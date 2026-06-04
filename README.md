# Evidence výsadby stromů

Webová aplikace pro evidenci výsadby stromů: mapa (MapLibre — mapa, **satelit**, **ČÚZK ortofoto**, topo, tmavý režim), tabulka záznamů, připomínky údržby, import/export CSV a GeoJSON, záloha dat.

## Požadavky

- [Bun](https://bun.sh) (doporučeno — lockfile `bun.lock`) nebo Node.js 20+ s `npm`
- SQLite (souborová databáze v projektu)

CI používá Bun (`/.github/workflows/ci.yml`). Lokálně: `bun run typecheck`, `bun run lint`, `bun run test`, `bun run build`.

## Rychlý start

```bash
bun install
cp .env.example .env
# Upravte NEXTAUTH_SECRET v .env (náhodný řetězec)
bun run db:push
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

**Migrace:** Po změně `schema.prisma` používejte `bun run db:migrate`. Stav ověříte přes `bun run db:migrate:status`. Obsah DB (počty uživatelů/záznamů) zobrazí `bun run db:check`.

**Pozor:** Soubor `db/custom.db` v kořeni je legacy — aplikace i Prisma CLI teď používají jen `prisma/db/custom.db`. Po ověření, že vidíte svá data, můžete kořenovou kopii smazat.

## Testovací účet (po seedu)

```bash
bun run scripts/seed-data.ts 100 test@example.com password123
```

- E-mail: `test@example.com`
- Heslo: `password123`

## Skripty

| Příkaz | Popis |
|--------|--------|
| `bun run dev` | Vývojový server |
| `bun run build` | Produkční build (standalone) |
| `bun run start` | Spuštění po buildu |
| `bun run lint` | ESLint |
| `bun run typecheck` | Route types (`next typegen`) + `tsc` (bez `.next/dev`) |
| `bun run test` | Unit testy (Vitest) |
| `bun run test:smoke` | API smoke testy (vyžaduje běžící `dev`; v CI nastavte `SMOKE_PASSWORD`) |
| `bun run db:push` | Sync schématu do SQLite (bez historie migrací) |
| `bun run db:migrate` | Prisma migrace (vývoj) |
| `bun run db:migrate:deploy` | Aplikovat migrace (produkce) |
| `bun run db:migrate:status` | Stav migrací |
| `bun run db:check` | Počty záznamů v DB |
| `bun run db:studio` | Prisma Studio (grafické prohlížení/editace DB) |
| `bun run db:generate` | Generovat Prisma client |

## Proměnné prostředí

Viz [.env.example](.env.example).

| Proměnná | Povinná | Popis |
|----------|---------|--------|
| `DATABASE_URL` | doporučená | SQLite URL |
| `NEXTAUTH_SECRET` | ano (produkce) | Tajný klíč pro JWT |
| `NEXTAUTH_URL` | ano (produkce) | Veřejná URL aplikace |
| `ALLOW_REGISTRATION` | ne | Dev: vypnout=`false`. **Produkce: zapnout jen explicitně `true`** |
| `DEBUG_PRISMA` | ne | `1` zapne log SQL dotazů |

### Produkční checklist

- `NEXTAUTH_SECRET` — nový náhodný řetězec ≥ 32 znaků (`openssl rand -base64 32`). Po úniku v git historii **povinná rotace** (staré přihlášení přestanou platit). Placeholder z `.env.example` v produkci aplikace **odmítne start**.
- Registrace je v produkci **vypnutá**, dokud nenastavíte `ALLOW_REGISTRATION=true`.
- `NEXTAUTH_URL` — veřejná URL aplikace

## Záloha fotek

Fotografie se ukládají do `public/uploads/`. Při JSON zálohě zálohujte i tuto složku — cesty v databázi na ni odkazují.

## Historie vývoje

Automatické logy z iterací AI agentů: [docs/archive/](docs/archive/) — **nejsou zdrojem aktuálního stavu aplikace**.

## Hosting skripty

Složka `.zscripts/` obsahuje skripty z původního cloud prostředí. Pro lokální vývoj používejte `bun run dev` přímo.

