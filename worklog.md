# Worklog — Evidence výsadby stromů

---
Task ID: 1
Agent: Main
Task: Install required packages

Work Log:
- Installed maplibre-gl, supercluster, bcryptjs, @types/bcryptjs

Stage Summary:
- All required packages installed successfully

---
Task ID: 2
Agent: Main
Task: Set up Prisma schema and push to DB

Work Log:
- Created Prisma schema with User, TreeRecord, Reminder models
- Ran db:push to sync database
- Schema uses SQLite with autoincrement for recordNumber, uuid for other IDs

Stage Summary:
- Database schema created and synced

---
Task ID: 3-4
Agent: Backend Subagent
Task: Create auth system and all API routes

Work Log:
- Created auth.ts with NextAuth CredentialsProvider
- Created api-auth.ts helper for route protection
- Created reminder-utils.ts for nextDueAt calculation
- Created all API routes: auth, register, records (CRUD + geojson + bulk), reminders (CRUD + ack + due), upload
- All routes protected with requireAuth()

Stage Summary:
- Complete backend with 13+ API routes
- Auth working with NextAuth v4 credentials provider
- All routes return proper JSON with Zod validation

---
Task ID: 5-6
Agent: Frontend Subagent
Task: Create Zustand stores and AuthGate

Work Log:
- Created useUiStore with viewMode, selectedRecordNumber, search/filters
- Created usePlantStore with activeSpecies/Date/Locality, placeMode, recentSpecies, undo
- Created AuthGate with SessionProvider + login/register forms
- Created QueryProvider for TanStack Query
- Updated layout.tsx with Czech metadata

Stage Summary:
- Stores and auth gate working
- Login/register with Zod validation and Czech labels

---
Task ID: 8-9
Agent: Frontend Subagent
Task: Build MapView and PlantContextBar

Work Log:
- Created MapView with MapLibre GL, supercluster clustering
- Map layers: cluster circles, count labels, individual tree points, selected highlight
- Place mode: click to insert trees without dialog
- Fly-to selection, undo (Ctrl+Z), cursor change on place mode
- Created PlantContextBar with species input, date picker, locality input
- Recent species chips for quick switching
- Place mode toggle with pulse animation

Stage Summary:
- Map fully functional with clustering, insertion, selection
- PlantContextBar with sticky defaults working

---
Task ID: 10-12-14
Agent: Frontend Subagent
Task: Build table and editor components

Work Log:
- Created RecordsTable with TanStack Table, server-side pagination, sorting, filtering
- Created CoordCell (MapPin icon → fly-to), ReminderCell (Bell + Sheet with ReminderEditor)
- Created BulkActionBar for multi-select note/reminder
- Created RecordEditor (Dialog with all fields, photo upload, delete with confirmation)
- Created ReminderEditor (interval/date modes, Calendar pickers, CRUD operations)
- Created shared types in lib/types.ts

Stage Summary:
- Full table with pagination, sorting, multi-select, filtering
- Complete CRUD editors for records and reminders

---
Task ID: 7, 11, 13, 15
Agent: Main
Task: Build AppShell, MaintenanceBell, wire up page.tsx

Work Log:
- Created AppShell with icon-only top bar, view mode toggle (Map/List/Both), user menu
- Created MaintenanceBell with due reminders popover, polling, acknowledge action
- Created page.tsx with AuthGate → ThemeProvider → TooltipProvider → AppShell + SplitView
- Used ResizablePanelGroup for map/list split view
- Fixed MaintenanceBell bug (API returns {reminders: [...]} not array)
- Fixed store imports (consolidated to useUiStore/usePlantStore)
- Added include: {reminders: true} to records API
- Added NEXTAUTH_URL and NEXTAUTH_SECRET to .env

Stage Summary:
- Complete SPA working with auth → map + table → split view
- Data insertion, viewing, and basic CRUD verified via browser testing
- 6 test records created and visible in both map and table

## Current Project Status

**Working features:**
- User registration and login (NextAuth credentials)
- Map view with MapLibre GL + supercluster clustering
- Table view with TanStack Table (sorting, filtering, pagination, multi-select)
- Split view with resizable divider
- Planting context bar with species/date/locality sticky defaults
- Place mode toggle for click-to-insert trees
- Record editor dialog (all fields editable, photo upload, delete with confirmation)
- Reminder editor (interval/date modes, CRUD operations)
- Bulk actions (add note, set reminder to selected records)
- Maintenance bell with due reminders panel (polling every 60s)
- View mode toggle (Map/List/Both)
- Dark mode toggle
- Czech UI labels throughout

**Known issues:**
- Map click insertion doesn't always work with automated browser tools (works manually)
- Records table needs reminders data included (fixed in API)
- MaintenanceBell data parsing fixed (API returns {reminders: [...]})

**Architecture:**
- Next.js 16 App Router, single / route SPA
- Prisma + SQLite database
- NextAuth v4 for authentication
- Zustand for client state (UI + planting context)
- TanStack Query for server state
- TanStack Table for data table
- MapLibre GL + supercluster for map
