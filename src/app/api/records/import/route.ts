import { NextRequest, NextResponse } from "next/server"
import Papa from "papaparse"
import { z } from "zod"
import { requireAuth } from "@/lib/api-auth"
import { normalizeCsvHeader } from "@/lib/csv-header-map"
import { importTreeRecords, type ImportRowInput } from "@/lib/import-records"

const MAX_FILE_SIZE = 5 * 1024 * 1024
const MAX_RECORDS = 5000

const importRecordSchema = z.object({
  speciesLatin: z.string().min(1),
  plantedAt: z.string().min(1),
  lat: z.number(),
  lng: z.number(),
  locality: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
})

const jsonImportSchema = z.object({
  records: z.array(importRecordSchema).max(MAX_RECORDS),
})

function parseCoord(val: string): number {
  return parseFloat(val.replace(",", "."))
}

function csvRowsToImportInputs(
  data: Record<string, string>[],
  headers: string[],
  mappedHeaders: string[]
): ImportRowInput[] {
  return data.map((row) => {
    const mapped: Record<string, string> = {}
    for (let j = 0; j < headers.length; j++) {
      mapped[mappedHeaders[j]] = row[headers[j]]?.trim() ?? ""
    }
    return {
      speciesLatin: mapped.speciesLatin ?? "",
      plantedAt: mapped.plantedAt ?? "",
      lat: parseCoord(mapped.lat ?? ""),
      lng: parseCoord(mapped.lng ?? ""),
      locality: mapped.locality || null,
      note: mapped.note || null,
    }
  })
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if ("error" in auth) return auth.error

  const contentType = request.headers.get("content-type") ?? ""

  if (contentType.includes("application/json")) {
    try {
      const body = await request.json()
      const parsed = jsonImportSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Validation failed", details: parsed.error.issues },
          { status: 400 }
        )
      }
      const result = await importTreeRecords(auth.userId, parsed.data.records)
      return NextResponse.json(result)
    } catch (error) {
      console.error("JSON import error:", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  }

  const formData = await request.formData()
  const file = formData.get("file")

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Soubor nebyl nalezen" }, { status: 400 })
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "Soubor je příliš velký (max. 5 MB)" },
      { status: 400 }
    )
  }

  const text = (await file.text()).replace(/^\uFEFF/, "")

  let result = Papa.parse<Record<string, string>>(text, {
    header: true,
    delimiter: ";",
    skipEmptyLines: true,
  })

  let data = result.data
  let headers = result.meta.fields ?? []

  if (headers.length <= 1 && text.includes(",")) {
    const commaResult = Papa.parse<Record<string, string>>(text, {
      header: true,
      delimiter: ",",
      skipEmptyLines: true,
    })
    if ((commaResult.meta.fields ?? []).length > headers.length) {
      data = commaResult.data
      headers = commaResult.meta.fields ?? []
    }
  }

  const mappedHeaders = headers.map(normalizeCsvHeader)

  if (
    !mappedHeaders.includes("speciesLatin") ||
    !mappedHeaders.includes("plantedAt") ||
    !mappedHeaders.includes("lat") ||
    !mappedHeaders.includes("lng")
  ) {
    return NextResponse.json(
      {
        error: "Chybí povinné sloupce",
        details:
          "Je potřeba: Druh/Species, Datum výsadby/Date, Zem. šířka/Lat, Zem. délka/Lng",
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

  const rows = csvRowsToImportInputs(data, headers, mappedHeaders)
  const importResult = await importTreeRecords(auth.userId, rows, 1)

  return NextResponse.json(importResult)
}
