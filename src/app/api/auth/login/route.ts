import { NextRequest, NextResponse } from "next/server"
import { compare } from "bcryptjs"
import { encode } from "next-auth/jwt"
import { db } from "@/lib/db"

const SECRET = process.env.NEXTAUTH_SECRET || "dev-secret-change-in-production"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ error: "Zadejte e-mail a heslo" }, { status: 400 })
    }

    const user = await db.user.findUnique({ where: { email } })
    if (!user) {
      return NextResponse.json({ error: "Neplatný e-mail nebo heslo" }, { status: 401 })
    }

    const isValid = await compare(password, user.passwordHash)
    if (!isValid) {
      return NextResponse.json({ error: "Neplatný e-mail nebo heslo" }, { status: 401 })
    }

    // Create a NextAuth-compatible JWT session token
    const sessionToken = await encode({
      token: {
        id: user.id,
        email: user.email,
        name: user.name,
        sub: user.id,
      },
      secret: SECRET,
    })

    // Set the session cookie as a fallback for non-iframe environments
    const response = NextResponse.json({
      ok: true,
      token: sessionToken, // Include token in body for localStorage-based auth
      user: { id: user.id, email: user.email, name: user.name },
    })

    response.cookies.set("next-auth.session-token", sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: false,
      maxAge: 30 * 24 * 60 * 60, // 30 days
    })

    return response
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Chyba serveru" }, { status: 500 })
  }
}
