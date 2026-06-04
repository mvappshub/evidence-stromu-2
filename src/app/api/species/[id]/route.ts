import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/api-auth"
import { normalizeSpeciesLatinName } from "@/lib/species-catalog"

const updateSchema = z.object({
  latinName: z.string().min(1).optional(),
  sortOrder: z.number().int().optional(),
})

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request)
  if ("error" in auth) return auth.error

  const { id } = await context.params

  try {
    const body = await request.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const existing = await db.species.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Druh nenalezen" }, { status: 404 })
    }

    const data: { latinName?: string; sortOrder?: number } = {}
    if (parsed.data.sortOrder !== undefined) {
      data.sortOrder = parsed.data.sortOrder
    }
    if (parsed.data.latinName !== undefined) {
      const latinName = normalizeSpeciesLatinName(parsed.data.latinName)
      if (latinName !== existing.latinName) {
        const conflict = await db.species.findUnique({ where: { latinName } })
        if (conflict) {
          return NextResponse.json(
            { error: "Druh s tímto názvem již existuje" },
            { status: 409 }
          )
        }
        data.latinName = latinName
      }
    }

    const species = await db.species.update({ where: { id }, data })
    return NextResponse.json({ species })
  } catch (error) {
    console.error("Update species error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request)
  if ("error" in auth) return auth.error

  const { id } = await context.params

  try {
    const existing = await db.species.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Druh nenalezen" }, { status: 404 })
    }

    await db.species.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Delete species error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
