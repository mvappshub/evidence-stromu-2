import { access, mkdir, readFile, unlink, writeFile } from "fs/promises"
import { basename, extname, join } from "path"
import { v4 as uuidv4 } from "uuid"

export interface BackupPhotoPayload {
  fileName: string
  dataBase64: string
}

const UPLOADS_DIR = join(process.cwd(), "public", "uploads")

function getUploadFilename(photoPath: string | null | undefined) {
  if (!photoPath || !photoPath.startsWith("/uploads/")) return null
  const fileName = basename(photoPath)
  if (!fileName || fileName.includes("..")) return null
  return fileName
}

export async function ensureUploadsDir() {
  await mkdir(UPLOADS_DIR, { recursive: true })
}

export async function readPhotoBackupPayload(
  photoPath: string | null | undefined
): Promise<BackupPhotoPayload | null> {
  const fileName = getUploadFilename(photoPath)
  if (!fileName) return null

  try {
    const file = await readFile(join(UPLOADS_DIR, fileName))
    return { fileName, dataBase64: file.toString("base64") }
  } catch {
    return null
  }
}

export async function photoFileExists(photoPath: string | null | undefined) {
  const fileName = getUploadFilename(photoPath)
  if (!fileName) return false

  try {
    await access(join(UPLOADS_DIR, fileName))
    return true
  } catch {
    return false
  }
}

export async function restorePhotoFromBackup(
  photo: BackupPhotoPayload
): Promise<string> {
  await ensureUploadsDir()

  const ext = extname(photo.fileName) || ".jpg"
  const restoredFileName = `${uuidv4()}${ext}`
  await writeFile(
    join(UPLOADS_DIR, restoredFileName),
    Buffer.from(photo.dataBase64, "base64")
  )
  return `/uploads/${restoredFileName}`
}

/** Delete uploaded photo file if path is under /uploads/. */
export async function deletePhotoFile(photoPath: string | null | undefined) {
  const filename = getUploadFilename(photoPath)
  if (!filename) return
  try {
    await unlink(join(UPLOADS_DIR, filename))
  } catch {
    // File may already be missing
  }
}
