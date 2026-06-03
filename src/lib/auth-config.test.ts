import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { getAuthSecret, isRegistrationAllowed } from "@/lib/auth-config"

describe("isRegistrationAllowed", () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("allows registration in development by default", () => {
    vi.stubEnv("NODE_ENV", "development")
    vi.stubEnv("ALLOW_REGISTRATION", "")
    expect(isRegistrationAllowed()).toBe(true)
  })

  it("blocks registration in development when ALLOW_REGISTRATION=false", () => {
    vi.stubEnv("NODE_ENV", "development")
    vi.stubEnv("ALLOW_REGISTRATION", "false")
    expect(isRegistrationAllowed()).toBe(false)
  })

  it("blocks registration in production unless ALLOW_REGISTRATION=true", () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("ALLOW_REGISTRATION", "")
    expect(isRegistrationAllowed()).toBe(false)

    vi.stubEnv("ALLOW_REGISTRATION", "true")
    expect(isRegistrationAllowed()).toBe(true)
  })
})

describe("getAuthSecret production guard", () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("rejects placeholder NEXTAUTH_SECRET in production", () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("NEXTAUTH_SECRET", "change-me-to-a-long-random-string-ok-length")
    expect(() => getAuthSecret()).toThrow(/placeholder/)
  })

  it("accepts a non-placeholder secret in production", () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv(
      "NEXTAUTH_SECRET",
      "a7f3c9e2b1d84f6a0e5c8b2d9f1a4e7c0b3d6f9a2e5c8b1d4f7a0e3c6b9d2f5a8e1"
    )
    expect(getAuthSecret().length).toBeGreaterThanOrEqual(32)
  })
})
