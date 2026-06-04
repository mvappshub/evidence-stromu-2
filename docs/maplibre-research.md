# MapLibre — ekosystém a nápady pro mapu

Referenční přehled (ne specifikace implementace). Aktuální podklady v kódu: `src/lib/map-basemaps.ts` (OSM, ortofoto ČÚZK, topo, dark).

Zdroje: [katalog pluginů MapLibre](https://maplibre.org/maplibre-gl-js/docs/plugins/), dokumentace MapLibre / Protomaps / OpenMapTiles.

---

## Jak na MapLibre nahlížet

**MapLibre GL JS** = WebGL renderer v prohlížeči + style JSON + interakce.
┌─────────────────────────────────────────┐ │ Vaše data (stromy, clustery, měření) │ GeoJSON, markery ├─────────────────────────────────────────┤ │ MapLibre (engine) │ zoom, vrstvy, události ├─────────────────────────────────────────┤ │ Podkladová mapa (tiles / style) │ OSM, MapTiler, PMTiles… └─────────────────────────────────────────┘


**OpenStreetMap v rohu mapy** = attribution zdroje podkladu, ne druhý engine.

### Co engine umí sám

- GeoJSON source, vrstvy: `circle`, `symbol`, `line`, `fill`, `heatmap`, `raster`
- Vestavěný clustering na GeoJSON (`cluster: true`) — alternativa k Supercluster
- Markery, popupy, ovládací prvky
- `addProtocol` pro vlastní protokoly (PMTiles, COG…)
- 3D terén (s `raster-dem`), custom WebGL vrstvy

---

## Stav v projektu Evidence stromů

| Oblast        | Použito                          | Poznámka                          |
|---------------|----------------------------------|-----------------------------------|
| Engine        | `maplibre-gl`                    | `MapView.tsx`                     |
| Clustery      | `supercluster`                   | ruční index + GeoJSON source      |
| Podklad       | OSM, ČÚZK ortofoto, topo, dark   | `map-basemaps.ts`                 |
| OSM stromy    | Overpass přes `/api/map/osm-trees` | referenční vrstva, ne oficiální stav |
| Vyhledávání   | Photon → flyTo, bbox ČR          | `MapPlaceSearch.tsx`              |
| Vizuál bodů   | kontrast na ortofotu             | `map-tree-layer-paints.ts`        |
| Geoman        | ne                               | volitelné                         |
| Měření        | vlastní (GeoJSON + haversine)    | ne Geoman                         |

---

## 1. Podklady (basemaps)

### Raster tiles (PNG dlaždice)

| Zdroj              | Poznámka                                      |
|--------------------|-----------------------------------------------|
| OpenStreetMap      | `tile.openstreetmap.org`, attribution, limity |
| OpenTopoMap        | topografický raster                           |
| Carto              | Positron, Dark Matter                         |
| ČÚZK / ZM / WMTS   | české ortofoto, ZM (licence, API klíč)        |
| Google Map Tiles   | plugin `maplibre-google-maps`                 |
| Bing / Mapbox      | komerční, API klíč                            |
| WMS / WMTS         | style spec, `raster` + WMS URL                |

### Vector tiles (MVT)

| Ekosystém      | Popis                                              |
|----------------|----------------------------------------------------|
| OpenMapTiles   | schéma, self-host — https://openmaptiles.org/      |
| MapTiler       | tiles, styly, geocoding — https://docs.maptiler.com/maplibre/ |
| Protomaps      | PMTiles, `@protomaps/basemaps`                     |
| PMTiles        | jeden soubor, S3/R2, bez klasického tile serveru |
| Esri VTS       | přes esri-gl / mapbox-gl-esri-sources              |
| Vlastní        | Martin, Tegola, PostGIS → MVT                      |

### Terén / výška

- `raster-dem` (Terrarium, MapTiler terrain RGB)
- pluginy: `maplibre-contour`, `maplibre-contourmap`, `mapbox-gl-elevation`

### Fonty a sprites

- glyphs + sprite ve style JSON (MapTiler, Protomaps assets, vlastní host)

---

## 2. Oficiální pluginy MapLibre GL JS

Kompletní seznam: https://maplibre.org/maplibre-gl-js/docs/plugins/  
(Odhad ~82 pluginů + framework integrace, růst od 2023.)

### UI a ovládání

| Plugin | Účel |
|--------|------|
| maplibre-gl-geocoder | vyhledávání míst |
| maptiler-geocoding-control | geocoding MapTiler |
| maplibre-search-box | Stadia Maps |
| mapbox.photon | Photon API |
| maplibre-gl-basemaps | přepínání raster podkladů |
| map-gl-style-switcher | přepínač stylů (+ react-map-gl) |
| maplibre-gl-style-flipper | přepínání stylů |
| maplibre-transition | plynulé přechody stylů |
| maplibre-gl-compare | swipe dvou map |
| mapboxgl-minimap / maplibregl-minimap | minimapa |
| maplibre-gl-export | PDF, PNG, JPEG, SVG |
| maplibre-gl-map-to-image | statický obrázek do `<img>` |
| maplibre-gl-video-export | animace → WebM/MP4 |
| maplibre-gl-opacity | vrstvy + opacity (Leaflet-like) |
| maplibre-gl-layers-control | show/hide vrstev, legenda |
| maplibre-gl-measures | měření na mapě |
| maplibre-compass-pro | kompas |
| mapbox-gl-controls | pravítko, style inspector, lokalizace |
| maplibre-gl-glass-css | glass UI pro controls |
| maplibre-preload | přednačítání dlaždic |
| mapbox-gl-legend | legenda ze style |
| mapbox-gl-infobox | infobox / gradient control |
| mapbox-gl-framerate / mapbox-gl-fps | měření FPS |

### Kreslení a editace geometrie

| Plugin | Účel |
|--------|------|
| maplibre-geoman (@geoman-io/maplibre-geoman-free/pro) | CAD-like draw/edit |
| mapbox-gl-draw | základní kreslení |
| Terra Draw | drawing + MapLibre adapter |
| maplibre-gl-multiple-color-draw | více barev, React hook |
| route-snapper | trasy/plochy na silnicích |

### Routing / isochrony

| Plugin | Účel |
|--------|------|
| any-routing | modulární routing |
| mapbox-gl-valhalla | isochrony (Valhalla server) |

### Vizualizace a rendering

| Plugin | Účel |
|--------|------|
| deck.gl | pokročilé WebGL vrstvy |
| L7-maplibre-gl | AntV L7 |
| maplibre-three-plugin | Three.js na mapě |
| echartslayer / maplibre-gl-echarts-layer | ECharts |
| flowmap.blue | flow mapy |
| H3J / H3T | H3 hex grid |
| maplibre-contour / maplibre-contourmap | vrstevnice |
| maplibre-gl-dates | časové filtry |
| maplibre-adiff-viewer | OSM diff |
| maplibre-gl-teritorio-cluster | HTML clustery |
| Gauge Legend | dynamická legenda |
| mapbox-gl-traffic | dopravní vrstvy |
| Diplomat / mapbox-gl-language | lokalizace popisků |
| mapbox-gl-rtl-text / maplibre-gl-complex-text | RTL / složité skripty |
| geogrid-maplibre-gl | geografická mřížka |
| maplibre-gleo | alternativní WebGL symboly |
| Americana Shield Renderer | štíty dálnic |

### Speciální zdroje dat

| Plugin | Účel |
|--------|------|
| PMTiles | dlaždice bez tile serveru |
| maplibre-cog-protocol | Cloud Optimized GeoTIFF |
| mapbox-gl-flatgeobuf | FlatGeobuf |
| mapbox-gl-ogc-feature-collection | OGC Features API |
| mapbox-gl-esri-sources / esri-gl | ArcGIS služby |
| mapbox-gl-arcgis-featureserver | FeatureServer |
| Allmaps Maplibre | georeferencované IIIF |
| maplibre-gl-lidar | LIDAR |
| @naivemap/maplibre-gl-image-layer | georeferencované obrázky (proj4) |
| maplibre-gl-vector-text-protocol | CSV, KML, GPX, TopoJSON |
| maplibre-merge-protocol | merge tilesetů |
| backproj/maplibre-proj | libovolné CRS (PROJ WASM) |
| maplibre-google-maps | Google raster tiles |

### Street View

| Plugin | Účel |
|--------|------|
| maplibre-pegman | Google Street View |
| @rezw4n/maplibre-google-streetview | (zmíněno v zadání projektu) |

### Utility knihovny

| Knihovna | Účel |
|----------|------|
| supercluster | shlukování bodů (**používáme**) |
| @turf/turf | buffer, intersect, area, simplify… |
| geojson-map-fit-mercator | fit viewport + bearing |
| mapbox-gl-sync-move | synchronní více map |
| mapbox-gl-utils / mapbox-gl-layer-groups | práce s vrstvami |
| simplespec-to-gl-style | simplestyle → MapLibre style |
| map-gl-offline | offline tiles |
| maplibregl-mapbox-request-transformer | Mapbox Studio style v MapLibre |
| maplibregl-theme | UI theming |
| maplibre-legend | legenda ze style.json |
| expression-jamsession | Studio formule → expressions |
| mapbox-choropleth | choropleth z CSV |

### Dev / test

| Plugin | Účel |
|--------|------|
| maplibre-gl-inspect | inspect vector features |
| mapgrab | e2e testy (Playwright, Cypress) |

---

## 3. Framework integrace

| Stack | Balíček |
|-------|---------|
| React | react-map-gl, maplibre-react-components, react-map-components-maplibre |
| Vue 3 | @indoorequal/vue-maplibre-gl, LibreGL |
| Svelte | svelte-maplibre, svelte-maplibre-gl, svelte-maplibre-components |
| Angular | ngx-maplibre-gl |
| Astro | maps-withastro |
| OpenLayers | ol-maplibre-layer |
| Leaflet | MapLibre GL Leaflet |
| Plotly | geospatial + MapLibre |
| Elm / Ember / Jekyll | elm-mapbox, ember-mapbox-gl, jekyll-maplibre |

---

## 4. Doporučené kombinace podle úkolu

| Úkol | Typický stack |
|------|----------------|
| Levná OSM mapa | MapLibre + raster OSM (aktuální stav) |
| Profesionální vektor + search | MapLibre + MapTiler |
| 5–10k bodů | MapLibre + supercluster (nebo built-in cluster) |
| Kreslit parcely / plochy | maplibre-geoman nebo Terra Draw |
| 3D / pokročilá viz | deck.gl nebo maplibre-three-plugin |
| GIS analýza | MapLibre + Turf.js |
| Offline v terénu | map-gl-offline + PMTiles |
| Enterprise GIS | Esri sources |
| Self-host bez tile serveru | PMTiles + object storage |
| Export mapy | maplibre-gl-export |
| Street View | maplibre-pegman |

---

## 5. Vizuální vylepšení mapy (prioritizace, 2026-06)

Zaměření: **jak mapa vypadá**, ne nové GIS funkce.

| Nápad | Přínos pro vizuál | Náklady | Verdikt |
|-------|-------------------|---------|---------|
| Ortofoto ČÚZK | vysoký | nízké (WMS raster) | **hotovo** — `map-basemaps.ts` |
| Kontrast bodů na leteckém podkladu | vysoký | nízké | **hotovo** — `MAP_COLORS_AERIAL` |
| Hybrid satelit + popisky OSM (2 vrstvy, labels 40 % opacity) | střední | střední | zvážit později |
| `maplibre-transition` při přepnutí podkladu | nízký | nízké | spíš ne |
| `maplibregl-minimap` | nízký | střední (clutter UI) | ne |
| `maplibre-gl-export` / screenshot mapy | střední (výstupy) | střední | až na požádání |
| Vlastní symbol místo kruhu (ikona stromu) | střední | střední (sprite, scale) | volitelné |
| Terén hillshade (`raster-dem`) | nízký u bodů | střední | ne |
| MapTiler vector + styly | vysoký vzhled mapy | API klíč, platba | ne bez rozpočtu |

**Ortofoto ČÚZK:** jen ČR, nejlepší pro přesné umístění stromu v terénu. OSM/topo pro kontext komunikací a popisků.

---

## 6. Rozšíření relevantní pro Evidence stromů (nápady)

| Potřeba | Možné rozšíření |
|---------|------------------|
| Český podklad | ČÚZK WMTS jako raster source |
| Vyhledávání adres | maplibre-gl-geocoder / MapTiler |
| Znovu kreslit plochy | @geoman-io/maplibre-geoman-free |
| Uliční pohled | maplibre-pegman |
| Export mapy s legendou | maplibre-gl-export |
| Jednodušší React API | react-map-gl (refaktor MapView) |

---

## 7. Proveditelnost vrstev pro terénní rozhodování (výzkum 2026-06-02)

Cíl: u každé požadované vrstvy ověřit **zdroj dat**, **integraci do MapLibre**, **právní podmínky**, **co aplikace reálně umí říct uživateli** a **odhad náročnosti**.

### Shrnutí (implementovat / ne)

| Vrstva | Lze v MapLibre? | Vhodný zdroj (ČR) | Vlastnictví / právní jistota | Verdikt |
|--------|-----------------|-------------------|------------------------------|---------|
| Ortofoto / podklad | **Ano** (hotovo) | ČÚZK `ORTOFOTO_WM`, Esri, OSM | veřejné prohlížení, attribution | **Hotovo** |
| Parcely (hranice, č. parcely) | **Ano** | ČÚZK KM WMS/WMTS | **Ne** vlastník v mapě | **Ano — overlay + klik** |
| Vlastnictví | **Ne** jako mapová vrstva | Katastr (Nahlížení / DKM) | osobní údaje, jiný produkt | **Ne v této app** |
| Komunikace / chodníky | **Ano** | IS DMVS DI WMS, OSM vektor | veřejné DTM / OSM | **Ano — overlay** |
| Inženýrské sítě | **Částečně** | IS DMVS TI WMS (`dtm_ti_ver`) | agregace krajů, ne 100 % sítí | **Ano s výhradami** |
| Existující stromy (cizí) | **Ano** | OSM Overpass `natural=tree` | neúplná data | **Ano — reference** |
| Existující stromy (vaše) | **Ano** (hotovo) | vlastní GeoJSON API | plná kontrola | **Rozšířit logikou** |
| Zóny správy / obce | **Ano** | RÚIAN (WMS / ArcGIS / VFR) | CC-BY 4.0 otevřená data | **Ano — polygon + pole** |

---

### 1. Ortofoto / podkladová mapa

**Stav v projektu:** implementováno (`map-basemaps.ts`: OSM, ortofoto ČÚZK, topo, dark) + Photon vyhledávání + OSM stromy přes API proxy.

**Technicky:** raster `type: 'raster'` + `tiles[]`, stejný model jako současné podklady.

**Limity:** ČÚZK ortofoto od zoomu 6; satelit Esri není „vlastnictví pozemku“. Pro právní jistotu polohy v ČR: **ortofoto ČÚZK + katastrální mapa**.

**Závěr:** splněno.

---

### 2. Parcely / vlastnictví

#### 2a. Hranice parcel a katastrální mapa — **LZE**

**Zdroj:** ČÚZK katastrální mapa (KM), veřejná bez registrace.

| Typ služby | URL (ověřeno) | CORS z prohlížeče |
|------------|----------------|-------------------|
| WMS (doporučeno pro MapLibre) | `https://services.cuzk.gov.cz/wms/local-km-wms.asp` | `Access-Control-Allow-Origin: *` |
| WMTS Google řada | `https://services.cuzk.gov.cz/wmts/local-km-wmts-google.asp` | `*` (tile REST: `.../rest/WMTS/{Style}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}`) |

**Vrstvy WMS (z GetCapabilities):** např. `hranice_parcel`, `obrazy_parcel`, `parcelni_cisla`, `DEF_PARCELY`, `VB` (věcná břemena).

**Integrace MapLibre** (oficiální vzor: [Add a WMS source](https://maplibre.org/maplibre-gl-js/docs/examples/add-a-wms-source/)):

```javascript
tiles: [
  'https://services.cuzk.gov.cz/wms/local-km-wms.asp?SERVICE=WMS&REQUEST=GetMap&VERSION=1.1.1&LAYERS=hranice_parcel&STYLES=&FORMAT=image/png&TRANSPARENT=true&SRS=EPSG:3857&BBOX={bbox-epsg-3857}&WIDTH=256&HEIGHT=256'
]
```

**Klik na parcelu:** WMS `GetFeatureInfo` na stejné službě → číslo parcely, katastrální území (atributy dle služby). Vyžaduje implementaci dotazu z pixelu (ne jen dlaždice).

**Podmínky:** [Podmínky poskytování síťových služeb ČÚZK](https://www.cuzk.gov.cz/English/Practical-Information/Conditions-of-Provision-for-Spatial-Data-and-Netwo/Conditions-for-Provision-of-CUZK-Network-Services.aspx) — attribution, zákaz zneužití hromadného stahování.

**Náročnost:** střední (1 přepínatelná vrstva + volitelně GetFeatureInfo).

#### 2b. Vlastník / „smím tu sázet?“ — **NELZE jako volná mapová vrstva**

Veřejná WMS/WMTS KM **nezobrazuje jména vlastníků**. To je vědomé (GDPR, katastrální zákon).

| Potřeba | Realistický kanál |
|---------|-------------------|
| Vlastník parcely | Nahlížení do katastru (placený účet), úřední výpis, notář |
| Veřejný pozemek vs. soukromý | částečně odvoditelné z DKM + kontext, ne spolehlivě automaticky |
| Právní souhlas | mimo rozsah GIS app |

**Co aplikace může:** po kliku ukázat **č. parcely + k.ú.** a text „vlastníka ověřte v katastru / u investora“. Automatické „ano/ne sázet“ **nedávat** bez právního zdroje.

**Závěr:** parcely **ano**, vlastnictví **ne** (jen odkaz / ruční poznámka v záznamu).

---

### 3. Komunikace a chodníky

#### 3a. Viditelnost na mapě — **už částečně**

Podklad OSM / topo silnice zobrazuje. Není to analytická vrstva (vzdálenost, kolize).

#### 3b. Samostatná vrstva + dotaz — **LZE**

**Zdroj (preferovaný pro ČR):** IS DMVS — dopravní infrastruktura, veřejná WMS, **CORS `*`**.

| Služba | URL |
|--------|-----|
| Dopravní infrastruktura | `https://dmvs.cuzk.gov.cz/api/wms/dtm_di_ver?service=WMS` |
| Podskupiny (z capabilities) | `siln_dopr`, `dr_dopr`, `vod_dopr`, `let_dopr`, … |

Stejný WMS pattern `{bbox-epsg-3857}` jako u KM. `GetFeatureInfo` pro typ komunikace.

**Alternativa:** OSM Overpass / vektor z OSM (`highway=*`, `footway`) — celostátní, ale nekonzistentní u chodníků v obcích.

**Analýza vzdálenosti (kolize):** ne WMS, ale **vlastní kód** — Turf.js `pointToLineDistance` na GeoJSON silnic stažených pro bbox (Overpass nebo WFS). Spouštět při vkládání stromu: varování „&lt; 2 m od okraje vozovky“.

**Náročnost:** overlay střední; varování při kliku střední–vyšší.

---

### 4. Inženýrské sítě

#### Realita v ČR

**Neexistuje** jedna bezplatná celostátní vrstva všech podzemních sítí všech operátorů v reálném čase. Data jsou u správců (ČEZ Distribuce, Plyn, vodárny, města) a v **krajských DTM**.

#### Co **lze** implementovat

**IS DMVS — technická infrastruktura (agregace krajů):**

| Služba | URL | CORS |
|--------|-----|------|
| WMS TI | `https://dmvs.cuzk.gov.cz/api/wms/dtm_ti_ver?service=WMS` | `*` |
| WMTS TI | `https://dmvs.cuzk.gov.cz/api/wmts/dtm_ti_ver?service=WMTS` | ověřit stejně |

`GetFeatureInfo` → typ sítě, správce (dle DTM modelu). Mapový portál: https://dmvs.cuzk.gov.cz/mapovy-portal

**Limity DTM TI:**
- pokrytí a aktualizace závisí na kraji / VSP,
- ne všechny sítě, ne všechny hloubky,
- **není náhrada** za výkopový řád nebo dotaz u operátora (ČEZ geoportál vyžaduje často přihlášení pro projektanty).

**ČEZ Distribuce:** https://geoportal.cezdistribuce.cz/ — spíš žádosti a dokumentace, ne volný tile layer pro všechny.

**Závěr:** vrstvu **ano s výrazným disclaimerem**; automatické „místo zamítnuto kvůli plynovodu“ **ne** bez oficiálního API a kompletních dat.

**Náročnost:** střední (WMS overlay + GetFeatureInfo); právní text v UI povinný.

---

### 5. Existující stromy

#### 5a. Vaše evidence — **hotovo, chybí logika**

Data: `TreeRecord` + GeoJSON API. Chybí:
- kontrola duplicity při `POST` (bod do X m od existujícího),
- zvýraznění konfliktu na mapě.

**Implementace:** čistě backend/frontend (haversine / Turf), **bez externí služby**.

#### 5b. Cizí stromy (OSM) — **implementováno (referenční vrstva)**

**Zdroj:** Overpass `natural=tree` v bbox — serverová route `GET /api/map/osm-trees` (limity bbox a počtu prvků).

**Integrace:** GeoJSON source na mapě, jiná barva než vlastní záznamy. Data jsou neúplná — nepřepisují evidenci uživatele.

**Municipální katastry zeleně:** per obec, celostátní vrstva neexistuje.

---

### 6. Zóny správy / městské části

#### Zobrazení hranic — **LZE**

| Zdroj | URL / formát | Licence |
|-------|--------------|---------|
| RÚIAN WMS | `https://ags.cuzk.gov.cz/arcgis/services/RUIAN/MapServer/WMSServer` (viz geoportál) | veřejná služba |
| ArcGIS REST obce | `https://ags.cuzk.cz/arcgis/rest/services/RUIAN/MapServer/12` (vrstva Obec, polygon) | dotaz `geometry` + `spatialRel` |
| Stažení hranic | https://services.cuzk.gov.cz/shp/stat/ (obce, ORP, okresy) | **CC-BY 4.0** (NKOD / RÚIAN VFR) |

**Integrace:**
- **Rychlé:** WMS hranice obcí jako raster overlay.
- **Kvalitní:** jednou za měsíc import SHP/VFR do SQLite nebo bbox dotaz na ArcGIS → přiřazení `obec_kod` k záznamu.

#### Reporting / odpovědnost — **LZE v aplikaci, ne jen na mapě**

Rozšíření datového modelu (volitelné pole): `obecKod`, `mop`, `spravniObvod` — doplnění při uložení bodu (point-in-polygon).

**Photon** (už máte) doplní text `locality`, ale **nenahradí** oficiální kód obce pro exporty pro úřad.

**MČ Praha:** v RÚIAN jako MOMC; pro Prahu specifické členění použít vrstvu MOMC, ne jen obec.

**Náročnost:** WMS overlay **nízká**; automatické přiřazení zóny při save **střední**.

---

### Technický architektonický model (všechny WMS vrstvy)

```
[MapLibre mapa]
  ├─ basemap (raster)           ← hotovo
  ├─ overlay WMS (KM, DTM…)     ← raster source + {bbox-epsg-3857}
  ├─ vaše stromy (GeoJSON)      ← hotovo
  └─ OSM stromy (GeoJSON)       ← fetch Overpass per bbox

[API route /api/geocode/...]    ← volitelný proxy pro WFS/Overpass (rate limit, skrýt URL)
```

**Proč proxy:** Overpass a některé služby mají limity; server-side cache sníží riziko blokace z jedné IP uživatele.

**setStyle() problém:** při změně basemap dnes znovu přidáváte GeoJSON vrstvy — WMS overlay je nutné přidat stejným hookem (`style.load`) nebo **nepoužívat full setStyle**, jen měnit basemap layer (refactor).

---

### Doporučené pořadí implementace (po výzkumu)

| Pořadí | Vrstva / funkce | Proč |
|--------|-----------------|------|
| 1 | Duplicita vlastních bodů | žádný externí zdroj, nejvyšší UX value |
| 2 | Katastr `hranice_parcel` WMS + GetFeatureInfo | právně relevantní poloha, CORS OK |
| 3 | DMVS `dtm_di_ver` (silnice/chodníky) | kolize s provozem |
| 4 | DMVS `dtm_ti_ver` + disclaimer | sítě s výhradou |
| 5 | RÚIAN obec/MOMC + pole v DB | reporting |
| 6 | OSM stromy | **hotovo** — rozšířit jen UX/disclaimer |

---

### Co vědomě neimplementovat

- **Vlastník parcely** v mapě
- **Automatické právní „povoleno/zakázáno“**
- **Google Photorealistic 3D Tiles** (EEA omezení, jiný renderer, nesmysl pro bodovou evidenci)
- **Jedna celostátní vrstva všech sítí** — neexistuje

---

## Odkazy

- https://maplibre.org/maplibre-gl-js/docs/plugins/
- https://maplibre.org/maplibre-gl-js/docs/examples/add-a-wms-source/
- https://wms.cuzk.gov.cz/ (přehled WMS/WMTS ČÚZK)
- https://services.cuzk.gov.cz/wms/local-km-wms.asp
- https://dmvs.cuzk.gov.cz/ (DTM / TI / DI)
- https://dtmwiki.cuzk.gov.cz/02_sprava/02_vydej_dat/03_poskytovani_dat
- https://developers.google.com/maps/comms/eea/map-tiles (EEA — 3D/satellite tiles)
- https://wiki.openstreetmap.org/wiki/Overpass_API
- https://data.gov.cz/ (RÚIAN otevřená data)
- https://maplibre.org/maplibre-style-spec/sources/
- https://geoman.io/blog/the-state-of-the-maplibre-plugin-ecosystem
- https://docs.protomaps.com/basemaps/maplibre
- https://openmaptiles.org/
- https://docs.maptiler.com/maplibre/
- https://github.com/mapbox/supercluster
- https://github.com/geoman-io/maplibre-geoman

---

*Vygenerováno: červen 2026 · sekce 7 doplněna 2026-06-02 (proveditelnost vrstev, ověření CORS/URL)*