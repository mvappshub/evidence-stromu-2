import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'

const reminderSchema = z.object({
  text: z.string().min(1),
  mode: z.enum(['interval', 'date']),
  intervalNum: z.number().nullable().optional(),
  intervalUnit: z.enum(['day', 'week', 'month', 'year']).nullable().optional(),
  startAt: z.string().nullable().optional(),
  dueAt: z.string().nullable().optional(),
  nextDueAt: z.string(),
  active: z.boolean().default(true),
})

const recordSchema = z.object({
  recordNumber: z.number().optional(),
  speciesLatin: z.string().min(1),
  plantedAt: z.string().min(1),
  lat: z.number(),
  lng: z.number(),
  locality: z.string().nullable().optional(),
  photoPath: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  reminders: z.array(reminderSchema).optional(),
})

const backupSchema = z.object({
  version: z.number(),
  timestamp: z.string().optional(),
  user: z.object({ name: z.string().nullable(), email: z.string() }).optional().nullable(),
  records: z.array(recordSchema),
})

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  try {
    const body = await request.json()
    const parsed = backupSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Neplatný formát zálohy', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { records } = parsed.data

    // Delete all existing records and reminders for the current user
    // Reminders are cascade-deleted with records
    await db.treeRecord.deleteMany({
      where: { createdById: auth.userId },
    })

    // Create new records from backup data
    let restoredCount = 0
    for (const rec of records) {
      const { reminders, ...recData } = rec
      const created = await db.treeRecord.create({
        data: {
          speciesLatin: recData.speciesLatin,
          plantedAt: new Date(recData.plantedAt),
          lat: recData.lat,
          lng: recData.lng,
          locality: recData.locality ?? null,
          photoPath: recData.photoPath ?? null,
          note: recData.note ?? null,
          createdById: auth.userId,
          reminders: reminders
            ? {
                create: reminders.map((rem) => ({
                  text: rem.text,
                  mode: rem.mode,
                  intervalNum: rem.intervalNum ?? null,
                  intervalUnit: rem.intervalUnit ?? null,
                  startAt: rem.startAt ? new Date(rem.startAt) : null,
                  dueAt: rem.dueAt ? new Date(rem.dueAt) : null,
                  nextDueAt: new Date(rem.nextDueAt),
                  active: rem.active,
                })),
              }
            : undefined,
        },
      })
      if (created) restoredCount++
    }

    return NextResponse.json({ restored: restoredCount })
  } catch (error) {
    console.error('Restore error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
