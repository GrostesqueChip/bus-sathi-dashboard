'use client';

import dynamic from 'next/dynamic';
import { ArrowRight, GitMerge, History, Route as RouteIcon, TrendingDown } from 'lucide-react';
import type { RouteRationalizationKashmirSummary } from '@/lib/routeRationalizationKashmir';
import { formatNumber } from '@/components/rationalization-kashmir/KashmirCards';

const KashmirBeforeAfterMap = dynamic(
  () => import('@/components/rationalization-kashmir/KashmirBeforeAfterMap'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-4 border-slate-400" />
          <p className="mt-3 text-xs font-black uppercase tracking-[0.18em] text-slate-500">Preparing map</p>
        </div>
      </div>
    ),
  },
);

type KashmirBeforeAfterProps = {
  summary: RouteRationalizationKashmirSummary;
};

export default function KashmirBeforeAfter({ summary }: KashmirBeforeAfterProps) {
  const reductionPercent = summary.totalRouteRows
    ? Math.round(((summary.totalRouteRows - summary.activeRoutes) / summary.totalRouteRows) * 100)
    : 0;

  return (
    <section
      id="before-after"
      className="overflow-hidden rounded-[2.4rem] border border-slate-200 bg-white shadow-sm"
    >
      <div className="border-b border-slate-100 bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950 px-6 py-7 text-white md:px-8">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-emerald-200">
          <History size={14} /> The problem &amp; the fix
        </div>
        <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
          Before <span className="text-slate-500">→</span> After
        </h2>
        <p className="mt-2 max-w-3xl text-sm font-semibold leading-7 text-slate-200/85">
          Today, {formatNumber(summary.totalRouteRows)} separate RTO permits overlap on the same corridors — some duplicated
          38 and 42 times. The plan consolidates them into {formatNumber(summary.activeRoutes)} clean, coordinated routes.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 border-b border-slate-100 bg-slate-50/60 px-6 py-6 md:grid-cols-[1fr_auto_1fr] md:items-center md:px-8">
        <div className="rounded-[1.6rem] border border-rose-200 bg-rose-50/60 p-5">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-rose-700">Before</p>
          <p className="mt-2 text-5xl font-black text-rose-900">{formatNumber(summary.totalRouteRows)}</p>
          <p className="text-sm font-bold text-rose-700">overlapping RTO permits</p>
          <ul className="mt-3 space-y-1.5 text-xs font-semibold leading-5 text-rose-900/85">
            <li>• 38 separate permits for Soura ↔ LD alone</li>
            <li>• 42 separate permits for Hazratbal ↔ LD</li>
            <li>• No standard route codes or coordination</li>
            <li>• Frequency set by history, not by demand</li>
          </ul>
        </div>

        <div className="flex items-center justify-center text-emerald-700">
          <div className="hidden h-12 w-12 items-center justify-center rounded-full bg-emerald-100 md:flex">
            <ArrowRight size={22} />
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 md:hidden">
            <ArrowRight size={22} className="rotate-90" />
          </div>
        </div>

        <div className="rounded-[1.6rem] border border-emerald-200 bg-emerald-50/70 p-5">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-700">After</p>
          <p className="mt-2 text-5xl font-black text-emerald-900">{formatNumber(summary.activeRoutes)}</p>
          <p className="text-sm font-bold text-emerald-700">clean rationalised routes</p>
          <ul className="mt-3 space-y-1.5 text-xs font-semibold leading-5 text-emerald-900/85">
            <li>• {summary.trunkRoutes} high-capacity trunk corridors</li>
            <li>• {summary.ssclBackboneRoutes} SSCL e-bus backbone routes</li>
            <li>• {summary.feederRoutes} feeders with demand-based frequency</li>
            <li>• Standard route codes for every service</li>
          </ul>
        </div>
      </div>

      <div className="px-6 py-7 md:px-8">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Map view</p>
          <h3 className="mt-2 text-2xl font-black text-slate-950">The same valley, on the map</h3>
          <p className="mt-1 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
            Left: every existing permit as a separate red line — visibly stacked dozens deep on the same corridors.
            Right: the rationalised network — single trunks with feeders and a clear hierarchy. Both maps cover the
            exact same area.
          </p>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <BeforeAfterMapPanel
            label="Before"
            count={summary.totalRouteRows}
            countNoun="overlapping permits"
            sublabel="Every existing RTO permit drawn as its own corridor"
            tone="rose"
            mode="before"
            legend={[
              { color: '#dc2626', label: 'Existing permit', dashed: false },
              { color: '#dc2626', label: 'Thicker line = more duplicates', dashed: false, bold: true },
            ]}
          />
          <BeforeAfterMapPanel
            label="After"
            count={summary.activeRoutes}
            countNoun="rationalised routes"
            sublabel="One coordinated network with real road geometry"
            tone="emerald"
            mode="after"
            legend={[
              { color: '#7c3aed', label: 'SSCL e-bus backbone', dashed: false },
              { color: '#059669', label: 'Trunk corridor', dashed: false },
              { color: '#2563eb', label: 'Main feeder', dashed: false },
              { color: '#0f766e', label: 'Local feeder', dashed: true },
            ]}
          />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
          <KeyStat
            icon={TrendingDown}
            value={`${reductionPercent}%`}
            label="Fewer routes to manage"
            detail={`Down from ${formatNumber(summary.totalRouteRows)} permits to ${formatNumber(summary.activeRoutes)} coordinated routes.`}
            tone="emerald"
          />
          <KeyStat
            icon={GitMerge}
            value={formatNumber(summary.mergedRoutes)}
            label="Duplicate permits merged"
            detail="Absorbed into high-capacity trunk corridors instead of running separately."
            tone="rose"
          />
          <KeyStat
            icon={RouteIcon}
            value={formatNumber(summary.feederRoutes)}
            label="Routes kept as feeders"
            detail="Neighbourhood routes retained, each with its own demand-based frequency."
            tone="teal"
          />
        </div>
      </div>
    </section>
  );
}

function KeyStat({
  icon: Icon,
  value,
  label,
  detail,
  tone,
}: {
  icon: typeof GitMerge;
  value: string;
  label: string;
  detail: string;
  tone: 'rose' | 'emerald' | 'teal';
}) {
  const toneClass = {
    rose: 'border-rose-100 bg-rose-50/60 text-rose-700',
    emerald: 'border-emerald-100 bg-emerald-50/60 text-emerald-700',
    teal: 'border-teal-100 bg-teal-50/60 text-teal-700',
  }[tone];

  const numberClass = {
    rose: 'text-rose-900',
    emerald: 'text-emerald-900',
    teal: 'text-teal-900',
  }[tone];

  return (
    <div className={`rounded-[1.5rem] border p-5 ${toneClass}`}>
      <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em]">
        <Icon size={14} /> {label}
      </p>
      <p className={`mt-2 text-4xl font-black ${numberClass}`}>{value}</p>
      <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">{detail}</p>
    </div>
  );
}

type LegendItem = { color: string; label: string; dashed?: boolean; bold?: boolean };

function BeforeAfterMapPanel({
  label,
  count,
  countNoun,
  sublabel,
  tone,
  mode,
  legend,
}: {
  label: string;
  count: number;
  countNoun: string;
  sublabel: string;
  tone: 'rose' | 'emerald';
  mode: 'before' | 'after';
  legend: LegendItem[];
}) {
  const headerToneClass =
    tone === 'rose'
      ? 'border-rose-200 bg-rose-50/70 text-rose-800'
      : 'border-emerald-200 bg-emerald-50/70 text-emerald-800';
  const pillToneClass = tone === 'rose' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white';

  return (
    <div className={`overflow-hidden rounded-[1.5rem] border ${headerToneClass} shadow-sm`}>
      <div className="flex items-start justify-between gap-3 px-5 py-4">
        <div>
          <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${pillToneClass}`}>
            {label}
          </span>
          <p className="mt-2 text-sm font-bold leading-5">{sublabel}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-3xl font-black leading-none">{formatNumber(count)}</p>
          <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] opacity-80">{countNoun}</p>
        </div>
      </div>
      <div className="relative h-[440px] bg-slate-50 sm:h-[500px] lg:h-[540px]">
        <KashmirBeforeAfterMap mode={mode} />
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/40 bg-white/60 px-5 py-3 text-[11px] font-semibold text-slate-600">
        {legend.map((item, i) => (
          <span key={i} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-[3px] w-7 rounded"
              style={{
                backgroundColor: item.color,
                backgroundImage: item.dashed
                  ? `repeating-linear-gradient(to right, ${item.color} 0 6px, transparent 6px 10px)`
                  : undefined,
                height: item.bold ? '5px' : '3px',
              }}
            />
            <span>{item.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
