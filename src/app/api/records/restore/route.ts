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
import { createRestoreBackupService } from "@/lib/records/restore-backup"

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

  try {
    const body = await request.json()
    const parsed = backupSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Neplatný formát zálohy", details: parsed.error.issues },
        { status: 400 }
      )
    }

    const restoreBackup = createRestoreBackupService({
      db,
      parseInputDate,
      parseStoredDate,
      restorePhotoFromBackup,
      photoFileExists,
      deletePhotoFile,
    })

    const result = await restoreBackup(auth.userId, parsed.data)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Restore error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      {
        status:
          error instanceof Error && error.message.startsWith("Záloha patří jinému uživateli")
            ? 403
            : error instanceof Error && error.message.startsWith("Neplatné")
              ? 400
              : 500,
      }
    )
  }
}
