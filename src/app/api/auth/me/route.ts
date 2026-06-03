import { NextRequest, NextResponse } from "next/server"
import { decode } from "next-auth/jwt"
import { db } from "@/lib/db"
import { getAuthSecret, getSessionCookieName } from "@/lib/auth-config"

const SECRET: string = getAuthSecret()

export async function GET(req: NextRequest) {
  try {
    // Try Bearer token from Authorization header first
    const authHeader = req.headers.get("authorization")
    let token: string | null = null

    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.slice(7)
    }

    // Fallback: try cookie
    if (!token) {
      token = req.cookies.get(getSessionCookieName())?.value ?? null
    }

    if (!token) {
      return NextResponse.json({ error: "No token" }, { status: 401 })
    }

    // Decode and verify the JWT
    const decoded = await decode({ token, secret: SECRET })
    if (!decoded?.sub) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    // Verify user still exists in database
    const user = await db.user.findUnique({
      where: { id: decoded.sub as string },
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
