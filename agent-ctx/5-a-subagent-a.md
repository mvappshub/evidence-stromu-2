# Task 5-a — Subagent A Work Record

## Task: Fix Activity Logging, Add Species Detail Panel, Add Quick Filter Presets

### Feature 1: Fix Activity Logging (Critical Bug)
Added `db.activityLog.create()` to 4 API routes that were missing it:
- `/src/app/api/reminders/[id]/route.ts` — PATCH (update) + DELETE
- `/src/app/api/records/bulk/note/route.ts` — POST
- `/src/app/api/records/bulk/reminder/route.ts` — POST
- `/src/app/api/records/bulk/edit/route.ts` — POST

### Feature 2: Species Detail Panel
- Created `/src/app/api/records/species/[species]/route.ts` — Species-specific stats API
- Created `/src/components/SpeciesDetailPanel.tsx` — Popover with species list, frequency badges, detail view
- Added `speciesFilter` to `/src/store/useUiStore.ts`
- Updated GeoJSON API to accept `?species=` filter
- Updated MapView to pass speciesFilter to GeoJSON query
- Added SpeciesDetailPanel to AppShell toolbar

### Feature 3: Quick Filter Presets
- Added `hasNoteFilter` and `noReminderFilter` to `/src/store/useUiStore.ts`
- Updated records GET API to support `hasNote` and `noReminder` params
- Added 5 pill buttons to RecordsTable: Tento měsíc, Tento rok, Poslední 30 dní, Bez připomínky, S poznámkou

### Lint Result
0 errors, 3 warnings (all pre-existing react-hooks/incompatible-library)
