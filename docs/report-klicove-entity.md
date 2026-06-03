1. Doménové entity
- User
- TreeRecord
- Reminder
- ActivityLog
- User 1:N TreeRecord (createdBy)
- User 1:N ActivityLog
- TreeRecord 1:N Reminder (onDelete Cascade)
- TreeRecord N:1 User
- ActivityLog odkazuje na záznam/připomínku přes entityId (string), bez FK na TreeRecord ani Reminder

2. Data a toky
- Primární úložiště: SQLite soubor prisma/db/custom.db (DATABASE_URL relativně ke složce prisma/)
- Fotografie: public/uploads/ (POST /api/upload, cesta v TreeRecord.photoPath)
- Serverová cache, Redis, S3: v aplikaci nepoužíváno
- Přihlášení: klient → POST /api/auth/login → JWT v httpOnly cookie a v těle odpovědi → localStorage → Bearer hlavička na /api/* (fetch interceptor)
- API → Prisma → SQLite; ActivityLog při mutacích záznamů a připomínek
- Klient → React Query v paměti prohlížeče (výchozí staleTime 30 s, některé dotazy 60 s)
- Klient → dlaždice OSM / OpenTopoMap / Carto přímo z prohlížeče, bez backend proxy
- Záloha: SQLite uživatele → GET /api/records/backup → JSON ke stažení
- Obnova: JSON → POST /api/records/restore → deleteMany všech TreeRecord uživatele → nové záznamy a Reminder
- Import: soubor max 5 MB, max 5000 řádků → batch create po 100 v transakci
- Oficiální DB není db/custom.db v kořeni (legacy, README)
- Session cookie maxAge 30 dní (login route); expirace JWT v authOptions explicitně nezadána

3. Závislosti a externí služby
- tile.openstreetmap.org — API raster dlaždic z klienta, bez autentizace, SLA Nezjištěno
- tile.opentopomap.org — API raster dlaždic z klienta, bez autentizace, SLA Nezjištěno
- a.basemaps.cartocdn.com — API raster dlaždic z klienta, bez autentizace, SLA Nezjištěno

4. Uživatelé a role
- Role admin/viewer v DB ani API: neexistují
- Přihlášený uživatel: CRUD vlastních TreeRecord (scope createdById), připomínky, import/export, záloha/obnova, upload, activity log, profil
- Nepřihlášený: chráněná /api/* vrací 401
- Registrace: vypnutelná ALLOW_REGISTRATION=false
- Ukládaná osobní/identifikační data: e-mail, jméno, GPS souřadnice, lokalita, poznámka, fotografie; GDPR procesy v repozitáři: Nezjištěno

5. Procesy a workflow
- Registrace: bez účtu → User (pokud ALLOW_REGISTRATION není false)
- Přihlášení: neautentizovaný → platná JWT session
- Vytvoření stromu: bez záznamu → TreeRecord + ActivityLog create
- Úprava/smazání stromu včetně fotky (upload → photoPath): existující záznam → upravený nebo smazaný + log
- Import CSV/JSON: soubor (≤5000 řádků) → nové TreeRecord, nevalidní řádky přeskočeny
- Export: filtrovaná data → CSV nebo GeoJSON soubor
- Záloha: data uživatele v DB → JSON snapshot
- Obnova zálohy: JSON (+ shoda e-mailu zálohy s účtem) → smazání všech záznamů uživatele → nová sada záznamů
- Připomínka: active → ack → (interval: posun nextDueAt | datum: active=false)
- Bulk operace: výběr záznamů → hromadná editace, poznámka, připomínka nebo smazání

6. Chyby a výjimky
- Logování: console.error v API route handlerech
- Vývoj/produkční start: výstup serveru přes tee do dev.log resp. server.log (package.json skripty)
- Sentry, ELK, centralizovaný APM: nepoužíváno
- Top 3 nejčastější produkční chyby: N/A

7. Konfigurace a prostředí
- Proměnné: DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL, ALLOW_REGISTRATION, DEBUG_PRISMA, NODE_ENV, PRISMA_STUDIO_PORT
- Přepínání prostředí: soubor .env + NODE_ENV; feature flag ALLOW_REGISTRATION
- Dev: fallback NEXTAUTH_SECRET pokud chybí, /api/dev/prisma-studio povoleno, registrace typicky zapnutá
- Prod: NEXTAUTH_SECRET a NEXTAUTH_URL povinné dle README, prisma-studio API vrací 403, logout cookie secure=true při NODE_ENV=production

8. Bezpečnostní hrozby
- Hesla: bcrypt hash v User.passwordHash (registrace cost 12, změna hesla v profilu cost 10)
- Session token: JWT podepsaný NEXTAUTH_SECRET; duplicitní uložení v localStorage (AUTH_TOKEN_KEY)
- JWT v localStorage + globální fetch interceptor (riziko exfiltrace při XSS)
- Rate limiting na login, registraci a API: v kódu chybí
- Výchozí NEXTAUTH_SECRET dev-secret-change-in-production pokud env chybí
- Upload vyžaduje auth, kontrola MIME a max 10 MB; soubory servírované veřejně pod /uploads/
- Custom NextAuth cookies v auth.ts mají secure: false bez ohledu na NODE_ENV

9. Výkonnostní kritéria
- GET /api/records/geojson — findMany celého datasetu uživatele bez stránkování; p50/p95 Nezjištěno
- GET /api/records/backup — findMany všech záznamů uživatele včetně reminders; p50/p95 Nezjištěno
- POST /api/records/import — až 5000 záznamů, zápis batch po 100 v transakci; p50/p95 Nezjištěno
