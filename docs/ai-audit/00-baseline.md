# Fáze 0 — Baseline

Datum auditu: 2026-06-04  
Režim: **NO-PRODUCTION-CHANGES** (kromě tohoto adresáře)

## 1. Stack a tooling

| Položka | Hodnota | Důkaz |
|--------|---------|--------|
| Runtime / PM (dokumentace) | Bun | `package.json` skripty `start` používají `bun` |
| PM v tomto prostředí | **npm** (bun není v PATH) | `where.exe bun` → nenalezeno; `npm run typecheck` OK |
| Lockfile | `bun.lock` | kořen repa |
| Framework | Next.js 16 (`next` ^16.1.1) | `package.json` L62–63 |
| UI | React 19, Radix, Tailwind 4 | `package.json` dependencies |
| DB | Prisma 6 + SQLite | `prisma/schema.prisma`, skript `db:*` |
| Auth | next-auth 4 + vlastní JWT login | `src/lib/auth.ts`, `src/app/api/auth/login/route.ts` |
| Mapa | maplibre-gl | `package.json` |
| Test runner | Vitest 4 | `vitest.config.ts`, `"test": "vitest run"` |
| Lint | ESLint 9 + eslint-config-next | `eslint.config.mjs` |
| Typecheck | `next typegen` + `tsc --noEmit -p tsconfig.typecheck.json` | `package.json` L12 |
| Build | `prisma generate && next build --webpack` + kopie do standalone | `package.json` L7 |
| CI | **nenalezeno** | žádná `.github/workflows/` |
| Pre-commit (husky/lint-staged) | **nenalezeno** | grep v repu bez shody |

### Relevantní úryvky `package.json` (skripty)

```json
"typecheck": "next typegen && tsc --noEmit -p tsconfig.typecheck.json",
"lint": "eslint .",
"test": "vitest run",
"build": "prisma generate && next build --webpack && node -e \"...standalone copy...\""
```

### TypeScript

- `strict: true`, ale `noImplicitAny: false` v `tsconfig.json` L13.

## 2. Výsledky kontrol

Prostředí: Windows, `c:\Users\marti\Desktop\evidence stromů\evidence-stromu-2`, `node_modules` přítomné.

### 2.1 Typecheck

- **Příkaz:** `npm run typecheck`
- **Exit code:** `0`
- **Výstup (zkráceno):** `Generating route types... ✓ Types generated successfully`

### 2.2 Lint

- **Příkaz:** `npm run lint`
- **Exit code:** `0` (warnings nefailují)
- **Výstup (zkráceno):** `✖ 20 problems (0 errors, 20 warnings)` — převážně `@typescript-eslint/no-unused-vars` a `react-hooks/incompatible-library`

### 2.3 Testy

- **Příkaz:** `npm run test`
- **Exit code:** `0`
- **Výstup (zkráceno):**

```
Test Files  3 passed (3)
     Tests  32 passed (32)
```

Soubory testů: `reminder-utils.test.ts`, `reminder-validation.test.ts`, `records-query.test.ts`.

### 2.4 Build

**A) Plný skript `npm run build`**

- **Exit code:** `1`
- **Důkaz (stderr):**

```
EPERM: operation not permitted, rename '...\node_modules\.prisma\client\query_engine-windows.dll.node.tmp...' -> '...\query_engine-windows.dll.node'
```

Pravděpodobně zámek souboru (běžící dev server / antivirus). **Není ověřeno**, že by build selhal i na čistém stroji.

**B) Ověření kompilace Next (bez `prisma generate`)**

- **Příkaz:** `npx next build --webpack`
- **Exit code:** `0`
- **Výstup (zkráceno):** route tabulka včetně `/api/*` — build dokončen.

## 3. Secret scan (před commitem)

| Kontrola | Výsledek |
|----------|----------|
| `git ls-files` obsahuje `.env`? | **Ne** — pouze `.env.example` |
| Lokální `.env` | **Existuje** — hodnoty **nečteny** (audit pravidlo) |
| Hardcoded `sk-`, `ghp_`, AWS klíče v `src/` | **Nenalezeno** (grep) |
| Dev hesla `password123` | `scripts/seed-data.ts`, `scripts/smoke-test.mjs`, README — **dokumentované dev výchozí**, ne production secret |
| `.env` v git historii | **Ano** — commit `7364609` odstranil `.env` ze sledování (`git show 7364609 --stat`) |
| `db/custom.db` v historii | **Ano** — stejný commit odstranil binární DB ze sledování |

### ⚠️ Zastavení baseline commitu (secret / historie)

Pokud commit `7364609` nebo dřívější obsahoval **živý** `NEXTAUTH_SECRET` (ne placeholder), považujte ho za **kompromitovaný** → **rotace** `NEXTAUTH_SECRET` a invalidace starých JWT/session. Hodnoty z historie **nebyly** načteny.

**Doporučení:** před production deploy ověřit `git log -p` na `.env` pouze lokálně; při pochybnosti rotovat.

## 4. Git stav

- **Repo:** inicializované, remote `origin` → `git@github.com:mvappshub/evidence-stromu-2.git`
- **Git binary:** `C:\Program Files\Git\cmd\git.exe` (v default PATH shellu **chybí**)

### `git status --short` (2026-06-04)

```
 M README.md
 M prisma/schema.prisma
 M src/components/map/MapView.tsx
 M src/hooks/useMapInit.ts
 M src/hooks/useMapInteractions.ts
 M src/hooks/useMapStyleLifecycle.ts
 M src/hooks/useMapTreeLayers.ts
 M src/lib/map-layer-restore.ts
 M src/lib/map-tree-layers.ts
?? .cursor/
?? .playwright-mcp/
```

**Interpretace:** 8 změněných souborů = probíhající práce na mapových vrstvách / Prisma / README. `?? .cursor/`, `?? .playwright-mcp/` = lokální tooling, typicky **necommitovat** bez schválení.

**Warning:** `could not open directory '.next-smoke /'` — pravděpodobně artefakt se jménem složky s mezerou na konci.

### Baseline commit — **neproveden**

Důvody (stop pravidla):

1. Necommitnuté **produkční** změny (mapa) — není jasné, zda mají být součástí baseline.
2. `.env` dříve v historii — rotace secretů má přednost před „zapečetěním“ stavu.
3. Plný `npm run build` v tomto běhu **neselhal kvůli kódu**, ale kvůli EPERM na Prisma engine.

**Navrhované další kroky (vyžadují schválení):**

- A) Commit **pouze** `docs/ai-audit/` jako audit snapshot, nebo  
- B) Uživatel nejdřív commitne/stashne mapové WIP, pak baseline celého stavu, nebo  
- C) Baseline přeskočit do dokončení fáze 3.

## 5. Poznámky k prostředí auditora

- `bun` není v PATH → CI/DX by měl dokumentovat npm **nebo** zajistit bun v PATH.
- `.cursor/rules/ui-changes-require-approval.mdc` existuje (projektové pravidlo UI).
