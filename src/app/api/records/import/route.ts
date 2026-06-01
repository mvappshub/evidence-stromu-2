import { NextRequest, NextResponse } from "next/server"
import Papa from "papaparse"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/api-auth"

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_RECORDS = 5000

// Czech and English header mappings
const HEADER_MAP: Record<string, string> = {
  "druh": "speciesLatin",
  "species": "speciesLatin",
  "datum výsadby": "plantedAt",
  "datum_vysadby": "plantedAt",
  "date": "plantedAt",
  "zem. šířka": "lat",
  "zem_sirka": "lat",
  "zem.širka": "lat",
  "lat": "lat",
  "latitude": "lat",
  "zem. délka": "lng",
  "zem_delka": "lng",
  "zem.delka": "lng",
  "lng": "lng",
  "lon": "lng",
  "longitude": "lng",
  "lokalita": "locality",
  "locality": "locality",
  "location": "locality",
  "poznámka": "note",
  "poznamka": "note",
  "note": "note",
}

function normalizeHeader(h: string): string {
  const lower = h.trim().toLowerCase()
  return HEADER_MAP[lower] ?? lower
}

/** Replace comma decimal separator with dot for coordinate parsing */
function parseCoord(val: string): number {
  return parseFloat(val.replace(",", "."))
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if ("error" in auth) return auth.error

  // Parse multipart form data
  const formData = await request.formData()
  const file = formData.get("file")

  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "Soubor nebyl nalezen" },
      { status: 400 }
    )
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "Soubor je příliš velký (max. 5 MB)" },
      { status: 400 }
    )
  }

  // Read file content
  const text = await file.text()

  // Remove BOM if present
  const cleanedText = text.replace(/^\uFEFF/, "")

  // Parse CSV — try semicolon first (Czech convention), then comma, then auto-detect
  const result = Papa.parse(cleanedText, {
    header: true,
    delimiter: ";",
    skipEmptyLines: true,
    encoding: "UTF-8",
  })

  if (result.errors.length > 0 && result.data.length === 0) {
    return NextResponse.json(
      { error: "Chyba při čtení CSV souboru", details: result.errors.map((e) => e.message) },
      { status: 400 }
    )
  }

  let data = result.data as Record<string, string>[]
  let headers = result.meta.fields ?? []

  // If only one column was found, try comma delimiter
  if (headers.length <= 1 && cleanedText.includes(",")) {
    const commaResult = Papa.parse(cleanedText, {
      header: true,
      delimiter: ",",
      skipEmptyLines: true,
      encoding: "UTF-8",
    })
    if ((commaResult.meta.fields ?? []).length > headers.length) {
      data = commaResult.data as Record<string, string>[]
      headers = commaResult.meta.fields ?? []
    }
  }

  // Auto-detect delimiter if both failed
  if (headers.length <= 1) {
    const autoResult = Papa.parse(cleanedText, {
      header: true,
      skipEmptyLines: true,
      encoding: "UTF-8",
    })
    if ((autoResult.meta.fields ?? []).length > headers.length) {
      data = autoResult.data as Record<string, string>[]
      headers = autoResult.meta.fields ?? []
    }
  }

  // Map headers to field names
  const mappedHeaders = headers.map(normalizeHeader)

  if (!mappedHeaders.includes("speciesLatin") || !mappedHeaders.includes("plantedAt") ||
      !mappedHeaders.includes("lat") || !mappedHeaders.includes("lng")) {
    return NextResponse.json(
      {
        error: "Chybí povinné sloupce",
        details: "Je potřeba: Druh/Species, Datum výsadby/Date, Zem. šířka/Lat, Zem. délka/Lng",
        foundHeaders: headers,
      },
      { status: 400 }
    )
  }

  if (data.length > MAX_RECORDS) {
    return NextResponse.json(
      { error: `Příliš mnoho záznamů (max. ${MAX_RECORDS})` },
      { status: 400 }
    )
  }

  // Process rows
  let imported = 0
  let skipped = 0
  const errors: string[] = []

  for (let i = 0; i < data.length; i++) {
    const row = data[i]

    // Map row values using header mapping
    const mapped: Record<string, string> = {}
    for (let j = 0; j < headers.length; j++) {
      const fieldName = mappedHeaders[j]
      const value = row[headers[j]]?.trim() ?? ""
      mapped[fieldName] = value
    }

    // Validate required fields
    if (!mapped.speciesLatin) {
      errors.push(`Řádek ${i + 2}: Chybí druh`)
      skipped++
      continue
    }

    if (!mapped.plantedAt) {
      errors.push(`Řádek ${i + 2}: Chybí datum výsadby`)
      skipped++
      continue
    }

    const lat = parseCoord(mapped.lat)
    const lng = parseCoord(mapped.lng)

    if (isNaN(lat) || isNaN(lng)) {
      errors.push(`Řádek ${i + 2}: Neplatné souřadnice`)
      skipped++
      continue
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      errors.push(`Řádek ${i + 2}: Souřadnice mimo rozsah`)
      skipped++
      continue
    }

    // Parse date - support multiple formats
    let plantedAt: Date | null = null

    // ISO format: 2024-01-15
    if (/^\d{4}-\d{2}-\d{2}$/.test(mapped.plantedAt)) {
      plantedAt = new Date(mapped.plantedAt + "T00:00:00.000Z")
    }
    // Czech format: 15.1.2024 or 15. 1. 2024
    else if (/^\d{1,2}\.\s*\d{1,2}\.\s*\d{4}$/.test(mapped.plantedAt)) {
      const parts = mapped.plantedAt.split(".")
      const day = parseInt(parts[0])
      const month = parseInt(parts[1]) - 1
      const year = parseInt(parts[2])
      plantedAt = new Date(Date.UTC(year, month, day))
    }
    // Fallback: try Date parser
    else {
      const parsed = new Date(mapped.plantedAt)
      if (!isNaN(parsed.getTime())) {
        plantedAt = parsed
      }
    }

    if (!plantedAt || isNaN(plantedAt.getTime())) {
      errors.push(`Řádek ${i + 2}: Neplatné datum "${mapped.plantedAt}"`)
      skipped++
      continue
    }

    try {
      await db.treeRecord.create({
        data: {
          speciesLatin: mapped.speciesLatin,
          plantedAt,
          lat,
          lng,
          locality: mapped.locality || null,
          note: mapped.note || null,
          createdById: auth.userId,
        },
      })
      imported++
    } catch {
      errors.push(`Řádek ${i + 2}: Chyba při ukládání`)
      skipped++
    }
  }

  return NextResponse.json({
    imported,
    skipped,
    errors: errors.slice(0, 100), // Limit error messages
  })
}
