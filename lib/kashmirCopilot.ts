// Kashmir route-rationalisation knowledge for the chat assistant.
//
// The base chat assistant only knows the live Firebase *fleet* snapshot (drivers,
// trips, anomalies). On the Kashmir route-rationalisation dashboard, users ask
// about the PLAN itself (routes, buses, districts, headways, verification). This
// module builds that knowledge from the static, server-loaded Kashmir dataset so
// the assistant can answer those questions WITHOUT Firebase and WITHOUT OpenAI
// (a deterministic local fallback is provided too).

import { readFile } from 'fs/promises';
import path from 'path';
import type {
  RationalizedRouteKashmir,
  RouteRationalizationKashmirDataset,
  RouteRationalizationKashmirSummary,
} from '@/lib/routeRationalizationKashmir';

// Static verification facts (from the v3.4.4 assurance pass / appendix).
const VERIFICATION = {
  pass: 93,
  review: 88,
  fail: 5,
  corrections: 49,
  mapeBefore: 37.4,
  mapeAfter: 13.3,
  mapeMedian: 6.3,
  busesPerLakh: 43,
  mohuaBand: '40–60 per lakh',
  todayBusesPerLakh: 26,
};

// ── Reality Layer (observed app-GPS) facts ─────────────────────────────────
// Loaded from public/kashmir-reality/ops.json (exported by the trace-intelligence
// pipeline). Cached per server process; null when the file is absent.
type RealityOps = {
  scope: string;
  drivers: number; driver_days: number; runs: number; observed_days: number;
  duty_span_h: number; in_service_h: number; utilisation: number;
  turnaround_min: number | null; turnaround_n: number;
  day_start: string; day_end: string; peak_hour: number;
  moving_kmh: number; effective_kmh: number; dwell_share: number;
  corridor_tally: Record<string, number>;
  coverage_note: string;
};

let realityCache: RealityOps | null | undefined;

export async function getRealityOps(): Promise<RealityOps | null> {
  if (realityCache !== undefined) return realityCache;
  try {
    const raw = await readFile(path.join(process.cwd(), 'public', 'kashmir-reality', 'ops.json'), 'utf8');
    realityCache = JSON.parse(raw) as RealityOps;
  } catch {
    realityCache = null;
  }
  return realityCache;
}

function realityFacts(ops: RealityOps): string[] {
  const verified = (ops.corridor_tally.matched ?? 0) + (ops.corridor_tally.partial ?? 0);
  return [
    'OBSERVED REALITY LAYER (Bus Sathi app GPS — measured, partial adoption; validates geometry/speeds/stops, NOT supply or demand):',
    `- Sample: ${ops.drivers} self-selected drivers, ${nf(ops.runs)} service runs over ${ops.observed_days} days (${nf(ops.driver_days)} driver-days).`,
    `- Measured bus speeds: ~${ops.moving_kmh} km/h moving, ~${ops.effective_kmh} km/h effective (dwell ≈ ${Math.round(ops.dwell_share * 100)}% of run time).`,
    `- Observed duty day: ${ops.duty_span_h} h span with ${ops.in_service_h} h in service (${Math.round(ops.utilisation * 100)}% utilisation), typically ${ops.day_start}–${ops.day_end} IST; service collapses after ~19:00.`,
    `- Terminal turnaround: median ${ops.turnaround_min} min door-to-door (n=${nf(ops.turnaround_n)}), including layover.`,
    `- Corridors: ${ops.corridor_tally.matched} observed corridors MATCH the plan's routes; ${ops.corridor_tally.partial} diverge in geometry (reconciliation candidates); 0 informal/unpermitted. ${verified} verified in total.`,
    `- ${ops.coverage_note}`,
    '- IMPORTANT CAVEAT: adoption is partial and Srinagar-concentrated, so the app data cannot measure network frequency or ridership demand — never claim it does.',
  ];
}

const DISTRICTS: { code: string; name: string }[] = [
  { code: 'SR', name: 'Srinagar' }, { code: 'BG', name: 'Budgam' },
  { code: 'GB', name: 'Ganderbal' }, { code: 'BR', name: 'Baramulla' },
  { code: 'BP', name: 'Bandipora' }, { code: 'PW', name: 'Pulwama' },
  { code: 'SP', name: 'Shopian' }, { code: 'AN', name: 'Anantnag' },
  { code: 'KG', name: 'Kulgam' }, { code: 'KW', name: 'Kupwara' },
];
const DISTRICT_NAME: Record<string, string> = Object.fromEntries(DISTRICTS.map((d) => [d.code, d.name]));

function nf(value: number) {
  return new Intl.NumberFormat('en-IN').format(Math.round(value));
}

/** Is this request about the Kashmir route plan (vs the live fleet)? */
export function isKashmirQuestion(pathname: string, question: string): boolean {
  const p = (pathname || '').toLowerCase();
  if (p.includes('rationalization-kashmir') || p.includes('rationalisation-kashmir') || p.includes('kashmir')) {
    return true;
  }
  const q = (question || '').toLowerCase();
  if (/\bkashmir\b|\bsscl\b|rationalis|route plan|route code|headway|chalo|gulmarg|pahalgam|sonmarg/.test(q)) {
    return true;
  }
  return false;
}

type DistrictRollup = { code: string; name: string; routes: number; fleet: number; sscl: number };

function districtRollup(active: RationalizedRouteKashmir[]): DistrictRollup[] {
  const map = new Map<string, DistrictRollup>(
    DISTRICTS.map((d) => [d.code, { code: d.code, name: d.name, routes: 0, fleet: 0, sscl: 0 }]),
  );
  active.forEach((r) => {
    const code = r.routeCode || '';
    const seen = new Set<string>();
    [code.slice(0, 2), code.slice(2, 4)].forEach((c) => {
      const b = map.get(c);
      if (!b || seen.has(c)) return;
      seen.add(c);
      b.routes += 1;
      b.fleet += r.fleetRequired;
      if (r.newRouteId.startsWith('SSCL-')) b.sscl += 1;
    });
  });
  return Array.from(map.values()).filter((d) => d.routes > 0).sort((a, b) => b.fleet - a.fleet);
}

function headwayRollup(active: RationalizedRouteKashmir[]) {
  const m = new Map<number, number>();
  active.forEach((r) => m.set(r.headwayMin, (m.get(r.headwayMin) || 0) + 1));
  return Array.from(m.entries()).sort((a, b) => a[0] - b[0]);
}

/** Compact facts block for the OpenAI system prompt. */
export function buildKashmirContext(
  dataset: RouteRationalizationKashmirDataset,
  reality?: RealityOps | null,
): string {
  const s = dataset.summary;
  const active = dataset.routes.filter((r) => r.actionTaken !== 'MERGED_INTO_TRUNK');
  const districts = districtRollup(active);
  const headways = headwayRollup(active);

  const lines = [
    'KASHMIR VALLEY ROUTE RATIONALISATION PLAN (v3.4.4) — authoritative facts:',
    `- Active routes: ${s.activeRoutes} (consolidated from ${nf(s.totalRouteRows)} legacy RTO permits; ${s.mergedRoutes} merged into trunks).`,
    `- Route classes: ${s.trunkRoutes} trunk + ${s.feederRoutes} feeder. SSCL e-bus backbone: ${s.ssclBackboneRoutes} routes at 15-min headway.`,
    `- Total fleet: ${nf(s.totalFleetRequired)} buses = ${nf(s.hpvTotal)} large (HPV/12m) + ${nf(s.mpvTotal)} medium (MPV/9m) + ${nf(s.lpvTotal)} small (LPV). About +67% over today's ~600 buses.`,
    `- Districts served: ${districts.length} (whole Kashmir Division).`,
    `- Network coverage: ${s.networkCoveragePercent.toFixed(1)}% — ${nf(s.deduplicatedNetworkPopulation)} of ${nf(s.studyAreaPopulation)} residents within a 400 m walk.`,
    `- Social-obligation (protected) routes: ${nf(s.socialObligationRoutes)}. Tourist corridors flagged: ${nf(s.touristCorridorCount)}.`,
    `- Headways (minutes : route count): ${headways.map(([h, c]) => `${h}min:${c}`).join(', ')}. City tiers 15/20/35; long rural lifelines demand-sized 35/40/45/50 with a hard 50-min max wait.`,
    `- Per-district (routes touching / buses): ${districts.map((d) => `${d.name} ${d.routes}/${nf(d.fleet)}`).join('; ')}.`,
    'VERIFICATION (v3.4.4): every active route checked against the real world (Google Maps / JKRTC / gazetteers).',
    `- Outcome: ${VERIFICATION.pass} PASS / ${VERIFICATION.review} REVIEW / ${VERIFICATION.fail} FAIL; ${VERIFICATION.corrections} distance corrections applied.`,
    `- Distance accuracy vs reality improved from MAPE ${VERIFICATION.mapeBefore}% to ${VERIFICATION.mapeAfter}% (median ${VERIFICATION.mapeMedian}%).`,
    `- Fleet density ${VERIFICATION.busesPerLakh} buses/lakh served — clears the MoHUA Service Level Benchmark (${VERIFICATION.mohuaBand}); today's ~600 buses sit at ~${VERIFICATION.todayBusesPerLakh}/lakh.`,
    'METHOD: open-data pipeline — geocode permit endpoints, route on real roads (OSRM/OpenStreetMap), score demand from population (WorldPop) + points-of-interest, set headway within RTO ceilings, size fleet = ceil(cycle time / headway) x 1.15 spare. Calibrated to CHALO published totals (11.6M trips, May 2025–Apr 2026, 30 SSCL routes).',
    'DOWNLOADS available on this page: Bus Schedule Workbook (Pretty Excel, the RTO submission), Route Verification Appendix, Master transit map, plus technical CSV/GeoJSON files.',
  ];
  if (reality) {
    lines.push('', ...realityFacts(reality));
  }
  return lines.join('\n');
}

/** Find an active route by route code or a name fragment ("soura lal chowk"). */
function findRoute(q: string, active: RationalizedRouteKashmir[]): RationalizedRouteKashmir | null {
  const codeMatch = q.toUpperCase().match(/[A-Z]{4}[-\s]?\d{4}[-\s]?\d{4}[A-Z]?|[A-Z]{4}\d{8}[A-Z]?/);
  if (codeMatch) {
    const code = codeMatch[0].replace(/[-\s]/g, '');
    const hit = active.find((r) => (r.routeCode || '').toUpperCase() === code);
    if (hit) return hit;
  }
  const idMatch = q.toUpperCase().match(/\b(SSCL|TRK|FDR)-?\d{1,3}\b/);
  if (idMatch) {
    const id = idMatch[0].replace(/(SSCL|TRK|FDR)-?/, (_, p) => `${p}-`).toUpperCase();
    const hit = active.find((r) => r.newRouteId.toUpperCase() === id
      || r.newRouteId.toUpperCase() === id.replace('-', '-0')
      || r.newRouteId.toUpperCase() === id.replace('-', '-00'));
    if (hit) return hit;
  }
  // name-token match: every meaningful query token appears in the route name
  const stop = new Set(['route', 'the', 'to', 'via', 'about', 'tell', 'me', 'show', 'what', 'info', 'bus', 'buses', 'from', 'and', 'of', 'is', 'for']);
  const tokens = q.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter((t) => t.length > 2 && !stop.has(t));
  if (tokens.length === 0) return null;
  const scored = active
    .map((r) => {
      const name = r.routeName.toLowerCase();
      const hits = tokens.filter((t) => name.includes(t)).length;
      return { r, hits };
    })
    .filter((x) => x.hits >= Math.min(2, tokens.length))
    .sort((a, b) => b.hits - a.hits || a.r.routeName.length - b.r.routeName.length);
  return scored[0]?.r ?? null;
}

function describeRoute(r: RationalizedRouteKashmir): string {
  const cls = r.newRouteId.startsWith('SSCL-') ? 'SSCL e-bus trunk'
    : r.actionTaken === 'UPGRADED_TO_TRUNK' ? 'Trunk (main route)' : 'Feeder route';
  const mix = [
    r.hpvCount ? `${r.hpvCount} large` : '',
    r.mpvCount ? `${r.mpvCount} medium` : '',
    r.lpvCount ? `${r.lpvCount} small` : '',
  ].filter(Boolean).join(' + ');
  return [
    `**${r.routeName}**`,
    `- Route code: **${r.routeCode || '—'}** · plan ID ${r.newRouteId} · ${cls}`,
    `- Length: **${r.routeKm.toFixed(1)} km** · a bus every **${r.headwayMin} min**`,
    `- Fleet: **${r.fleetRequired} buses**${mix ? ` (${mix})` : ''}`,
    `- Population within a 400 m walk of the route: **${nf(r.populationServedRaw ?? 0)}**`,
    r.socialFlag ? '- **Social-obligation route** — protected (serves townships / hospitals / lifelines).' : '',
    r.touristCorridor ? '- Flagged as a **tourist corridor**.' : '',
  ].filter(Boolean).join('\n');
}

/** Deterministic answer (no OpenAI needed) for common Kashmir questions. */
export function buildKashmirLocalReply(
  question: string,
  dataset: RouteRationalizationKashmirDataset,
  reality?: RealityOps | null,
): string {
  const q = (question || '').toLowerCase();
  const s = dataset.summary;
  const active = dataset.routes.filter((r) => r.actionTaken !== 'MERGED_INTO_TRUNK');

  // Route-specific: a route code, plan ID (SSCL-/TRK-/FDR-), or "<place> to <place>"
  // name fragment. Most specific intent — checked first.
  const route = findRoute(q, active);
  if (route) {
    return describeRoute(route);
  }

  // Observed-reality (app GPS) questions.
  if (reality && /(gps|trace|observ|reality|measured|actual speed|real speed|ground truth|driver day|turnaround|duty|utili[sz]ation|app data)/.test(q)) {
    const verified = (reality.corridor_tally.matched ?? 0) + (reality.corridor_tally.partial ?? 0);
    return [
      '**Observed reality (Bus Sathi app GPS)** — see the Reality Layer tab.',
      `Measured from **${reality.drivers} drivers** / **${nf(reality.runs)} service runs** over ${reality.observed_days} days:`,
      `- Buses move at **~${reality.moving_kmh} km/h**, effective **~${reality.effective_kmh} km/h** with stops (dwell ≈ ${Math.round(reality.dwell_share * 100)}% of run time)`,
      `- Duty day: **${reality.duty_span_h} h** span, **${reality.in_service_h} h** in service (${Math.round(reality.utilisation * 100)}% utilisation), ~${reality.day_start}–${reality.day_end}; service collapses after ~19:00`,
      `- Terminal turnaround: median **${reality.turnaround_min} min** door-to-door (n=${nf(reality.turnaround_n)})`,
      `- **${verified} observed corridors verified** against the plan (${reality.corridor_tally.matched} match, ${reality.corridor_tally.partial} diverge in geometry); **0 informal routes**`,
      '',
      '_Adoption is partial and Srinagar-concentrated — this validates geometry, speeds and stops; it does not measure network frequency or demand._',
    ].join('\n');
  }

  // District-specific: did they name a district?
  const named = DISTRICTS.find((d) => q.includes(d.name.toLowerCase()));
  if (named) {
    const roll = districtRollup(active).find((d) => d.code === named.code);
    if (roll) {
      const top = active
        .filter((r) => (r.routeCode || '').slice(0, 2) === named.code || (r.routeCode || '').slice(2, 4) === named.code)
        .sort((a, b) => b.fleetRequired - a.fleetRequired)
        .slice(0, 5)
        .map((r) => `- **${r.routeCode}** — ${r.routeName} (${r.fleetRequired} buses, every ${r.headwayMin} min)`);
      return [
        `**${DISTRICT_NAME[named.code]} district**`,
        `- **${roll.routes}** routes touch the district`,
        `- **${nf(roll.fleet)}** buses on those routes`,
        `- **${roll.sscl}** SSCL e-bus backbone routes`,
        '',
        'Busiest routes here:',
        ...top,
      ].join('\n');
    }
  }

  if (/(verif|accura|audit|mape|pass|review|fail|real.?world|check)/.test(q)) {
    return [
      '**Independent verification (v3.4.4)**',
      `Every one of the **${s.activeRoutes}** active routes was checked against the real world (Google Maps, JKRTC timetables, district gazetteers).`,
      `- **${VERIFICATION.pass} PASS / ${VERIFICATION.review} REVIEW / ${VERIFICATION.fail} FAIL**`,
      `- **${VERIFICATION.corrections} distance corrections** applied (wrong coordinates / detours replaced with verified road km)`,
      `- Distance error vs reality cut from **MAPE ${VERIFICATION.mapeBefore}% → ${VERIFICATION.mapeAfter}%** (median ${VERIFICATION.mapeMedian}%)`,
      `- **${VERIFICATION.busesPerLakh} buses/lakh** served — clears the MoHUA benchmark (${VERIFICATION.mohuaBand})`,
    ].join('\n');
  }

  if (/(headway|frequen|how often|wait|minutes)/.test(q)) {
    const headways = headwayRollup(active);
    return [
      '**Service frequency (headways)**',
      'Lower minutes = a bus comes more often.',
      ...headways.map(([h, c]) => `- **${h} min** — ${c} routes`),
      '',
      'City tiers run 15 / 20 / 35 min; the SSCL e-bus backbone runs every **15 min**. Long rural lifelines are demand-sized at 35/40/45/50 min, with a hard **50-min maximum wait**.',
    ].join('\n');
  }

  if (/(district|division|where|region|cover)/.test(q) && !/coverage/.test(q)) {
    const districts = districtRollup(active);
    return [
      `**Service by district** — the plan spans all **${districts.length}** districts of the Kashmir Division:`,
      ...districts.map((d) => `- **${d.name}** — ${d.routes} routes, ${nf(d.fleet)} buses${d.sscl ? `, ${d.sscl} SSCL` : ''}`),
    ].join('\n');
  }

  if (/(coverage|population|residents|reach|walk)/.test(q)) {
    return [
      '**Network coverage**',
      `The network reaches **${nf(s.deduplicatedNetworkPopulation)}** residents within a 400 m walk — **${s.networkCoveragePercent.toFixed(1)}%** of the ${nf(s.studyAreaPopulation)} people across the 10-district Kashmir Division.`,
      'Coverage is measured division-wide (much of it dispersed rural); coverage of built-up settlement is substantially higher.',
    ].join('\n');
  }

  if (/(sscl|e.?bus|electric|backbone|chalo|trunk)/.test(q)) {
    return [
      '**SSCL e-bus backbone**',
      `The plan is built on the **${s.ssclBackboneRoutes}** SSCL electric-bus routes that form the trunk backbone, running every **15 minutes**.`,
      `In total there are **${s.trunkRoutes} trunk** routes and **${s.feederRoutes} feeders**. The backbone is calibrated to CHALO's published ridership (11.6M trips, May 2025–Apr 2026).`,
    ].join('\n');
  }

  if (/(bus|fleet|vehicle|hpv|mpv|lpv|how many)/.test(q)) {
    return [
      '**Fleet plan**',
      `- **${nf(s.totalFleetRequired)} buses** total (about **+67%** over today's ~600)`,
      `- **${nf(s.hpvTotal)}** large (HPV, 12 m) · **${nf(s.mpvTotal)}** medium (MPV, 9 m) · **${nf(s.lpvTotal)}** small (LPV)`,
      `- Deployed across **${s.activeRoutes}** active routes (${s.trunkRoutes} trunk + ${s.feederRoutes} feeder)`,
    ].join('\n');
  }

  if (/(download|excel|workbook|file|appendix|map)/.test(q)) {
    return [
      '**Downloads on this page**',
      '- **Bus Schedule Workbook (Pretty Excel)** — the RTO submission file (Summary KPIs + full Route Plan)',
      '- **Route Verification Appendix** — the route-by-route real-world checks and corrections',
      '- **Master transit map** — interactive map with trunk / feeder / SSCL / regional layers',
      '- Plus technical CSV / GeoJSON files under the Downloads tab.',
    ].join('\n');
  }

  // Default overview
  return [
    '**Kashmir Valley Route Rationalisation — v3.4.4**',
    `- **${s.activeRoutes} active routes** (from ${nf(s.totalRouteRows)} legacy permits)`,
    `- **${nf(s.totalFleetRequired)} buses** (${nf(s.hpvTotal)} large / ${nf(s.mpvTotal)} medium / ${nf(s.lpvTotal)} small), ~+67% over today`,
    `- **${s.ssclBackboneRoutes} SSCL e-bus trunks** at 15-min headway, across all 10 districts`,
    `- **${s.networkCoveragePercent.toFixed(1)}% coverage** (${nf(s.deduplicatedNetworkPopulation)} residents within 400 m)`,
    `- Independently verified: **${VERIFICATION.pass} PASS / ${VERIFICATION.review} REVIEW / ${VERIFICATION.fail} FAIL**, distance error MAPE ${VERIFICATION.mapeBefore}% → ${VERIFICATION.mapeAfter}%`,
    '',
    'Ask me about a **specific route** (by name or code), a **district**, **fleet/buses**, **headways**, the **SSCL backbone**, **coverage**, **verification**, what the **GPS traces show**, or **downloads**.',
  ].join('\n');
}
