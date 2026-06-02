import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/api-auth"

const reminderSchema = z.object({
  text: z.string().min(1),
  mode: z.enum(["interval", "date"]),
  intervalNum: z.number().nullable().optional(),
  intervalUnit: z.enum(["day", "week", "month", "year"]).nullable().optional(),
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
  recordCount: z.number().optional(),
  user: z
    .object({ name: z.string().nullable(), email: z.string().email() })
    .optional()
    .nullable(),
  records: z.array(recordSchema),
})

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if ("error" in auth) return auth.error

  try {
    const body = await request.json()
    const parsed = backupSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Neplatný formát zálohy", details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { records, user: backupUser } = parsed.data

    const currentUser = await db.user.findUnique({
      where: { id: auth.userId },
      select: { email: true },
    })

    if (
      backupUser?.email &&
      currentUser?.email &&
      backupUser.email !== currentUser.email
    ) {
      return NextResponse.json(
        {
          error:
            "Záloha patří jinému uživateli. Obnovit lze pouze vlastní zálohu.",
        },
        { status: 403 }
      )
    }

    const restoredCount = await db.$transaction(async (tx) => {
      await tx.treeRecord.deleteMany({
        where: { createdById: auth.userId },
      })

      let count = 0
      for (const rec of records) {
        const { reminders, ...recData } = rec
        await tx.treeRecord.create({
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
        count++
      }
      return count
    })

    await db.activityLog.create({
      data: {
        action: "create",
        entityType: "record",
        entityId: "restore",
        details: JSON.stringify({ restored: restoredCount }),
        userId: auth.userId,
      },
    })

    return NextResponse.json({ restored: restoredCount })
  } catch (error) {
    console.error("Restore error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
