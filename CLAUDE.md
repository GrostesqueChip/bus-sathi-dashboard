# CLAUDE.md — bus-sathi-dashboard

Next.js admin dashboard. The Kashmir route-rationalisation section is fed by a
sibling engine repo — **do not hand-edit the generated data**.

## Kashmir section
- Page: `app/route-rationalization-kashmir/page.tsx`
- Components: `components/rationalization-kashmir/*`
- Data loader + constants: `lib/routeRationalizationKashmir.ts`
- Data + assets: `public/route-rationalization-kashmir/`
  (`data/routes.json`, `data/impact.json`, `data/log.json`, CSVs, GeoJSON,
  Folium maps, `route_maps_kashmir/`, RTO workbooks, Routes_with_Codes.xlsx)

## Source of truth
The engine repo `Princu-Babu/kashmir-transit-rationalisation` (local
`E:\kash`) generates everything. Its `_sync_dashboard.py` copies assets here
and rebuilds the JSON. **Re-run that script in the engine repo rather than
editing `public/route-rationalization-kashmir/data/*` by hand.** See
`E:\kash\CLAUDE.md` for the full per-build workflow, version history, and the
conda/OSRM run requirements.

## Current state (engine v3.3.6)
- 207 active routes, 1,003 buses (HPV 84 / MPV 797 / LPV 122)
- 342/342 routes carry real 12-char Route_Codes (0 TMP, 0 UNMATCHED)
- Hero version pill + download links point at v3.3.6 artefacts
- `lpvCount` IS read from CSV in the loader (was a past bug — don't regress)

## When bumping engine version
Update in `lib/routeRationalizationKashmir.ts`: the narrative comment block,
`DEDUPLICATED_NETWORK_POPULATION` / `NETWORK_COVERAGE_PERCENT`, the
`KASHMIR_SOURCE_FILES` hrefs/filenames, and the GIS-features description. In
`components/rationalization-kashmir/KashmirPresentationDashboard.tsx`: the
version pill text and the RTO-workbook download hrefs. Then drop the new
`Kashmir_Route_Frequency_Plan_vX.Y.Z_RTO.xlsx` into `public/...kashmir/`.
