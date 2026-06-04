import type { PrismaClient } from "@prisma/client"
import { enrichRecordLocationFromCoords } from "@/lib/records/enrich-record-location"

type BackupPhoto = {
  fileName: string
  dataBase64: string
}

type BackupReminder = {
  text: string
  mode: "interval" | "date"
  intervalNum?: number | null
  intervalUnit?: "day" | "week" | "month" | "year" | null
  startAt?: string | null
  dueAt?: string | null
  nextDueAt: string
  active: boolean
}

type BackupRecord = {
  speciesLatin: string
  plantedAt: string
  lat: number
  lng: number
  locality?: string | null
  orpKod?: number | null
  photoPath?: string | null
  photo?: BackupPhoto | null
  note?: string | null
  reminders?: BackupReminder[]
}

type BackupPayload = {
  user?: {
    name: string | null
    email: string
  } | null
  records: BackupRecord[]
}

type RestoreBackupDeps = {
  db: PrismaClient
  parseInputDate: (value: string) => Date | null
  parseStoredDate: (value: string) => Date | null
  restorePhotoFromBackup: (photo: BackupPhoto) => Promise<string | null>
  photoFileExists: (photoPath: string) => Promise<boolean>
  deletePhotoFile: (photoPath: string | null | undefined) => Promise<void>
}

export function createRestoreBackupService({
  db,
  parseInputDate,
  parseStoredDate,
  restorePhotoFromBackup,
  photoFileExists,
  deletePhotoFile,
}: RestoreBackupDeps) {
  return async function restoreBackup(
    authUserId: string,
    backup: BackupPayload
  ): Promise<{ restored: number }> {
    const createdPhotoPaths: string[] = []

    try {
      const existingRecords = await db.treeRecord.findMany({
        where: { createdById: authUserId },
        select: { photoPath: true },
      })

      const currentUser = await db.user.findUnique({
        where: { id: authUserId },
        select: { email: true },
      })

      if (
        backup.user?.email &&
        currentUser?.email &&
        backup.user.email !== currentUser.email
      ) {
        throw new Error("Záloha patří jinému uživateli. Obnovit lze pouze vlastní zálohu.")
      }

      const preparedRecords = await Promise.all(
        backup.records.map(async (rec, index) => {
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

          let orpKod = rec.orpKod ?? null
          let locality = rec.locality ?? null
          if (orpKod == null) {
            const enriched = await enrichRecordLocationFromCoords(rec.lng, rec.lat, {
              fillLocality: !locality,
            })
            orpKod = enriched.orpKod ?? null
            if (!locality && enriched.locality) locality = enriched.locality
          }

          return {
            speciesLatin: rec.speciesLatin,
            plantedAt,
            lat: rec.lat,
            lng: rec.lng,
            locality,
            orpKod,
            photoPath: restoredPhotoPath,
            note: rec.note ?? null,
            reminders,
          }
        })
      )

      const restoredCount = await db.$transaction(async (tx) => {
        await tx.treeRecord.deleteMany({
          where: { createdById: authUserId },
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
              orpKod: rec.orpKod,
              photoPath: rec.photoPath,
              note: rec.note,
              createdById: authUserId,
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
          userId: authUserId,
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

      return { restored: restoredCount }
    } catch (error) {
      await Promise.all(createdPhotoPaths.map((photoPath) => deletePhotoFile(photoPath)))
      throw error
    }
  }
}
