# Task 5-a: Comprehensive Styling Overhaul

## Agent: Styling Subagent A
## Task: Improve UI from 5/10 to 8+/10 across all components

### Summary of Changes

#### 1. globals.css — New CSS utilities and animations
- Smooth page transition (`page-enter` keyframes)
- Green shimmer skeleton loading (`.skeleton-green`)
- Hover-lift effect for cards/buttons (`.hover-lift`)
- Smooth scroll behavior (`html { scroll-behavior: smooth }`)
- Better focus-visible states with green accent
- Print-friendly styles (`@media print`)
- Green accent strip for dialogs (`.dialog-accent-top`)
- Animated gradient background (`.animated-gradient-bg`)
- View mode active left accent (`.view-mode-active`)
- Green chip hover animation (`.chip-hover`)
- Status bar separators (`.status-separator`)

#### 2. AppShell.tsx
- h-10 → h-11 toolbar height
- Green-tinted gradient background with backdrop-blur
- "Evidence stromů" label next to icon (md+ screens)
- Green badge/chip for tree count with dot indicator
- View mode toggle in bg-muted/40 container with left accent on active

#### 3. RecordsTable.tsx
- Sticky header with bg-muted/60 backdrop-blur
- Green left border on selected rows (border-l-2 border-l-green-500)
- "Zobrazeno X–Y z Z" range text in pagination
- Gradient background on empty state
- Custom green shimmer skeleton (replaced Skeleton components)
- "Záznam" column header instead of "#"

#### 4. PlantContextBar.tsx
- max-w-3xl mx-auto with increased padding
- Green gradient background with backdrop-blur
- Green focus rings on inputs (focus-visible:ring-green-500/40)
- chip-hover animation on species chips
- Tooltip on place mode button showing "P" shortcut
- All inputs h-9 (was h-8)

#### 5. StatusBar.tsx
- h-6 → h-7 height
- Green dot indicator instead of Wifi icon for "Připojeno"
- Shows "X stromů v databázi" using czechPlural
- Subtle separators between status items

#### 6. StatisticsPanel.tsx
- w-80 → w-96 popover width
- Gradient header background
- Section headers with icons (TreePine, MapPin, Calendar)
- Percentage labels on bar charts
- Yearly timeline with connecting lines, hover, taller chart

#### 7. RecordEditor.tsx
- Green accent strip at top (.dialog-accent-top)
- Section labels with icons (TreePine, CalendarDays, MapPin, FileText, Camera)
- DMS coordinate display (toDMS utility function)
- "Smazat záznam" delete button with gap-1.5
- Separators between form sections
- All inputs h-9, green-tinted borders

#### 8. AuthGate.tsx
- Animated gradient background (.animated-gradient-bg)
- Green-tinted card shadow
- hover-lift effect on card
- Version number at bottom (v1.0.0)

### Verification
- Lint: 0 errors, 3 warnings (all pre-existing)
- Dev server compiles and runs correctly
- No functionality broken
