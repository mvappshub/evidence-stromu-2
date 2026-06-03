import { beforeAll, describe, expect, it } from "vitest"
import { encode } from "next-auth/jwt"

const TEST_SECRET =
  "audit-test-nextauth-secret-min-32-chars-long!!"

describe("decodeSessionToken", () => {
  let decodeSessionToken: typeof import("@/lib/session-token").decodeSessionToken

  beforeAll(async () => {
    process.env.NEXTAUTH_SECRET = TEST_SECRET
    ;({ decodeSessionToken } = await import("@/lib/session-token"))
  })

  it("returns sub for a valid NextAuth JWT", async () => {
    const token = await encode({
      token: { sub: "user-abc-123" },
      secret: TEST_SECRET,
    })
    const decoded = await decodeSessionToken(token)
    expect(decoded).toEqual({ sub: "user-abc-123" })
  })

  it("returns null for invalid token", async () => {
    expect(await decodeSessionToken("not-a-jwt")).toBeNull()
  })

  it("returns null when token was signed with another secret", async () => {
    const token = await encode({
      token: { sub: "user-xyz" },
      secret: "other-secret-at-least-32-characters-long!!",
    })
    expect(await decodeSessionToken(token)).toBeNull()
  })
})
