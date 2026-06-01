# Task 3-4: Backend API Routes & Auth Configuration

## Status: COMPLETED

## Summary
Created all backend API routes and authentication configuration for the tree planting recording web application. All 15 files were created successfully, covering auth, user registration, tree records CRUD, geojson, bulk operations, reminders CRUD, reminder acknowledgment, due reminders, and file uploads.

## Files Created
1. `src/lib/auth.ts` - NextAuth v4 config (CredentialsProvider, JWT, callbacks)
2. `src/lib/api-auth.ts` - requireAuth() helper
3. `src/lib/reminder-utils.ts` - nextDueAt calculation utilities
4. `src/app/api/auth/[...nextauth]/route.ts` - NextAuth handler
5. `src/app/api/register/route.ts` - User registration
6. `src/app/api/records/route.ts` - List/Create records
7. `src/app/api/records/geojson/route.ts` - GeoJSON endpoint
8. `src/app/api/records/[n]/route.ts` - Update/Delete record
9. `src/app/api/records/bulk/note/route.ts` - Bulk add note
10. `src/app/api/records/bulk/reminder/route.ts` - Bulk add reminder
11. `src/app/api/reminders/route.ts` - Create reminder
12. `src/app/api/reminders/[id]/route.ts` - Update/Delete reminder
13. `src/app/api/reminders/[id]/ack/route.ts` - Acknowledge reminder
14. `src/app/api/reminders/due/route.ts` - Due reminders
15. `src/app/api/upload/route.ts` - Photo upload

## Key Decisions
- JWT session strategy for stateless auth
- Zod v4 for input validation
- date-fns for date calculations
- Dynamic params as `await params` (Next.js 16)
- File uploads validated for type/size
