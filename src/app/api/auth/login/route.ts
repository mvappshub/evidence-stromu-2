import { NextRequest, NextResponse } from "next/server"
import { encode } from "next-auth/jwt"
import { getAuthSecret, getSessionCookieName, isSecureCookie } from "@/lib/auth-config"
import { loginUser } from "@/lib/login-user"

const SECRET: string = getAuthSecret()

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const result = await loginUser(body.email, body.password)

    if (!result.ok) {
      if (result.reason === "missing_credentials") {
        return NextResponse.json({ error: "Zadejte e-mail a heslo" }, { status: 400 })
      }
      return NextResponse.json({ error: "Neplatný e-mail nebo heslo" }, { status: 401 })
    }

    const user = result.user

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

    const response = NextResponse.json({
      ok: true,
      token: sessionToken, // Include token in body for localStorage-based auth
      user: { id: user.id, email: user.email, name: user.name },
    })

    // Clear stale session cookies (e.g. after NEXTAUTH_SECRET rotation) before setting new.
    for (const name of [
      getSessionCookieName(),
      "__Secure-next-auth.session-token",
      "next-auth.session-token",
    ]) {
      response.cookies.set(name, "", {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isSecureCookie(),
        maxAge: 0,
      })
    }

    response.cookies.set(getSessionCookieName(), sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: isSecureCookie(),
      maxAge: 30 * 24 * 60 * 60, // 30 days
    })

    return response
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Chyba serveru" }, { status: 500 })
  }
}
