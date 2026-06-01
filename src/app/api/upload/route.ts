import { NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"
import { writeFile } from "fs/promises"
import { join } from "path"
import { requireAuth } from "@/lib/api-auth"

export async function POST(request: Request) {
  const auth = await requireAuth()
  if ("error" in auth) return auth.error

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, WebP, GIF" },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size: 10MB" },
        { status: 400 }
      )
    }

    const ext = file.name.split(".").pop() || "jpg"
    const filename = `${uuidv4()}.${ext}`
    const filepath = join(process.cwd(), "public", "uploads", filename)

    const bytes = await file.arrayBuffer()
    await writeFile(filepath, Buffer.from(bytes))

    const path = `/uploads/${filename}`

    return NextResponse.json({ path }, { status: 201 })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
