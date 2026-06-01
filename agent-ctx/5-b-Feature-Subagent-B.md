# Task 5-b — Feature Subagent B Work Record

## Task: Activity Log / Recent Changes Panel + Quick Date-Range Filter with Presets

### Feature 1: Activity Log / Recent Changes Panel

**Backend:**
- Updated `prisma/schema.prisma`:
  - Added `ActivityLog` model with fields: id (uuid), action (create/update/delete/ack), entityType (record/reminder), entityId, details (JSON string), userId, createdAt
  - Added `activityLogs ActivityLog[]` relation to User model
- Ran `bun run db:push` to sync schema
- Created `/home/z/my-project/src/app/api/activity-log/route.ts`:
  - GET endpoint returning last 50 activities for current user (configurable via `?limit=N`)
  - Returns `{ activities: [{ id, action, entityType, entityId, details, createdAt, userName }] }`
  - Includes user relation for userName display
  - Protected with requireAuth()
- Added activity logging to existing API routes:
  - `POST /api/records` — logs "create" action with speciesLatin and recordNumber
  - `PATCH /api/records/[n]` — logs "update" action with changedFields
  - `DELETE /api/records/[n]` — logs "delete" action with recordNumber and speciesLatin
  - `POST /api/reminders` — logs "create" for reminder with recordNumber, text, mode
  - `POST /api/reminders/[id]/ack` — logs "ack" action with recordNumber and text

**Frontend:**
- Created `/home/z/my-project/src/components/ActivityLog.tsx`:
  - Popover panel triggered by Clock icon button in AppShell toolbar
  - Scrollable list of recent activities (max 50)
  - Each entry: action icon (green +/blue pencil/red trash/emerald check), entity description, time ago in Czech, user name
  - Uses TanStack Query with 30s stale time
  - Czech labels: "Aktivita" header, "před X min/hod/dny", "Vytvořeno", "Upraveno", "Smazáno", "Připomínka vyřízena"
  - Entity descriptions parsed from details JSON (e.g. "Záznam #5 — Quercus robur")
- Updated `/home/z/my-project/src/components/AppShell.tsx`:
  - Imported ActivityLog component
  - Added between StatisticsPanel and KeyboardShortcuts

### Feature 2: Quick Date-Range Filter with Presets

**Backend:**
- Updated `GET /api/records` to accept `dateFrom` and `dateTo` query params (ISO date strings)
  - Adds `plantedAt: { gte: dateFrom, lte: dateTo }` to Prisma where clause
- Updated `GET /api/records/export` to accept `dateFrom` and `dateTo` params
- Updated `GET /api/records/filters` to accept `dateFrom` and `dateTo` params (now uses NextRequest)

**Frontend:**
- Updated `src/store/useUiStore.ts`:
  - Added `dateFrom: string | null`, `dateTo: string | null`
  - Added `setDateFrom`, `setDateTo`, `clearDateRange` actions
- Created `/home/z/my-project/src/components/table/DateRangePicker.tsx`:
  - Popover with "📅 Období" button (green-themed when active)
  - Left sidebar with preset buttons: "Tento měsíc", "Tento rok", "Posledních 30 dní", "Posledních 90 dní", "Minulý rok", "Vše" (clear)
  - Right side with two Calendar pickers (Od/Do)
  - Active range shown as date text in button
  - X button to clear date range
  - Uses date-fns for date calculations
- Updated `/home/z/my-project/src/components/table/RecordsTable.tsx`:
  - Added DateRangePicker to filter bar after locality select
  - Passes dateFrom/dateTo in all API query params (records, filters, export)
  - Filter query key includes date range for proper cache invalidation
  - Resets pagination when date range changes
  - Export buttons include dateFrom/dateTo params

### Lint & Verification
- Lint: 0 errors, 3 pre-existing warnings (react-hooks/incompatible-library)
- Dev server compiles and runs correctly
- All API endpoints responding properly
