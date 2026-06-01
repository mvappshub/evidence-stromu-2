import type { NextAuthOptions, CookieOption } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { compare } from "bcryptjs"
import { db } from "@/lib/db"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const user = await db.user.findUnique({ where: { email: credentials.email } })
        if (!user) return null
        const isValid = await compare(credentials.password, user.passwordHash)
        if (!isValid) return null
        return { id: user.id, email: user.email, name: user.name }
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as Record<string, unknown>).id = token.id
      }
      return session
    },
  },
  pages: { signIn: "/" },
  secret: process.env.NEXTAUTH_SECRET || "dev-secret-change-in-production",
  trustHost: true,
  // Force SameSite=Lax (not None) and secure=false for widest compatibility
  // The Caddy proxy forwards requests, so cookies set on the proxy domain
  // will be sent back correctly as long as SameSite=Lax
  useSecureCookies: false,
  cookies: {
    sessionToken: {
      name: "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: false,
      },
    },
    callbackUrl: {
      name: "next-auth.callback-url",
      options: {
        httpOnly: false,
        sameSite: "lax",
        path: "/",
        secure: false,
      },
    },
    csrfToken: {
      name: "next-auth.csrf-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: false,
      },
    },
    pkceCodeVerifier: {
      name: "next-auth.pkce.code_verifier",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: false,
      },
    },
  },
}
