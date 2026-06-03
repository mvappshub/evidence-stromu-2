import { NextResponse } from "next/server"
import { getSessionCookieName, isSecureCookie } from "@/lib/auth-config"

export async function POST() {
  const response = NextResponse.json({ ok: true })

  const cookieNames = [
    getSessionCookieName(),
    "__Secure-next-auth.session-token",
    "next-auth.csrf-token",
    "__Host-next-auth.csrf-token",
    "next-auth.callback-url",
  ]

  for (const name of cookieNames) {
    response.cookies.set(name, "", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: isSecureCookie(),
      maxAge: 0,
    })
  }

  return response
}
