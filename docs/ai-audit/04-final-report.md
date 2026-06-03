# Fáze 4 — Finální report (částečný)

Datum: 2026-06-04

## Co bylo nalezeno

Viz [`01-findings.md`](01-findings.md) — 22+ nálezů včetně SEC-001 (`.env` v historii), SEC-002 (registrace), chybějící CI, mezery v testech.

## Co bylo opraveno (AUTO-SAFE)

| ID | Stav |
|----|------|
| A1 | Audit docs přidány |
| A2 | GitHub Actions CI |
| A3–A5 | Testy import dates, coords, loginUser, decodeSessionToken |
| A6 | Upload MIME → ext whitelist |
| A7 | Smoke vyžaduje `SMOKE_PASSWORD` v CI |
| A8 | README rozšířeno |
| A9 | `.gitignore` doplněn |
| A10 | Cursor rule `api-routes-require-auth.mdc` |

## Co zůstalo a proč

| Položka | Důvod |
|---------|--------|
| SEC-001 rotace secret | NEEDS-APPROVAL — provozní akce |
| SEC-002 registrace default | NEEDS-APPROVAL — mění chování |
| Mapové WIP (8 souborů) | Necommitnuto — mimo audit scope |
| Plný `npm run build` | EPERM Prisma na Windows v audit běhu; `next build` OK |
| ARCH-* refaktory | DO-NOT-FIX |

## Pojistky přidané

- CI: typecheck, lint, test
- 4 nové test soubory (+14 testů)
- API auth cursor rule
- Upload ext whitelist

## Příkazy (poslední lokální běh)

```
npm run test     → exit 0, 47 passed
npm run typecheck → exit 0
npm run lint     → exit 0, 20 warnings
```

## Commity

Viz `git log` po push — dávky 1–6 (audit agent).

## Zbylá rizika

1. Historický `.env` v git — rotace secretu pokud byl reálný klíč.
2. Registrace otevřená bez `ALLOW_REGISTRATION=false`.
3. JWT v localStorage (XSS surface).
4. Lint warnings (20) — neblokují CI.

## Doporučené další kroky

1. Ověřit SEC-001 lokálně; rotovat `NEXTAUTH_SECRET` pokud potřeba.
2. Schválit N2 — vypnout registraci v produkci.
3. Commitnout nebo dokončit mapové WIP zvlášť.
4. Po push ověřit zelený GitHub Actions run.
