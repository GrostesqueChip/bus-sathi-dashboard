'use client';

import {
  AlertTriangle,
  BadgeCheck,
  Download,
  Gauge,
  MapPin,
  Mountain,
  ScrollText,
  ShieldCheck,
  Signpost,
  Users,
} from 'lucide-react';
import {
  KASHMIR_BUSES_PER_100K_DIVISION,
  KASHMIR_BUSES_PER_100K_NEAR_ROUTE,
  KASHMIR_COVERAGE_NETWORK_PERCENT,
} from '@/lib/kashmirServicePlans';

const VERIFICATION_STATS = [
  { value: '186', label: 'routes desk-checked', detail: 'AI-assisted desk research against web sources; no field survey' },
  { value: '93 / 88 / 5', label: 'pass / review / fail', detail: 'desk-check verdicts: 93 pass, 88 flagged for review, 5 flagged as failing' },
  { value: '49', label: 'distances corrected', detail: 'wrong-coordinate / detour km replaced with web-sourced road km' },
  { value: '37.4% → 13.3%', label: 'distance MAPE vs web-sourced km', detail: 'mean absolute error of planned km, before → after correction (median 6.3%)' },
];

const LIMITATIONS = [
  {
    icon: MapPin,
    title: 'Village coordinates are approximations',
    body: '~40 rural villages with no surveyed coordinates are placed at their correct district/town centre, not the exact stop. Distances for these are best-estimate.',
    fix: 'Resolves with the RTO surveyed stop register.',
  },
  {
    icon: ScrollText,
    title: '19 stop names not independently confirmable',
    body: 'Some hamlet/mahalla names could not be verified on any public map or gazetteer, so their distance is benchmarked against nearby towns rather than the exact point.',
    fix: 'Confirm against the RTO stop register.',
  },
  {
    icon: Mountain,
    title: 'Mountain-pass run-times are conservative',
    body: 'For high-pass lifelines (Tangdhar/Sadhna, Uri, Chowkibal) the corrected distance is realistic, but cycle time is scaled at average road speed — a pass is slower per km.',
    fix: 'Refines with surveyed run-times; fleet impact is small.',
  },
  {
    icon: Users,
    title: 'Demand is modelled, not ticket-measured',
    body: 'Built from open population (WorldPop), street-network and points-of-interest data plus the permit register. Smart City e-bus (CHALO) ridership aggregates were used only as a consistency check, not a validation; no per-route ticketing feed was available.',
    fix: 'Sharpens when AFC ridership is shared.',
  },
  {
    icon: AlertTriangle,
    title: 'One route deferred (Garkote → Baramulla)',
    body: 'The place "Garkote" has two candidate locations; its identity is unresolved, so its numbers are left unchanged rather than guessed.',
    fix: 'Resolves with the RTO stop register.',
  },
  {
    icon: Gauge,
    title: 'Coverage is measured division-wide',
    body: `35.2% of residents live within 400 m straight-line distance of a planned route; measured along the walking network the figure is ${KASHMIR_COVERAGE_NETWORK_PERCENT}%. Both are against the full 6.58M Kashmir Division (much of it dispersed rural).`,
    fix: 'Treat the walking-network figure as the conservative one.',
  },
  {
    icon: Signpost,
    title: 'Map lines vs planning distance',
    body: 'Drawn lines come from the road router between the desk-checked endpoints. On ~16 corridors the router takes a longer path than the web-sourced road km, so a line can read up to ~2× the listed km. The endpoints and the listed km are the authoritative figures.',
    fix: 'Tightens with the RTO stop register / road-network refresh.',
  },
];

export default function KashmirAssurance() {
  return (
    <section className="space-y-6">
      {/* Desk-check & fleet-density highlight */}
      <div className="overflow-hidden rounded-[2rem] border border-emerald-200 bg-gradient-to-br from-white to-emerald-50/60 p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
            <BadgeCheck size={15} /> AI-assisted desk check
          </p>
          <h2 className="text-2xl font-black text-slate-950 md:text-3xl">Desk-checked route by route against web sources</h2>
          <p className="max-w-4xl text-sm font-semibold leading-7 text-slate-600">
            186 routes desk-checked using AI-assisted desk research (an AI model searching web sources such as Google
            Maps, JKRTC timetables and district gazetteers, with sources cited per route): 93 pass, 88 flagged for review,
            5 flagged as failing. This is neither a field survey nor an independent audit. Wrong-coordinate and detour
            distances were replaced with the web-sourced road distance (cited per route), and the fleet recomputed with
            the published formulas. A
            network-integrity check confirms the routes also work as a <b>system</b>: 184 of 186 form one
            connected network with clear interchange hubs, redundancy is low, and only three tehsils
            (Gurez, Kokernag, Karnah) remain genuine coverage gaps.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {VERIFICATION_STATS.map((s) => (
            <div key={s.label} className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
              <p className="text-2xl font-black tracking-tight text-emerald-700 md:text-[1.7rem]">{s.value}</p>
              <p className="mt-1 text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">{s.label}</p>
              <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">{s.detail}</p>
            </div>
          ))}
        </div>

        {/* Fleet-density strip */}
        <div className="mt-4 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-950 p-5 text-white sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <ShieldCheck size={22} className="mt-0.5 shrink-0 text-emerald-300" />
            <div>
              <p className="text-sm font-black">Fleet density</p>
              <p className="mt-1 max-w-2xl text-xs font-semibold leading-5 text-slate-300">
                <span className="font-black text-white">{KASHMIR_BUSES_PER_100K_DIVISION} buses per 100,000 residents</span> of the
                Division ({KASHMIR_BUSES_PER_100K_NEAR_ROUTE} per 100,000 residents living near a route); national benchmarks are
                defined for cities and are not directly comparable.
              </p>
            </div>
          </div>
          <a
            href="/route-rationalization-kashmir/Kashmir_Route_Verification_Appendix_v3.4.5_RTO.xlsx"
            download
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-black text-slate-950 transition-all hover:bg-emerald-400"
          >
            <Download size={16} /> Verification Appendix
          </a>
        </div>
      </div>

      {/* Limitations & data caveats */}
      <div className="rounded-[2rem] border border-amber-200 bg-amber-50/50 p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-amber-700">
            <AlertTriangle size={15} /> Limitations &amp; data caveats
          </p>
          <h2 className="text-2xl font-black text-slate-950">What this plan does not yet know — disclosed up front</h2>
          <p className="max-w-4xl text-sm font-semibold leading-7 text-slate-600">
            A plan should be honest about its inputs. These are the open items in the current plan; each is
            tabulated in the verification appendix and resolves once the RTO supplies the surveyed stop register and
            ridership data we have requested.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {LIMITATIONS.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                    <Icon size={17} />
                  </span>
                  <div>
                    <p className="text-sm font-black leading-5 text-slate-950">{item.title}</p>
                    <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">{item.body}</p>
                    <p className="mt-2 text-xs font-bold leading-5 text-emerald-700">→ {item.fix}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
