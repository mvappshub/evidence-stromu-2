# Výzkum: Počasí na mapě a u záznamů stromů

**Datum:** 2026-06-04 (revize 2 — kritická)  
**Repozitář:** Evidence výsadby stromů · MapLibre, WMS overlaye, `MaintenanceBell`, `PlantContextBar`

---

## Implementováno (2026-06-04)

- **Fáze H1 — radar srážek na mapě:** přepínač „Radar srážek“ v `MapLayerPanel`, tiles z [RainViewer](https://www.rainviewer.com/) (poslední snímek z `weather-maps.json`). Moduly: `rainviewer-radar.ts`, `map-radar-layer.ts`, hook `useRainviewerRadarLayer`. Bez vazby na jednotlivé stromy.
- **Open-Meteo předpověď v titlebaru:** zkoušeno 2026-06, zrušeno — API v praxi často nedostupné (502); pro předpověď odkaz na [ČHMÚ](https://www.chmi.cz/predpoved-pocasi/vystrahy). Výstrahy CAP zůstávají v titlebaru (`/api/weather/alerts`).

---

## 0. Sebekritika první verze reportu

První návrh **neodpověděl na otázku, kterou jsi implicitně pokládal**, a část textu byla **generický katalog API** bez vazby na tvoji app.

| Problém první verze | Proč je to špatně |
|---------------------|-------------------|
| Neformuloval **tvůj konkrétní problém** | V konverzaci nebylo „chci panel“, ale **integrace do map** — přesto doporučení „bez mapové vrstvy“. |
| Open-Meteo jako jediný hráč | Open-Meteo **nemá radarové XYZ/WMTS tiles** — pro „počasí **na mapě**“ je to špatná primární volba. |
| Flood, Climate, Ensemble, AQI, Elevation | **Výplň** — s výsadbou stromů v ČR prakticky nesouvisí; zabíraly místo podstatného. |
| „Je dnes vhodné jet na výsadbu?“ | App už má **`PlantContextBar` + place mode** — uživatel **už je v terénu**, když zakládá bod. Důležitější je **údržba** (`MaintenanceBell`, texty typu „Zalít strom“) a **riziko po výsadbě** (mráz/sucho v následujících dnech). |
| Ignorování existující mapové architektury | Máte **vzor WMS raster overlay** (`map-wms-runtime.ts`, `MapLayerPanel`) a **`setStyle()` reset** — počasí na mapě musí projít stejným hookem jako parcely, ne „přilepit GeoJSON heatmapu“. |
| Sekce „alternativy“ = 3 řádky | Požadavek na **jiná API včetně map** nebyl splněn. |

**Tato revize:** nejdřív problém a scénáře, pak **dvě integrační osy** (mapa vs. bod), pak srovnání poskytovatelů včetně **tile vrstev**.

---

## 1. Jaký problém máš (odvozený z aplikace, ne z hlavy)

Aplikace **neřeší meteorologii**. Řeší:

1. **Kde** je strom (GPS, ortofoto, parcely, OSM reference).  
2. **Kdy** byl vysazen (`plantedAt`) a **co** s ním dělat dál (připomínky).  
3. **Hromadný terén** — zakládání bodů (`placeMode`), seznam splatných úkolů (`/api/reminders/due`, zvoněk v UI).

Počasí dává smysl jen pokud **zkracuje chybné rozhodnutí v terénu** nebo **dává kontext k minulé akci**. Konkrétní otázky uživatelů (odvozené):

| # | Otázka uživatele | Kde v app | Mapa vs. data u bodu |
|---|------------------|-----------|----------------------|
| **A** | „Prší to teď / za chvíli na tom místě, kam jedu kvůli připomínce?“ | `MaintenanceBell` → `handleGoToRecord` | **Mapa** (radar/srážky) + **bod** (předpověď) |
| **B** | „Je v okolí bouřka / liják, když jsem na mapě a zakládám další stromy?“ | `PlantContextBar`, place mode | **Mapa** (radar) prioritně |
| **C** | „Hrozí mráz nebo sucho po výsadbě u tohoto stromu?“ | detail záznamu, popup | **Bod** (7–16 dní forecast), ne celá ČR |
| **D** | „Jaké bylo počasí v den výsadby?“ (zpětně, report) | tabulka / detail | **Bod** (historical reanalysis) |
| **E** | „Kde na mapě prší vs. neprší?“ (orientace v krajině) | mapové okno | **Pouze mapová vrstva** (tiles) |

**Na otázku A–E první report odpověděl jen částečně** (hlavně C, D jako text u bodu). **A, B, E vyžadují jiného poskytovatele než samotný Open-Meteo Forecast JSON.**

---

## 2. Dvě osy integrace (nemíchat)

```
                    ┌─────────────────────────────────────┐
                    │         MAPA (MapLibre)              │
                    │  raster overlay / časová animace     │
                    │  RainViewer · OWM · Meteoblue · CHMI │
                    └─────────────────────────────────────┘
                                      +
                    ┌─────────────────────────────────────┐
                    │    BOD / ZÁZNAM (lat, lng, datum)    │
                    │  JSON forecast + historical          │
                    │  Open-Meteo · OWM One Call · Meteoblue│
                    └─────────────────────────────────────┘
```

| Osa | Co uživatel vidí | Typická technologie | Open-Meteo |
|-----|------------------|---------------------|------------|
| **Mapa** | Modrý/zelený radar nad ortofotem, přepínač v `MapLayerPanel` | `{z}/{x}/{y}` raster tiles | **Ne** (jen JSON grid) |
| **Bod** | „Zítra 4 mm, min 2 °C“ u `#123` nebo v `MaintenanceBell` | REST + proxy | **Ano** (silná stránka) |

**Závěr:** „Implementovat Open-Meteo do map“ je **dvě různé úlohy**. Open-Meteo = spíš **osa bod**. Osa mapa = **RainViewer / OpenWeatherMap / Meteoblue** (příp. CHMI po vlastním zpracování).

---

## 3. Kontext v kódu (kam to sedí)

| Komponenta | Soubor | Význam pro počasí |
|------------|--------|-------------------|
| Přepínač WMS vrstev | `MapLayerPanel.tsx`, `useMapLayerStore` | **Stejné UX** pro radar/srážky jako pro parcely |
| Přidání raster overlay | `map-wms-runtime.ts` | `addSource` raster + `beforeId: FIRST_TREE_LAYER_ID` — **šablona pro weather tiles** |
| Reset při změně podkladu | `useMapStyleLifecycle.ts` → `setStyle` | Pořadí vrstev se obnovuje v `useMapInit` — weather layer **musí** být v tomto řetězci |
| Proxy externích dat | `api/map/osm-trees/route.ts` | Vzor: auth, limity, cache — pro **JSON** počasí, ne pro tiles (tiles mohou jít z klienta s klíčem nebo přes tile proxy) |
| Splné úkoly | `MaintenanceBell.tsx` | Seznam s GPS → ideální místo pro **„dnes dešť“** bez otevření mapy |
| Výsadba | `PlantContextBar.tsx` | Aktivní druh/datum — ne plánování týdne dopředu |

**Chybělo v prvním reportu:** vazba na `MaintenanceBell` a na **existující overlay pipeline** — to není kosmetika, je to rozhodnutí o složitosti.

---

## 4. Srovnání poskytovatelů (včetně map)

### 4.1 Přehledová tabulka

| Poskytovatel | Mapové tiles | Data u bodu | ČR pokrytí | Cena (typicky) | Licence / riziko |
|--------------|-------------|-------------|------------|----------------|------------------|
| **[Open-Meteo](https://open-meteo.com/en/docs)** | ❌ (jen vlastní heatmapa z gridu) | ✅ silné | ✅ | Free non-commercial; placené API | CC-BY; **non-commercial** free tier |
| **[RainViewer](https://www.rainviewer.com/api.html)** | ✅ radar PNG tiles | ❌ (jen odhad z mapy) | ✅ radar | Free personal/edu | Attribution; **ne komerce**; data mohou zmizet |
| **[OpenWeatherMap](https://openweathermap.org/api/weathermaps)** | ✅ `precipitation_new`, `temp_new`, `wind_new`, … | ✅ One Call / Current | ✅ | Free tier + **API key**; map tiles v placených plánech | Komerce možná; limity podle plánu |
| **[Meteoblue](https://docs.meteoblue.com/en/weather-apis/maps-api/tile-api)** | ✅ raster/vector tiles, plugin | ✅ point API | ✅ | **API key**, placené tiles | Komerce; počítání tiles |
| **[ČHMÚ opendata](https://opendata.chmi.cz/)** | ⚠️ PNG kompozity / HDF5 grid, **ne** standard XYZ pro MapLibre | ⚠️ přes vlastní zpracování | ✅✅ oficiální | CC-BY 4.0 | Nejsložitější integrace; **nejvyšší důvěra v ČR** |
| **Windy / Visual Crossing / atd.** | často ano | ano | ano | různé | V reportu neřešeno do hloubky — u MVP zbytečné rozptylování |

### 4.2 Open-Meteo — co skutečně umí a neumí

**Umí (osa bod):**

- Forecast 16 dní: teplota, srážky, vítr, `weather_code`, půdní vlhkost, ET₀.  
- Historical ERA5 od 1940 — k `plantedAt`.  
- Air quality / pyl (Evropa) — okrajově.

**Neumí (osa mapa bez vlastní práce):**

- Hotové `{z}/{x}/{y}` vrstvy pro MapLibre jako ČÚZK WMS.  
- Radarová animace „teď vs. před 2 h“.

**Zbytečné API pro tuto app (vyřazeno jako balast):**

- Flood (`river_discharge` u řeky v ~5 km), Climate (projekce do 2050), Ensemble, Marine, Seasonal, Geocoding (máte Photon).

### 4.3 RainViewer — nejlepší fit pro **mapovou vrstvu** (MVP radar)

- API: `https://api.rainviewer.com/public/weather-maps.json` → seznam snímků + `host` + `path`.  
- Tile URL: `{host}{path}/512/{z}/{x}/{y}/2/1_1.png` (barva, smooth dle [dokumentace](https://www.rainviewer.com/api/weather-maps-api.html)).  
- **Max zoom 7** — nad jemným přiblížením ortofota radar „zmizí“ (důležité pro UX).  
- Pokrytí: spíš **srážkový radar**, ne mráz ani vítr.  
- **Implementace u vás:** nový overlay id `radar` v `useMapLayerStore` + funkce jako `ensureWmsOverlay`, ale URL z RainViewer místo WMS; časová animace = volitelná fáze 2 (slider snímků).  
- **Složitost:** ★★☆☆☆ (1–2 dny) pokud bez animace; ★★★★☆ s časovým sliderem.  
- **Rizika:** non-commercial; kvalita mimo ČR závisí na dostupnosti radarů; **není oficiální ČHMÚ**.

### 4.4 OpenWeatherMap — mapa + bod v jednom ekosystému

- Tiles: `https://tile.openweathermap.org/map/{layer}/{z}/{x}/{y}.png?appid=KEY` — vrstvy `precipitation_new`, `temp_new`, `clouds_new`, `wind_new`, …  
- Bod: One Call API 3.0 (minutová/hodinová/denní).  
- **Výhoda:** jeden dodavatel, komerční plány jasné.  
- **Nevýhoda:** API klíč v klientovi u tiles = únik; řešit **env na serveru** + tile proxy route (jako byste dělali u OWM). Map tiles často **nejsou v nejlevnějším free tieru** — ověřit aktuální [pricing](https://openweathermap.org/price).  
- **Složitost:** ★★★☆☆ (proxy + overlay + bod).  
- **Rizika:** limity volání; závislost na jednom komerčním účtu.

### 4.5 Meteoblue — nejbohatší mapy, nejdražší provoz

- Tile API: `maps-api.meteoblue.com/v1/map/raster/{domain}/{time}/{layer}/{z}/{x}/{y}?apikey=` — dokumentace uvádí MapLibre příklady.  
- Mnoho vrstev: srážky, oblačnost, vítr, anomálie, …  
- **Složitost:** ★★★★☆ (inventory API, časové dimenze, účtování tiles).  
- **Rizika:** náklady podle tile count; overkill pro evidenci stromů bez meteo produktu.

### 4.6 ČHMÚ — když záleží na „oficiálním“ zdroji v ČR

- [opendata.chmi.cz](https://opendata.chmi.cz/) — radar HDF5, **PNG kompozity** (např. MAX_Z, MERGE srážky), CC-BY 4.0.  
- **Pro MapLibre:** není to jeden řádek `tiles: [...]` — typicky **vlastní tile server** (generování z PNG/grid) nebo statický overlay bounding box ČR.  
- **Složitost:** ★★★★★ pro plnou integraci; ★★★☆☆ pokud jen odkaz „radar ČHMÚ“ v novém okně.  
- **Hodí se:** pokud cíloví uživatelé jsou obce/školství a chtějí státní zdroj — ne pro rychlé MVP.

---

## 5. Co je podstatné (dříve chybělo)

1. **Rozlišení výsadba vs. údržba** — jiné scénáře (B vs. A/C).  
2. **Mapová vrstva vs. panel u bodu** — jiní dodavatelé.  
3. **Hook `setStyle` / obnova vrstev** — technický blocker pro jakýkoli radar overlay.  
4. **`MaintenanceBell`** — nejvyšší ROI pro počasí **bez** velké mapy (batch forecast pro unikátní lat/lng).  
5. **Mráz po výsadbě** — důležitější než „pyly“ nebo „povodeň řeky“.  
6. **Licence provozu** — free Open-Meteo + RainViewer **není** pro komerční app s reklamou/platbou.  
7. **Disclaimer** — modelová mřížka ≠ měření na parcele; nesmí nahradit odborný posudek.  
8. **Zoom limit radarů** — na ortofotu detailu radar nedává smysl; vypnout pod zoom 8–9 nebo zobrazit hint.

---

## 6. Co bylo zbytečné (vyřazeno z doporučení)

- Flood API, Climate API, Ensemble, Marine, Seasonal.  
- Air quality jako priorita (jen pokud explicitně městský use-case).  
- Elevation API (máte GPS + ortofoto).  
- GeoJSON heatmapa z Open-Meteo gridu přes celý bbox — **vysoká složitost, nízká přesnost**, duplicita k radar tiles.  
- Automatické posouvání `nextDueAt` podle počasí — **bez doménových pravidel nebezpečné**.

---

## 7. Doporučená strategie (cílená, ne generická)

### Varianta H — hybrid (doporučeno)

| Krok | Co | Poskytovatel | Složitost | Hodnota |
|------|-----|--------------|-----------|---------|
| H1 | Přepínatelná vrstva **radar/srážky** v `MapLayerPanel` | RainViewer tiles | ★★☆☆☆ | A, B, E |
| H2 | Proxy `GET /api/weather/at-point` + 7denní souhrn u vybraného stromu | Open-Meteo | ★★☆☆☆ | C |
| H3 | Stejný endpoint v `MaintenanceBell` (deduplikace souřadnic) | Open-Meteo | ★★★☆☆ | A |
| H4 | Historical jeden den k `plantedAt` v detailu záznamu | Open-Meteo archive | ★★☆☆☆ | D |

**Proč ne jen Open-Meteo:** neřeší mapu.  
**Proč ne jen RainViewer:** neřeší mráz/teplotu u bodu ani historii k datu výsadby.

### Varianta K — komerční jeden dodavatel

OpenWeatherMap tiles + One Call — pokud víte, že app bude **komerční** a chcete jednu smlouvu.

### Varianta Č — institucionální

ČHMÚ data + vlastní tile pipeline — až pokud je požadavek **oficiální zdroj** a máte budget na infra.

---

## 8. Matice složitost × riziko (MVP prvky)

| Prvek | Složitost (1–5) | Riziko (1–5) | Poznámka |
|-------|-----------------|--------------|----------|
| RainViewer overlay bez animace | 2 | 2 | Licence non-commercial |
| RainViewer + časový slider | 4 | 3 | Více tile requestů |
| Open-Meteo proxy + panel stromu | 2 | 2 | Grid ~11 km |
| Open-Meteo v MaintenanceBell | 3 | 2 | Batch + cache |
| Historical k plantedAt | 2 | 2 | |
| OWM tiles + proxy | 3 | 3 | Klíč, platba |
| Meteoblue map layers | 4 | 4 | Náklady tiles |
| CHMI vlastní tiles | 5 | 3 | Údržba pipeline |
| Open-Meteo heatmapa na mapě | 5 | 4 | **Nedoporučeno** |

---

## 9. Implementační poznámky (mapa — RainViewer)

1. Přidat `radar` do `MapOverlayId` / store (nebo samostatný `weatherRadarVisible` — raději **jeden pattern** s WMS).  
2. `ensureRadarOverlay(map)`: načíst `weather-maps.json`, vzít poslední `past` frame, sestavit tile URL.  
3. Obnovit při `style.load` (stejně jako `syncWmsOverlays`).  
4. Attribution: RainViewer + Open-Meteo (pokud obojí) v patičce `MapLayerPanel`.  
5. **Nepouštět tiles** při zoom &gt; 7 — MapLibre `maxzoom` na source nebo vypnout vrstvu.

**Příklad tile šablony:**

```
{host}{path}/512/{z}/{x}/{y}/2/1_1.png
```

---

## 10. Implementační poznámky (bod — Open-Meteo)

```
GET https://api.open-meteo.com/v1/forecast
  ?latitude={lat}&longitude={lng}
  &current=temperature_2m,precipitation,weather_code,wind_speed_10m
  &daily=temperature_2m_min,temperature_2m_max,precipitation_sum,weather_code
  &forecast_days=7
  &timezone=Europe/Prague
```

- Server route + `requireAuth`.  
- Zaokrouhlení souřadnic na 3 desetinná místa, cache 15 min.  
- Mapování `weather_code` → český popis (WMO tabulka v [docs](https://open-meteo.com/en/docs)).

---

## 11. Otevřené otázky (musíš rozhodnout ty)

1. **Je provoz komerční?** (ovlivní RainViewer + Open-Meteo free tier.)  
2. **Co je primární UI:** vrstva na mapě, nebo text u připomínek? (ovlivní pořadí H1 vs. H3.)  
3. **Potřebujete oficiální ČHMÚ**, nebo stačí radarová vizualizace?  
4. **Chcete animaci radaru**, nebo statický „poslední snímek“?  

Bez odpovědi 1–2 hrozí implementace **technicky správné, produktově mířící jinam**.

---

## 12. Závěr

- **Na tvůj implicitní problém** („počasí **v mapové aplikaci** pro výsadbu/údržbu v ČR“) první report **neodpověděl celý** — zaměřil se na JSON u bodu a odradil od mapy.  
- **Open-Meteo** je vhodné pro **forecast/historical u stromu a připomínek**, ne jako hlavní mapová vrstva.  
- **Pro mapu** dává smysl začít **RainViewer** (nejnižší bariéra, stejný raster model jako WMS) nebo **OWM/Meteoblue** při komerčním provozu.  
- **ČHMÚ** jen při požadavku na státní data a s větším rozpočtem na integraci.

---

## Odkazy

- [Open-Meteo Forecast](https://open-meteo.com/en/docs) · [Historical](https://open-meteo.com/en/docs/historical-weather-api) · [Terms](https://open-meteo.com/en/terms)
- [RainViewer Weather Maps API](https://www.rainviewer.com/api/weather-maps-api.html)
- [OpenWeatherMap Weather maps](https://openweathermap.org/api/weathermaps)
- [Meteoblue Tile API](https://docs.meteoblue.com/en/weather-apis/maps-api/tile-api)
- [ČHMÚ opendata radar](https://opendata.chmi.cz/meteorology/weather/radar/)
- Vlastní architektura mapy: [maplibre-research.md](maplibre-research.md) · [architecture.md](architecture.md)
