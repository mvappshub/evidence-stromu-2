import { describe, expect, it } from "vitest"
import { buildRecordsWhere } from "@/lib/records-query"
import { parseInputDate } from "@/lib/server-date"

const USER_A = "user-a-1111"
const USER_B = "user-b-2222"

describe("buildRecordsWhere", () => {
  it("always scopes records to the given userId", () => {
    const where = buildRecordsWhere(USER_A, {})
    expect(where.createdById).toBe(USER_A)

    const withFilters = buildRecordsWhere(USER_B, {
      search: "quercus",
      species: "Quercus",
      locality: "Praha",
      dateFrom: "2020-01-01",
      dateTo: "2024-12-31",
      hasNote: true,
      noReminder: true,
    })
    expect(withFilters.createdById).toBe(USER_B)
  })

  it("returns only createdById when filters are empty", () => {
    expect(buildRecordsWhere(USER_A, {})).toEqual({
      createdById: USER_A,
    })
  })

  it("applies species as exact match on speciesLatin", () => {
    expect(
      buildRecordsWhere(USER_A, { species: "Acer platanoides" })
    ).toEqual({
      createdById: USER_A,
      speciesLatin: "Acer platanoides",
    })
  })

  it("applies locality as contains filter", () => {
    expect(buildRecordsWhere(USER_A, { locality: "Brno" })).toEqual({
      createdById: USER_A,
      locality: { contains: "Brno" },
    })
  })

  it("applies search as OR across speciesLatin, locality, and note", () => {
    expect(buildRecordsWhere(USER_A, { search: "lípa" })).toEqual({
      createdById: USER_A,
      OR: [
        { speciesLatin: { contains: "lípa" } },
        { locality: { contains: "lípa" } },
        { note: { contains: "lípa" } },
      ],
    })
  })

  it("applies dateFrom and dateTo on plantedAt using parseInputDate", () => {
    const dateFrom = "2022-03-01"
    const dateTo = "2022-06-30"
    const where = buildRecordsWhere(USER_A, { dateFrom, dateTo })

    expect(where.createdById).toBe(USER_A)
    expect(where.plantedAt).toEqual({
      gte: parseInputDate(dateFrom),
      lte: parseInputDate(dateTo),
    })
  })

  it("applies only gte when dateFrom is set", () => {
    const dateFrom = "2021-01-01"
    expect(buildRecordsWhere(USER_A, { dateFrom }).plantedAt).toEqual({
      gte: parseInputDate(dateFrom),
    })
  })

  it("applies only lte when dateTo is set", () => {
    const dateTo = "2023-12-31"
    expect(buildRecordsWhere(USER_A, { dateTo }).plantedAt).toEqual({
      lte: parseInputDate(dateTo),
    })
  })

  it("does not add plantedAt when date strings are absent", () => {
    const where = buildRecordsWhere(USER_A, {})
    expect(where.plantedAt).toBeUndefined()
  })

  it("applies hasNote filter", () => {
    expect(buildRecordsWhere(USER_A, { hasNote: true })).toEqual({
      createdById: USER_A,
      note: { not: null },
    })
  })

  it("ignores hasNote when false", () => {
    const where = buildRecordsWhere(USER_A, { hasNote: false })
    expect(where.note).toBeUndefined()
  })

  it("applies noReminder filter", () => {
    expect(buildRecordsWhere(USER_A, { noReminder: true })).toEqual({
      createdById: USER_A,
      reminders: { none: {} },
    })
  })

  it("combines multiple filters while keeping user scope", () => {
    const where = buildRecordsWhere(USER_A, {
      species: "Tilia",
      hasNote: true,
      noReminder: true,
    })
    expect(where).toEqual({
      createdById: USER_A,
      speciesLatin: "Tilia",
      note: { not: null },
      reminders: { none: {} },
    })
  })
})
