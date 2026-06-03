# Fáze 3 — Implementation log

## Dávka 1 — Audit dokumentace

- **Změny:** `docs/ai-audit/00-baseline.md`, `01-findings.md`, `02-remediation-plan.md`
- **Checky:** N/A (markdown only)
- **Commit:** (viz git log)

## Dávka 2 — Unit testy kritické logiky

- **Změny:**
  - `src/lib/import-records.ts` — export `parsePlantedAt` pro testy
  - `src/lib/import-records.test.ts`
  - `src/lib/coords.test.ts`
  - `src/lib/login-user.test.ts`
  - `src/lib/session-token.test.ts`
- **Příkaz:** `npm run test`
- **Exit code:** `0`
- **Výstup (zkráceno):** `Test Files 7 passed (7)`, `Tests 47 passed (47)`
- **Příkaz:** `npm run typecheck`
- **Exit code:** `0` (po opravě mock typů v login-user.test)

## Dávka 3 — Upload MIME → přípona

- **Soubor:** `src/app/api/upload/route.ts`
- **Změna:** přípona jen z whitelistu MIME, ne z `file.name`
- **Checky:** test + typecheck výše

## Dávka 4 — Smoke test CI guard

- **Soubor:** `scripts/smoke-test.mjs`
- **Změna:** při `CI=1` vyžaduje `SMOKE_PASSWORD`

## Dávka 5 — CI workflow

- **Soubor:** `.github/workflows/ci.yml`
- **Job:** bun install, db:generate, typecheck, lint, test
- **Ověření:** push na GitHub (lokálně bun není v PATH auditora)

## Dávka 6 — DX / pojistky

- **README.md** — bun vs npm, `test`, produkční checklist
- **.gitignore** — `.playwright-mcp/`, `.next-smoke*`, `.cursor/settings.json`
- **`.cursor/rules/api-routes-require-auth.mdc`**

## Neprovedeno (NEEDS-APPROVAL)

- N1 rotace `NEXTAUTH_SECRET`
- N2 default `ALLOW_REGISTRATION=false` v produkci
- N8 baseline commit mapového WIP
