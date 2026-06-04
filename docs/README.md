# Dokumentace

Přehled podkladů k projektu **Evidence výsadby stromů**. Aktuální spuštění a skripty: [README.md](../README.md) v kořeni repozitáře.

| Dokument | Obsah |
|----------|--------|
| [architecture.md](architecture.md) | Doménový model, API toky, bezpečnost, limity |
| [ui-guidelines.md](ui-guidelines.md) | Vizuální principy (DevTools / VS Code styl) |
| [maplibre-research.md](maplibre-research.md) | MapLibre ekosystém, podklady, nápady na vrstvy (referenční) |
| [security-audit-triage.md](security-audit-triage.md) | Stav `bun audit` a akceptovaná rizika (dev závislosti) |
| [open-meteo-integration-research.md](open-meteo-integration-research.md) | Počasí na mapě + u záznamů (Open-Meteo, RainViewer, OWM, Meteoblue, ČHMÚ) |
| [chmi-tree-stewardship-research.md](chmi-tree-stewardship-research.md) | CHMI / 5letý dohled nad velkým fondem stromů (výstrahy, sucho) |

## Struktura kódu (orientačně)

| Oblast | Cesta |
|--------|--------|
| API routes | `src/app/api/` |
| Mapa | `src/components/map/`, `src/lib/map-*.ts` |
| Prisma schéma | `prisma/schema.prisma` |
| Pravidla pro agenty | `.cursor/rules/` |

## CI

GitHub Actions: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) — typecheck, lint, testy, build, volitelné smoke testy (`SMOKE_PASSWORD` secret).
