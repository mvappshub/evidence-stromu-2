import { PrismaClient } from '@prisma/client'
import path from 'node:path'
import fs from 'node:fs'

const official = path.resolve('prisma/db/custom.db')
const legacy = path.resolve('db/custom.db')

async function inspect(label, filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`${label}: (soubor neexistuje)`)
    return
  }
  process.env.DATABASE_URL = `file:${filePath.replace(/\\/g, '/')}`
  const db = new PrismaClient()
  try {
    const users = await db.user.count()
    const records = await db.treeRecord.count()
    let migrations = 0
    try {
      migrations = await db.$queryRaw`SELECT COUNT(*) as c FROM _prisma_migrations`.then(
        (r) => Number(r[0]?.c ?? 0),
      )
    } catch {
      migrations = -1
    }
    console.log(`${label}:`, {
      path: filePath,
      bytes: fs.statSync(filePath).size,
      users,
      records,
      prismaMigrations: migrations,
    })
  } finally {
    await db.$disconnect()
  }
}

await inspect('prisma/db/custom.db', official)
await inspect('db/custom.db (kořen)', legacy)
