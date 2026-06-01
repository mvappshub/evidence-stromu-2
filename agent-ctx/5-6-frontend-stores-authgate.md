# Task 5-6: Zustand Stores & AuthGate Component

## Summary
Created Zustand state management stores and the AuthGate authentication wrapper component.

## Files Created/Modified

1. **`src/store/useUiStore.ts`** - UI state (viewMode, selectedRecord, search, filters)
2. **`src/store/usePlantStore.ts`** - Planting context (active species/date/locality, place mode, recent species, undo support)
3. **`src/components/AuthGate.tsx`** - Auth gate with SessionProvider, login/register tabs, Czech labels, zod validation
4. **`src/components/QueryProvider.tsx`** - TanStack Query provider (30s stale time, no refetch on focus)
5. **`src/app/layout.tsx`** - Updated: Czech metadata, QueryProvider, Sonner Toaster

## Key Decisions
- MRU pattern for recent species (max 10)
- SessionProvider + AuthGateInner pattern for proper useSession context
- Sonner toasts for auth error/success feedback
- Auto sign-in after registration
- `.refine()` in Zod for password confirmation matching
