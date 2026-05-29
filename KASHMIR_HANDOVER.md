# 🗺️ Kashmir Valley Route Rationalisation — Technical Handover

> **Document Version:** 1.0  
> **Engine Version:** v3.3.7  
> **Date:** May 2026  
> **Purpose:** Complete technical handover for continuing development on the Kashmir Valley route rationalisation system. This document provides everything an AI assistant or developer needs to understand, modify, and extend the system.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Before vs After: The Transformation](#2-before-vs-after-the-transformation)
3. [Route Code System](#3-route-code-system)
4. [Data Schema Reference](#4-data-schema-reference)
5. [File Map & Locations](#5-file-map--locations)
6. [How Routes Were Rationalised (The Algorithm)](#6-how-routes-were-rationalised-the-algorithm)
7. [Merge Map: Old Routes → New Routes](#7-merge-map-old-routes--new-routes)
8. [Scripts & Tooling](#8-scripts--tooling)
9. [Dashboard Component Architecture](#9-dashboard-component-architecture)
10. [Instructions for Continuing Work](#10-instructions-for-continuing-work)

---

## 1. Executive Summary

The Kashmir Valley Route Rationalisation is a data-driven transit planning project that analysed **342 legacy bus routes** from the Kashmir RTO permit register and restructured them into an optimised **192-route network** with a 3-tier hierarchy.

### The Problem (Before)
- 342 individual bus permits issued over decades (some from 1990)
- Massive route duplication — e.g., **38 separate permits** for "Soura ↔ LD" alone
- No standardised route coding system — routes identified only by "From → To via Via" text
- No data-driven frequency planning — headways and fleet sizes based on historical allocation, not demand
- No integration with the SSCL e-bus system

### The Solution (After)
- **192 unique routes** in a 3-tier hierarchy: Trunk (TRK), Feeder (FDR), SSCL Backbone
- Every route has a **12-character alphanumeric code** based on geographic sectors
- Fleet sizing and headways computed from a **Composite Demand Index (CDI)**
- Full integration with 30 SSCL e-bus backbone routes from CHALO ridership data
- Interactive dashboard, downloadable workbooks, GeoJSON, and per-route HTML maps

---

## 2. Before vs After: The Transformation

### High-Level Numbers

```
┌──────────────────────────────────────────────────────────────────┐
│                    BEFORE (Legacy System)                        │
│                                                                  │
│   342 individual bus permits                                     │
│   No standard route codes                                       │
│   Massive duplication (38x Soura↔LD, 42x Hazratbal↔LD, etc.)   │
│   ~3,207.8 total route-km across all permits                    │
│   Routes identified by "From → To via Via" text only            │
│   No demand-based fleet planning                                │
│   No integration with SSCL e-bus backbone                       │
└──────────────────────────────────────────────────────────────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │  RATIONALISATION │
                   │    ENGINE v3.3.7 │
                   └─────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│                     AFTER (New System)                           │
│                                                                  │
│   192 unique routes in 3-tier hierarchy:                        │
│     ├── 5 Trunk routes (TRK) — high-capacity corridors          │
│     ├── 157 Feeder routes (FDR) — neighbourhood connectors      │
│     └── 30 SSCL Backbone routes — e-bus with 15-min headways    │
│                                                                  │
│   Every route has a 12-char alphanumeric code                   │
│   CDI-based fleet sizing & headway planning                     │
│   Coverage: ~2.6 lakh residents across 10 districts             │
│   0 TMP (temporary) codes remaining — all resolved              │
└──────────────────────────────────────────────────────────────────┘
```

### Action Breakdown

| Action | Count | What It Means |
|--------|------:|---------------|
| **MERGED_INTO_TRUNK** | 135 | Old permits absorbed into a high-capacity trunk route. These routes no longer operate independently — their corridor is served by the trunk. |
| **RETAINED_AS_FEEDER** | 157 | Route kept as a feeder, connecting neighbourhoods to trunk routes. Gets its own fleet allocation and headway. |
| **UPGRADED_TO_TRUNK** | 50 | Route promoted from feeder to trunk status based on high CDI score. Assigned to an existing trunk corridor. |
| **Total** | **342** | All 342 legacy permits accounted for. |

### Route Type Distribution

| Type | Count | Description |
|------|------:|-------------|
| **Urban** | 308 | Within Srinagar metro area |
| **Peri-Urban** | 25 | Srinagar outskirts to satellite towns |
| **Regional/District** | 9 | Inter-district connections |

### District Origin Distribution (by route code prefix)

| District Code | District | Routes |
|:---:|----------|------:|
| **SR** | Srinagar | 235 |
| **PW** | Pulwama | 79 |
| **BG** | Budgam | 11 |
| **BR** | Baramulla | 8 |
| **SP** | Shopian | 6 |
| **KW** | Kupwara | 3 |

### Before → After: Sample Route Transformations

#### Example 1: Soura ↔ LD Corridor (38 old routes → 1 trunk)

```
BEFORE (38 individual permits):
  R0001: SOURA ↔ LD
  R0016: SOURA ↔ LD
  R0017: SOURA ↔ LD
  R0022: SOURA ↔ LD
  R0026: SOURA ↔ PARIMPORA
  R0028: SOURA ↔ LD
  R0034: SORA ↔ PARIMPORA
  R0037: SOURA ↔ LD
  R0039: SOURA ↔ LD
  R0042: SORA ↔ LD
  R0043: BAGHAT SHORA ↔ LALCHOWK
  ... + 27 more permits
  
AFTER (1 trunk route):
  TRK-047 | Code: PWSP08091416
  Action: MERGED_INTO_TRUNK
  All 38 permits consolidated into one high-capacity trunk corridor
```

#### Example 2: Hazratbal ↔ LD Corridor (42 old routes → 1 trunk)

```
BEFORE (42 individual permits):
  R0020: HAZRATBAL ↔ LD
  R0066: HAZRATBAL ↔ LD
  R0067: HAZRATBAL ↔ LD
  R0150: HAZRATBAL ↔ LD
  ... + 38 more permits

AFTER (1 trunk route):
  TRK-049 | Code: SRSP10091816
  Action: MERGED_INTO_TRUNK
  All 42 permits consolidated into one high-capacity trunk corridor
```

#### Example 3: Feeder Route Retained

```
BEFORE:
  R0006: PARIMPORA ↔ HAZRATBAL (Stage Carriage Permit, Medium Bus)

AFTER:
  FDR-101 | Code: SRSR10105418
  Action: RETAINED_AS_FEEDER
  Fleet: 3 buses | Headway: 35 min | Priority: MP
  CDI: 0.6597 | Tourist Corridor: Yes (Seasonal)
```

#### Example 4: Route Upgraded to Trunk

```
BEFORE:
  R0018: SOURA ↔ HAZRATBAL (individual permit)

AFTER:
  TRK-048 | Code: PWSR08101418
  Action: UPGRADED_TO_TRUNK
  10 old permits consolidated under this trunk
```

### Trunk Route Summary (All 5 Trunk Routes)

| Trunk ID | Route Code | Corridor | Old Routes Merged | Key Corridor |
|----------|-----------|----------|:-----------------:|-------------|
| **TRK-046** | SRSR10102510 | Jehangir Chowk ↔ Bemina | 11 | Western Srinagar |
| **TRK-047** | PWSP08091416 | Soura ↔ LD/Parimpora | 38 | Eastern → Western spine |
| **TRK-048** | PWSR08101418 | Soura ↔ Hazratbal | 10 | Eastern → University |
| **TRK-049** | SRSP10091816 | Hazratbal ↔ LD | 42 | University → City core |
| **TRK-050** | SRSR10104626 | Safakadal/Parimpora ↔ Jehangir Chowk | 34 | Old city → Commercial hub |

---

## 3. Route Code System

### Code Format: `XXYY AABB CCDD` (12 characters, no hyphens)

Every route gets a unique 12-character alphanumeric code encoding its geographic origin and destination.

```
  SRSR 1010 5418
  ││││ ││││ ││││
  ││││ ││││ ││└┘── Destination Stop_No  (18 = Hazratbal)
  ││││ ││││ └┘──── Origin Stop_No       (54 = Uttersoo/Parimpora area)
  ││││ ││└┘──────── Destination Sector_ID (10 = Srinagar sector)
  ││││ └┘────────── Origin Sector_ID      (10 = Srinagar sector)
  ││└┘───────────── Destination Tehsil_Code (SR = Srinagar)
  └┘─────────────── Origin Tehsil_Code     (SR = Srinagar)
```

### Tehsil (District) Codes

| Code | District | Sector_ID |
|:----:|----------|:---------:|
| **AN** | Anantnag | 01 |
| **BG** | Budgam | 02 |
| **BP** | Bandipora | 03 |
| **BR** | Baramulla | 04 |
| **GB** | Ganderbal | 05 |
| **KG** | Kulgam | 06 |
| **KW** | Kupwara | 07 |
| **PW** | Pulwama | 08 |
| **SP** | Shopian | 09 |
| **SR** | Srinagar | 10 |

### Stop Lookup Process

The route code is generated by looking up the origin and destination stop names against the **Kashmir_Stops_Sectored_V2.csv** file (187 stops). The matching uses a 6-level fallback strategy:

1. **Exact match** on cleaned/uppercased name
2. **Compact match** — remove all spaces and punctuation (handles "PANTHA CHOWK" vs "PANTHACHOWK")
3. **Noise-stripped compact match** — strip common suffixes like "BUS STAND", "CHOWK", "HOSPITAL"
4. **Substring match** (either direction)
5. **Fuzzy match** — `difflib.get_close_matches` with 0.80 cutoff (catches "BATAMALOO" vs "BATAMALLO")
6. **Manual map fallback** — hardcoded overrides for known stubborn names (see `MANUAL_STOP_MAP` in `update_route_codes.py`)

### Route Code Status

As of v3.3.7:
- **342 real codes** — all routes have permanent alphanumeric codes
- **0 TMP codes** — all temporary codes resolved
- **0 empty codes** — no routes without codes

---

## 4. Data Schema Reference

### `routes.json` — Primary Route Data (342 entries)

Each entry represents one **original RTO permit** and its fate in the rationalisation:

```json
{
  "Route_Code": "PWSP08091416",       // 12-char geographic code
  "Route_ID": "R0001",                // ORIGINAL permit ID (BEFORE)
  "Route_Name": "SOURA ↔ LD",         // Human-readable route name
  "Action_Taken": "MERGED_INTO_TRUNK", // What happened to this route
  "New_Route_ID": "TRK-047",          // NEW route assignment (AFTER)
  "Displaced_Operator_Class": "Private Minibus",
  "Route_KM": "7.511",                // Route length in km
  "Route_Type": "Urban",              // Urban | Peri_Urban | Regional_District
  "OSRM_Duration_S": "494.8",         // OSRM routing duration in seconds
  "Cycle_Time_Min": "60.1",           // Full cycle time in minutes
  "Congestion_Zone": "City_Core",     // City_Core | Suburban | Outer
  "N_Stops_Estimated": "15",
  "Pop_Score": "0.9375",              // Population density score [0-1]
  "POI_Score": "0.6286",              // Point-of-interest density [0-1]
  "Road_Multiplier": "1.25",          // Road quality multiplier
  "Final_CDI": "0.783",               // COMPOSITE DEMAND INDEX [0-1]
  "Social_Flag": "False",             // Protected social obligation route
  "Priority_Band": "HP",              // HP | MP | LP | SOC
  "Headway_Min": "20",                // Target headway in minutes
  "Fleet_Required": "0",              // Buses needed (0 if merged into trunk)
  "HPV_Count": "0",                   // High-platform vehicles (12m bus)
  "MPV_Count": "0",                   // Medium-platform vehicles (9m bus)
  "CMP_Trunk": "False",               // Part of CMP trunk network?
  "Population_Served": "262",          // Population catchment (hundreds)
  "Corridor_Competitors": "281",       // Overlapping routes in corridor
  "HV_POI_Count": "66",               // High-value POIs along route
  "Overlap_Metric": "0.2755",         // Spatial overlap with other routes
  "Tourist_Corridor": "False",         // Seasonal tourist route
  "Seasonal_Operability": "Year_Round",
  "Daily_Trips": "96.0",
  "Daily_KM": "721.1",
  "Daily_Capacity_Pax": "0.0",
  "Daily_Demand_Pax": "30.0",
  "Load_Ratio": "0.0",
  "Viability_Ratio": "0.006",
  "Emissions_GCO2_Daily": "685003.0",
  "Equity_Score": "0.061",
  "Map_File": "route_maps_kashmir/TRK-047.html"
}
```

### `log.json` — Decision Audit Trail (342 entries)

Same structure as routes.json but includes the `Reasoning_String` field:

```json
{
  "Route_Code": "PWSP08091416",
  "Route_ID": "R0001",
  "Route_Name": "SOURA ↔ LD",
  "Action_Taken": "MERGED_INTO_TRUNK",
  "New_Route_ID": "TRK-047",
  "Reasoning_String": "Route R0001 (SOURA ↔ LD) merged into Trunk TRK-047. Spatial overlap with trunk corridor. CDI=0.7830. Fleet=0 (counted under Trunk)."
}
```

### `impact.json` — Passenger Impact (207 entries)

Focuses on the **new route network** (unique New_Route_IDs with fleet allocation):

```json
{
  "Route_Code": "TMP-K0001",       // NOTE: impact.json may still have old TMP codes
  "New_Route_ID": "FDR-101",
  "Route_Name": "PARIMPORA ↔ HAZRATBAL",
  "Action_Taken": "RETAINED_AS_FEEDER",
  "Priority_Band": "MP",
  "Headway_Min": "35",
  "Fleet_Required": "3",
  "HPV_Count": "0",
  "MPV_Count": "0",
  "LPV_Count": "3",
  "Population_Served": "263"
}
```

### `Kashmir_Stops_Sectored_V2.csv` — Stop Reference (187 stops)

```csv
Master_Stop_Code,Stop_Name,Sector_ID,Latitude,Longitude,Stop_No,Tehsil_Code
SGR-10-51,SRINAGAR,10,34.0717455,74.8043213,51,SR
SGR-10-08,BATAMALLO,10,34.07021,74.79256,8,SR
SGR-10-25,JEHANGIR CHOWK,10,34.05399047,74.80434562,25,SR
```

Fields:
- `Master_Stop_Code`: Formatted as `SGR-{Sector_ID}-{Stop_No}`
- `Stop_Name`: Official stop name
- `Sector_ID`: Numeric sector (maps to a district)
- `Latitude`, `Longitude`: GPS coordinates
- `Stop_No`: Sequential stop number within sector
- `Tehsil_Code`: 2-letter district abbreviation

---

## 5. File Map & Locations

### Data Files (Source of Truth)

| File | Path | Format | Entries | Purpose |
|------|------|--------|--------:|---------|
| **routes.json** | `public/route-rationalization-kashmir/data/routes.json` | JSON | 342 | All old routes with new assignments, metrics, codes |
| **log.json** | `public/route-rationalization-kashmir/data/log.json` | JSON | 342 | Decision reasoning for each route |
| **impact.json** | `public/route-rationalization-kashmir/data/impact.json` | JSON | 207 | Passenger impact per new route |
| **Stops CSV** | `Kashmir_Stops_Sectored_V2.csv` | CSV | 187 | Stop names, sectors, coordinates, tehsil codes |
| **GeoJSON** | `public/route-rationalization-kashmir/Rationalised_Routes_Kashmir_v3.geojson` | GeoJSON | - | Geographic route geometries |
| **Master Map** | `public/route-rationalization-kashmir/Master_Transit_Map_Kashmir_v3.html` | HTML | - | Pre-rendered interactive map |
| **Bus Schedule (Pretty)** | `public/route-rationalization-kashmir/Kashmir_Route_Frequency_Plan_v3.3.7_RTO_Pretty.xlsx` | Excel | - | ⭐ Primary RTO download — 4-sheet bus schedule |
| **RTO Master Excel** | `public/route-rationalization-kashmir/Kashmir_Route_Frequency_Plan_v3.3.7_RTO.xlsx` | Excel | - | 9-sheet master submission workbook |
| **v3 Excel** | `public/route-rationalization-kashmir/Kashmir_Route_Frequency_Plan_v3.xlsx` | Excel | - | Full v3 workbook with all sheets |
| **Route Maps** | `public/route-rationalization-kashmir/route_maps_kashmir/*.html` | HTML | ~192 | Individual route HTML maps |
| **Rationalisation Log CSV** | `public/route-rationalization-kashmir/Rationalisation_Log_Kashmir_v3.csv` | CSV | - | CSV version of log data |

### Code Files

| File | Path | Language | Purpose |
|------|------|----------|---------|
| **Route code generator** | `generate_route_codes.py` | Python | Reads Excel, generates 12-char codes using stops CSV |
| **Route code updater** | `update_route_codes.py` | Python | Resolves TMP-* codes and patches all JSON/GeoJSON files |
| **CSV converter** | `scripts/convertKashmirCsv.js` | Node.js | Converts CSV data to JSON for the dashboard |
| **Data loader** | `lib/routeRationalizationKashmir.ts` | TypeScript | Server-side data loader with types |
| **Dashboard** | `components/rationalization-kashmir/KashmirPresentationDashboard.tsx` | TSX | Main presentation component |
| **Network Map** | `components/rationalization-kashmir/KashmirNetworkMap.tsx` | TSX | Leaflet-based network explorer |
| **Route Table** | `components/rationalization-kashmir/KashmirRouteTable.tsx` | TSX | Sortable/filterable route table |
| **Cards** | `components/rationalization-kashmir/KashmirCards.tsx` | TSX | KPI cards, distribution cards, policy cards |
| **Utilities** | `components/rationalization-kashmir/KashmirRouteUtils.ts` | TypeScript | Route key, map href, priority order helpers |
| **Source Files** | `components/rationalization-kashmir/KashmirSourceFiles.tsx` | TSX | Downloadable files panel |
| **Page** | `app/route-rationalization-kashmir/page.tsx` | TSX | Next.js page (server component, loads data) |

---

## 6. How Routes Were Rationalised (The Algorithm)

### Step 1: Load Legacy Routes
- Read all 342 route permits from the RTO register
- Parse "From → To via Via" text into structured origin/destination pairs

### Step 2: Compute Composite Demand Index (CDI)
For each route, calculate:

```
CDI = (Pop_Score × w1) + (POI_Score × w2) × Road_Multiplier
```

Where:
- **Pop_Score** [0–1]: Population density along the corridor (census grid)
- **POI_Score** [0–1]: Point-of-interest density (hospitals, schools, markets, offices)
- **Road_Multiplier** [0.75–1.25]: Road width/quality factor

### Step 3: Integrate SSCL Backbone
- 30 SSCL e-bus routes from CHALO ridership data are inserted as the fixed backbone
- These get `SSCL-XX` IDs and 15-minute headways with 98 deployed buses

### Step 4: Identify Trunk Corridors
- Routes with the highest CDI in overlapping corridors become Trunks (TRK-XXX)
- Duplicate permits on the same corridor are MERGED_INTO_TRUNK

### Step 5: Classify Remaining Routes
- Routes with sufficient CDI are RETAINED_AS_FEEDER (FDR-XXX)
- High-CDI feeders may be UPGRADED_TO_TRUNK
- Social obligation routes (hospitals, KP townships) are protected regardless of CDI

### Step 6: Fleet Sizing
- Each active route gets fleet = ceil(Cycle_Time / Headway)
- Headway is set by Priority Band, then clamped to a hard 35-min ceiling (v3.3.7): SSCL trunks 15min, HP 20min, MP/LP 35min — no route exceeds 35min
- Merged routes get Fleet=0 (their corridor is served by the trunk)

### Step 7: Generate Route Codes
- Origin and destination stop names are matched to `Kashmir_Stops_Sectored_V2.csv`
- The 6-level matching strategy resolves fuzzy names
- Final code = `{Origin_Tehsil}{Dest_Tehsil}{Origin_Sector}{Dest_Sector}{Origin_Stop}{Dest_Stop}`

---

## 7. Merge Map: Old Routes → New Routes

This shows exactly which old permits were consolidated into each trunk route. This is the key "before → after" evidence for the RTO officer.

### TRK-047: Soura ↔ LD/Parimpora Spine (38 old routes merged)

| Old Route ID | Old Route Name |
|:---:|-------------|
| R0001 | SOURA ↔ LD |
| R0016 | SOURA ↔ LD |
| R0017 | SOURA ↔ LD |
| R0022 | SOURA ↔ LD |
| R0026 | SOURA ↔ PARIMPORA |
| R0028 | SOURA ↔ LD |
| R0034 | SORA ↔ PARIMPORA |
| R0037 | SOURA ↔ LD |
| R0039 | SOURA ↔ LD |
| R0042 | SORA ↔ LD |
| R0043 | BAGHAT SHORA ↔ LALCHOWK |
| R0048 | SOURA ↔ LD |
| R0054 | SOURA ↔ PARIMPORA |
| R0056 | SOURA ↔ QAMARWARI |
| R0062 | SOURA ↔ LD |
| R0188 | SOURA ↔ PARIMPORA |
| R0247 | SOURA ↔ CHUNTWALIWAR |
| R0254 | SOURA ↔ PARIMPORA |
| R0301 | SOURA ↔ PARIMPORA |
| R0378 | SOURA ↔ LD |
| R0386 | SOURA ↔ LD |
| R0391 | SOURA ↔ LD |
| R0394 | SOURA ↔ LD |
| R0397 | SOURA ↔ LD |
| R0398 | BAGHAT SHORA ↔ LALCHOWK |
| R0403 | SOURA ↔ LD |
| R0404 | SOURA ↔ LD |
| R0406 | SOURA ↔ LD |
| R0407 | BAGHAT SHORA ↔ LALCHOWK |
| R0408 | SOURA ↔ LALCHOWK |
| R0410 | BAGHAT SHORA ↔ LALCHOWK |
| R0411 | SOURA ↔ LALCHOWK |
| R0413 | SOURA ↔ LD |
| R0432 | SOURA ↔ LD |
| R0434 | SOURA ↔ LD |
| R0440 | SOURA ↔ LD |
| R0442 | SOURA ↔ LD |
| R0443 | SOURA ↔ LD |

### TRK-049: Hazratbal ↔ LD Corridor (42 old routes merged)

| Old Route ID | Old Route Name |
|:---:|-------------|
| R0020 | HAZRATBAL ↔ LD |
| R0066 | HAZRATBAL ↔ LD |
| R0067 | HAZRATBAL ↔ LD |
| R0150 | HAZRATBAL ↔ LD |
| R0151 | HAZRATBAL ↔ LD |
| R0167 | HAZRATBAL ↔ LD |
| R0169 | HAZRATBAL ↔ LD |
| R0171 | HAZRATBAL ↔ LD |
| R0172 | HAZRATBAL ↔ LD |
| R0173 | HAZRATBAL ↔ LD |
| R0181 | HAZRATBAL ↔ LD |
| R0182 | HAZRATBAL ↔ LD |
| R0184 | HAZRATBAL ↔ LD |
| R0190 | HAZRATBAL ↔ LD |
| R0201 | HAZRATBAL ↔ LD |
| R0203 | HAZRATBAL ↔ LD |
| R0212 | HAZRATBAL ↔ LD |
| R0216 | HAZRATBAL ↔ LD |
| R0217 | HAZRATBAL ↔ LD |
| R0221 | HAZRATBAL ↔ LD |
| R0223 | HAZRATBAL ↔ LD |
| R0225 | HAZRATBAL ↔ LD |
| R0228 | HAZRATBAL ↔ LD |
| R0241 | HAZRATBAL ↔ LD |
| R0242 | HAZRATBAL ↔ LD |
| R0260 | HAZRATBAL ↔ LD |
| R0261 | HAZRATBAL ↔ LD |
| R0265 | HAZRATBAL ↔ LD |
| R0277 | HAZRATBAL ↔ LD |
| R0296 | HAZRATBAL ↔ LD |
| R0299 | HAZRATBAL ↔ LD |
| R0300 | HAZRATBAL ↔ LD |
| R0316 | HAZRATBAL ↔ LD |
| R0339 | HAZRATBAL ↔ LD |
| R0349 | HAZRATBAL ↔ LD |
| R0355 | HAZRATBAL ↔ LD |
| R0356 | HAZRATBAL ↔ LD |
| R0358 | HAZRATBAL ↔ LD |
| R0360 | HAZRATBAL ↔ LD |
| R0369 | HAZRATBAL ↔ LD |
| R0387 | HAZRATBAL ↔ LD |
| R0409 | HAZRATBAL ↔ LD |

### TRK-050: Safakadal/Parimpora ↔ Jehangir Chowk (34 old routes merged)

| Old Route ID | Old Route Name |
|:---:|-------------|
| R0008 | LAWAYPORA ↔ JEHANGIR CHOWK |
| R0058 | SAFAKADAL ↔ JEHANGIR CHOWK |
| R0059 | SAFAKADAL ↔ JEHANGIR CHOWK |
| R0061 | SAFAKADAL ↔ JEHANGIR CHOWK |
| R0063 | SAFAKADAL ↔ JEHANGIR CHOWK |
| R0097 | SAFAKADAL ↔ JEHANGIR CHOWK |
| R0098 | SAFAKADAL ↔ JEHANGIR CHOWK |
| R0101 | SAFAKADAL ↔ JEHANGIR CHOWK |
| R0102 | SAFAKADAL ↔ JEHANGIR CHOWK |
| R0104 | SAFAKADAL ↔ JEHANGIR CHOWK |
| R0105 | SAFAKADAL ↔ JEHANGIR CHOWK |
| R0124 | QAMARWARI ↔ JEHANGIR CHOWK |
| R0130 | PARIMPORA ↔ JEHANGIR CHOWK |
| R0143 | SAFAKADAL ↔ JEHANGIR CHOWK |
| R0158 | GBS ↔ LAL CHOWK |
| R0162 | PARIMPORA ↔ JAWAHAIRNAGAR |
| R0170 | PARIMPORA ↔ JAWAHIRNAGAR |
| R0174 | PARIMPORA ↔ JAWAHIRNAGAR |
| R0177 | SAFAKADAL ↔ JEHANGIR CHOWK |
| R0179 | PARIMPORA ↔ JAWAHIRNAGAR |
| R0195 | SAFAKADAL ↔ JEHANGIR CHOWK |
| R0208 | SAFAKADAL ↔ JEHANGIR CHOWK |
| R0211 | SAFAKADAL ↔ JEHANGIR CHOWK |
| R0224 | PARIMPORA ↔ JAWAHIRNAGAR |
| R0317 | LAWAYPORA ↔ JEHANGIR CHOWK |
| R0319 | RANGPORA ↔ LALCHOWK |
| R0321 | RANGPORA ↔ LALCHOWK |
| R0322 | RANGPORA ↔ LALCHOWK |
| R0344 | RANGPORA ↔ LALCHOWK |
| R0346 | RANGPORA ↔ LALCHOWK |
| R0412 | LAWAYPORA ↔ JEHANGIR CHOWK |
| R0436 | SAFAKADAL ↔ JEHANGIR CHOWK |
| R0444 | PARIMPORA ↔ JAWAHIRNAGAR |
| R0445 | SAFAKADAL ↔ JEHANGIR CHOWK |

### TRK-048: Soura ↔ Hazratbal (10 old routes merged)

| Old Route ID | Old Route Name |
|:---:|-------------|
| R0027 | SOURA ↔ HAZRATBAL |
| R0041 | SOURA ↔ HAZRATBAL |
| R0229 | SOURA ↔ HAZRATBAL |
| R0380 | SOURA ↔ HAZRATBAL |
| R0381 | SOURA ↔ HAZRATBAL |
| R0392 | SOURA ↔ HAZRATBAL |
| R0418 | SOURA ↔ HAZRATBAL |
| R0427 | SOURA ↔ HAZRATBAL |
| R0428 | SOURA ↔ HAZRATBAL |
| R0429 | SOURA ↔ HAZRATBAL |

### TRK-046: Jehangir Chowk ↔ Bemina (11 old routes merged)

| Old Route ID | Old Route Name |
|:---:|-------------|
| R0175 | JEHANGIR CHOWK ↔ BEMINA |
| R0220 | JEHANGIR CHOWK ↔ BEMINA |
| R0226 | JEHANGIR CHOWK ↔ BEMINA |
| R0236 | JEHANGIR CHOWK ↔ BEMINA |
| R0246 | JEHANGIR CHOWK ↔ BEMINA |
| R0253 | JEHANGIR CHOWK ↔ BEMINA |
| R0282 | JEHANGIR CHOWK ↔ BEMINA |
| R0289 | JEHANGIR CHOWK ↔ BEMINA |
| R0318 | JEHANGIR CHOWK ↔ BEMINA |
| R0324 | JEHANGIR CHOWK ↔ BEMINA |
| R0340 | JEHANGIR CHOWK ↔ BEMINA |

---

## 8. Scripts & Tooling

### `generate_route_codes.py`

**Purpose:** Reads the Kashmir Route Frequency Plan Excel workbook and generates 12-character route codes.

**Inputs:**
- `Kashmir_Route_Frequency_Plan_v3.xlsx` (Excel, sheet: "Route-Level Plan")
- `Kashmir_Stops_Sectored_V2.csv`

**Outputs:**
- `Routes_with_Codes.xlsx`

**How to run:**
```bash
pip install pandas openpyxl difflib
python generate_route_codes.py
```

**What it does:**
1. Reads route names from Excel
2. Extracts origin/destination from "A ↔ B" or "A TO B VIA C" format
3. Matches each stop name against the stops CSV using 5-level fuzzy matching
4. Generates `{Tehsil}{Tehsil}{Sector}{Sector}{Stop}{Stop}` codes
5. Inserts `Route_Code` column into the Excel output

---

### `update_route_codes.py`

**Purpose:** Resolves any remaining TMP-* (temporary) route codes and patches all dashboard data files in-place.

**Inputs:**
- `Kashmir_Stops_Sectored_V2.csv`
- `public/route-rationalization-kashmir/data/routes.json`
- `public/route-rationalization-kashmir/data/log.json`
- `public/route-rationalization-kashmir/Rationalised_Routes_Kashmir_v3.geojson`

**How to run:**
```bash
python update_route_codes.py
```

**What it does:**
1. Loads the stops reference CSV
2. Reads `routes.json` and finds all `TMP-*` coded routes
3. Attempts to resolve each via the same 6-level matching strategy + `MANUAL_STOP_MAP`
4. Patches `routes.json`, `log.json`, and the GeoJSON file in-place
5. Prints a summary of resolved vs still-unresolved codes

**`MANUAL_STOP_MAP`** — hardcoded overrides for names that fuzzy matching misses:
```python
MANUAL_STOP_MAP = {
    'PANZINARA':     ('SR', 10, 39),
    'BATWARA':       ('SR', 10, 11),
    'BARZALLA':      ('SR', 10, 9),
    'NASEEM BAGH':   ('SR', 10, 18),
    'NOORBAGH':      ('SR', 10, 37),
    'KHONMOH':       ('SR', 10, 40),
    'TRAL':          ('PW', 8, 13),
    'AWANTIPORA':    ('PW', 8, 5),
    'KANGAN':        ('GB', 5, 4),
    # ... see full list in update_route_codes.py
}
```

---

### `scripts/convertKashmirCsv.js`

**Purpose:** Converts the raw CSV outputs from the rationalisation engine into JSON files for the dashboard.

**How to run:**
```bash
node scripts/convertKashmirCsv.js
```

---

## 9. Dashboard Component Architecture

```
app/route-rationalization-kashmir/page.tsx  (Server Component)
    │
    ├── Calls getRouteRationalizationKashmirDataset()  ← lib/routeRationalizationKashmir.ts
    │   └── Reads routes.json, log.json, impact.json from public/
    │       Returns: { routes, log, summary, updatedAt }
    │
    └── Renders <KashmirPresentationDashboard>  (Client Component)
        │
        ├── Hero Section
        │   ├── Version badge, SSCL count, updated date
        │   ├── Title + description
        │   ├── Quick action links (Master Map, GeoJSON, Download Workbook)
        │   └── Network Coverage + Fleet KPI cards
        │
        ├── KPI Cards (4x)
        │   ├── Active Routes
        │   ├── Main / Feeder split
        │   ├── Social Obligation routes
        │   └── Route Maps count
        │
        ├── Policy Cards (4x dark section)
        │   ├── SSCL e-bus backbone
        │   ├── 3-tier POI system
        │   ├── Gender-aware demand
        │   └── Social protection
        │
        ├── Tourist Corridor Note (conditional)
        │
        ├── Network Explorer (2-column)
        │   ├── LEFT: Map viewer (Native Leaflet / Generated HTML iframe)
        │   │   └── <KashmirNetworkMap> — renders GeoJSON routes on Leaflet
        │   └── RIGHT: Route detail sidebar
        │       ├── Focused route info (code, name, action, priority)
        │       ├── Fleet metrics (buses, headway, HPV/MPV, CDI)
        │       └── Decision reasoning from log.json
        │
        ├── Distribution Cards (3x)
        │   ├── Route type mix
        │   ├── Priority bands
        │   └── Vehicle split (HPV / MPV / LPV bar chart)
        │
        ├── <KashmirRouteTable> — Sortable table with search, action filter, priority filter
        │
        └── <KashmirSourceFiles> — Download panel for all output files
```

### TypeScript Types (from `lib/routeRationalizationKashmir.ts`)

Key types used throughout:

```typescript
interface RationalizedRouteKashmir {
  routeCode: string;
  routeId: string;           // Old ID (R0001)
  routeName: string;         // "SOURA ↔ LD"
  actionTaken: string;       // MERGED_INTO_TRUNK | RETAINED_AS_FEEDER | UPGRADED_TO_TRUNK
  newRouteId: string;        // TRK-047 | FDR-101 | SSCL-06
  routeKm: number;
  routeType: string;
  finalCdi: number;
  priorityBand: string;
  headwayMin: number;
  fleetRequired: number;
  hpvCount: number;
  mpvCount: number;
  socialFlag: boolean;
  touristCorridor: boolean;
  // ... more fields
}

interface RouteRationalizationKashmirSummary {
  totalRouteRows: number;       // 342
  activeRoutes: number;         // 192
  mergedRoutes: number;         // 135
  trunkRoutes: number;          // 5
  feederRoutes: number;         // 157
  ssclBackboneRoutes: number;   // 30
  totalFleetRequired: number;
  hpvTotal: number;
  mpvTotal: number;
  lpvTotal: number;
  socialObligationRoutes: number;
  networkCoveragePercent: number;
  // ... more fields
}
```

---

## 10. Instructions for Continuing Work

### If you need to add new routes:
1. Add the route to `public/route-rationalization-kashmir/data/routes.json`
2. Generate its route code using `generate_route_codes.py` or manually using the stops CSV
3. Add a corresponding log entry to `log.json`
4. If it has geometry, add to the GeoJSON file
5. The dashboard will auto-render it

### If you need to update route codes:
1. Edit `update_route_codes.py` → add entries to `MANUAL_STOP_MAP` for any unresolved names
2. Run `python update_route_codes.py`
3. Verify 0 TMP codes remaining in the output

### If you need to add new stops:
1. Add rows to `Kashmir_Stops_Sectored_V2.csv`
2. Assign a `Sector_ID` matching the district (see Tehsil Codes table above)
3. Assign a sequential `Stop_No` within that sector
4. Re-run route code generation if needed

### If you need to change the rationalisation logic:
1. The algorithm lives outside this repo (Python pipeline producing the Excel/CSV outputs)
2. After re-running the pipeline, use `scripts/convertKashmirCsv.js` to regenerate the JSON files
3. Then run `update_route_codes.py` to resolve any TMP codes

### If you need to modify the dashboard UI:
1. All Kashmir-specific components are in `components/rationalization-kashmir/`
2. The page entry point is `app/route-rationalization-kashmir/page.tsx`
3. Data loading/types are in `lib/routeRationalizationKashmir.ts`
4. Static assets are in `public/route-rationalization-kashmir/`

### Key invariants to maintain:
- Every route in `routes.json` must have a non-empty `Route_Code` (no TMP-* codes)
- Every route must have a valid `Action_Taken` (one of the three values)
- Every route must have a `New_Route_ID` matching `TRK-XXX`, `FDR-XXX`, or `SSCL-XX`
- The `log.json` must have a matching entry for every route in `routes.json`
- Route codes must be exactly 12 characters: `{2-char Tehsil}{2-char Tehsil}{2-digit Sector}{2-digit Sector}{2-digit Stop}{2-digit Stop}`

---

> **This document was generated from live codebase analysis. All numbers, route IDs, and merge maps are derived directly from the data files in the repository.**
