import { compare } from "bcryptjs"
import { db } from "@/lib/db"

export type AuthenticatedUser = {
  id: string
  email: string
  name: string | null
}

export type LoginUserResult =
  | { ok: true; user: AuthenticatedUser }
  | { ok: false; reason: "missing_credentials" | "invalid_credentials" }

export async function loginUser(
  email: string | undefined,
  password: string | undefined
): Promise<LoginUserResult> {
  if (!email || !password) {
    return { ok: false, reason: "missing_credentials" }
  }

  const user = await db.user.findUnique({ where: { email } })
  if (!user) {
    return { ok: false, reason: "invalid_credentials" }
  }

  const isValid = await compare(password, user.passwordHash)
  if (!isValid) {
    return { ok: false, reason: "invalid_credentials" }
  }

  return {
    ok: true,
    user: { id: user.id, email: user.email, name: user.name },
  }
}
