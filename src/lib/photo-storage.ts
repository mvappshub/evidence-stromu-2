import { unlink } from "fs/promises"
import { join } from "path"

/** Delete uploaded photo file if path is under /uploads/. */
export async function deletePhotoFile(photoPath: string | null | undefined) {
  if (!photoPath || !photoPath.startsWith("/uploads/")) return
  const filename = photoPath.replace(/^\/uploads\//, "")
  if (!filename || filename.includes("..")) return
  try {
    await unlink(join(process.cwd(), "public", "uploads", filename))
  } catch {
    // File may already be missing
  }
}
