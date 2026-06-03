const DEV_FALLBACK_SECRET = "dev-secret-change-in-production"

function hasConfiguredSecret(secret: string | undefined) {
  if (!secret) return false
  const normalized = secret.trim()
  return normalized.length > 0 && normalized !== DEV_FALLBACK_SECRET
}

export function getAuthSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET?.trim()
  if (hasConfiguredSecret(secret)) return secret as string

  if (process.env.NODE_ENV === "production") {
    throw new Error("NEXTAUTH_SECRET must be configured in production")
  }

  return DEV_FALLBACK_SECRET
}

export function isSecureCookie() {
  return process.env.NODE_ENV === "production"
}

export function getSessionCookieName() {
  return isSecureCookie()
    ? "__Secure-next-auth.session-token"
    : "next-auth.session-token"
}
