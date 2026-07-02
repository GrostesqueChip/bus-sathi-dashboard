// ── Service plan ──────────────────────────────────────────────────────────
// The dashboard surfaces Phase-1 (the recommended, deployable plan) as the
// single plan. The Phase-2 aspirational figures are retained below for
// reference only — the side-by-side comparison UI was removed (RTO ask).
//
// Authoritative figures from the engine:
//   - Phase-1 Recommended = the LIVE v3.4.5 plan → 1,011 buses (187 HPV / 754 MPV
//     / 70 LPV) on 186 active routes (32 trunk / 154 feeder). City headways
//     15/20/35 min, rural lifelines demand-sized 35–50 (max 50-min wait); 35.2% walkshed coverage
//     (2.32M of the 6.58M Kashmir Division). +69% over current ~600. v3.4.4 applied
//     the AI route-by-route real-world verification (48 cited distance corrections;
//     fleet 1,044→1,004); v3.4.5 then anchored 5 GPS-verified Srinagar corridors to
//     their MEASURED bus moving speeds from the Bus Sathi app traces (cycle/fleet
//     recomputed, +7 buses). See ROUTE_VERIFICATION_RTO_APPENDIX + REALITY_CHECK.
//   - Phase-2 Aspirational = v3.3.4 (15-min on every trunk) → 1,113 buses.
// Srinagar currently runs ~600 buses; expansion % is measured against that.
//
// This module is intentionally free of any server-only imports (no `fs`) so it
// can be consumed directly by client components.

export interface KashmirServicePlan {
  id: 'phase1' | 'phase2';
  version: string;
  name: string;
  badge: string;
  tagline: string;
  totalFleet: number;
  hpv: number;
  mpv: number;
  lpv: number;
  busesPer1000: number;
  expansionPercent: number;
  recommended: boolean;
}

export interface KashmirHeadwayBand {
  band: string;
  scope: string;
  phase1Min: number;
  phase2Min: number;
  note: string;
}

export const KASHMIR_CURRENT_FLEET = 600;

export const KASHMIR_SERVICE_PLANS: {
  phase1: KashmirServicePlan;
  phase2: KashmirServicePlan;
  headwayBands: KashmirHeadwayBand[];
  sharedRoutes: number;
  sharedTrunk: number;
  sharedFeeder: number;
} = {
  phase1: {
    id: 'phase1',
    version: 'v3.4.5',
    name: 'Phase-1 — Recommended',
    badge: 'Recommended for Year-1',
    tagline: 'City routes ≤35 min; long rural lifelines demand-sized (35–50 min) — a recommended year-round level. Route distances independently verified (v3.4.4) and 5 core corridors anchored to measured GPS speeds (v3.4.5).',
    totalFleet: 1011,
    hpv: 187,
    mpv: 754,
    lpv: 70,
    busesPer1000: 0.44,
    expansionPercent: 69,
    recommended: true,
  },
  phase2: {
    id: 'phase2',
    version: 'v3.3.4',
    name: 'Phase-2 — Aspirational',
    badge: 'Long-term target',
    tagline: 'Buses every 15 minutes on every trunk — the full-service ambition.',
    totalFleet: 1113,
    hpv: 140,
    mpv: 827,
    lpv: 146,
    busesPer1000: 0.67,
    expansionPercent: 85,
    recommended: false,
  },
  // Headway = how often a bus comes. Lower minutes = more frequent = more buses.
  headwayBands: [
    {
      band: 'SSCL e-bus trunks',
      scope: '30 SSCL routes (of 32 trunks)',
      phase1Min: 15,
      phase2Min: 15,
      note: 'Unchanged — matches SSCL’s own published 15-min design target.',
    },
    {
      band: 'Main trunk corridors (HP)',
      scope: 'main HP corridors',
      phase1Min: 20,
      phase2Min: 15,
      note: 'The core trade-off: 20-min in Phase-1 vs 15-min in Phase-2.',
    },
    {
      band: 'Feeder routes (MP)',
      scope: 'feeder corridors',
      phase1Min: 35,
      phase2Min: 30,
      note: 'Slightly relaxed in Phase-1 to match peer-city feeder norms.',
    },
    {
      band: 'Lifeline routes (LP)',
      scope: 'lifeline corridors',
      phase1Min: 35,
      phase2Min: 30,
      note: 'City + feeder routes ≤35 min. Long rural lifelines are now demand-responsive (35/40/45/50 min, 50-min hard max wait) — a recommended size the RTO can reduce at execution.',
    },
  ],
  sharedRoutes: 186,
  sharedTrunk: 32,
  sharedFeeder: 154,
};
