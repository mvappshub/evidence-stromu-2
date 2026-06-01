# Task 5-c — Feature Subagent C Work Record

## Task: Import Records from CSV + Coordinate Display in WGS84 and S-JTSK

### Feature 1: Import Records from CSV

**Backend:**
- Installed `papaparse` and `@types/papaparse` via bun
- Created `/home/z/my-project/src/app/api/records/import/route.ts` — POST endpoint:
  - Accepts multipart form data with a CSV file
  - CSV parsing with auto-detection of delimiter (semicolon first per Czech convention, then comma, then auto)
  - BOM handling (removes UTF-8 BOM if present)
  - Header mapping supports both Czech and English column names (Druh/Species, Datum výsadby/Date, Zem. šířka/Lat, Zem. délka/Lng, Lokalita/Locality, Poznámka/Note)
  - Validates required fields: speciesLatin, plantedAt, lat, lng
  - Supports multiple date formats: ISO (2024-01-15), Czech (15.1.2024 / 15. 1. 2024), and generic Date parser fallback
  - Handles comma decimal separators in coordinates (e.g. "50,7334")
  - Returns `{ imported, skipped, errors }` with row-specific error messages
  - File size limit: 5MB, record limit: 5000 per import
  - Protected with requireAuth(), all records scoped to current user
  - Errors capped at 100 messages to avoid huge responses

**Frontend:**
- Created `/home/z/my-project/src/components/ImportDialog.tsx` — Multi-step import wizard:
  - Step 1: File upload area with drag & drop + click to select
  - Step 2: Preview first 5 rows in a table with row count display
  - Step 3: Column mapping with auto-detection from headers, manual override via Select dropdowns, required field indicators (*), and mapped data preview
  - Step 4: Import progress with spinner and progress bar
  - Step 5: Results display showing imported/skipped counts, error list with scroll, success indicator
  - Step indicator bar showing current position in workflow
  - Czech labels throughout: "Importovat záznamy", "Nahrajte CSV soubor", "Náhled dat", "Mapování sloupců", "Importovat", "Importováno", "Přeskočeno", "Chyby"
  - Uses TanStack Query mutation for import, invalidates records/geojson/filters queries on success
  - Toast notifications on success/error
  - Complete state reset on dialog close

- Updated `/home/z/my-project/src/components/table/RecordsTable.tsx`:
  - Added ImportDialog import and state
  - Added Upload icon button with "Importovat" tooltip in filter bar (before export buttons)
  - Passes open/onOpenChange to ImportDialog

### Feature 2: Coordinate Display in WGS84 and S-JTSK

**Utility:**
- Created `/home/z/my-project/src/lib/coords.ts` with:
  - `wgs84ToSjtsk(lat, lng)` — Full WGS84 → S-JTSK (Křovák) transformation:
    - Step 1: WGS84 geodetic → ECEF (XYZ) using WGS84 ellipsoid parameters
    - Step 2: Helmert 7-parameter transformation (WGS84 ECEF → S-JTSK ECEF) using standard Czech parameters
    - Step 3: S-JTSK ECEF → Bessel geodetic (iterative, 5 iterations)
    - Step 4: Křovák projection (geodetic → S-JTSK plane) using spherical distance and azimuth
    - Approximate accuracy: ~1-3 meters (sufficient for tree records prototype)
  - `formatDms(lat, lng)` — Format as DMS string (e.g. "50°44'12.5"N 14°14'08.5"E")
  - `formatSjtsk(x, y)` — Format as S-JTSK (e.g. "X: 1042563 Y: 728431")

**Frontend Integration:**
- Updated `/home/z/my-project/src/components/table/CoordCell.tsx`:
  - Added lat/lng props (was only receiving recordNumber before)
  - Added Popover component showing all coordinate formats when the coordinate value is clicked:
    - WGS84 decimal: "50.7334°N, 14.2357°E"
    - WGS84 DMS: "50°44'12.5"N 14°14'08.5"E"
    - S-JTSK: "X: 1042563 Y: 728431"
  - Each format has a CopyButton with clipboard copy and visual feedback (Copy → Check icon transition)
  - Compact table layout with Czech labels: "Desetinné (WGS84)", "Stupně (WGS84)", "S-JTSK (Křovák)"
  - Original MapPin button still works for "Zobrazit na mapě"

- Updated `/home/z/my-project/src/components/editors/RecordEditor.tsx`:
  - Added "Souřadnicové systémy" section below lat/lng input fields
  - Shows DMS and S-JTSK values as read-only text with CopyBtn copy buttons
  - Compact bordered card with green MapPin icon header
  - Only displays when coordinates are valid numbers
  - Shows fallback message for invalid coordinates
  - Replaced local toDMS function with shared formatDms from coords.ts
  - Added CopyBtn helper component with clipboard copy and check feedback

### Lint Results
- 0 errors, 3 warnings (all pre-existing react-hooks/incompatible-library)
- Dev server compiles and runs correctly

### Files Created
1. `/home/z/my-project/src/app/api/records/import/route.ts` — Import API endpoint
2. `/home/z/my-project/src/lib/coords.ts` — Coordinate conversion utilities
3. `/home/z/my-project/src/components/ImportDialog.tsx` — Import wizard dialog

### Files Modified
1. `/home/z/my-project/src/components/table/RecordsTable.tsx` — Added ImportDialog, Upload button
2. `/home/z/my-project/src/components/table/CoordCell.tsx` — Added coordinate popover with all formats
3. `/home/z/my-project/src/components/editors/RecordEditor.tsx` — Added coordinate systems section
