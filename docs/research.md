# MapLibre — ekosystém technologií a kombinací

> Přehled pro projekt Evidence stromů.  
> Zdroje: [oficiální katalog pluginů](https://maplibre.org/maplibre-gl-js/docs/plugins/), dokumentace MapLibre / Protomaps / OpenMapTiles, blog Geoman (2025).

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
| Podklad       | raster OSM / OpenTopoMap / Carto | `MapStyleSwitcher.tsx`            |
| Geoman        | ne                               | po zrušení ploch volitelné        |
| Street View   | ne                               | volitelné                         |
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

## 5. Rozšíření relevantní pro Evidence stromů (nápady)

| Potřeba | Možné rozšíření |
|---------|------------------|
| Český podklad | ČÚZK WMTS jako raster source |
| Vyhledávání adres | maplibre-gl-geocoder / MapTiler |
| Znovu kreslit plochy | @geoman-io/maplibre-geoman-free |
| Uliční pohled | maplibre-pegman |
| Export mapy s legendou | maplibre-gl-export |
| Jednodušší React API | react-map-gl (refaktor MapView) |

---

## Odkazy

- https://maplibre.org/maplibre-gl-js/docs/plugins/
- https://maplibre.org/maplibre-style-spec/sources/
- https://geoman.io/blog/the-state-of-the-maplibre-plugin-ecosystem
- https://docs.protomaps.com/basemaps/maplibre
- https://openmaptiles.org/
- https://docs.maptiler.com/maplibre/
- https://github.com/mapbox/supercluster
- https://github.com/geoman-io/maplibre-geoman

---

*Vygenerováno: červen 2026*