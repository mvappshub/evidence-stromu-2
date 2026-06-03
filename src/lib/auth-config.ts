const PLACEHOLDER_SECRET_MARKERS = ["change-me", "changeme", "replace-me", "your-secret-here"]

function assertProductionAuthSecret(secret: string) {
  if (process.env.NODE_ENV !== "production") return

  const lower = secret.toLowerCase()
  if (PLACEHOLDER_SECRET_MARKERS.some((marker) => lower.includes(marker))) {
    throw new Error(
      "NEXTAUTH_SECRET must not be a placeholder in production. Generate a new secret (e.g. openssl rand -base64 32), update .env, and rotate — old JWTs become invalid."
    )
  }
}

/** Dev: on unless ALLOW_REGISTRATION=false. Production: on only if ALLOW_REGISTRATION=true. */
export function isRegistrationAllowed(): boolean {
  const flag = process.env.ALLOW_REGISTRATION?.trim().toLowerCase()
  if (process.env.NODE_ENV === "production") {
    return flag === "true"
  }
  return flag !== "false"
}

export function getAuthSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET?.trim()
  if (!secret || secret.length < 32) {
    throw new Error(
      "NEXTAUTH_SECRET must be set in .env (min. 32 characters). Copy .env.example and run: openssl rand -base64 32"
    )
  }
  assertProductionAuthSecret(secret)
  return secret
}

export function isSecureCookie() {
  return process.env.NODE_ENV === "production"
}

export function getSessionCookieName() {
  return isSecureCookie()
    ? "__Secure-next-auth.session-token"
    : "next-auth.session-token"
}
