import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'
import { readPhotoBackupPayload } from '@/lib/photo-storage'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if ('error' in auth) return auth.error

  try {
    // Fetch all records with reminders for the current user
    const records = await db.treeRecord.findMany({
      where: { createdById: auth.userId },
      include: { reminders: true },
      orderBy: { recordNumber: 'asc' },
    })

    // Fetch user metadata
    const user = await db.user.findUnique({
      where: { id: auth.userId },
      select: { name: true, email: true },
    })

    const recordsWithPhotos = await Promise.all(
      records.map(async (r) => ({
        recordNumber: r.recordNumber,
        speciesLatin: r.speciesLatin,
        plantedAt: r.plantedAt.toISOString(),
        lat: r.lat,
        lng: r.lng,
        locality: r.locality,
        orpKod: r.orpKod,
        photoPath: r.photoPath,
        photo: await readPhotoBackupPayload(r.photoPath),
        note: r.note,
        createdAt: r.createdAt.toISOString(),
        reminders: r.reminders.map((rem) => ({
          text: rem.text,
          mode: rem.mode,
          intervalNum: rem.intervalNum,
          intervalUnit: rem.intervalUnit,
          startAt: rem.startAt?.toISOString() ?? null,
          dueAt: rem.dueAt?.toISOString() ?? null,
          nextDueAt: rem.nextDueAt.toISOString(),
          active: rem.active,
        })),
      }))
    )

    const backup = {
      version: 2,
      timestamp: new Date().toISOString(),
      recordCount: records.length,
      user: user ? { name: user.name, email: user.email } : null,
      records: recordsWithPhotos,
    }

    return NextResponse.json(backup)
  } catch (error) {
    console.error('Backup error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
