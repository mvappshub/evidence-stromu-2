# Send this to the implementation agent

Použij tento text jako celé zadání:

```text
Vytvoř novou samostatnou mobil-first webovou aplikaci v NOVÉM REPU s názvem `evidence-stromu-mobile`.

Tohle je závazné:
- nepiš žádný aplikační kód do repa `evidence-stromu-2`
- nevytvářej monorepo
- nesdílej codebase s hlavní aplikací
- ber `evidence-stromu-2` pouze jako existující backendový systém, se kterým se budeš integrovat přes HTTP API

Cíl:
- uživatel se přihlásí
- v terénu vyfotí nebo vybere fotku
- načte GPS polohu
- vyplní minimální formulář
- založí záznam do stejného systému / stejné databázové reality, kterou používá hlavní aplikace

Používej pouze existující backend endpointy hlavní aplikace:
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/upload`
- `POST /api/records`
- `PATCH /api/records/[n]`

Ověřená fakta o současném backendu:
- `POST /api/auth/login` vrací `{ ok: true, token, user }`
- backend podporuje `Authorization: Bearer <token>`
- `GET /api/auth/me` ověřuje bearer token
- `POST /api/upload` vyžaduje multipart field `file`
- `POST /api/upload` vrací `{ path }`
- `POST /api/records` aktuálně přijímá jen:
  - `lat`
  - `lng`
  - `speciesLatin`
  - `plantedAt`
  - `locality`
- `POST /api/records` aktuálně NEPŘIJÍMÁ `photoPath` ani `note`
- `PATCH /api/records/[n]` přijímá `photoPath` a `note`

Z toho plyne povinný submit flow:
1. login přes `POST /api/auth/login`
2. uložit bearer token
3. upload fotky přes `POST /api/upload` s field name `file`
4. create record přes `POST /api/records`
5. z odpovědi vzít `record.recordNumber`
6. patch record přes `PATCH /api/records/[recordNumber]` a doplnit:
   - `photoPath`
   - `note`

Tohle je povinné. Nevymýšlej jiný kontrakt create endpointu.

V1 scope:
- login screen
- perzistence tokenu
- ověření tokenu přes `/api/auth/me` při startu
- jedna hlavní obrazovka pro nový záznam
- foto capture / file input
- geolokace
- odeslání přes flow `upload -> create -> patch`
- success screen se zobrazením `recordNumber`

V1 nesmí obsahovat:
- offline sync
- seznam historických záznamů
- editaci starých záznamů
- mapu
- reverse geocoding
- připomínky
- nový backend
- přímý přístup do DB

UI nové app:
- mobil-first
- velké tap targety
- jednoduchý formulář
- pole:
  - foto
  - `speciesLatin`
  - `plantedAt`
  - `locality`
  - `note`
  - lat/lng jako read-only hodnoty po načtení GPS
- tlačítka:
  - `Načíst polohu`
  - `Uložit záznam`
  - `Odhlásit`

Pravidla formuláře:
- foto povinné
- GPS povinná
- `speciesLatin` povinné
- `plantedAt` povinné
- `locality` volitelné
- `note` volitelná
- `plantedAt` defaultně dnešní datum

Technické požadavky:
- nové repo `evidence-stromu-mobile`
- použij Next.js + TypeScript + React Query + Zod
- žádné Prisma
- žádná kopie backend route logiky
- žádné CORS domněnky

Runtime integrace:
- aplikace je samostatné repo, ale musí fungovat proti existujícímu backendu
- protože současný backend nemá ověřenou CORS podporu, navrhni runtime tak, aby browser neposílal cross-origin API requesty bez proxy vrstvy
- použij environment proměnnou `NEXT_PUBLIC_API_BASE_URL`
- backend URL nehardcoduj

Akceptační kritéria:
- veškerý nový aplikační kód je pouze v novém repu `evidence-stromu-mobile`
- login funguje s existujícím účtem
- token přežije refresh
- `/api/auth/me` validuje session po reloadu
- uživatel vybere nebo vyfotí 1 obrázek
- uživatel načte GPS
- aplikace provede `upload -> create -> patch`
- success screen zobrazí `recordNumber`
- nový záznam se objeví v hlavní aplikaci pro stejného uživatele

Co nesmíš dělat:
- neptat se, do kterého repa psát
- nepsat kód do `evidence-stromu-2`
- nešířit scope
- nepřidávat nový backend

Implementační pořadí:
1. založ nové repo `evidence-stromu-mobile`
2. implementuj login + token persistence
3. implementuj create-record screen
4. implementuj geolokaci + foto input
5. implementuj `upload -> create -> patch`
6. ověř, že záznam vznikne v existujícím systému
```
