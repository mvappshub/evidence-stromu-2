# Fáze 1 — Nálezy

Datum: 2026-06-04  
Každý nález: ID · soubor:řádky · důkaz · problém · dopad · severity (1=kritické, 5=kosmetika) · riziko opravy · náprava · prevence · ověření

---

## Priorita 1 — Secrets / security

### SEC-001 · Historie: `.env` v gitu

- **Soubor:** git historie, commit `7364609`
- **Důkaz:** `git show 7364609 --stat` → `.env | 4 ----` (soubor odstraněn ze sledování)
- **Problém:** Environment soubor s tajemstvími mohl být pushnutý; po odstranění z indexu zůstává v historii.
- **Dopad:** Kompromitace `NEXTAUTH_SECRET` → forge session/JWT.
- **Severity:** **1** (pokud v historii byl reálný secret; **3** pokud jen placeholder — **ověřit lokálně**)
- **Riziko opravy:** Nízké (rotace secretu); vysoké ignorování
- **Náprava:** Rotovat `NEXTAUTH_SECRET`; zvážit `git filter-repo` jen pokud repo nikdy nebylo veřejné / koordinace s týmem
- **Prevence:** `.gitignore` už má `.env*`; secret scan v CI
- **Ověření:** Lokálně `git log -p -- .env` (bez publikování hodnot)

### SEC-002 · Registrace veřejně zapnutá defaultně

- **Soubor:** `src/app/api/register/route.ts:12-18`, `.env.example:9`
- **Důkaz:**

```typescript
if (process.env.ALLOW_REGISTRATION === "false") {
  return NextResponse.json({ error: "Registrace je vypnutá" }, { status: 403 })
}
```

`.env.example`: `ALLOW_REGISTRATION=true`

- **Problém:** Endpoint `POST /api/register` bez auth; v produkci bez explicitního `ALLOW_REGISTRATION=false` kdokoli vytvoří účet.
- **Dopad:** Neautorizované účty, spam, DoS na DB.
- **Severity:** **2** (produkce), **4** (čistý dev)
- **Riziko opravy:** Střední — může zlomit onboarding, pokud registraci očekáváte
- **Náprava:** Produkční default `false` v kódu nebo povinná env validace při startu
- **Prevence:** Dokumentace + deploy checklist
- **Ověření:** `curl -X POST /api/register` bez cookie → 403 po změně

### SEC-003 · Upload: přípona z klientského `file.name`

- **Soubor:** `src/app/api/upload/route.ts:20-40`
- **Důkaz:**

```typescript
const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"]
// ...
const ext = file.name.split(".").pop() || "jpg"
const filename = `${uuidv4()}.${ext}`
```

- **Problém:** MIME z klienta je spoofovatelný; přípona může být např. `php`, `svg` s XSS (u SVG záleží na servírování).
- **Dopad:** Statické soubory pod `/uploads/` — riziko špatného content-type / XSS při přímém servírování.
- **Severity:** **3**
- **Riziko opravy:** Nízké
- **Náprava:** Mapovat MIME → whitelist přípon; případně re-encode přes `sharp`
- **Prevence:** Test upload route
- **Ověření:** POST s `file.name=x.php` + `image/jpeg` → uložená přípona `.jpg` only

### SEC-004 · JWT v localStorage (mobilní / SPA flow)

- **Soubor:** `src/store/useAuthStore.ts:23-37`, `src/app/api/auth/login/route.ts:33-36`
- **Důkaz:** login vrací `token` v JSON; store ukládá `localStorage.setItem(AUTH_TOKEN_KEY, token)`
- **Problém:** XSS → krádež bearer tokenu (cookie je httpOnly, localStorage není).
- **Dopad:** Únik session při XSS v aplikaci.
- **Severity:** **3** (akceptovatelné pro field app; dokumentované v `docs/mobile-field-agent-send-this.md`)
- **Riziko opravy:** Vysoké (změna auth modelu)
- **Náprava:** Fáze 3+ — cookie-only pro web, bearer jen pro native
- **Prevence:** CSP, sanitizace; pravidla pro UI komponenty
- **Ověření:** Review CSP headers — **HYPOTÉZA:** middleware/CSP chybí (viz INFRA-002)

### SEC-005 · Veřejný health endpoint

- **Soubor:** `src/app/api/route.ts:1-5`
- **Důkaz:** `GET` vrací `{ message: "Hello, world!" }` bez auth
- **Problém:** Informační únik / scan surface (nízké).
- **Severity:** **5**
- **Náprava:** Odstranit nebo chránit v produkci
- **Ověření:** `GET /api` → 404 po změně

---

## Priorita 2 — Rozbité / chybějící baseline pojistky

### INFRA-001 · Chybí CI pipeline

- **Důkaz:** `Glob **/.github/**` → 0 souborů
- **Problém:** Žádná automatická kontrola typecheck/lint/test/build na push/PR.
- **Severity:** **2**
- **Riziko opravy:** Nízké
- **Náprava:** GitHub Actions workflow se 4 joby (nebo jeden matrix)
- **Prevence:** Branch protection
- **Ověření:** PR check zelený

### INFRA-002 · Chybí Next.js `middleware.ts` pro auth/CSP

- **Důkaz:** `Glob **/middleware.ts` → 0
- **Problém:** Ochrana stránek jen klientsky (`AuthGate`); CSP/security headers centralizované chybí.
- **Severity:** **3** (HYPOTÉZA pro CSP — neověřeno v `next.config.ts`)
- **Důkaz pro absenci v config:** `next.config.ts` nemá `headers()`
- **Náprava:** Middleware pro `/api` rate limit / security headers — **NEEDS-APPROVAL** pokud mění chování
- **Ověření:** Response headers inspection

### INFRA-003 · Plný `npm run build` selhal (EPERM Prisma)

- **Důkaz:** viz `00-baseline.md` §2.4A
- **Problém:** Baseline build není reprodukovatelně zelený v audit prostředí.
- **Severity:** **3** (prostředí), **4** (kód OK — `next build` prošel)
- **Náprava:** Zavřít procesy držící `query_engine-windows.dll.node`; retry
- **Ověření:** `npm run build` exit 0

### INFRA-004 · Bun v dokumentaci, npm v audit shellu

- **Důkaz:** README / skripty vs `where.exe bun` fail
- **Problém:** Nový vývojář/CI může spustit špatný package manager.
- **Severity:** **4**
- **Náprava:** README explicitně: „bun preferován; npm kompatibilní“ nebo `engines` v package.json
- **Ověření:** Čistý clone podle README

### INFRA-005 · ESLint: mnoho pravidel vypnuto

- **Soubor:** `eslint.config.mjs:10-51`
- **Důkaz:** `react-hooks/exhaustive-deps: off`, `prefer-const: off`, `@typescript-eslint/no-explicit-any: off`, …
- **Problém:** Lint projde s 20 warnings; reálné chyby mohou projít.
- **Severity:** **4**
- **Náprava:** Postupně zapínat pravidla po souborech
- **Ověření:** `npm run lint` bez warnings na kritických cestách

### INFRA-006 · `noImplicitAny: false`

- **Soubor:** `tsconfig.json:13`
- **Důkaz:** `"noImplicitAny": false`
- **Problém:** Slabší typová pojistka než `strict` naznačuje.
- **Severity:** **4**
- **Náprava:** Zapnout postupně s typecheck
- **Ověření:** `npm run typecheck` po zapnutí

### INFRA-007 · Artefakt `.next-smoke /` (mezerou v názvu)

- **Důkaz:** `git status` warning `could not open directory '.next-smoke /'`
- **Problém:** Git noise, exclude v eslint už řeší variantu s mezerou (`eslint.config.mjs:54`)
- **Severity:** **5**
- **Náprava:** Přejmenovat/smazat lokální složku; doplnit `.gitignore`
- **Ověření:** `git status` bez warningu

---

## Priorita 3 — Testovatelnost kritické logiky

### TEST-001 · Import záznamů bez testů

- **Soubor:** `src/lib/import-records.ts` (107 řádků)
- **Důkaz:** grep `*.test.ts` → pouze 3 soubory; `import-records` chybí
- **Problém:** Parsování dat (`parsePlantedAt`), bulk create — regrese neodhalena.
- **Severity:** **2**
- **Náprava:** Vitest unit testy pro `parsePlantedAt` + happy path importu (mock db)
- **Ověření:** `npm run test` + nové cases

### TEST-002 · Souřadnicová transformace bez testů

- **Soubor:** `src/lib/coords.ts` (124 řádků)
- **Důkaz:** stejný grep
- **Problém:** S-JTSK transformace ~1–3 m přesnost — změna konstant rozbije zobrazení.
- **Severity:** **3**
- **Náprava:** Golden-file testy pro známé body
- **Ověření:** `npm run test`

### TEST-003 · Auth (`requireAuth`, `loginUser`, `decodeSessionToken`) bez testů

- **Soubory:** `src/lib/api-auth.ts`, `src/lib/login-user.ts`, `src/lib/session-token.ts`
- **Důkaz:** žádné test soubory
- **Problém:** Regrese po rotaci secretu / bearer vs cookie.
- **Severity:** **2**
- **Náprava:** Unit testy s mock `getServerSession` / `decode`
- **Ověření:** `npm run test`

### TEST-004 · Mapová logika bez testů

- **Soubory:** `src/lib/map-tree-layers.ts`, `src/hooks/useMapInit.ts`, …
- **Důkaz:** pouze manuální/E2E **HYPOTÉZA** (playwright MCP yaml v `?? .playwright-mcp/`)
- **Severity:** **4**
- **Náprava:** Extrahovat čisté funkce (GeoJSON, paint) → unit testy
- **Ověření:** test + smoke `npm run test:smoke`

### TEST-005 · Smoke test závisí na dev hesle

- **Soubor:** `scripts/smoke-test.mjs:36`
- **Důkaz:** `process.env.SMOKE_PASSWORD || 'password123'`
- **Problém:** Falešně zelený smoke, pokud DB nemá seed uživatele.
- **Severity:** **4**
- **Náprava:** Smoke fail fast bez `SMOKE_PASSWORD` v CI
- **Ověření:** `SMOKE_PASSWORD= npm run test:smoke` → exit ≠ 0

---

## Priorita 4 — Preventivní pojistky

### PREV-001 · Chybí pre-commit hook

- **Důkaz:** grep `husky|lint-staged|pre-commit` → 0
- **Severity:** **3**
- **Náprava:** Husky + `lint-staged` na `typecheck`/`test` — **tooling brzda: návrh zvlášť**

### PREV-002 · `getAuthSecret()` throw při chybějícím secretu — dobré, ale build/runtime závislost

- **Soubor:** `src/lib/auth-config.ts:1-8`
- **Důkaz:** `throw new Error("NEXTAUTH_SECRET must be set...")`
- **Problém:** Moduly `api-auth.ts`, `session-token.ts` volají `getAuthSecret()` na top-level → import bez env spadne.
- **Severity:** **4** (záměr pro produkci)
- **Náprava:** Dokumentovat v README deploy; `.env.example` bez reálných hodnot ✓

### PREV-003 · Dev endpoint Prisma Studio

- **Soubor:** `src/app/api/dev/prisma-studio/route.ts:9-14`
- **Důkaz:** `NODE_ENV === 'production'` → 403; jinak `requireAuth`
- **Problém:** V dev útočník s účtem spustí DB UI — OK pro lokál.
- **Severity:** **4**
- **Ověření:** `NODE_ENV=production` POST → 403

---

## Architektura (pouze nálezy — bez refaktoru)

### ARCH-001 · MapView orchestruje mnoho hooků (SoC)

- **Soubor:** `src/components/map/MapView.tsx` (~129 řádků)
- **Důkaz:** importy `useMapInit`, `useMapTreeLayers`, `useMapStyleLifecycle`, `useMapInteractions`, `useOsmTreesLayer`, … L10-22
- **Problém:** Komponenta je hub; změny stylu/vrstev/provázané refy.
- **Severity:** **4** (raná fáze — refaktor předčasný)
- **Náprava:** DO-NOT-FIX nyní; extrakce až při třetí změně stejné oblasti

### ARCH-002 · Duální auth cesty (NextAuth + custom login JWT)

- **Soubory:** `src/lib/auth.ts`, `src/app/api/auth/login/route.ts`, `src/lib/api-auth.ts`
- **Důkaz:** `requireAuth` zkouší Bearer pak `getServerSession`
- **Problém:** Dva mechanismy = vyšší kognitivní zátěž; již částečně řešeno (`auth/me` fallback po rotaci secretu v commit `c864bb1`).
- **Severity:** **4**

### ARCH-003 · `db.ts` mutuje `process.env.DATABASE_URL`

- **Soubor:** `src/lib/db.ts:12-34`
- **Důkaz:** `process.env.DATABASE_URL = fallbackUrl`
- **Problém:** Side effect při importu; těžší testování multi-tenant.
- **Severity:** **4** (pragmatické pro SQLite paths)

### ARCH-004 · DRY: filter specs vs query builder — **částečně vyřešeno**

- **Důkaz:** commit `fe46f6b refactor(filters): centralize record filter definitions`
- **Severity:** **5** (sledovat při dalších filtrech)

---

## Shrnutí počtů

| Severity | Počet |
|----------|-------|
| 1–2 | 4 (+ SEC-001 podmíněně) |
| 3 | 6 |
| 4–5 | 12 |

**HYPOTÉZY k ověření:** SEC-001 (obsah historického `.env`), SEC-004/CSP, TEST-004 E2E pokrytí mapy.
