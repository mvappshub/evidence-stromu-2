import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/api-auth"
import {
  deletePhotoFile,
  photoFileExists,
  restorePhotoFromBackup,
} from "@/lib/photo-storage"
import { parseInputDate, parseStoredDate } from "@/lib/server-date"

const backupPhotoSchema = z.object({
  fileName: z.string().min(1),
  dataBase64: z.string().min(1),
})

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
  photo: backupPhotoSchema.nullable().optional(),
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
  const createdPhotoPaths: string[] = []

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
    const existingRecords = await db.treeRecord.findMany({
      where: { createdById: auth.userId },
      select: { photoPath: true },
    })

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

    const preparedRecords = await Promise.all(
      records.map(async (rec, index) => {
        const plantedAt = parseInputDate(rec.plantedAt)
        if (!plantedAt) {
          throw new Error(`Neplatné datum výsadby u záznamu #${index + 1}`)
        }

        const restoredPhotoPath = rec.photo
          ? await restorePhotoFromBackup(rec.photo)
          : rec.photoPath && (await photoFileExists(rec.photoPath))
            ? rec.photoPath
            : null
        if (rec.photo && restoredPhotoPath) createdPhotoPaths.push(restoredPhotoPath)

        const reminders = (rec.reminders ?? []).map((rem, reminderIndex) => {
          const nextDueAt = parseStoredDate(rem.nextDueAt)
          if (!nextDueAt) {
            throw new Error(
              `Neplatné datum připomínky u záznamu #${index + 1}, připomínka #${reminderIndex + 1}`
            )
          }

          const startAt = rem.startAt ? parseStoredDate(rem.startAt) : null
          if (rem.startAt && !startAt) {
            throw new Error(
              `Neplatné startAt u záznamu #${index + 1}, připomínka #${reminderIndex + 1}`
            )
          }

          const dueAt = rem.dueAt ? parseStoredDate(rem.dueAt) : null
          if (rem.dueAt && !dueAt) {
            throw new Error(
              `Neplatné dueAt u záznamu #${index + 1}, připomínka #${reminderIndex + 1}`
            )
          }

          return {
            text: rem.text,
            mode: rem.mode,
            intervalNum: rem.intervalNum ?? null,
            intervalUnit: rem.intervalUnit ?? null,
            startAt,
            dueAt,
            nextDueAt,
            active: rem.active,
          }
        })

        return {
          speciesLatin: rec.speciesLatin,
          plantedAt,
          lat: rec.lat,
          lng: rec.lng,
          locality: rec.locality ?? null,
          photoPath: restoredPhotoPath,
          note: rec.note ?? null,
          reminders,
        }
      })
    )

    const restoredCount = await db.$transaction(async (tx) => {
      await tx.treeRecord.deleteMany({
        where: { createdById: auth.userId },
      })

      let count = 0
      for (const rec of preparedRecords) {
        await tx.treeRecord.create({
          data: {
            speciesLatin: rec.speciesLatin,
            plantedAt: rec.plantedAt,
            lat: rec.lat,
            lng: rec.lng,
            locality: rec.locality,
            photoPath: rec.photoPath,
            note: rec.note,
            createdById: auth.userId,
            reminders: rec.reminders.length > 0
              ? {
                  create: rec.reminders,
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

    const restoredPhotoPaths = new Set(
      preparedRecords
        .map((record) => record.photoPath)
        .filter((photoPath): photoPath is string => Boolean(photoPath))
    )

    await Promise.all(
      existingRecords
        .map((record) => record.photoPath)
        .filter((photoPath): photoPath is string => Boolean(photoPath))
        .filter((photoPath) => !restoredPhotoPaths.has(photoPath))
        .map((photoPath) => deletePhotoFile(photoPath))
    )

    return NextResponse.json({ restored: restoredCount })
  } catch (error) {
    await Promise.all(createdPhotoPaths.map((photoPath) => deletePhotoFile(photoPath)))
    console.error("Restore error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.startsWith("Neplatné") ? 400 : 500 }
    )
  }
}
