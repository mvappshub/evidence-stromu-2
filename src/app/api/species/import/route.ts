import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/api-auth"
import { importSpeciesCatalog } from "@/lib/import-species"
import { parseSpeciesCsvText } from "@/lib/species-import-parse"

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if ("error" in auth) return auth.error

  try {
    const contentType = request.headers.get("content-type") ?? ""
    let latinNames: string[] = []

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData()
      const file = form.get("file")
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "Chybí soubor CSV" }, { status: 400 })
      }
      const text = await file.text()
      latinNames = parseSpeciesCsvText(text)
    } else {
      const body = await request.json()
      if (Array.isArray(body.names)) {
        latinNames = body.names.map(String)
      } else if (typeof body.csv === "string") {
        latinNames = parseSpeciesCsvText(body.csv)
      } else {
        return NextResponse.json({ error: "Neplatný formát požadavku" }, { status: 400 })
      }
    }

    if (latinNames.length === 0) {
      return NextResponse.json(
        { error: "CSV neobsahuje žádné druhy" },
        { status: 400 }
      )
    }

    const result = await importSpeciesCatalog(latinNames)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Species import error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
