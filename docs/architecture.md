# Architektura a doména

Aktualizováno: 2026-06-04 · zdroj pravdy: `prisma/schema.prisma`, `src/app/api/`

## 1. Doménové entity

- **User**, **TreeRecord**, **Reminder**, **Species** (katalog druhů)
- User 1:N TreeRecord (`createdBy`)
- Katalog **Species** je globální (latinské názvy); záznamy odkazují na druh textem v `speciesLatin`
- TreeRecord 1:N Reminder (`onDelete: Cascade`)

## 2. Data a toky

- Primární úložiště: SQLite `prisma/db/custom.db` (`DATABASE_URL` relativně ke složce `prisma/`)
- Fotografie: `public/uploads/` (`POST /api/upload`, cesta v `TreeRecord.photoPath`)
- Serverová cache, Redis, S3: nepoužíváno
- Přihlášení: klient → `POST /api/auth/login` → JWT v httpOnly cookie a v těle → `localStorage` → `Authorization: Bearer` na `/api/*` (fetch interceptor)
- API → Prisma → SQLite
- Klient → React Query (výchozí `staleTime` 30 s, některé dotazy 60 s)
- Podklad mapy: raster dlaždice z prohlížeče (`src/lib/map-basemaps.ts`); OSM stromy přes `GET /api/map/osm-trees` (Overpass proxy, auth)
- Záloha: `GET /api/records/backup` → JSON
- Obnova: `POST /api/records/restore` → `deleteMany` záznamů uživatele → nová sada
- Import: max 5 MB, max 5000 řádků → batch po 100 v transakci
- Legacy: `db/custom.db` v kořeni — nepoužívat

## 3. Externí služby

| Služba | Použití | Auth |
|--------|---------|------|
| tile.openstreetmap.org | Podklad OSM | ne |
| services.cuzk.gov.cz (WMS) | Ortofoto ČR | ne |
| tile.opentopomap.org | Topo podklad | ne |
| a.basemaps.cartocdn.com | Tmavý podklad | ne |
| overpass-api.de | OSM stromy (`/api/map/osm-trees`) | ne (server-side) |
| Photon (vyhledávání míst) | klient, viz `MapPlaceSearch` | ne |

## 4. Uživatelé a role

- Role admin/viewer: **neexistují**
- Přihlášený: CRUD vlastních `TreeRecord` (`createdById`), připomínky, import/export, záloha/obnova, upload, activity log, profil, bulk operace
- Nepřihlášený: chráněné `/api/*` → 401
- Registrace: `ALLOW_REGISTRATION=false` vypne; v produkci výchozí vypnuto (viz README)
- Osobní data: e-mail, jméno, GPS, lokalita, poznámka, fotografie

## 5. Procesy

- Registrace → `User` (pokud registrace povolena)
- Vytvoření stromu → `TreeRecord`
- Úprava/smazání včetně fotky → log
- Import CSV/JSON → nové záznamy, nevalidní řádky přeskočeny
- Export → CSV nebo GeoJSON
- Připomínka: active → ack → (interval: posun `nextDueAt` | datum: `active=false`)
- Bulk: hromadná editace, poznámka, připomínka, smazání

## 6. Observabilita

- Logování: `console.error` v API handlerech
- Sentry / centralizovaný APM: nepoužíváno

## 7. Konfigurace

- `.env`: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `ALLOW_REGISTRATION`, `DEBUG_PRISMA`, `PRISMA_STUDIO_PORT`, `SMOKE_*`
- Dev: fallback secret pokud chybí, `/api/dev/prisma-studio` povoleno
- Prod: `NEXTAUTH_SECRET` povinný (placeholder z `.env.example` odmítnut), prisma-studio API 403

## 8. Bezpečnost (známá omezení)

- Hesla: bcrypt (`passwordHash`)
- JWT v `localStorage` + interceptor — riziko při XSS
- Rate limiting na login/API: **chybí**
- Upload: auth, MIME, max 10 MB; soubory veřejně pod `/uploads/`
- Podrobný audit závislostí: [security-audit-triage.md](security-audit-triage.md)

## 9. Výkon (orientačně)

- `GET /api/records/geojson` — celý dataset uživatele bez stránkování
- `GET /api/records/backup` — všechny záznamy + reminders
- `POST /api/records/import` — až 5000 záznamů, batch 100
