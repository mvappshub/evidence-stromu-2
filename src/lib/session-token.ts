import { decode } from "next-auth/jwt"
import { getAuthSecret } from "@/lib/auth-config"

const SECRET: string = getAuthSecret()

export type DecodedSession = {
  sub: string
}

/** Decode a NextAuth JWT; returns null if invalid or encrypted with another secret. */
export async function decodeSessionToken(
  token: string
): Promise<DecodedSession | null> {
  try {
    const decoded = await decode({ token, secret: SECRET })
    if (!decoded?.sub) return null
    return { sub: decoded.sub as string }
  } catch {
    return null
  }
}
