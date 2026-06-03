import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { decode } from "next-auth/jwt"
import { NextRequest, NextResponse } from "next/server"
import { getAuthSecret } from "@/lib/auth-config"

const SECRET: string = getAuthSecret()

export async function requireAuth(req?: NextRequest) {
  // Strategy 1: Try Bearer token from Authorization header
  if (req) {
    const authHeader = req.headers.get("authorization")
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7)
      try {
        const decoded = await decode({ token, secret: SECRET })
        if (decoded?.sub) {
          return { userId: decoded.sub as string }
        }
      } catch {
        // Token invalid, fall through to cookie auth
      }
    }
  }

  // Strategy 2: Try NextAuth session cookie
  const session = await getServerSession(authOptions)
  if (session?.user) {
    return { userId: (session.user as Record<string, unknown>).id as string }
  }

  return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
}
