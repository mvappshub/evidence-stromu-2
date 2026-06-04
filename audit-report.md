# Audit připravenosti codebase

**Datum auditu:** 2026-06-04  
**Workspace:** `c:\Users\marti\Desktop\evidence stromů\evidence-stromu-2`  
**Revize:** `f603c3a` (větev `main`)  
**Provedeno:** read-only audit; jediný zápis = tento soubor + artefakty z tooling (`npm install`, test/build).

---

## 1. Verdikt jednou větou

**NENÍ PŘIPRAVENO** — pracovní strom má 37 necommitnutých položek, oficiální `npm run build` selhává (Prisma EPERM), `npm audit` hlásí 8 high zranitelností a CI neověřuje produkční build ani smoke testy.

---

## 2. Souhrnná tabulka

| ID | Položka | Verdikt | Důkaz → |
|----|---------|---------|---------|
| P1 | Čistý working tree | **FAIL** | viz §6/P1 |
| P2 | `.env.example` vs kód | **PASS** | viz §6/P2 |
| P3 | CI, příkazy, brány | **PASS** | viz §6/P3 |
| B1 | Instalace závislostí | **PASS** | viz §6/B1 |
| B2 | Deterministická instalace (lockfile) | **FAIL** | viz §6/B2 |
| B3 | Lokální spuštění (dev) | **UNVERIFIED** | viz §6/B3 |
| B4 | Production build | **FAIL** | viz §6/B4 |
| B5 | CI na každý PR | **PASS** | viz §6/B5 |
| B6 | Merge blokován při failu CI | **UNVERIFIED** | viz §6/B6 |
| B7 | Žádné tiché vypínání testů/lintu | **PASS** | viz §6/B7 |
| B8 | Testy jedním příkazem | **PASS** | viz §6/B8 |
| B9 | Testy v CI | **PASS** | viz §6/B9 |
| B10 | Flaky check (3× suite) | **PASS** | viz §6/B10 |
| B11 | Lint / typecheck v CI + lokálně | **PASS** | viz §6/B11 |
| B12 | Secret scan (základní grep) | **PASS** | viz §6/B12 |
| B13 | Dependency / security scan | **FAIL** | viz §6/B13 |
| B14 | Známé kritické bugy v kódu | **PASS** | viz §6/B14 |
| B15 | Migrace bezpečné | **PASS** | viz §6/B15 |
| B16 | Auth otestované | **PASS** | viz §6/B16 |
| D1 | Kritické moduly ↔ testy | **FAIL** | viz §6/D1 |
| D2 | Coverage práh | **UNVERIFIED** | viz §6/D2 |
| D3 | API kontrakty / validace | **PASS** | viz §6/D3 |
| D4 | Hranice vrstev | **PASS** | viz §6/D4 |
| D5 | Zakázané importy automaticky | **FAIL** | viz §6/D5 |
| D6 | Cyklické závislosti | **UNVERIFIED** | viz §6/D6 |
| D7 | Duplicita business pravidel | **UNVERIFIED** | viz §6/D7 |
| D8 | Obří funkce / složitost | **FAIL** | viz §6/D8 |
| D9 | FIXME / HACK / XXX | **PASS** | viz §6/D9 |
| D10 | Mrtvý kód | **UNVERIFIED** | viz §6/D10 |
| D11 | Dohledatelnost chyb (logování) | **PASS** | viz §6/D11 |
| D12 | Deploy & rollback postup | **PASS** | viz §6/D12 |
| D13 | Čerstvost závislostí | **PASS** | viz §6/D13 |

---

## 3. Blokující nálezy (FAIL)

### P1 — Nečistý working tree
- **Dopad:** Audit a CI běží na jiném kódu než HEAD; riziko konfliktů při merge a nereprodukovatelné chyby.
- **Nejmenší oprava:** Commitnout nebo stashnout 37 položek (21 změněných, 2 smazané, 14 nových) před další implementací.

### B2 — Duální lockfile
- **Dopad:** CI používá `bun install --frozen-lockfile`, lokálně audit použil `npm install`; dva trackované lockfile (`bun.lock`, `package-lock.json`) zvyšují riziko rozdílných verzí závislostí.
- **Nejmenší oprava:** Zvolit jeden package manager, druhý lockfile odstranit z gitu a sjednotit dokumentaci + CI.

### B4 — `npm run build` neprojde
- **Dopad:** Produkční build skript (Prisma generate + Next standalone kopie) selže; nasazení podle README `bun run build` může padat stejně na `prisma generate`.
- **Nejmenší oprava:** Uvolnit zámek `query_engine-windows.dll.node` (ukončit procesy držící Prisma), ověřit build na Linux CI; případně přidat `build` do CI.

### B13 — npm audit: 8× high
- **Dopad:** Známé zranitelnosti v `next`, `prisma`/`effect`, `minimatch`, `defu`, `flatted`, `picomatch` a transitivních závislostech.
- **Nejmenší oprava:** `npm audit fix` (bez `--force` kde možné), plánovaný bump `next` na opravenou verzi dle advisories; znovu audit.

### Dluh označený FAIL (neblokuje verdikt, ale závažné)
- **D1:** 29 API route souborů, 0 route testů; 22 hooků, 0 hook testů.
- **D5:** Chybí automatická kontrola import hranic (dep-cruiser / eslint-plugin-import boundaries).
- **D8:** ESLint hlásí 67 varování (složitost, délka funkcí).

---

## 4. UNVERIFIED

| ID | Co chybělo | Co by bylo potřeba |
|----|------------|-------------------|
| B3 | `npm run dev` skončil `EADDRINUSE` na portu 3000 | Čistý port nebo jiný port; ověřit cold start od nuly |
| B6 | Branch protection není v repozitáři | Přístup k GitHub Settings / `gh api` pro required checks |
| D2 | V `package.json` není coverage threshold ani skript | Nastavit Vitest coverage + limit, pokud má být brána |
| D6 | Nástroj na cykly (madge, dependency-cruiser) nespuštěn | `npx madge --circular src` nebo ekvivalent |
| D7 | Systematická duplicita business pravidel | Manuální review / diff tooling |
| D10 | knip / vulture | `npx knip` v projektu |

---

## 5. Dluh (seřazeno dle závažnosti)

1. **Vysoká — API/hooks bez testů (D1):** 29× `route.ts`, 0× `*route*.test.ts`; 22 hooků, 0× `src/hooks/*.test.ts`. Jádro je pokryto v `src/lib/*.test.ts` (17 souborů, 142 testů).
2. **Vysoká — CI bez build a smoke (P3):** `.github/workflows/ci.yml` končí u unit testů; chybí `bun run build`, `test:smoke`, `db:migrate:deploy` v pipeline.
3. **Vysoká — ESLint složitost/délka (D8):** 67 warnings; nejhorší: `AuthGateInner` complexity 21, `ImportDialog` 297 řádků, `KeyboardShortcuts` complexity 26.
4. **Střední — Zastaralé závislosti (D13):** `prisma`/`@prisma/client` latest 7.8.0 vs 6.19.x; `eslint` latest 10.x; viz `npm outdated`.
5. **Střední — Volitelné env v kódu mimo example (P2):** `SMOKE_*` (`scripts/smoke-test.mjs`), `PRISMA_STUDIO_PORT` (`src/lib/prisma-studio-server.ts:3`).
6. **Nízká — Husky bez git v PATH při `npm install`:** `git command not found` v prepare skriptu (viz B1).
7. **Nízká — Žádný strukturovaný APM (D11):** pouze `console.error` v API routes, bez Sentry/pino.

---

## 6. PŘÍLOHA — DOSLOVNÉ VÝSTUPY

### P1 — Čistý working tree

```
$ "C:\Program Files\Git\bin\git.exe" status --porcelain
 M src/app/api/auth/login/route.ts
 M src/app/api/auth/me/route.ts
 M src/app/api/records/restore/route.ts
 M src/components/AppShell.tsx
 M src/components/AuthGate.tsx
 M src/components/AuthInitializer.tsx
 M src/components/BackupRestore.tsx
 M src/components/GlobalSearch.tsx
 M src/components/ImportDialog.tsx
 M src/components/UserProfileDialog.tsx
 M src/components/editors/ReminderEditor.tsx
 M src/components/table/BulkActionBar.tsx
 M src/components/table/RecordsTable.tsx
 M src/components/table/use-record-edit-draft.ts
 D src/components/ui/sheet.tsx
 M src/hooks/useImportRecords.ts
 M src/hooks/useMapInteractions.ts
 M src/hooks/useMapRecordMutations.ts
 M src/lib/api-auth.ts
 D src/lib/auth-interceptor.ts
 M src/store/useAuthStore.ts
?? src/components/editors/ExistingRemindersList.tsx
?? src/components/editors/ReminderForm.tsx
?? src/hooks/useAuthActions.ts
?? src/hooks/useBackupRestore.ts
?? src/hooks/useBulkRecordActions.ts
?? src/hooks/useImportDialogState.ts
?? src/hooks/useMapCursor.ts
?? src/hooks/useMapKeyboardShortcuts.ts
?? src/hooks/useMapMeasure.ts
?? src/hooks/useMapSelection.ts
?? src/hooks/useRecordsTableController.ts
?? src/hooks/useReminderActions.ts
?? src/lib/query-invalidation.test.ts
?? src/lib/query-invalidation.ts
?? src/lib/records/restore-backup.test.ts
?? src/lib/records/restore-backup.ts

$ ("C:\Program Files\Git\bin\git.exe" status --porcelain | Measure-Object -Line).Lines
37
```

exit code: 0

---

### P2 — `.env.example` vs kód

**Soubor `.env.example` (řádky 1–14):**

```
# SQLite — path is relative to prisma/ (same as Prisma CLI), file ends up at prisma/db/custom.db
DATABASE_URL="file:./db/custom.db"

# Auth — generate: openssl rand -base64 32
# If this value was ever committed to git, rotate NEXTAUTH_SECRET (invalidates old sessions).
NEXTAUTH_SECRET=change-me-to-a-long-random-string
NEXTAUTH_URL=http://localhost:3000

# Development: registration on unless ALLOW_REGISTRATION=false
# Production: registration off unless ALLOW_REGISTRATION=true
ALLOW_REGISTRATION=true

# Set to "1" to log Prisma SQL queries
# DEBUG_PRISMA=0
```

**Kód čte (výběr):**

- `src/lib/db.ts:13-29` — `DATABASE_URL`, fallback `prisma/db/custom.db`
- `src/lib/auth-config.ts:16-31` — `ALLOW_REGISTRATION`, `NEXTAUTH_SECRET` (min. 32 znaků, placeholder guard v produkci)
- `src/lib/db.ts:45` — `DEBUG_PRISMA === '1'`

**Volitelné proměnné v kódu, chybí v `.env.example`:** `SMOKE_BASE_URL`, `SMOKE_PASSWORD`, `SMOKE_EMAIL` (`scripts/smoke-test.mjs:4,32,44`); `PRISMA_STUDIO_PORT` (`src/lib/prisma-studio-server.ts:3`).

exit code: N/A (read-only)

---

### P3 — CI a příkazy

**`.github/workflows/ci.yml:1-32`:**

```yaml
name: CI

on:
  push:
    branches: [main, master]
  pull_request:

jobs:
  check:
    runs-on: ubuntu-latest
    env:
      NEXTAUTH_SECRET: ci-placeholder-nextauth-secret-min-32-chars
      DATABASE_URL: "file:./db/custom.db"
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Generate Prisma client
        run: bun run db:generate

      - name: Typecheck
        run: bun run typecheck

      - name: Lint
        run: bun run lint

      - name: Unit tests
        run: bun run test
```

**`package.json` skripty (výběr):** `lint`, `test` (`vitest run`), `typecheck`, `build`, `test:smoke`, `db:migrate:status`.

**README.md:10** — lokálně ekvivalent `npm run typecheck`, `lint`, `test`; CI používá Bun.

exit code: N/A

---

### B1 — Instalace

```
$ npm install

> evidence-stromu@0.3.0 prepare
> husky

git command not found
up to date in 1s

218 packages are looking for funding
  run `npm fund` for details
```

exit code: 0

**Poznámka auditu:** Nešlo o čistý clone (existující `node_modules`); lockfile po install nezměněn (`git status --porcelain package-lock.json bun.lock` → prázdný výstup).

---

### B2 — Lockfile

```
$ "C:\Program Files\Git\bin\git.exe" ls-files bun.lock package-lock.json pnpm-lock.yaml yarn.lock
bun.lock
package-lock.json
```

exit code: 0

---

### B3 — Spuštění dev serveru

```
$ npm run dev
(Start-Job, 15 s)

> evidence-stromu@0.3.0 dev
> next dev --webpack -p 3000

⨯ Failed to start server
Error: listen EADDRINUSE: address already in use :::3000
    at <unknown> (Error: listen EADDRINUSE: address already in use :::3000)
    at new Promise (<anonymous>) {
  code: 'EADDRINUSE',
  errno: -4091,
  syscall: 'listen',
  address: '::',
  port: 3000
}
```

```
$ Invoke-WebRequest http://localhost:3000 -UseBasicParsing -TimeoutSec 5
HTTP 200 len=16931
```

exit code: 0 (health check); dev příkaz selhal kvůli obsazenému portu

---

### B4 — Production build

**Oficiální skript `npm run build`:**

```
$ npm run build

> evidence-stromu@0.3.0 build
> prisma generate && next build --webpack && node -e "const fs=require('fs');fs.mkdirSync('.next/standalone/.next',{recursive:true});fs.cpSync('.next/static','.next/standalone/.next/static',{recursive:true,force:true});fs.cpSync('public','.next/standalone/public',{recursive:true,force:true});"

Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma
Error: 
EPERM: operation not permitted, rename 'C:\Users\marti\Desktop\evidence stromů\evidence-stromu-2\node_modules\.prisma\client\query_engine-windows.dll.node.tmp49744' -> 'C:\Users\marti\Desktop\evidence stromů\evidence-stromu-2\node_modules\.prisma\client\query_engine-windows.dll.node'
```

exit code: 1

**Doplňkový pokus (bez prisma generate v řetězci):**

```
$ npx next build --webpack
▲ Next.js 16.1.3 (webpack)
- Environments: .env

  Creating an optimized production build ...
✓ Compiled successfully in 6.5s
  Running TypeScript ...
  Collecting page data using 15 workers ...
  Generating static pages using 15 workers (0/28) ...
  Generating static pages using 15 workers (7/28) 
  Generating static pages using 15 workers (14/28) 
  Generating static pages using 15 workers (21/28) 
✓ Generating static pages using 15 workers (28/28) in 443.9ms
  Finalizing page optimization ...
  Collecting build traces ...

Route (app)
┌ ○ /
├ ○ /_not-found
├ ƒ /api
├ ƒ /api/activity-log
├ ƒ /api/auth/[...nextauth]
├ ƒ /api/auth/login
├ ƒ /api/auth/logout
├ ƒ /api/auth/me
├ ƒ /api/auth/profile
├ ƒ /api/dev/prisma-studio
├ ƒ /api/map/osm-trees
├ ƒ /api/records
├ ƒ /api/records/[n]
├ ƒ /api/records/backup
├ ƒ /api/records/bulk/delete
├ ƒ /api/records/bulk/edit
├ ƒ /api/records/bulk/note
├ ƒ /api/records/bulk/reminder
├ ƒ /api/records/export
├ ƒ /api/records/filters
├ ƒ /api/records/geojson
├ ƒ /api/records/import
├ ƒ /api/records/restore
├ ƒ /api/records/species/[species]
├ ƒ /api/records/stats
├ ƒ /api/register
├ ƒ /api/reminders
├ ƒ /api/reminders/[id]
├ ƒ /api/reminders/[id]/ack
├ ƒ /api/reminders/due
├ ƒ /api/upload
└ ○ /icon.svg


○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

exit code: 0 (pouze `next build`, ne celý `npm run build`)

---

### B5 — CI na PR

Viz doslovný úryvek v §6/P3: `on.pull_request` bez větvení — trigger na PR je přítomen.

exit code: N/A

---

### B6 — Branch protection

```
$ gh api repos/{owner}/{repo}/branches/main/protection
(nespouštěno — nastavení GitHub není v repozitáři; audit nemá ověřený přístup k branch protection)
```

exit code: N/A → **UNVERIFIED**

---

### B7 — Grep skip / disable

```
$ rg '\.(only|skip)\(|eslint-disable|@ts-ignore|@ts-expect-error' src
(no matches)

$ rg 'describe\.only|it\.only|test\.only|describe\.skip|it\.skip|test\.skip' .
(no matches)
```

exit code: 0 (rg návratová hodnota 1 = žádné shody)

---

### B8 — Unit testy

```
$ npm run test

> evidence-stromu@0.3.0 test
> vitest run


 RUN  v4.1.8 C:/Users/marti/Desktop/evidence stromů/evidence-stromu-2


 Test Files  17 passed (17)
      Tests  142 passed (142)
   Start at  10:03:42
   Duration  2.83s (transform 2.39s, setup 0ms, import 6.55s, tests 453ms, environment 4ms)
```

exit code: 0

---

### B9 — Testy v CI

Viz §6/P3 řádky 31–32: `run: bun run test`.

exit code: N/A

---

### B10 — Flaky check (3×)

```
$ npm run test
(... run 1 ...)
 Test Files  17 passed (17)
      Tests  142 passed (142)

$ npm run test
(... run 2 ...)
 Test Files  17 passed (17)
      Tests  142 passed (142)

$ npm run test
(... run 3 ...)
 Test Files  17 passed (17)
      Tests  142 passed (142)
```

exit code: 0 (všechny tři běhy)

---

### B11 — Lint a typecheck

```
$ npm run typecheck

> evidence-stromu@0.3.0 typecheck
> next typegen && tsc --noEmit -p tsconfig.typecheck.json

Generating route types...
✓ Types generated successfully
```

exit code: 0

```
$ npm run lint

> evidence-stromu@0.3.0 lint
> eslint .


C:\Users\marti\Desktop\evidence stromů\evidence-stromu-2\src\app\api\records\import\route.ts
  49:8  warning  Async function 'POST' has a complexity of 20. Maximum allowed is 15  complexity

C:\Users\marti\Desktop\evidence stromů\evidence-stromu-2\src\app\api\records\stats\route.ts
  5:8  warning  Async function 'GET' has too many lines (86). Maximum allowed is 80  max-lines-per-function

C:\Users\marti\Desktop\evidence stromů\evidence-stromu-2\src\app\api\reminders\[id]\route.ts
  78:1  warning  Function 'buildReminderPatchData' has a complexity of 18. Maximum allowed is 15  complexity

C:\Users\marti\Desktop\evidence stromů\evidence-stromu-2\src\components\ActivityLog.tsx
  14:3  warning  'Loader2' is defined but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars
  77:1  warning  Function 'TimelineEntry' has too many lines (85). Maximum allowed is 80    max-lines-per-function

C:\Users\marti\Desktop\evidence stromů\evidence-stromu-2\src\components\AppShell.tsx
  34:8  warning  Function 'AppShell' has too many lines (99). Maximum allowed is 80  max-lines-per-function

C:\Users\marti\Desktop\evidence stromů\evidence-stromu-2\src\components\AuthGate.tsx
  51:1  warning  Function 'AuthGateInner' has too many lines (244). Maximum allowed is 80  max-lines-per-function
  51:1  warning  Function 'AuthGateInner' has a complexity of 21. Maximum allowed is 15    complexity

C:\Users\marti\Desktop\evidence stromů\evidence-stromu-2\src\components\DataMenu.tsx
  3:10  warning  'useRef' is defined but never used. Allowed unused vars must match /^_/u       @typescript-eslint/no-unused-vars
  3:18  warning  'useCallback' is defined but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars
  3:31  warning  'useState' is defined but never used. Allowed unused vars must match /^_/u     @typescript-eslint/no-unused-vars

C:\Users\marti\Desktop\evidence stromů\evidence-stromu-2\src\components\GlobalSearch.tsx
  29:8  warning  Function 'GlobalSearch' has too many lines (128). Maximum allowed is 80  max-lines-per-function

C:\Users\marti\Desktop\evidence stromů\evidence-stromu-2\src\components\ImportDialog.tsx
  40:8  warning  Function 'ImportDialog' has too many lines (297). Maximum allowed is 80  max-lines-per-function
  40:8  warning  Function 'ImportDialog' has a complexity of 23. Maximum allowed is 15    complexity

C:\Users\marti\Desktop\evidence stromů\evidence-stromu-2\src\components\KeyboardShortcuts.tsx
  37:46  warning  Arrow function has a complexity of 26. Maximum allowed is 15  complexity

C:\Users\marti\Desktop\evidence stromů\evidence-stromu-2\src\components\MaintenanceBell.tsx
   4:35  warning  'addDays' is defined but never used. Allowed unused vars must match /^_/u       @typescript-eslint/no-unused-vars
   6:31  warning  'ExternalLink' is defined but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars
   6:45  warning  'X' is defined but never used. Allowed unused vars must match /^_/u             @typescript-eslint/no-unused-vars
  10:10  warning  'Separator' is defined but never used. Allowed unused vars must match /^_/u     @typescript-eslint/no-unused-vars
  37:8   warning  Function 'MaintenanceBell' has too many lines (156). Maximum allowed is 80      max-lines-per-function

C:\Users\marti\Desktop\evidence stromů\evidence-stromu-2\src\components\SpeciesDetailPanel.tsx
  51:8  warning  Function 'SpeciesDetailPanel' has too many lines (164). Maximum allowed is 80  max-lines-per-function

C:\Users\marti\Desktop\evidence stromů\evidence-stromu-2\src\components\StatisticsPanel.tsx
  28:8   warning  Function 'StatisticsPanel' has too many lines (141). Maximum allowed is 80  max-lines-per-function
  73:61  warning  'idx' is defined but never used. Allowed unused args must match /^_/u       @typescript-eslint/no-unused-vars

C:\Users\marti\Desktop\evidence stromů\evidence-stromu-2\src\components\UserProfileDialog.tsx
  39:8  warning  Function 'UserProfileDialog' has too many lines (153). Maximum allowed is 80  max-lines-per-function

C:\Users\marti\Desktop\evidence stromů\evidence-stromu-2\src\components\editors\ReminderEditor.tsx
  30:8  warning  Function 'ReminderEditor' has too many lines (86). Maximum allowed is 80  max-lines-per-function

C:\Users\marti\Desktop\evidence stromů\evidence-stromu-2\src\components\editors\ReminderForm.tsx
  40:8  warning  Function 'ReminderForm' has too many lines (183). Maximum allowed is 80  max-lines-per-function
  40:8  warning  Function 'ReminderForm' has a complexity of 16. Maximum allowed is 15    complexity

C:\Users\marti\Desktop\evidence stromů\evidence-stromu-2\src\components\map\MapOverlays.tsx
  46:8  warning  Function 'MapOverlays' has too many lines (159). Maximum allowed is 80  max-lines-per-function
  46:8  warning  Function 'MapOverlays' has a complexity of 21. Maximum allowed is 15    complexity

C:\Users\marti\Desktop\evidence stromů\evidence-stromu-2\src\components\map\MapPlaceSearch.tsx
  10:8  warning  Function 'MapPlaceSearch' has too many lines (190). Maximum allowed is 80  max-lines-per-function
  10:8  warning  Function 'MapPlaceSearch' has a complexity of 17. Maximum allowed is 15    complexity

C:\Users\marti\Desktop\evidence stromů\evidence-stromu-2\src\components\map\MapView.tsx
  25:8  warning  Function 'MapView' has too many lines (116). Maximum allowed is 80  max-lines-per-function

C:\Users\marti\Desktop\evidence stromů\evidence-stromu-2\src\components\map\PlantContextBar.tsx
  17:8  warning  Function 'PlantContextBar' has too many lines (132). Maximum allowed is 80  max-lines-per-function

C:\Users\marti\Desktop\evidence stromů\evidence-stromu-2\src\components\table\BulkActionBar.tsx
   70:8   warning  Function 'BulkActionBar' has too many lines (288). Maximum allowed is 80  max-lines-per-function
  115:25  warning  Compilation Skipped: Use of incompatible library
(... react-hooks/incompatible-library ...)

C:\Users\marti\Desktop\evidence stromů\evidence-stromu-2\src\components\table\CoordCell.tsx
  42:48  warning  'lng' is defined but never used. Allowed unused args must match /^_/u
  43:10  warning  'open' is assigned a value but never used. Allowed unused vars must match /^_/u
  43:16  warning  'setOpen' is assigned a value but never used. Allowed unused vars must match /^_/u

C:\Users\marti\Desktop\evidence stromů\evidence-stromu-2\src\components\table\DateRangePicker.tsx
   4:27  warning  'subMonths' is defined but never used. Allowed unused vars must match /^_/u
  56:8   warning  Function 'DateRangePicker' has too many lines (131). Maximum allowed is 80

C:\Users\marti\Desktop\evidence stromů\evidence-stromu-2\src\components\table\RecordsTable.tsx
  25:8   warning  Function 'RecordsTable' has too many lines (199). Maximum allowed is 80
  72:17  warning  Compilation Skipped: Use of incompatible library
(... react-hooks/incompatible-library ...)

C:\Users\marti\Desktop\evidence stromů\evidence-stromu-2\src\components\table\RecordsTableEditInput.tsx
  4:15  warning  'RecordEditDraft' is defined but never used. Allowed unused vars must match /^_/u

C:\Users\marti\Desktop\evidence stromů\evidence-stromu-2\src\components\table\RecordsTablePagination.tsx
  28:8  warning  Function 'RecordsTablePagination' has too many lines (83). Maximum allowed is 80

C:\Users\marti\Desktop\evidence stromů\evidence-stromu-2\src\components\table\RecordsTableToolbar.tsx
  47:8  warning  Function 'RecordsTableToolbar' has too many lines (148). Maximum allowed is 80

C:\Users\marti\Desktop\evidence stromů\evidence-stromu-2\src\components\table\records-table-columns.tsx
  32:8  warning  Function 'createRecordsTableColumns' has too many lines (228). Maximum allowed is 80

C:\Users\marti\Desktop\evidence stromů\evidence-stromu-2\src\components\ui\calendar.tsx
  14:1  warning  Function 'Calendar' has too many lines (157). Maximum allowed is 80

C:\Users\marti\Desktop\evidence stromů\evidence-stromu-2\src\hooks\useBulkRecordActions.ts
  17:8  warning  Function 'useBulkRecordActions' has too many lines (112). Maximum allowed is 80

C:\Users\marti\Desktop\evidence stromů\evidence-stromu-2\src\hooks\useImportDialogState.ts
  24:8  warning  Function 'useImportDialogState' has too many lines (112). Maximum allowed is 80

C:\Users\marti\Desktop\evidence stromů\evidence-stromu-2\src\hooks\useMapInit.ts
  15:8   warning  Function 'useMapInit' has too many lines (123). Maximum allowed is 80
  30:13  warning  Arrow function has too many lines (96). Maximum allowed is 80

C:\Users\marti\Desktop\evidence stromů\evidence-stromu-2\src\hooks\useMapRecordMutations.ts
  10:8  warning  Function 'useMapRecordMutations' has too many lines (101). Maximum allowed is 80

C:\Users\marti\Desktop\evidence stromů\evidence-stromu-2\src\hooks\useMapSelection.ts
  29:8  warning  Function 'useMapSelection' has too many lines (84). Maximum allowed is 80

C:\Users\marti\Desktop\evidence stromů\evidence-stromu-2\src\hooks\useMapTreeLayers.ts
  14:8  warning  Function 'useMapTreeLayers' has too many lines (175). Maximum allowed is 80

C:\Users\marti\Desktop\evidence stromů\evidence-stromu-2\src\hooks\useRecordsTableController.ts
  20:8  warning  Function 'useRecordsTableController' has too many lines (199). Maximum allowed is 80

C:\Users\marti\Desktop\evidence stromů\evidence-stromu-2\src\hooks\useReminderActions.ts
  24:8  warning  Function 'useReminderActions' has too many lines (115). Maximum allowed is 80

C:\Users\marti\Desktop\evidence stromů\evidence-stromu-2\src\lib\coords.ts
  35:7  warning  'FI0' is assigned a value but never used.
  36:7  warning  'LA0_FERRO' is assigned a value but never used.
  96:9  warning  'cosAz' is assigned a value but never used.

C:\Users\marti\Desktop\evidence stromů\evidence-stromu-2\src\lib\csv-import-rows.test.ts
  19:38  warning  Arrow function has too many lines (89). Maximum allowed is 80

C:\Users\marti\Desktop\evidence stromů\evidence-stromu-2\src\lib\import-records.ts
  34:8  warning  Async function 'importTreeRecords' has a complexity of 20. Maximum allowed is 15

C:\Users\marti\Desktop\evidence stromů\evidence-stromu-2\src\lib\record-filters-characterization.test.ts
  52:58  warning  Arrow function has too many lines (263). Maximum allowed is 80

C:\Users\marti\Desktop\evidence stromů\evidence-stromu-2\src\lib\records-query.test.ts
  8:31  warning  Arrow function has too many lines (100). Maximum allowed is 80

C:\Users\marti\Desktop\evidence stromů\evidence-stromu-2\src\lib\records-table-presets.test.ts
  24:59  warning  Arrow function has too many lines (148). Maximum allowed is 80

C:\Users\marti\Desktop\evidence stromů\evidence-stromu-2\src\lib\records\restore-backup.test.ts
  26:40  warning  Arrow function has too many lines (91). Maximum allowed is 80

C:\Users\marti\Desktop\evidence stromů\evidence-stromu-2\src\lib\records\restore-backup.ts
  48:8   warning  Function 'createRestoreBackupService' has too many lines (138). Maximum allowed is 80
  56:10  warning  Async function 'restoreBackup' has too many lines (129). Maximum allowed is 80

✖ 67 problems (0 errors, 67 warnings)
```

exit code: 0

---

### B12 — Secret scan (grep)

```
$ rg '(sk-|pk_live|pk_test|AKIA[0-9A-Z]{16}|ghp_[a-zA-Z0-9]{36}|BEGIN (RSA |OPENSSH )?PRIVATE KEY)' --glob '*.{ts,tsx,js,mjs,json,env*,yml,yaml,md}'
docs/ai-audit/00-baseline.md
  92:| Hardcoded `sk-`, `ghp_`, AWS klíče v `src/` | **Nenalezeno** (grep) |
```

Žádný nález v `src/`.

exit code: 0

---

### B13 — npm audit

```
$ npm audit
# npm audit report

ajv  <6.14.0
Severity: moderate
(...)

brace-expansion  <1.1.13 || >=2.0.0 <2.0.3
Severity: moderate
(...)

defu  <=6.1.4
Severity: high
(...)

effect  <3.20.0
Severity: high
(...)

flatted  <=3.4.1
Severity: high
(...)

minimatch  <=3.1.3 || 9.0.0 - 9.0.6
Severity: high
(...)

next  9.3.4-canary.0 - 16.3.0-canary.5
Severity: high
(...)

picomatch  <=2.3.1
Severity: high
(...)

postcss  <8.5.10
Severity: moderate
(...)

uuid  <11.1.1
Severity: moderate
(...)

13 vulnerabilities (5 moderate, 8 high)

To address issues that do not require attention, run:
  npm audit fix

To address all issues (including breaking changes), run:
  npm audit fix --force
```

exit code: 1

**Poznámka:** Dva dřívější pokusy selhaly sítí (`getaddrinfo EAI_AGAIN registry.npmjs.org`); třetí pokus vrátil plný report výše.

---

### B14 — Kritické bugy v kódu

```
$ rg -i 'CRITICAL|BUG:|blocker' src
(no matches)

$ rg 'FIXME|HACK|XXX' src
(no matches)
```

exit code: 1 (žádné shody)

---

### B15 — Prisma migrace

```
$ npx prisma migrate status
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma
Datasource "db": SQLite database "custom.db" at "file:./db/custom.db"

1 migration found in prisma/migrations

Database schema is up to date!
```

exit code: 0

Rollback na throwaway DB nebyl spuštěn → pouze forward status ověřen.

---

### B16 — Auth testy

Testové soubory (výběr):

- `src/lib/auth-config.test.ts` — registrace, `NEXTAUTH_SECRET` placeholder v produkci
- `src/lib/login-user.test.ts`
- `src/lib/session-token.test.ts`

```
$ rg -l 'auth|login|session' src --glob '*.test.ts'
src/lib/auth-config.test.ts
src/lib/login-user.test.ts
src/lib/session-token.test.ts
```

exit code: 0

---

### D1 — Pokrytí modulů testy

```
$ Get-ChildItem -Recurse src/app/api -Filter route.ts | Measure-Object
Count: 29

$ Get-ChildItem -Recurse -Filter *route*.test.ts
Count: 0

$ Get-ChildItem src/hooks -Filter *.ts | Measure-Object
Count: 22

$ Get-ChildItem src/hooks -Filter *.test.ts
Count: 0

$ Get-ChildItem -Recurse -Filter *.test.ts src/lib | Measure-Object
Count: 17
```

exit code: 0

---

### D2 — Coverage práh

```
$ rg 'coverage' package.json vitest.config.ts
(vitest.config.ts — pouze test.environment a alias, žádný coverage threshold)
```

exit code: N/A → **UNVERIFIED** (práh v projektu není definován)

---

### D3 — Validace API (Zod)

```
$ rg -l "from ['\"]zod['\"]|z\\.object" src/app/api
src/app/api/reminders/[id]/route.ts
src/app/api/records/restore/route.ts
src/app/api/records/route.ts
src/app/api/records/bulk/note/route.ts
src/app/api/records/bulk/edit/route.ts
src/app/api/auth/profile/route.ts
src/app/api/records/import/route.ts
src/app/api/register/route.ts
src/app/api/records/[n]/route.ts
src/app/api/records/bulk/reminder/route.ts
src/app/api/reminders/route.ts
src/app/api/records/bulk/delete/route.ts
(12 souborů z 29 routes)
```

exit code: 0

---

### D4 — Hranice vrstev (vzorek)

```
$ rg "from ['\"]@/components" src/app/api
(no matches)
```

API neimportuje React komponenty přímo.

exit code: 1

---

### D5 — Automatické import boundaries

```
$ rg 'dependency-cruiser|import/no-restricted-paths|eslint-plugin-boundaries' eslint.config.mjs package.json
(no matches)
```

exit code: 1 → **FAIL** (nástroj v CI chybí)

---

### D6 — Cyklické závislosti

```
$ npx madge --circular src
(nespouštěno — nástroj není v devDependencies)
```

exit code: N/A → **UNVERIFIED**

---

### D7 — Duplicita business pravidel

Manuální vzorek nebyl systematicky projit diff nástrojem v rámci auditu.

exit code: N/A → **UNVERIFIED**

---

### D8 — Obří funkce / složitost

Viz plný výstup `npm run lint` v §6/B11 — souhrn:

```
✖ 67 problems (0 errors, 67 warnings)
```

Nejvyšší complexity: `KeyboardShortcuts.tsx` 26, `ImportDialog.tsx` 23, `AuthGateInner` 21.

exit code: 0 (lint skript; prahy překročeny jako warnings)

---

### D9 — FIXME / HACK / XXX

Viz §6/B14 — žádné shody v `src/`.

exit code: 1

---

### D10 — Mrtvý kód

```
$ npx knip
(nespouštěno)
```

exit code: N/A → **UNVERIFIED**

---

### D11 — Logování chyb

```
$ rg 'console\.(error|warn)' src/app/api --count-matches
(více route souborů, např. src/app/api/auth/login/route.ts:63)
```

Příklad: `src/app/api/auth/login/route.ts:63` — `console.error("Login error:", error)`

Strukturovaný APM (Sentry/pino) v `src/` nenalezen.

exit code: 0

---

### D12 — Deploy postup

**`README.md:54-55`:**

```
| `bun run build` | Produkční build (standalone) |
| `bun run start` | Spuštění po buildu |
```

**`next.config.ts:3-5`:**

```typescript
const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: process.cwd(),
```

**`package.json` build** — kopíruje `.next/static` a `public` do `.next/standalone/`.

exit code: N/A

---

### D13 — Zastaralé závislosti

```
$ npm outdated
Package                 Current   Wanted   Latest  Location
@prisma/client           6.19.2   6.19.3    7.8.0  node_modules/@prisma/client
prisma                   6.19.2   6.19.3    7.8.0  node_modules/prisma
eslint                   9.39.2   9.39.4   10.4.1  node_modules/eslint
next                     16.1.3   16.2.7   16.2.7  node_modules/next
lucide-react            0.525.0  0.525.0   1.17.0  node_modules/lucide-react
uuid                     11.1.0   11.1.1   14.0.0  node_modules/uuid
(... celkem 26 řádků balíčků s odlišnou Latest ...)
```

exit code: 1 (`npm outdated` standardně vrací 1 při zastaralých balíčcích)

---

## Kontext projektu (auditorem doplněno)

| Položka | Hodnota |
|---------|---------|
| Stack | Next.js 16, React 19, TypeScript 5, Prisma 6, SQLite, Vitest 4 |
| Install (audit) | `npm install` |
| Install (CI / README) | `bun install --frozen-lockfile` |
| Test | `npm run test` → `vitest run` |
| Lint | `npm run lint` → `eslint .` |
| Typecheck | `npm run typecheck` |
| Build | `npm run build` (selhalo); `npx next build --webpack` (prošlo) |
| Nedostupné | GitHub branch protection, produkční logy, gitleaks |

---

*Konec reportu.*
