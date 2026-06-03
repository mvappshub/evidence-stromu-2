# Agent Handoff: external standalone mobile-first field app

This brief is for an implementation agent that will build a new application in a separate repository.

This is the non-negotiable top-level rule:

- implementation target is a new standalone repository
- do not write application code into `evidence-stromu-2`
- do not merge codebases
- the new app is a separate sister application that integrates with the existing system only over HTTP

## 1. What problem this app solves

Build a mobile-first web app for field work that allows a user to:

- log in
- capture or choose a photo at the planting site
- capture current GPS coordinates
- enter the minimum record fields
- create a record in the same database that the current system uses

The app is for fast field entry only.
It is not a replacement for the main application.

## 2. Binding implementation target

The implementation agent must create code only in a new external repository.

Target repository name:

- `evidence-stromu-mobile`

Do not:

- create `field-mobile/` inside this repository
- edit the UI code of `evidence-stromu-2`
- restructure this repository
- create a monorepo

The agent may use this repository only as a source of verified API facts.

## 3. Verified facts from the current system

Everything below was verified directly from the current repository.

### 3.1 Auth endpoints

Verified from:

- `src/app/api/auth/login/route.ts`
- `src/app/api/auth/me/route.ts`
- `src/lib/api-auth.ts`

Facts:

- `POST /api/auth/login` exists
- request body:
  - `email`
  - `password`
- success response:
  - `{ ok: true, token, user }`
- the backend supports bearer auth through:
  - `Authorization: Bearer <token>`
- `GET /api/auth/me` exists
- `GET /api/auth/me` validates a bearer token and returns `{ user }`

Conclusion:

- the new app must use the existing login and bearer-token flow

### 3.2 Upload endpoint

Verified from `src/app/api/upload/route.ts`.

Facts:

- `POST /api/upload` exists
- auth is required
- it expects multipart field name:
  - `file`
- allowed types:
  - `image/jpeg`
  - `image/png`
  - `image/webp`
  - `image/gif`
- max size:
  - `10 MB`
- success response:
  - `{ path }`
- returned file path format:
  - `/uploads/<generated-name>`

### 3.3 Record create endpoint

Verified from `src/app/api/records/route.ts`.

Facts:

- `POST /api/records` exists
- auth is required
- current accepted create payload is:
  - `lat: number`
  - `lng: number`
  - `speciesLatin: string`
  - `plantedAt: string`
  - `locality?: string | null`
- current create route does not accept:
  - `photoPath`
  - `note`
- success response:
  - `{ record }`
- server writes `createdById` from authenticated user

### 3.4 Record update endpoint

Verified from `src/app/api/records/[n]/route.ts`.

Facts:

- `PATCH /api/records/[n]` exists
- auth is required
- accepted update payload includes:
  - `note?: string | null`
  - `photoPath?: string | null`

### 3.5 Data model facts

Verified from `prisma/schema.prisma`.

Relevant `TreeRecord` fields already exist in the database:

- `recordNumber`
- `plantedAt`
- `speciesLatin`
- `lat`
- `lng`
- `locality`
- `photoPath`
- `note`
- `createdById`

Conclusion:

- the external app does not need a new DB model
- it must integrate with the current backend contracts

### 3.6 Cross-origin fact

Verified by repository inspection:

- no application-level CORS support was found in source code
- no `Access-Control-Allow-Origin` handling was found in application routes

Conclusion:

- do not assume a browser app on a different origin can call the API directly
- separate repo is allowed
- separate browser origin is not a verified-supported runtime model

## 4. Binding architecture

The new application must satisfy all of these constraints at once:

- separate repository
- no shared codebase with the main app
- no code changes inside `evidence-stromu-2`
- no direct DB access
- integration only through existing HTTP endpoints

Because the current API has no verified CORS support, the app must be designed like this:

- frontend code lives in separate repo `evidence-stromu-mobile`
- browser-visible API requests must appear same-origin from the mobile app runtime

Allowed ways to satisfy that:

- deploy the external app behind a reverse proxy that forwards `/api/*` to the existing backend
- or run the external app with a server-side proxy / rewrite layer to the existing backend

Not allowed:

- cross-origin browser fetches that assume CORS will work
- direct writes to SQLite
- cloning backend code into the mobile repo

## 5. Required integration flow

Because current `POST /api/records` does not accept `photoPath` or `note`, the external app must use this exact multi-step flow:

1. `POST /api/auth/login`
2. store bearer token client-side
3. `POST /api/upload` with multipart field `file`
4. receive `{ path }`
5. `POST /api/records` with:
   - `lat`
   - `lng`
   - `speciesLatin`
   - `plantedAt`
   - `locality`
6. read `record.recordNumber` from create response
7. `PATCH /api/records/[recordNumber]` with:
   - `photoPath`
   - `note`

This is not optional.
Do not invent a different create contract.

## 6. Exact client contracts

### 6.1 Login

Request:

- `POST /api/auth/login`
- JSON body:
  - `email: string`
  - `password: string`

Success:

- status `200`
- body:
  - `{ ok: true, token: string, user: { id: string, email: string, name: string | null } }`

Failure:

- status `400`, `401`, or `500`
- body includes `error`

### 6.2 Session validation

Request:

- `GET /api/auth/me`
- header:
  - `Authorization: Bearer <token>`

Success:

- status `200`
- body:
  - `{ user: { id: string, email: string, name: string | null } }`

Failure:

- status `401`

### 6.3 Upload

Request:

- `POST /api/upload`
- multipart form-data
- file field name:
  - `file`
- header:
  - `Authorization: Bearer <token>`

Success:

- status `201`
- body:
  - `{ path: string }`

Failure:

- status `400`, `401`, or `500`

### 6.4 Create record

Request:

- `POST /api/records`
- JSON body:
  - `lat: number`
  - `lng: number`
  - `speciesLatin: string`
  - `plantedAt: string`
  - `locality?: string | null`
- header:
  - `Authorization: Bearer <token>`

Success:

- status `201`
- body:
  - `{ record }`

Important:

- do not send `photoPath`
- do not send `note`
- current backend create route does not accept them

### 6.5 Patch record

Request:

- `PATCH /api/records/[recordNumber]`
- JSON body:
  - `photoPath?: string | null`
  - `note?: string | null`
- header:
  - `Authorization: Bearer <token>`

Success:

- status `200`
- body:
  - `{ record }`

## 7. V1 scope

The agent must build only this scope.

Must build:

- login screen
- auth persistence
- startup token validation via `/api/auth/me`
- single create-record screen
- photo capture / file input
- GPS capture
- create flow using existing endpoints
- success state

Must not build:

- offline mode
- queue / sync
- list of previous records
- record editing UI
- map UI
- reverse geocoding
- reminders
- admin tools
- native mobile wrapper
- new backend service

## 8. Exact V1 UI

### 8.1 Screen A: login

Controls:

- email input
- password input
- submit button

Behavior:

- call `POST /api/auth/login`
- store token locally
- validate token on future app starts via `/api/auth/me`

### 8.2 Screen B: create record

Controls:

- photo capture / choose input
- preview of selected image
- button `Nacist polohu`
- read-only lat display
- read-only lng display
- `speciesLatin` text input
- `plantedAt` date input
- `locality` text input
- `note` textarea
- submit button
- logout button

Binding rules:

- photo is required in V1
- coordinates are required in V1
- `speciesLatin` is required
- `plantedAt` is required
- `locality` is optional
- `note` is optional

Initial state:

- `plantedAt` defaults to today
- lat/lng empty until geolocation succeeds

### 8.3 Screen C: success state

Must show:

- confirmation of success
- created `recordNumber`
- action `Novy zaznam`

Behavior:

- reset form for another entry
- keep the logged-in session

## 9. Technical requirements for the new repo

Use:

- Next.js
- TypeScript
- React Query
- Zod

The new repo must not include:

- Prisma
- direct database access
- copied backend route logic from the main app

Reason:

- the app is an external client, not another backend owner

## 10. Runtime configuration requirements

The new repo must use environment-based API configuration.

Required environment variable:

- `NEXT_PUBLIC_API_BASE_URL`

Behavior:

- in local development, the app may proxy to the existing backend
- in production, requests must still be presented to the browser as same-origin or reverse-proxied

The agent must not hardcode the production backend URL.

## 11. Acceptance criteria

The implementation is done only if all of these are true.

### 11.1 Repository boundary

- all new app code exists only in the new repository
- no UI code was added to `evidence-stromu-2`
- no backend code was changed in `evidence-stromu-2`

### 11.2 Auth

- user can log in with an existing account
- token persists across refresh
- app validates token on startup using `/api/auth/me`
- invalid token returns the user to login

### 11.3 Record creation

- user can capture or choose one image
- app uploads it via `/api/upload`
- app creates a record via `/api/records`
- app patches the record via `/api/records/[n]`
- created record ends up with:
  - coordinates
  - species
  - planted date
  - optional locality
  - optional note
  - photoPath

### 11.4 System integration

After successful submit:

- the new record exists in the same backend system
- it is visible in the main application for the same user
- uploaded image path is under `/uploads/...`

## 12. Manual verification sequence

1. open the mobile app
2. log in with a valid existing account
3. validate that startup auth works after refresh
4. choose or capture a photo
5. request geolocation
6. enter `speciesLatin`
7. submit the record
8. verify upload succeeded
9. verify create succeeded
10. verify patch succeeded
11. verify success state shows `recordNumber`
12. verify the record appears in the main app

## 13. What the agent must not ask

The agent must not ask where to write code.
That is already decided.

Write code only in the new external repository:

- `evidence-stromu-mobile`

Use the current system only as an external HTTP-integrated backend.

## 14. Final instruction to the agent

Build the simplest external client that works with the current backend exactly as it exists today.

That means:

- separate repo
- no shared codebase
- no edits in `evidence-stromu-2`
- no new backend
- no direct DB access
- no speculative features
- no CORS assumptions

Implementation order:

1. create new repo
2. implement login + token persistence
3. implement photo + geolocation form
4. implement `upload -> create -> patch`
5. verify the record appears in the current system
