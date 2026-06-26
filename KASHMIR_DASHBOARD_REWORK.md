# Kashmir Dashboard Rework — plan & log (resumable)

_Goal: make the Kashmir route-rationalisation dashboard professional and
presentation-ready for the RTO — fix broken downloads, surface every key
deliverable (esp. the Pretty bus-schedule Excel), and disclose the plan's
limitations (village-coordinate approximations etc.). Token-aware: work in small
steps, tick each as done._

Live plan = **v3.4.4**: 186 active routes, 1,004 buses (HPV 187 / MPV 748 / LPV 69),
93 PASS / 88 REVIEW / 5 FAIL verified, 49 corrected, MoHUA-compliant (43 buses/lakh
served), distance MAPE 13.3%. Engine `adcb1c2`, dashboard `e71a356`.

## Checklist
- [x] **P0 — Fix broken/stale version links** in `KashmirPresentationDashboard.tsx`
  (5 × `v3.4.1` → `v3.4.4`; the hero CTA + 2 RTO-section buttons were pointing at
  purged files). Verify against existing public files.
- [x] **P1a — RTO downloads section**: add the **Route Verification Appendix**
  button alongside Pretty + Master workbook; tighten copy to v3.4.4.
- [x] **P1b — New "Verification & Assurance" highlight** (`KashmirAssurance.tsx`):
  showcase 186-route real-world verification (93/88/5 → 49 corrected), distance
  MAPE 37.4%→13.3%, MoHUA-compliant 43 buses/lakh, blind-audit agreement. This is
  the work we want reflected.
- [x] **P1c — New "Limitations & data caveats" panel** (in `KashmirAssurance.tsx`):
  village-coordinate approximations, 19 name-unverifiable stops → RTO stop register,
  mountain-pass run-times conservative, demand not yet AFC-ground-truthed, Garkote
  identity, coverage-denominator note.
- [x] **P1d — Downloads hub** (`KashmirSourceFiles.tsx`): confirm appendix +
  all v3.4.4 files surface; already data-driven from `KASHMIR_SOURCE_FILES`.
- [x] **P2 — Hero polish**: v3.4.4 badge, add a "verified" trust chip, consistent copy.
- [x] **P3 — Build/typecheck, commit + push.** (tsc clean; committed)

## Status: COMPLETE (2026-06-26)
All checklist items done. Dashboard reworked: broken v3.4.1 links fixed, RTO
downloads section adds the Verification Appendix, new Assurance + Limitations
section added (`KashmirAssurance.tsx`), hero shows v3.4.4 + verified trust chips.
`npx tsc --noEmit` passes for the changed files. Pushed to dashboard main.

## Add-on (2026-06-26): Stops, districts & route-codes register
- [x] Published the v4 geo-canonical stops registry to the dashboard
  (`data/stops_master.json` = 143 stops, `data/route_codes.json` = 186 decoded
  routes, + `Kashmir_Stops_Master_v4.csv` download). Coord-patched the 4
  re-geocoded stops (Budgam/GBS/Hazratbal/Manigam).
- [x] **CHECK**: 186/186 active route codes decode to two registry stops; all 143
  stops used; 10 districts map 1:1 to the 2-letter codes.
- [x] New `KashmirStopsCodes.tsx` — district legend, code-format explainer, and a
  searchable/tabbed Stops + Route-codes browser; wired after the route table.
- [x] Downloads hub now serves the v4 register (replaced the retired V2 file). tsc clean.

## Add-on (2026-06-26): plotted-line geometry follow-through
- Found that the v3.4.4 distance corrections updated the *numbers* everywhere but
  42 corrected routes still drew their old (pre-correction) GeoJSON line — some
  absurd (e.g. a ~3 km route drawn as 14.6 km).
- [x] Re-routed all 42 stale lines via OSRM (throttled) using their current
  endpoints — lines are now real road paths. **171/186 (91%) within 1.3× of the
  listed km; worst 2.0× (was ~6×).** km/fleet UNCHANGED (1,004) — only geometry.
- [x] Disclosed the residual on the Limitations panel ("Map lines vs planning
  distance" — ~16 corridors where the router draws a longer path than the verified
  real road). tsc clean.

## Notes
- Two download surfaces exist: the inline "RTO Official Downloads" hero band (top)
  and `KashmirSourceFiles` (bottom hub). Kept both: band = 3 hero CTAs, hub = full
  tiered list. Both now v3.4.4.
- Engine repo unchanged this pass (dashboard-only rework).
