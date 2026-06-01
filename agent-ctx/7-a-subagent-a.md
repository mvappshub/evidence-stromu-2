# Task 7-a: Map Measurement Tool, Data Backup & Restore, Global Search

## Work Completed

### Feature 1: Map Measurement Tool
- Created `/home/z/my-project/src/lib/haversine.ts` - Haversine formula + formatDistance utility
- Updated `/home/z/my-project/src/store/usePlantStore.ts` - Added measureMode, setMeasureMode, toggleMeasureMode with mutual exclusion
- Updated `/home/z/my-project/src/components/map/MapView.tsx` - Added Ruler button, measurement source/layers, click handler, floating panel, cursor styling

### Feature 2: Data Backup & Restore
- Created `/home/z/my-project/src/app/api/records/backup/route.ts` - GET backup endpoint
- Created `/home/z/my-project/src/app/api/records/restore/route.ts` - POST restore endpoint
- Created `/home/z/my-project/src/components/BackupRestore.tsx` - DropdownMenu with download/restore + AlertDialog confirmation

### Feature 3: Global Search
- Created `/home/z/my-project/src/components/GlobalSearch.tsx` - CommandDialog with grouped search results
- Updated `/home/z/my-project/src/components/AppShell.tsx` - Added Search button, BackupRestore, GlobalSearch
- Updated `/home/z/my-project/src/components/KeyboardShortcuts.tsx` - Added Ctrl+K shortcut, onCtrlK prop

## Lint Result
- 0 errors, 3 warnings (all pre-existing react-hooks/incompatible-library)
