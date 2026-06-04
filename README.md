# Evidence výsadby stromů

Webová aplikace pro evidenci výsadby stromů: mapa (MapLibre — OSM, **ČÚZK ortofoto**, topo, tmavý režim), tabulka záznamů, připomínky údržby, import/export CSV a GeoJSON, záloha dat, reference stromů z OSM.

Podrobnější popis domény a API: [docs/architecture.md](docs/architecture.md). Index dokumentace: [docs/README.md](docs/README.md).

## Požadavky

- [Bun](https://bun.sh) (doporučeno — lockfile `bun.lock`) nebo Node.js 20+ s `npm`
- SQLite (souborová databáze v projektu)

CI používá Bun ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)): `bun run typecheck`, `bun run lint`, `bun run test`, `bun run build`, volitelně smoke testy při nastaveném secretu `SMOKE_PASSWORD`.

## Rychlý start

```bash
bun install
cp .env.example .env
# Upravte NEXTAUTH_SECRET v .env (náhodný řetězec)
bun run db:migrate
bun run dev
```

Aplikace běží na [http://localhost:3000](http://localhost:3000).

## Databáze

Oficiální soubor: **`prisma/db/custom.db`**

V `.env` použijte (cesta je **relativní ke složce `prisma/`**, stejně jako u Prisma CLI):

```
DATABASE_URL="file:./db/custom.db"
```

Soubor se vytvoří při prvním `bun run db:migrate` (doporučeno) nebo `bun run db:push`. Pokud nemáte `.env`, runtime použije stejnou cestu automaticky ([src/lib/db.ts](src/lib/db.ts)).

**Migrace:** Po změně `schema.prisma` používejte `bun run db:migrate`. Stav ověříte přes `bun run db:migrate:status`. Obsah DB zobrazí `bun run db:check`.

**Po `git pull` s novou migrací:** zastavte běžící dev server, spusťte `npm run db:migrate:deploy` a `npm run db:generate`, pak znovu `npm run dev`. Bez `db:generate` může API padat chybou `Unknown argument orpKod` (zastaralý Prisma klient).

**Bun na Windows:** pokud `bun` v PowerShellu „není rozpoznán“, je často nainstalovaný v `%USERPROFILE%\.bun\bin` — přidejte do PATH, nebo: `& "$env:USERPROFILE\.bun\bin\bun.exe" run db:generate`

**Pozor:** Soubor `db/custom.db` v kořeni je legacy — aplikace i Prisma CLI používají `prisma/db/custom.db`. Po ověření dat můžete kořenovou kopii smazat.

## Testovací účet (po seedu)

```bash
bun run scripts/seed-data.ts 100 test@example.com password123
```

- E-mail: `test@example.com`
- Heslo: `password123`

## Skripty

| Příkaz | Popis |
|--------|--------|
| `bun run dev` | Vývojový server (port 3000) |
| `bun run build` | Produkční build (standalone) |
| `bun run start` | Spuštění po buildu |
| `bun run lint` | ESLint |
| `bun run typecheck` | Route types (`next typegen`) + `tsc` |
| `bun run test` | Unit testy (Vitest) |
| `bun run test:smoke` | API smoke testy (běžící server; v CI `SMOKE_PASSWORD`) |
| `bun run db:push` | Sync schématu do SQLite (bez historie migrací) |
| `bun run db:migrate` | Prisma migrace (vývoj) |
| `bun run db:migrate:deploy` | Aplikovat migrace (produkce) |
| `bun run db:migrate:status` | Stav migrací |
| `bun run db:check` | Počty záznamů v DB |
| `bun run db:studio` | Prisma Studio |
| `bun run db:generate` | Generovat Prisma client |

Pre-commit: Husky spouští ESLint na staged `*.ts` / `*.tsx` (`lint-staged`).

## Proměnné prostředí

Viz [.env.example](.env.example).

| Proměnná | Povinná | Popis |
|----------|---------|--------|
| `DATABASE_URL` | doporučená | SQLite URL |
| `NEXTAUTH_SECRET` | ano (produkce) | Tajný klíč pro JWT |
| `NEXTAUTH_URL` | ano (produkce) | Veřejná URL aplikace |
| `ALLOW_REGISTRATION` | ne | Dev: vypnout=`false`. **Produkce: zapnout jen explicitně `true`** |
| `DEBUG_PRISMA` | ne | `1` zapne log SQL dotazů |
| `SMOKE_*` | ne | Smoke testy (viz `.env.example`) |

### Produkční checklist

- `NEXTAUTH_SECRET` — nový náhodný řetězec ≥ 32 znaků (`openssl rand -base64 32`). Po úniku v git historii **povinná rotace**.
- Registrace je v produkci **vypnutá**, dokud nenastavíte `ALLOW_REGISTRATION=true`.
- `NEXTAUTH_URL` — veřejná URL aplikace

## Záloha fotek

Fotografie se ukládají do `public/uploads/`. Při JSON zálohě zálohujte i tuto složku — cesty v databázi na ni odkazují.

## Hosting skripty

Složka `.zscripts/` obsahuje skripty z původního cloud prostředí. Pro lokální vývoj používejte `bun run dev` přímo.
