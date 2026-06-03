import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSessionCookieName } from "@/lib/auth-config"
import { decodeSessionToken } from "@/lib/session-token"

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization")
    const bearerToken = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null
    const cookieToken = req.cookies.get(getSessionCookieName())?.value ?? null

    // Try Bearer first; on stale token after secret rotation, fall back to cookie.
    const candidates = [bearerToken, cookieToken].filter(
      (token, index, all): token is string =>
        Boolean(token) && all.indexOf(token) === index
    )

    if (candidates.length === 0) {
      return NextResponse.json({ error: "No token" }, { status: 401 })
    }

    let userId: string | null = null
    for (const token of candidates) {
      const decoded = await decodeSessionToken(token)
      if (decoded) {
        userId = decoded.sub
        break
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error("Auth/me error:", error)
    return NextResponse.json({ error: "Invalid token" }, { status: 401 })
  }
}
