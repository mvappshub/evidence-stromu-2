# Výzkum: CHMI a související zdroje pro 5letý dohled nad ~10 000 stromy

**Datum:** 2026-06-04  
**Kontext:** Evidence výsadby stromů — GPS body, `plantedAt`, připomínky údržby, mapové overlaye (ČÚZK, DTM, RainViewer radar).  
**Otázka:** Co z **ČHMÚ / CHMI** a okolí má **skutečný význam** pro péči o velký, drahý fond mladých stromů v následujících **5 letech** — bez over-engineeringu a bez 10 000 API volání na den.

---

## 1. Co je „problém“ (ne obecné počasí)

Provozovatel se nestará o meteorologii. Stará se o **riziko poškození nebo úhynu** investice v čase:

| Fáze (od výsadby) | Hlavní meteo rizika | Typická reakce v terénu |
|-------------------|---------------------|-------------------------|
| **0–12 měsíců** | jarní/podzimní **mráz**, **sucho** po výsadbě, vichřice | zálivka, mulč, ochrana kmene, kontrola zakořenění |
| **1–3 roky** | **letní sucho**, vedro, občas kroupy | zálivka v suchých týdnech, kontrola stresu |
| **3–5 let** | sucho, mrazíky, bouřky | méně zálivky, více kontroly struktury / zdraví |

Aplikace už řeší **kde** (mapa), **kdy vysazeno** (`plantedAt`), **co udělat** (připomínky, bulk). **Chybí vrstva „je teď v regionu ohrožení, které se týká mého fondu?“** — to má být **zónové / regionální**, ne u každého stromu zvlášť.

---

## 2. Co už máte (a stačí to jako základ)

| Schopnost app | Význam pro 5letý dohled |
|---------------|-------------------------|
| 10k+ bodů + připomínky | Plán údržby (zalít, zkontrolovat) — **jádro produktu** |
| `plantedAt` + věk cohorty | Filtrování „stromy do 2 let“ bez meteo API |
| Bulk připomínky / poznámky | Hromadná reakce na událost (po výstraze) |
| Mapa + ortofoto + parcely | Kontext lokality |
| **RainViewer radar** (implementováno) | **Srážky teď** — zóna na mapě |
| Export / záloha | Reporting pro zadavatele / obce |

**Závěr:** Meteo má **doplňovat rozhodnutí „jet / nejet, zalévat tento týden v regionu X“**, ne nahrazovat připomínky ani evidenci.

---

## 3. Princip pro 10 000 stromů (anti over-engineering)

```
ŠPATNĚ:  10 000 × Open-Meteo forecast denně
SPRÁVNĚ: 1× výstraha ČR (CAP) + 1× mapa sucha + radar na mapě
         → filtr: „máme stromy v dotčených obcích/krajích?“
         → bulk připomínka / banner v app
```

| Úroveň | Popis | Počet externích dotazů |
|--------|--------|-------------------------|
| **A – stát** | Celá ČR / kraj / okres | jednotky denně |
| **B – mapa** | Raster overlay (radar, sucho, teplota) | tiles při pohledu na mapu |
| **C – cohorta** | Stromy podle `plantedAt` + obec z RÚIAN | jen SQL v app |
| **D – bod** | Forecast u jednoho stromu | jen na vyžádání (detail) — **ne pro 10k** |

Pro váš záměr stačí **A + B** (+ stávající připomínky jako **C**).

---

## 4. ČHMÚ / CHMI — co má smysl (seřazeno podle hodnoty)

### 4.1 SIVS výstrahy (CAP XML) — **priorita 1**

**Co to je:** [Systém integrované výstražné služby](https://www.chmi.cz/predpoved-pocasi/system-integrovane-vystrazne-sluzby) — oficiální výstrahy pro ČR (mráz, vítr, bouřky, vydatné srážky, atd.) ve formátu [CAP](https://www.chmi.cz/predpoved-pocasi/napoveda-k-vystrazne-strance) (XML). Oblast platnosti: **obce s rozšířenou působností** (kód CISORP).

**Proč pro stromy:** Jediný zdroj, který uživatel může **obhájit vůči zadavateli** („vydal ČHMÚ“). Vhodné pro push/logiku: *„Výstraha: přízemní mráz — máte 340 stromů v dotčených obcích.“*

**Technicky:** Souhrnný feed (komunitně dokumentovaný např. `https://vystrahy-cr.chmi.cz/data/XOCZ50_OKPR.xml` — ověřit dostupnost v provozu). Parsování CAP → jev, úroveň, seznam obcí/kódů → průnik s **agregací stromů podle obce** (RÚIAN — viz níže).

**Složitost:** střední (parser CAP + jednou denně cache na serveru).  
**Riziko:** mapování GPS stromu → kód obce (potřeba RÚIAN nebo jednorázový import); feed občas nedostupný — cache + graceful degradation.

**Mapa:** Ne — spíš **banner / panel / e-mail** (druhá fáze).

---

### 4.2 HAMR (sucho a vodnost) — **priorita 2**

**Co to je:** [hamr.chmi.cz](https://hamr.chmi.cz/) — týdenní hodnocení **povrchového / zemědělského / meteorologického sucha**, predikce až **8 týdnů**, mapy pro celé území ČR.

**Proč pro stromy:** Letní **závlaha mladých stromů** je hlavní nákladová položka v letech 1–3. HAMR dává **zónový** signál „je v regionu sucho“ lépe než radar.

**Technicky:** Primárně **web + mapové obrázky** pro lidi; pro integraci do MapLibre je potřeba zjistit, zda existuje **WMS/tiles/API** v [opendata.chmi.cz](https://opendata.chmi.cz/) pod `hydrology/` nebo `meteorology/` — často spíš **odkaz „otevřít HAMR“** nebo statický PNG overlay s bounding boxem ČR, ne plnohodnotné XYZ tiles bez vlastního tile serveru.

**Složitost:** střední až vysoká pro mapovou vrstvu; **nízká** pro odkaz + týdenní ruční kontrolu.  
**Doporučení:** Fáze 2a — banner „Týden X: zemědělské sucho — viz HAMR“; fáze 2b — overlay pokud najdete strojově čitelný raster v opendata.

---

### 4.3 InterSucho — **priorita 2 (obsah), priorita 3 (integrace)**

**Co to je:** [intersucho.cz](https://www.intersucho.cz/) — intenzita sucha **S0–S5**, vlhkost půdy 0–40 cm a 40–100 cm, předpověď; data z modelu SoilClim + CHMI; rozlišení až na **katastr** (po modernizaci webu).

**Proč pro stromy:** Přímá vazba na **zásobu vody v půdě** — relevantnější než jen „prší / neprší“ pro zálivku.

**Technicky:** **Veřejné API pro vývojáře není** (Windy má licencovaná data; raw grid není volně k dispozici). Integrace = odkaz, stažení map, nebo **smluvní spolupráce** s CzechGlobe.

**Složitost integrace do app:** vysoká bez partnerství.  
**Doporučení:** V panelu vrstev odkaz „Sucho (InterSucho)“ → nové okno; interně sledovat, zda vznikne API v rámci NDHP ČHMÚ.

---

### 4.4 Agropočasí (katastr, 3 dny) — **priorita 3**

**Co to je:** [Portál Agropočasí](https://www.chmi.cz/o-chmu/produkty-a-sluzby/zemedelstvi) (ČZU + ČHMÚ) — předpověď teploty a srážek na **katastr**, historické řady od 2022 (teplota, půda, vlhkost, vítr, …).

**Proč pro stromy:** Jemnější než celostátní výstraha, ale stále **zóna (katastr)**, ne 10k bodů.

**Technicky:** Ověřit strojový přístup (embed / export); může být web-only.

**Doporučení:** Až po CAP + HAMR; užitečné pro report „katastr X: očekává se 0 mm / Tmin 2 °C“.

---

### 4.5 Radar ČHMÚ (opendata) vs. RainViewer — **volitelné vylepšení**

**Co to je:** [opendata.chmi.cz/meteorology/weather/radar/](https://opendata.chmi.cz/meteorology/weather/radar/) — oficiální radarová data (HDF5, PNG kompozity), CC-BY 4.0.

**Proč zvažovat:** **Oficiální zdroj** pro zadavatele ve veřejné správě; RainViewer je praktický, ale **nekomerční / třetí strana**.

**Proč ne hned:** Integrace ≠ XYZ tiles (vlastní pipeline z PNG/grid). RainViewer už pokrývá **srážky na mapě**.

**Doporučení:** Ponechat RainViewer; u institucionálního projektu plánovat **ČHMÚ PNG kompozit** jako druhou vrstvu nebo náhradu.

---

### 4.6 Fenologie dřevin (opendata) — **priorita 4 (specialista)**

**Co to je:** [opendata.chmi.cz/meteorology/phenology/wood_species/](https://opendata.chmi.cz/meteorology/phenology/) — fenologická pozorování (dřeviny).

**Proč pro stromy:** Okno **rizika jarního mrazu** vůči fázi vegetace — spíš pro odborníka než pro každodenní UI.

**Doporučení:** Nepřidávat do MVP; zmínit v metodice péče / PDF pro arboristy.

---

### 4.7 Oficiální škodní / historické posudky — **mimo app**

ČHMÚ umí **oficiální popis počasí pro škodní události** (zemědělství) — placená služba. Pro spor „strom uhynul po mrazu“ je to **právní nástroj**, ne live integrace.

---

## 5. Co záměrně NEŘEŠIT (i když to zní lákavě)

| Zdroj / nápad | Proč ne pro 10k / 5 let |
|---------------|-------------------------|
| Open-Meteo u **každého** stromu | náklady, šum, mřížka ~11 km |
| Flood API / povodňové modely | řeky ≠ jednotlivé výsadby |
| Climate API 2050 | reporting, ne operativa |
| Pyly / AQI | okrajové pro výsadbu |
| Automatické „zrušit výjezd“ podle počasí | bez arboristických pravidel nebezpečné |
| Vlastní tile server z HDF5 radaru | vysoká údržba |

---

## 6. Doporučená roadmapa (5 let produktu, malé kroky)

### Fáze 0 — hotovo

- Radar srážek na mapě (RainViewer).
- Připomínky + bulk + `plantedAt`.

### Fáze 1 — nejvyšší ROI (doporučeno jako další krok)

**ČHMÚ CAP výstrahy → agregace na fond stromů**

1. Server: `GET /api/weather/alerts` — stáhne/cache CAP, vrátí aktivní jevy + seznam kódů obcí.
2. Jednorázově nebo při importu: doplnit `obecKod` k záznamu (point-in-polygon RÚIAN) **nebo** při výstraze bbox → obce z polygonu.
3. UI: **jeden banner** v `AppShell` / mapě: „Aktivní: Mráz — 412 stromů v 8 obcích“ + odkaz na ČHMÚ.
4. Akce: tlačítko „Vytvořit hromadnou připomínku: kontrola po mrazu“ (bulk reminder — už existuje API).

**Složitost:** ~3–5 dní. **Bez** mapové vrstvy.

### Fáze 2 — sucho na mapě / v přehledu

- Odkaz + týdenní shrnutí HAMR / InterSucho.
- Případně statický overlay „sucho tento týden“ pokud opendata nabídne georeferencovaný PNG s known extent.

### Fáze 3 — cohorty v app (bez externích API)

- Filtry: „stromy 0–1 rok“, „vysazeno 2024“, kombinace s výstrahou.
- Statistiky v `StatisticsPanel`: počty v rizikových obcích tento týden.

### Fáze 4 — volitelně

- Teplotní mapová vrstva (OWM tiles) pro **vedro/mráz zóny**.
- Oficiální radar ČHMÚ místo RainViewer u veřejných zakázek.

---

## 7. Matice: jev × zdroj × integrace

| Jev (5 let péče) | Nejlepší zdroj | Forma v app | Priorita |
|------------------|----------------|-------------|----------|
| Aktuální srážky | RainViewer (hotovo) / ČHMÚ radar | mapová vrstva | hotovo |
| Bouřka, vítr, vichřice | **ČHMÚ CAP** | banner + počty stromů | **1** |
| Přízemní / jarní mráz | **ČHMÚ CAP** | banner + bulk úkol | **1** |
| Letní sucho | **HAMR**, InterSucho | odkaz / později overlay | **2** |
| Zálivka potřeba | připomínky + sucho mapa | připomínky (už máte) | **0** |
| Vedro / heat stress | CAP + případně teplotní tiles | banner / fáze 4 | 3 |
| Historie „den výsadby“ | ČHMÚ stanice / Open-Meteo archive | detail záznamu | 4 |
| Škodní dokumentace | ČHMÚ služba | mimo app | — |

---

## 8. Právní a provozní poznámky

- **Otevřená data ČHMÚ:** [CC-BY 4.0](https://www.chmi.cz/o-chmu/produkty-a-sluzby/data-a-vyhodnoceni) — attribution povinná.
- **RainViewer:** non-commercial — u komerčního provozu fondu 10k stromů **ověřit** licenci (může být důvod přejít na ČHMÚ radar).
- Výstraha ≠ pokyn „strom přežije“ — v UI vždy **doporučení ke kontrole**, ne automatické rozhodnutí.

---

## 9. Co potřebujete rozhodnout (2 otázky)

1. **Máte nebo plánujete kód obce (RÚIAN / CISORP) u záznamů?** Bez toho CAP výstrahy půjdou jen jako „pro celou ČR / ruční kraj“.
2. **Je provoz komerční (obec / firma na zakázce)?** Ovlivní RainViewer vs. ČHMÚ a případnou smlouvu s CzechGlobe (InterSucho).

---

## 10. Závěr jednou větou

Pro **5letý dohled nad ~10 000 drahými stromy** dává smysl **zónový oficiální signál (ČHMÚ CAP + sucho HAMR/InterSucho) + stávající připomínky a cohorty podle `plantedAt`**, ne počasí u každého bodu; **nejdůležitější další integrace po radaru je výstrahový feed ČHMÚ s počtem dotčených stromů v obci**, ne další mapová vrstva.

---

## Odkazy

- [ČHMÚ data a vyhodnocení](https://www.chmi.cz/o-chmu/produkty-a-sluzby/data-a-vyhodnoceni)
- [opendata.chmi.cz](https://opendata.chmi.cz/)
- [SIVS / CAP](https://www.chmi.cz/predpoved-pocasi/system-integrovane-vystrazne-sluzby)
- [HAMR](https://hamr.chmi.cz/)
- [InterSucho](https://www.intersucho.cz/)
- [Agropočasí (ČHMÚ zemědělství)](https://www.chmi.cz/o-chmu/produkty-a-sluzby/zemedelstvi)
- [Počasí na mapě — interní výzkum](open-meteo-integration-research.md)

---

## Implementováno (MVP)

| Část | Soubory / endpoint |
|------|-------------------|
| **ORP u záznamu** | `TreeRecord.orpKod`, RUIAN vrstva 14 (`src/lib/ruian-orp.ts`), doplnění při POST/PATCH a obnově zálohy |
| **CAP feed** | `src/lib/chmi-cap-*.ts`, cache ~12 min, filtr stromových jevů |
| **API** | `GET /api/weather/alerts` — agregace stromů uživatele podle ORP |
| **UI** | `WeatherTitlebarControls` — výstrahy v horní liště (popover), refetch ~15 min |

Staré záznamy bez `orpKod` se doplní při změně souřadnic nebo volitelným backfill skriptem (zatím není v repu).
