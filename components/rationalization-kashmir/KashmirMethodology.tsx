'use client';

import { BookOpen, BusFront, ClipboardCheck, Clock, MapPin, Users, Workflow } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type Phase = {
  n: number;
  icon: LucideIcon;
  title: string;
  body: string;
  formula?: string;
  sources: string;
};

const PHASES: Phase[] = [
  {
    n: 1,
    icon: MapPin,
    title: 'Build the real network',
    body: 'Every legacy permit’s endpoints are geocoded district-aware, then routed on the real road network so distance and run-time are the true on-road figures — not straight lines.',
    formula: 'Route km, cycle time ← OSRM on OpenStreetMap roads',
    sources: 'OpenStreetMap · OSRM (Luxen & Vetter, 2011)',
  },
  {
    n: 2,
    icon: Users,
    title: 'Score demand from open data',
    body: 'Residents within a 400 m walk of each corridor (WorldPop raster) combine with 3-tier points of interest and a gender-aware boost into one Composite Demand Index — no proprietary GPS or ticketing feed needed.',
    formula: 'CDI = f( population₄₀₀ₘ , POI tiers , road factor )',
    sources: 'WorldPop (Tatem, 2017) · walkshed (El-Geneidy et al.)',
  },
  {
    n: 3,
    icon: Clock,
    title: 'Set the frequency (headway)',
    body: 'Each route’s demand maps to a headway within the RTO’s service ceilings: city 15 / 20 / 35 min, long rural lifelines demand-sized 35–50 min (50-min hard maximum wait). The SSCL e-bus backbone keeps its published 15-min target.',
    formula: 'headway = service band( demand, RTO ceiling )',
    sources: 'Vuchic · Ceder · TCQSM / TRB',
  },
  {
    n: 4,
    icon: BusFront,
    title: 'Size the fleet',
    body: 'Buses needed follow directly from round-trip cycle time and the chosen headway, with a maintenance/breakdown spare buffer, then split across vehicle sizes (large / medium / small).',
    formula: 'fleet = ⌈ cycle time ÷ headway ⌉ × 1.15 spare',
    sources: 'Vuchic, Urban Transit · Ceder, Public Transit Planning',
  },
];

const REFERENCES = [
  'Vuchic, V. R. — Urban Transit: Operations, Planning & Economics',
  'Ceder, A. — Public Transit Planning and Operation',
  'TCQSM (Transit Capacity & Quality of Service Manual), TRB',
  'WorldPop / Tatem, A. J. (2017) — gridded population',
  'OSRM — Luxen & Vetter (2011); OpenStreetMap road network',
  'El-Geneidy et al. — walking-distance catchments for transit',
  'Hansen, W. G. — How accessibility shapes land use',
  'Jenks natural-breaks classification (demand banding)',
];

export default function KashmirMethodology() {
  return (
    <section className="overflow-hidden rounded-[2.2rem] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950 px-6 py-7 text-white md:px-8">
        <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-emerald-200">
          <Workflow size={14} /> How the plan is built
        </p>
        <h2 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">From legacy permits to a sized network</h2>
        <p className="mt-2 max-w-3xl text-sm font-semibold leading-7 text-slate-200/85">
          A transparent four-step pipeline. Each step uses published, reproducible methods and open data — the same engine
          regenerates every workbook and map on this dashboard.
        </p>
      </div>

      {/* Pipeline */}
      <div className="px-6 py-8 md:px-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {PHASES.map((p, i) => {
            const Icon = p.icon;
            return (
              <div key={p.n} className="relative flex flex-col rounded-[1.6rem] border border-slate-200 bg-slate-50/60 p-5">
                {/* connector arrow on xl */}
                {i < PHASES.length - 1 && (
                  <span className="absolute right-[-13px] top-1/2 z-10 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-emerald-600 shadow-sm xl:flex">→</span>
                )}
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm"><Icon size={20} /></span>
                  <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Step {p.n}</span>
                </div>
                <h3 className="mt-3 text-base font-black leading-5 text-slate-950">{p.title}</h3>
                <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">{p.body}</p>
                {p.formula && (
                  <p className="mt-3 rounded-xl bg-slate-900 px-3 py-2 font-mono text-[11px] font-bold leading-4 text-emerald-200">{p.formula}</p>
                )}
                <p className="mt-3 flex items-start gap-1.5 text-[11px] font-bold leading-4 text-slate-400">
                  <BookOpen size={12} className="mt-0.5 shrink-0" /> {p.sources}
                </p>
              </div>
            );
          })}
        </div>

        {/* Calibration note */}
        <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 sm:flex-row sm:items-center">
          <ClipboardCheck size={22} className="shrink-0 text-emerald-700" />
          <p className="text-sm font-semibold leading-6 text-slate-700">
            <span className="font-black text-emerald-800">Calibration anchor:</span> the model is validated against CHALO’s
            published ridership totals — <span className="font-black">11.6 million trips, May 2025 – Apr 2026, across the 30 SSCL
            e-bus routes</span> — a one-time published-aggregate check (no per-trip GPS used). The engine blocks export unless 8 quality
            checks pass.
          </p>
        </div>

        {/* Ground-truth note */}
        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-teal-200 bg-teal-50/60 p-5 sm:flex-row sm:items-center">
          <MapPin size={22} className="shrink-0 text-teal-700" />
          <p className="text-sm font-semibold leading-6 text-slate-700">
            <span className="font-black text-teal-800">Grounded against real GPS (v3.4.5):</span> the plan is cross-checked against
            the Bus&nbsp;Sathi app’s <span className="font-black">real driver GPS</span> — 2,526 cleaned service runs from ~157
            drivers. This confirmed <span className="font-black">172 of 186 routes</span> are actually driven on the ground, re-anchored
            5 core corridors to measured bus speeds, and <span className="font-black">redrew 15 route map lines</span> whose endpoint
            pins were wrong. See the <span className="font-black">Reality Layer</span> tab. Adoption is partial (Srinagar-heavy), so
            this validates geometry and speeds — it does not measure demand or frequency.
          </p>
        </div>

        {/* References */}
        <div className="mt-6">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Methods &amp; references</p>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {REFERENCES.map((r) => (
              <p key={r} className="rounded-xl border border-slate-100 bg-slate-50/60 px-3.5 py-2 text-xs font-semibold leading-5 text-slate-600">{r}</p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
