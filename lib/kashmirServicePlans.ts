// ── Two service plans the decision-maker chooses between ──────────────────
// Both plans run the SAME 207 routes with identical geometry. The only
// difference is service frequency (headways), which sets fleet size.
//
// Authoritative figures from the engine:
//   - Phase-1 Recommended = the LIVE v3.3.7 plan → 1,009 buses (80 HPV /
//     807 MPV / 122 LPV). 35-min headway ceiling, trunk fleet balanced 50/50.
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
    version: 'v3.3.7',
    name: 'Phase-1 — Recommended',
    badge: 'Recommended for Year-1',
    tagline: 'Ambitious but operationally achievable from day one — no route waits over 35 min.',
    totalFleet: 1009,
    hpv: 80,
    mpv: 807,
    lpv: 122,
    busesPer1000: 0.61,
    expansionPercent: 68,
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
      scope: '45 permits / 30 routes',
      phase1Min: 15,
      phase2Min: 15,
      note: 'Unchanged — matches SSCL’s own published 15-min design target.',
    },
    {
      band: 'Main trunk corridors (HP)',
      scope: '~85 routes',
      phase1Min: 20,
      phase2Min: 15,
      note: 'The core trade-off: 20-min in Phase-1 vs 15-min in Phase-2.',
    },
    {
      band: 'Feeder routes (MP)',
      scope: '~54 routes',
      phase1Min: 35,
      phase2Min: 30,
      note: 'Slightly relaxed in Phase-1 to match peer-city feeder norms.',
    },
    {
      band: 'Lifeline routes (LP)',
      scope: '~23 routes',
      phase1Min: 35,
      phase2Min: 30,
      note: 'Brought down from 60 min (RTO ask, “1 hour is too long”) — no route waits longer than 35 min anywhere.',
    },
  ],
  sharedRoutes: 207,
  sharedTrunk: 50,
  sharedFeeder: 157,
};
