import { beforeEach, describe, expect, it, vi } from "vitest"
import { compare } from "bcryptjs"

vi.mock("bcryptjs", () => ({
  compare: vi.fn(),
}))

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
    },
  },
}))

import { db } from "@/lib/db"
import { loginUser } from "@/lib/login-user"

const mockedCompare = vi.mocked(compare)
const mockedFindUnique = vi.mocked(db.user.findUnique)

describe("loginUser", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns missing_credentials when email or password is empty", async () => {
    expect(await loginUser(undefined, "x")).toEqual({
      ok: false,
      reason: "missing_credentials",
    })
    expect(await loginUser("a@b.cz", "")).toEqual({
      ok: false,
      reason: "missing_credentials",
    })
    expect(mockedFindUnique).not.toHaveBeenCalled()
  })

  it("returns invalid_credentials when user does not exist", async () => {
    mockedFindUnique.mockResolvedValue(null)
    const result = await loginUser("missing@example.com", "secret")
    expect(result).toEqual({ ok: false, reason: "invalid_credentials" })
  })

  it("returns invalid_credentials when password does not match", async () => {
    mockedFindUnique.mockResolvedValue({
      id: "u1",
      email: "user@example.com",
      name: "User",
      passwordHash: "hash",
    } as never)
    vi.mocked(compare).mockResolvedValue(false as never)
    const result = await loginUser("user@example.com", "wrong")
    expect(result).toEqual({ ok: false, reason: "invalid_credentials" })
    expect(mockedCompare).toHaveBeenCalledWith("wrong", "hash")
  })

  it("returns user on valid credentials", async () => {
    mockedFindUnique.mockResolvedValue({
      id: "u1",
      email: "user@example.com",
      name: "Test",
      passwordHash: "hash",
    } as never)
    vi.mocked(compare).mockResolvedValue(true as never)
    const result = await loginUser("user@example.com", "good")
    expect(result).toEqual({
      ok: true,
      user: { id: "u1", email: "user@example.com", name: "Test" },
    })
  })
})
