import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/api-auth"

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if ("error" in auth) return auth.error

    const user = await db.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, email: true, name: true },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error("Auth/me error:", error)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}
