# UI — DevTools / VS Code

Aplikace má vypadat jako **panel nástroje** (Chrome DevTools, VS Code), ne jako marketingový shadcn web.

## Principy

- **Povrchy**: `#1e1e1e` / `#252526` / `#2d2d2d` (dark), světlý režim jako DevTools light.
- **Chrome**: bez stínů, bez velkých radiusů (2–3px), bez gradientů.
- **Typografie**: 11–13px, `font-mono` pro technické labely a souřadnice.
- **Aktivní stav**: kontrastní pozadí panelu (`--background` na segmentu), ne sytě modré placky.
- **Barva**: šedá dominuje; modrá `#58a6ff` jen odkazy / body na mapě; tlačítko akce `#0e639c` jen pro významné CTA (vkládání).

## Struktura

- Horní lišta: `.devtools-titlebar` + `.devtools-segment`
- Spodní panel mapy: `.devtools-drawer`
- Menu: `data`, `nástroje` (ghost, mono)

## Mapa

Barvy pouze v `src/lib/map-colors.ts`.

## Zakázáno

- `green-*`, `emerald-*`, gradientové hero, shimmer, tilt karty, kulaté „pill“ filtry v sytých barvách.
