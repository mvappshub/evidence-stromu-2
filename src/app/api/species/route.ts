import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/api-auth"
import {
  listSpeciesCatalog,
  normalizeSpeciesLatinName,
  speciesUsageCounts,
} from "@/lib/species-catalog"

const createSchema = z.object({
  latinName: z.string().min(1, "Zadejte latinský název druhu"),
  sortOrder: z.number().int().optional(),
})

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if ("error" in auth) return auth.error

  const [items, usage] = await Promise.all([
    listSpeciesCatalog(),
    speciesUsageCounts(auth.userId),
  ])

  return NextResponse.json({
    species: items.map((s) => ({
      ...s,
      recordCount: usage.get(s.latinName) ?? 0,
    })),
  })
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if ("error" in auth) return auth.error

  try {
    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const latinName = normalizeSpeciesLatinName(parsed.data.latinName)
    const existing = await db.species.findUnique({ where: { latinName } })
    if (existing) {
      return NextResponse.json(
        { error: "Druh s tímto názvem již existuje" },
        { status: 409 }
      )
    }

    const species = await db.species.create({
      data: {
        latinName,
        sortOrder: parsed.data.sortOrder ?? 0,
      },
    })

    return NextResponse.json({ species }, { status: 201 })
  } catch (error) {
    console.error("Create species error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
