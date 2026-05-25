'use client';

import { BusFront, Check, Clock, Scale } from 'lucide-react';
import {
  KASHMIR_CURRENT_FLEET,
  KASHMIR_SERVICE_PLANS,
  type KashmirServicePlan,
} from '@/lib/kashmirServicePlans';
import { formatNumber } from '@/components/rationalization-kashmir/KashmirCards';

const { phase1, phase2, headwayBands, sharedRoutes, sharedTrunk, sharedFeeder } = KASHMIR_SERVICE_PLANS;

export default function KashmirServicePlans() {
  const fleetDelta = phase2.totalFleet - phase1.totalFleet;
  const fleetDeltaPercent = Math.round((fleetDelta / phase1.totalFleet) * 100);

  return (
    <section
      id="service-plans"
      className="overflow-hidden rounded-[2.4rem] border border-slate-200 bg-white shadow-sm"
    >
      <div className="border-b border-slate-100 bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 px-6 py-7 text-white md:px-8">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-indigo-200">
          <Scale size={14} /> The decision
        </div>
        <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">Two service plans to choose from</h2>
        <p className="mt-2 max-w-3xl text-sm font-semibold leading-7 text-slate-200/85">
          Both plans run the <span className="text-white">same {sharedRoutes} routes</span> — {sharedTrunk} trunk + {sharedFeeder} feeder,
          identical on the map. The only difference is <span className="text-white">how often the buses run</span>, which decides how
          many buses are needed.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 px-6 py-6 md:px-8 lg:grid-cols-2">
        <PlanCard plan={phase1} />
        <PlanCard plan={phase2} deltaLabel={`+${formatNumber(fleetDelta)} buses (+${fleetDeltaPercent}%) vs Phase-1`} />
      </div>

      <div className="border-t border-slate-100 px-6 py-7 md:px-8">
        <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
          <Clock size={14} /> How often a bus comes (headway)
        </div>
        <h3 className="mt-2 text-2xl font-black text-slate-950">The frequency difference, tier by tier</h3>
        <p className="mt-1 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
          Lower minutes = buses come more often = more buses needed. Only the main trunk and feeder tiers change between the two plans.
        </p>

        <div className="mt-5 overflow-hidden rounded-[1.4rem] border border-slate-200">
          <div className="grid grid-cols-[1.6fr_1fr_1fr] bg-slate-50 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
            <div className="px-5 py-3">Service tier</div>
            <div className="px-4 py-3 text-center text-emerald-700">Phase-1</div>
            <div className="px-4 py-3 text-center text-indigo-700">Phase-2</div>
          </div>
          {headwayBands.map((band, index) => {
            const changed = band.phase1Min !== band.phase2Min;
            return (
              <div
                key={band.band}
                className={`grid grid-cols-[1.6fr_1fr_1fr] items-center border-t border-slate-100 ${
                  changed ? 'bg-amber-50/40' : 'bg-white'
                }`}
              >
                <div className="px-5 py-4">
                  <p className="text-sm font-black text-slate-900">{band.band}</p>
                  <p className="text-xs font-semibold text-slate-400">{band.scope}</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{band.note}</p>
                </div>
                <HeadwayCell minutes={band.phase1Min} tone="emerald" highlight={changed} />
                <HeadwayCell minutes={band.phase2Min} tone="indigo" highlight={changed} />
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-slate-100 bg-slate-50/70 px-6 py-7 md:px-8">
        <div className="rounded-[1.6rem] border border-slate-200 bg-white p-6">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Bottom line</p>
          <p className="mt-3 text-base font-semibold leading-7 text-slate-700">
            Phase-1 delivers a strong, reliable network with <span className="font-black text-emerald-700">{formatNumber(phase1.totalFleet)} buses</span> —
            a {phase1.expansionPercent}% step up from today’s ~{formatNumber(KASHMIR_CURRENT_FLEET)} buses, and achievable in Year-1.
            Phase-2 lifts every main corridor to a 15-minute service for <span className="font-black text-indigo-700">{formatNumber(phase2.totalFleet)} buses</span> ({fleetDelta > 0 ? '+' : ''}{formatNumber(fleetDelta)} more).
            The routes are identical either way — so the network can launch on Phase-1 and step up to Phase-2 as fleet and budget allow.
          </p>
        </div>
      </div>
    </section>
  );
}

function PlanCard({ plan, deltaLabel }: { plan: KashmirServicePlan; deltaLabel?: string }) {
  const recommended = plan.recommended;
  const accent = recommended
    ? {
        border: 'border-emerald-300 ring-2 ring-emerald-100',
        chip: 'bg-emerald-600 text-white',
        big: 'text-emerald-700',
        soft: 'bg-emerald-50 text-emerald-700',
        bar: 'bg-emerald-600',
      }
    : {
        border: 'border-indigo-200',
        chip: 'bg-indigo-600 text-white',
        big: 'text-indigo-700',
        soft: 'bg-indigo-50 text-indigo-700',
        bar: 'bg-indigo-600',
      };

  const total = plan.totalFleet || 1;
  const hpvPct = (plan.hpv / total) * 100;
  const mpvPct = (plan.mpv / total) * 100;
  const lpvPct = (plan.lpv / total) * 100;

  return (
    <div className={`relative flex flex-col rounded-[1.8rem] border bg-white p-6 shadow-sm ${accent.border}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${accent.chip}`}>
            {recommended && <Check size={12} />} {plan.badge}
          </span>
          <h3 className="mt-3 text-2xl font-black tracking-tight text-slate-950">{plan.name}</h3>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{plan.version}</p>
        </div>
        <BusFront className={accent.big} size={30} />
      </div>

      <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{plan.tagline}</p>

      <div className="mt-5 flex items-end gap-3">
        <span className={`text-6xl font-black leading-none ${accent.big}`}>{formatNumber(plan.totalFleet)}</span>
        <span className="pb-1 text-sm font-black uppercase tracking-[0.16em] text-slate-400">buses</span>
      </div>
      {deltaLabel && (
        <p className="mt-1 text-sm font-bold text-indigo-700">{deltaLabel}</p>
      )}

      <div className="mt-5">
        <div className="mb-1.5 flex items-center justify-between text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
          <span>Fleet mix</span>
          <span>{formatNumber(plan.hpv)} large · {formatNumber(plan.mpv)} medium · {formatNumber(plan.lpv)} small</span>
        </div>
        <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
          <div className="bg-blue-600" style={{ width: `${hpvPct}%` }} />
          <div className="bg-teal-500" style={{ width: `${mpvPct}%` }} />
          <div className="bg-orange-400" style={{ width: `${lpvPct}%` }} />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Buses / 1,000 residents</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{plan.busesPer1000.toFixed(2)}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Growth over today</p>
          <p className="mt-1 text-2xl font-black text-slate-900">+{plan.expansionPercent}%</p>
        </div>
      </div>
    </div>
  );
}

function HeadwayCell({
  minutes,
  tone,
  highlight,
}: {
  minutes: number;
  tone: 'emerald' | 'indigo';
  highlight: boolean;
}) {
  const toneClass = tone === 'emerald' ? 'text-emerald-700' : 'text-indigo-700';
  return (
    <div className="px-4 py-4 text-center">
      <span className={`text-2xl font-black ${highlight ? toneClass : 'text-slate-700'}`}>{minutes}</span>
      <span className="ml-1 text-xs font-bold text-slate-400">min</span>
    </div>
  );
}
