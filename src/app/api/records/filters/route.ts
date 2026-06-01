import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/api-auth"

export async function GET() {
  const auth = await requireAuth()
  if ("error" in auth) return auth.error

  const [speciesRaw, localityRaw] = await Promise.all([
    db.treeRecord.findMany({
      where: { createdById: auth.userId },
      select: { speciesLatin: true },
      distinct: ["speciesLatin"],
    }),
    db.treeRecord.findMany({
      where: {
        createdById: auth.userId,
        locality: { not: null },
      },
      select: { locality: true },
      distinct: ["locality"],
    }),
  ])

  const species = speciesRaw.map((r) => r.speciesLatin).sort()
  const localities = localityRaw
    .map((r) => r.locality!)
    .sort()

  return NextResponse.json({ species, localities })
}
