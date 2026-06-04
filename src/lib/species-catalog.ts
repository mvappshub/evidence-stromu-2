import { db } from "@/lib/db"

export function normalizeSpeciesLatinName(value: string): string {
  return value.trim().replace(/\s+/g, " ")
}

export async function listSpeciesCatalog() {
  return db.species.findMany({
    orderBy: [{ sortOrder: "asc" }, { latinName: "asc" }],
    select: {
      id: true,
      latinName: true,
      sortOrder: true,
      createdAt: true,
      updatedAt: true,
    },
  })
}

export async function speciesUsageCounts(userId: string) {
  const grouped = await db.treeRecord.groupBy({
    by: ["speciesLatin"],
    where: { createdById: userId },
    _count: { speciesLatin: true },
  })
  return new Map(
    grouped.map((g) => [g.speciesLatin, g._count.speciesLatin])
  )
}
