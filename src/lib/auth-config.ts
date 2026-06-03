export function getAuthSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET?.trim()
  if (!secret || secret.length < 32) {
    throw new Error(
      "NEXTAUTH_SECRET must be set in .env (min. 32 characters). Copy .env.example and run: openssl rand -base64 32"
    )
  }
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
