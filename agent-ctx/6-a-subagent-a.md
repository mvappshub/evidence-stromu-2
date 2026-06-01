# Task 6-a — Subagent A Work Record

## Task: Add Record Duplication, CSV Import with Progress, Print View

### Files Modified

1. **`/home/z/my-project/src/components/editors/RecordEditor.tsx`**
   - Added CopyPlus icon import
   - Added duplicateMutation for record copying with offset coordinates
   - Added "Kopírovat" button next to "Smazat záznam" in dialog footer
   - Toast: "Záznam zkopírován" / "Chyba při kopírování"

2. **`/home/z/my-project/src/components/ImportDialog.tsx`** (full rewrite)
   - Replaced bulk import with individual POST per record for progress tracking
   - Added importProgress state { current, total } for real-time progress
   - Progress bar shows actual percentage
   - Progress text: "X/N záznamů"
   - Client-side validation per row
   - Abort support via abortRef
   - Invalidates records, records-geojson, records-filters, records-count queries

3. **`/home/z/my-project/src/components/AppShell.tsx`**
   - Added Upload icon, ImportDialog import, useState for importOpen
   - Added Upload button in toolbar next to ActivityLog
   - Added ImportDialog component

4. **`/home/z/my-project/src/components/PrintView.tsx`** (new file)
   - Printer icon button with tooltip
   - Fetches filtered records + stats on click
   - Opens new window with formatted print HTML (title, summary, top 5 species, table)
   - Czech date formatting, czechPlural utility

5. **`/home/z/my-project/src/components/table/RecordsTable.tsx`**
   - Added PrintView import and component in filter bar after export buttons
   - Passes filter state as props

6. **`/home/z/my-project/src/app/globals.css`**
   - Enhanced @media print rules to hide all UI chrome
   - Print-specific table styling
   - Full-width table with overflow visible

### Lint Result
- 0 errors, 3 warnings (all pre-existing react-hooks/incompatible-library)
