import { PrismaClient } from '@prisma/client'
import path from 'node:path'

/** Prisma resolves SQLite paths relative to prisma/schema.prisma — match that here. */
const PRISMA_DIR = path.join(process.cwd(), 'prisma')

function toAbsoluteFileUrl(relativeToPrismaDir: string) {
  const absolutePath = path.resolve(PRISMA_DIR, relativeToPrismaDir)
  return `file:${absolutePath.replace(/\\/g, '/')}`
}

function resolveDatabaseUrl() {
  const configuredUrl = process.env.DATABASE_URL?.trim()
  const fallbackUrl = toAbsoluteFileUrl('db/custom.db')

  if (!configuredUrl) {
    process.env.DATABASE_URL = fallbackUrl
    return fallbackUrl
  }

  if (configuredUrl.startsWith('file:/home/')) {
    process.env.DATABASE_URL = fallbackUrl
    return fallbackUrl
  }

  if (configuredUrl.startsWith('file:./') || configuredUrl.startsWith('file:../')) {
    const relativePath = configuredUrl.slice('file:'.length)
    const normalizedUrl = toAbsoluteFileUrl(relativePath)
    process.env.DATABASE_URL = normalizedUrl
    return normalizedUrl
  }

  return configuredUrl
}

resolveDatabaseUrl()

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.DEBUG_PRISMA === '1' ? ['query'] : [],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
