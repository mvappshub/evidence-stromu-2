import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import {
  ensurePrismaStudioRunning,
  isPrismaStudioReachable,
  PRISMA_STUDIO_URL,
} from '@/lib/prisma-studio-server'

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Prisma Studio je dostupné jen ve vývoji' },
      { status: 403 }
    )
  }

  const auth = await requireAuth(request)
  if ('error' in auth) return auth.error

  const running = await isPrismaStudioReachable()
  return NextResponse.json({ url: PRISMA_STUDIO_URL, running })
}

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Prisma Studio je dostupné jen ve vývoji' },
      { status: 403 }
    )
  }

  const auth = await requireAuth(request)
  if ('error' in auth) return auth.error

  try {
    const result = await ensurePrismaStudioRunning()
    return NextResponse.json(result)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Nepodařilo se spustit Prisma Studio'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
