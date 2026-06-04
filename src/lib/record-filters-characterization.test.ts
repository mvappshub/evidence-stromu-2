import { describe, expect, it } from "vitest"
import type { RecordsFilterParams } from "@/lib/records-filter-definition"
import { RECORD_FILTER_SPECS } from "@/lib/record-filter-registry"
import {
  formatActiveRecordFilterLabels,
  uiFiltersToRecordsParams,
} from "@/lib/record-filters-client"
import {
  buildRecordsWhere,
  parseRecordsFilterParams,
  recordsFilterParamsToSearchParams,
} from "@/lib/records-query"
import { parseInputDate } from "@/lib/server-date"

const USER_ID = "user-char-test"

const emptyUi = {
  searchQuery: "",
  filterSpecies: "",
  filterLocality: "",
  dateFrom: null,
  dateTo: null,
  hasNoteFilter: false,
  noReminderFilter: false,
} as const

/** Current behavior: parse + uiFilters always materialize every filter key. */
function inactiveFilterParams(): RecordsFilterParams {
  return {
    search: null,
    species: null,
    locality: null,
    dateFrom: null,
    dateTo: null,
    hasNote: false,
    noReminder: false,
  }
}

function paramsWith(
  overrides: Partial<RecordsFilterParams>
): RecordsFilterParams {
  return { ...inactiveFilterParams(), ...overrides }
}

function specFor(apiKey: (typeof RECORD_FILTER_SPECS)[number]["apiKey"]) {
  const spec = RECORD_FILTER_SPECS.find((s) => s.apiKey === apiKey)
  if (!spec) throw new Error(`missing spec: ${apiKey}`)
  return spec
}

describe("record filters characterization (per apiKey)", () => {
  describe("search", () => {
    const spec = specFor("search")

    it("parseRecordsFilterParams reads query param", () => {
      const params = new URLSearchParams({ search: "lípa" })
      expect(parseRecordsFilterParams(params)).toEqual(
        paramsWith({ search: "lípa" })
      )
    })

    it("uiFiltersToRecordsParams maps searchQuery", () => {
      expect(
        uiFiltersToRecordsParams({ ...emptyUi, searchQuery: "  dub  " })
      ).toEqual(paramsWith({ search: "  dub  " }))
      expect(uiFiltersToRecordsParams({ ...emptyUi, searchQuery: "" })).toEqual(
        inactiveFilterParams()
      )
    })

    it("recordsFilterParamsToSearchParams serializes active search", () => {
      const qs = recordsFilterParamsToSearchParams({ search: "lípa" })
      expect(qs.get(spec.queryParam)).toBe("lípa")
    })

    it("buildRecordsWhere applies OR contains on speciesLatin, locality, note", () => {
      expect(buildRecordsWhere(USER_ID, { search: "lípa" })).toEqual({
        createdById: USER_ID,
        OR: [
          { speciesLatin: { contains: "lípa" } },
          { locality: { contains: "lípa" } },
          { note: { contains: "lípa" } },
        ],
      })
    })

    it("formatActiveRecordFilterLabels when searchQuery set", () => {
      expect(
        formatActiveRecordFilterLabels({ ...emptyUi, searchQuery: "lípa" })
      ).toEqual(['Hledání: "lípa"'])
    })
  })

  describe("species", () => {
    const spec = specFor("species")

    it("parseRecordsFilterParams", () => {
      const params = new URLSearchParams({ species: "Quercus robur" })
      expect(parseRecordsFilterParams(params)).toEqual(
        paramsWith({ species: "Quercus robur" })
      )
    })

    it("uiFiltersToRecordsParams maps filterSpecies", () => {
      expect(
        uiFiltersToRecordsParams({ ...emptyUi, filterSpecies: "Tilia" })
      ).toEqual(paramsWith({ species: "Tilia" }))
    })

    it("recordsFilterParamsToSearchParams", () => {
      const qs = recordsFilterParamsToSearchParams({ species: "Tilia" })
      expect(qs.get(spec.queryParam)).toBe("Tilia")
    })

    it("buildRecordsWhere exact match on speciesLatin", () => {
      expect(buildRecordsWhere(USER_ID, { species: "Tilia cordata" })).toEqual({
        createdById: USER_ID,
        speciesLatin: "Tilia cordata",
      })
    })

    it("formatActiveRecordFilterLabels", () => {
      expect(
        formatActiveRecordFilterLabels({ ...emptyUi, filterSpecies: "Tilia" })
      ).toEqual(["Druh: Tilia"])
    })
  })

  describe("locality", () => {
    const spec = specFor("locality")

    it("parseRecordsFilterParams", () => {
      const params = new URLSearchParams({ locality: "Brno" })
      expect(parseRecordsFilterParams(params)).toEqual(
        paramsWith({ locality: "Brno" })
      )
    })

    it("uiFiltersToRecordsParams maps filterLocality", () => {
      expect(
        uiFiltersToRecordsParams({ ...emptyUi, filterLocality: "Praha 6" })
      ).toEqual(paramsWith({ locality: "Praha 6" }))
    })

    it("recordsFilterParamsToSearchParams", () => {
      const qs = recordsFilterParamsToSearchParams({ locality: "Brno" })
      expect(qs.get(spec.queryParam)).toBe("Brno")
    })

    it("buildRecordsWhere contains on locality", () => {
      expect(buildRecordsWhere(USER_ID, { locality: "Brno" })).toEqual({
        createdById: USER_ID,
        locality: { contains: "Brno" },
      })
    })

    it("formatActiveRecordFilterLabels", () => {
      expect(
        formatActiveRecordFilterLabels({ ...emptyUi, filterLocality: "Brno" })
      ).toEqual(["Lokalita: Brno"])
    })
  })

  describe("dateFrom", () => {
    const spec = specFor("dateFrom")
    const dateFrom = "2022-01-15"

    it("parseRecordsFilterParams", () => {
      const params = new URLSearchParams({ dateFrom })
      expect(parseRecordsFilterParams(params)).toEqual(paramsWith({ dateFrom }))
    })

    it("uiFiltersToRecordsParams maps dateFrom", () => {
      expect(uiFiltersToRecordsParams({ ...emptyUi, dateFrom })).toEqual(
        paramsWith({ dateFrom })
      )
      expect(uiFiltersToRecordsParams({ ...emptyUi, dateFrom: null })).toEqual(
        inactiveFilterParams()
      )
    })

    it("recordsFilterParamsToSearchParams", () => {
      const qs = recordsFilterParamsToSearchParams({ dateFrom })
      expect(qs.get(spec.queryParam)).toBe(dateFrom)
    })

    it("buildRecordsWhere gte on plantedAt", () => {
      expect(buildRecordsWhere(USER_ID, { dateFrom }).plantedAt).toEqual({
        gte: parseInputDate(dateFrom),
      })
    })

    it("formatActiveRecordFilterLabels", () => {
      expect(
        formatActiveRecordFilterLabels({ ...emptyUi, dateFrom })
      ).toEqual([`Od: ${dateFrom}`])
    })
  })

  describe("dateTo", () => {
    const spec = specFor("dateTo")
    const dateTo = "2024-12-31"

    it("parseRecordsFilterParams", () => {
      const params = new URLSearchParams({ dateTo })
      expect(parseRecordsFilterParams(params)).toEqual(paramsWith({ dateTo }))
    })

    it("uiFiltersToRecordsParams maps dateTo", () => {
      expect(uiFiltersToRecordsParams({ ...emptyUi, dateTo })).toEqual(
        paramsWith({ dateTo })
      )
    })

    it("recordsFilterParamsToSearchParams", () => {
      const qs = recordsFilterParamsToSearchParams({ dateTo })
      expect(qs.get(spec.queryParam)).toBe(dateTo)
    })

    it("buildRecordsWhere lte on plantedAt", () => {
      expect(buildRecordsWhere(USER_ID, { dateTo }).plantedAt).toEqual({
        lte: parseInputDate(dateTo),
      })
    })

    it("formatActiveRecordFilterLabels", () => {
      expect(formatActiveRecordFilterLabels({ ...emptyUi, dateTo })).toEqual([
        `Do: ${dateTo}`,
      ])
    })
  })

  describe("dateFrom + dateTo together", () => {
    const dateFrom = "2022-01-15"
    const dateTo = "2024-12-31"

    it("buildRecordsWhere merges gte and lte on plantedAt", () => {
      expect(
        buildRecordsWhere(USER_ID, paramsWith({ dateFrom, dateTo })).plantedAt
      ).toEqual({
        gte: parseInputDate(dateFrom),
        lte: parseInputDate(dateTo),
      })
    })

    it("parseRecordsFilterParams with both query params", () => {
      const params = new URLSearchParams({ dateFrom, dateTo })
      expect(parseRecordsFilterParams(params)).toEqual(
        paramsWith({ dateFrom, dateTo })
      )
    })
  })

  describe("hasNote", () => {
    const spec = specFor("hasNote")

    it("parseRecordsFilterParams true only when query param is true", () => {
      expect(
        parseRecordsFilterParams(new URLSearchParams({ hasNote: "true" }))
      ).toEqual(paramsWith({ hasNote: true }))
      expect(
        parseRecordsFilterParams(new URLSearchParams({ hasNote: "false" }))
      ).toEqual(paramsWith({ hasNote: false }))
      expect(parseRecordsFilterParams(new URLSearchParams())).toEqual(
        inactiveFilterParams()
      )
    })

    it("uiFiltersToRecordsParams maps hasNoteFilter", () => {
      expect(
        uiFiltersToRecordsParams({ ...emptyUi, hasNoteFilter: true })
      ).toEqual(paramsWith({ hasNote: true }))
      expect(
        uiFiltersToRecordsParams({ ...emptyUi, hasNoteFilter: false })
      ).toEqual(paramsWith({ hasNote: false }))
    })

    it("recordsFilterParamsToSearchParams omits param when false", () => {
      expect(recordsFilterParamsToSearchParams({ hasNote: false }).has(spec.queryParam)).toBe(
        false
      )
      expect(
        recordsFilterParamsToSearchParams({ hasNote: true }).get(spec.queryParam)
      ).toBe("true")
    })

    it("buildRecordsWhere note not null when true, omitted when false", () => {
      expect(buildRecordsWhere(USER_ID, { hasNote: true })).toEqual({
        createdById: USER_ID,
        note: { not: null },
      })
      expect(buildRecordsWhere(USER_ID, { hasNote: false }).note).toBeUndefined()
    })

    it("formatActiveRecordFilterLabels only when filter active", () => {
      expect(
        formatActiveRecordFilterLabels({ ...emptyUi, hasNoteFilter: true })
      ).toEqual(["S poznámkou"])
      expect(formatActiveRecordFilterLabels(emptyUi)).toEqual([])
    })
  })

  describe("noReminder", () => {
    const spec = specFor("noReminder")

    it("parseRecordsFilterParams", () => {
      expect(
        parseRecordsFilterParams(new URLSearchParams({ noReminder: "true" }))
      ).toEqual(paramsWith({ noReminder: true }))
    })

    it("uiFiltersToRecordsParams maps noReminderFilter", () => {
      expect(
        uiFiltersToRecordsParams({ ...emptyUi, noReminderFilter: true })
      ).toEqual(paramsWith({ noReminder: true }))
    })

    it("recordsFilterParamsToSearchParams", () => {
      expect(
        recordsFilterParamsToSearchParams({ noReminder: true }).get(
          spec.queryParam
        )
      ).toBe("true")
    })

    it("buildRecordsWhere reminders none when true", () => {
      expect(buildRecordsWhere(USER_ID, { noReminder: true })).toEqual({
        createdById: USER_ID,
        reminders: { none: {} },
      })
      expect(buildRecordsWhere(USER_ID, { noReminder: false }).reminders).toBeUndefined()
    })

    it("formatActiveRecordFilterLabels", () => {
      expect(
        formatActiveRecordFilterLabels({ ...emptyUi, noReminderFilter: true })
      ).toEqual(["Bez připomínky"])
    })
  })

  describe("round-trip UI → params → query string (all keys)", () => {
    it("preserves active filters through client pipeline", () => {
      const ui = {
        searchQuery: "dub",
        filterSpecies: "Quercus",
        filterLocality: "Praha",
        dateFrom: "2020-01-01",
        dateTo: "2024-01-01",
        hasNoteFilter: true,
        noReminderFilter: true,
      }
      const params = uiFiltersToRecordsParams(ui)
      const qs = recordsFilterParamsToSearchParams(params)
      expect(parseRecordsFilterParams(qs)).toEqual(params)
      expect(buildRecordsWhere(USER_ID, params).createdById).toBe(USER_ID)
    })
  })
})
