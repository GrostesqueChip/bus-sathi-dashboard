'use client';

import { useMemo, useState } from 'react';
import {
  Bar, BarChart, Cell, LabelList, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { ArrowUpRight, BusFront, Clock, MapPinned, Network, TrendingUp } from 'lucide-react';
import type {
  RationalizedRouteKashmir,
  RouteRationalizationKashmirSummary,
} from '@/lib/routeRationalizationKashmir';
import { KASHMIR_CURRENT_FLEET } from '@/lib/kashmirServicePlans';
import { formatNumber, formatRouteType } from '@/components/rationalization-kashmir/KashmirCards';
import { getRouteKey, getRouteMapHref } from '@/components/rationalization-kashmir/KashmirRouteUtils';

// District = first 4 chars of the geo-canonical route code (<origin><dest>).
// A route is counted under EVERY district it touches (origin or destination),
// so "Srinagar ↔ Baramulla" appears under both. See ROUTE_CODE_METHODOLOGY.md.
const DISTRICTS: { code: string; name: string }[] = [
  { code: 'SR', name: 'Srinagar' }, { code: 'BG', name: 'Budgam' },
  { code: 'GB', name: 'Ganderbal' }, { code: 'BR', name: 'Baramulla' },
  { code: 'BP', name: 'Bandipora' }, { code: 'PW', name: 'Pulwama' },
  { code: 'SP', name: 'Shopian' }, { code: 'AN', name: 'Anantnag' },
  { code: 'KG', name: 'Kulgam' }, { code: 'KW', name: 'Kupwara' },
];
const DISTRICT_NAME = Object.fromEntries(DISTRICTS.map((d) => [d.code, d.name]));

const VEHICLE_COLORS = { hpv: '#2563eb', mpv: '#14b8a6', lpv: '#fb923c' };
const TONE_PALETTE = ['#0d9488', '#0ea5e9', '#6366f1', '#f97316', '#14b8a6', '#8b5cf6', '#ef4444', '#22c55e', '#eab308', '#ec4899'];

type Props = {
  routes: RationalizedRouteKashmir[];
  summary: RouteRationalizationKashmirSummary;
  onSelectRoute?: (route: RationalizedRouteKashmir) => void;
};

function endpoints(code: string) {
  return [code.slice(0, 2), code.slice(2, 4)];
}

export default function KashmirDataDistricts({ routes, summary, onSelectRoute }: Props) {
  const active = useMemo(() => routes.filter((r) => r.actionTaken !== 'MERGED_INTO_TRUNK'), [routes]);

  // ── Vehicle mix (donut) ────────────────────────────────────────────────
  const vehicleData = useMemo(
    () => [
      { name: 'Large (HPV · 12 m)', value: summary.hpvTotal, color: VEHICLE_COLORS.hpv },
      { name: 'Medium (MPV · 9 m)', value: summary.mpvTotal, color: VEHICLE_COLORS.mpv },
      { name: 'Small (LPV)', value: summary.lpvTotal, color: VEHICLE_COLORS.lpv },
    ],
    [summary],
  );

  // ── Headway distribution (how often a bus comes) ───────────────────────
  const headwayData = useMemo(() => {
    const m = new Map<number, number>();
    active.forEach((r) => m.set(r.headwayMin, (m.get(r.headwayMin) || 0) + 1));
    return Array.from(m.entries()).sort((a, b) => a[0] - b[0]).map(([min, count]) => ({ label: `${min} min`, count }));
  }, [active]);

  // ── Route-type mix (over active routes) ────────────────────────────────
  const typeData = useMemo(() => {
    const m = new Map<string, number>();
    active.forEach((r) => m.set(r.routeType, (m.get(r.routeType) || 0) + 1));
    return Array.from(m.entries()).map(([type, count]) => ({ label: formatRouteType(type), count })).sort((a, b) => b.count - a.count);
  }, [active]);

  // ── Per-district stats ─────────────────────────────────────────────────
  const districtStats = useMemo(() => {
    const map = new Map(DISTRICTS.map((d) => [d.code, { ...d, routes: [] as RationalizedRouteKashmir[], fleet: 0, sscl: 0 }]));
    active.forEach((r) => {
      const seen = new Set<string>();
      endpoints(r.routeCode).forEach((code) => {
        const bucket = map.get(code);
        if (!bucket || seen.has(code)) return;
        seen.add(code);
        bucket.routes.push(r);
        bucket.fleet += r.fleetRequired;
        if (r.newRouteId.startsWith('SSCL-')) bucket.sscl += 1;
      });
    });
    return Array.from(map.values()).filter((d) => d.routes.length > 0).sort((a, b) => b.fleet - a.fleet);
  }, [active]);

  const districtBars = districtStats.map((d, i) => ({ code: d.code, name: d.name, routes: d.routes.length, fleet: d.fleet, color: TONE_PALETTE[i % TONE_PALETTE.length] }));

  const [activeDistrict, setActiveDistrict] = useState(districtStats[0]?.code || 'SR');
  const selected = districtStats.find((d) => d.code === activeDistrict) || districtStats[0];
  const selectedRoutes = useMemo(
    () => (selected ? [...selected.routes].sort((a, b) => b.fleetRequired - a.fleetRequired) : []),
    [selected],
  );

  const fleetBefore = KASHMIR_CURRENT_FLEET;
  const fleetAfter = summary.totalFleetRequired;
  const growthPct = Math.round(((fleetAfter - fleetBefore) / fleetBefore) * 100);

  return (
    <div className="space-y-6">
      {/* ── CHARTS ROW ───────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Vehicle mix donut */}
        <ChartCard
          icon={BusFront}
          title="Fleet by vehicle size"
          subtitle={`${formatNumber(fleetAfter)} buses across three vehicle classes`}
        >
          <div className="flex flex-col items-center gap-5 sm:flex-row">
            <div className="relative h-[200px] w-full max-w-[230px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={vehicleData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={58} outerRadius={88} paddingAngle={2} stroke="none">
                    {vehicleData.map((d) => <Cell key={d.name} fill={d.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: any, n: any) => [`${formatNumber(Number(v))} buses`, n]} contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-slate-900">{formatNumber(fleetAfter)}</span>
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">buses</span>
              </div>
            </div>
            <div className="w-full space-y-2.5">
              {vehicleData.map((d) => {
                const pct = fleetAfter ? (d.value / fleetAfter) * 100 : 0;
                return (
                  <div key={d.name} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
                    <span className="flex items-center gap-2 text-sm font-bold text-slate-700">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: d.color }} /> {d.name}
                    </span>
                    <span className="text-sm font-black text-slate-900">{formatNumber(d.value)} <span className="text-xs font-bold text-slate-400">· {pct.toFixed(0)}%</span></span>
                  </div>
                );
              })}
            </div>
          </div>
        </ChartCard>

        {/* Headway distribution */}
        <ChartCard
          icon={Clock}
          title="How often a bus comes"
          subtitle="Active routes grouped by headway — lower minutes = more frequent"
        >
          <div className="h-[230px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={headwayData} margin={{ top: 18, right: 8, left: -18, bottom: 0 }}>
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fontWeight: 700, fill: '#475569' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                <Tooltip cursor={{ fill: 'rgba(13,148,136,0.06)' }} formatter={(v: any) => [`${formatNumber(Number(v))} routes`, 'Routes']} contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="count" radius={[8, 8, 0, 0]} fill="#0d9488">
                  <LabelList dataKey="count" position="top" style={{ fontSize: 12, fontWeight: 800, fill: '#0f766e' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Route-type mix */}
        <ChartCard
          icon={Network}
          title="Route types"
          subtitle={`${formatNumber(active.length)} active routes by service role`}
        >
          <div className="h-[230px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={typeData} margin={{ top: 4, right: 36, left: 8, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="label" width={104} tickLine={false} axisLine={false} tick={{ fontSize: 12, fontWeight: 700, fill: '#475569' }} />
                <Tooltip cursor={{ fill: 'rgba(13,148,136,0.06)' }} formatter={(v: any) => [`${formatNumber(Number(v))} routes`, 'Routes']} contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="count" radius={[0, 8, 8, 0]} fill="#0ea5e9" barSize={22}>
                  <LabelList dataKey="count" position="right" style={{ fontSize: 12, fontWeight: 800, fill: '#0369a1' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Before / after fleet */}
        <ChartCard
          icon={TrendingUp}
          title="Fleet: today vs the plan"
          subtitle={`A +${growthPct}% step up from today's operations`}
        >
          <div className="flex h-[230px] items-end gap-6 px-4 pb-2">
            <FleetBar label="Today" value={fleetBefore} max={fleetAfter} tone="slate" caption="~600 buses" />
            <div className="mb-10 flex flex-col items-center text-emerald-600">
              <ArrowUpRight size={30} />
              <span className="text-sm font-black">+{growthPct}%</span>
            </div>
            <FleetBar label="Planned (v3.4.4)" value={fleetAfter} max={fleetAfter} tone="emerald" caption={`${formatNumber(fleetAfter)} buses`} />
          </div>
        </ChartCard>
      </section>

      {/* ── DISTRICT DRILL-DOWN ──────────────────────────────────────── */}
      <section className="overflow-hidden rounded-[2.2rem] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950 px-6 py-6 text-white md:px-8">
          <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-emerald-200">
            <MapPinned size={14} /> District drill-down
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">Service by district</h2>
          <p className="mt-1 max-w-3xl text-sm font-semibold leading-6 text-slate-200/85">
            Every active route is counted under each of the {districtStats.length} districts it touches. Pick a district to see its routes, buses and SSCL backbone presence.
          </p>
        </div>

        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_22rem]">
          {/* Fleet-by-district bar (click to select) */}
          <div className="border-b border-slate-100 p-6 lg:border-b-0 lg:border-r">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Buses by district (touch count)</p>
            <div className="mt-4 h-[340px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={districtBars} margin={{ top: 0, right: 40, left: 8, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={78} tickLine={false} axisLine={false} tick={{ fontSize: 12, fontWeight: 700, fill: '#475569' }} />
                  <Tooltip cursor={{ fill: 'rgba(13,148,136,0.06)' }} formatter={(v: any, _n: any, p: any) => [`${formatNumber(Number(v))} buses · ${p.payload.routes} routes`, p.payload.name]} contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="fleet" radius={[0, 8, 8, 0]} barSize={20} onClick={(d: any) => setActiveDistrict(d.code)} className="cursor-pointer">
                    {districtBars.map((d) => <Cell key={d.code} fill={d.code === activeDistrict ? d.color : '#cbd5e1'} />)}
                    <LabelList dataKey="fleet" position="right" formatter={(v: any) => formatNumber(Number(v))} style={{ fontSize: 12, fontWeight: 800, fill: '#334155' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {districtStats.map((d) => (
                <button key={d.code} type="button" onClick={() => setActiveDistrict(d.code)}
                  className={`rounded-full px-3 py-1.5 text-xs font-black transition-all ${d.code === activeDistrict ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                  {d.name}
                </button>
              ))}
            </div>
          </div>

          {/* Selected district detail */}
          {selected && (
            <aside className="p-6">
              <h3 className="text-xl font-black tracking-tight text-slate-950">{DISTRICT_NAME[selected.code]}</h3>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{selected.code} district</p>
              <div className="mt-4 grid grid-cols-3 gap-2.5">
                <MiniStat label="Routes" value={formatNumber(selected.routes.length)} tone="slate" />
                <MiniStat label="Buses" value={formatNumber(selected.fleet)} tone="emerald" />
                <MiniStat label="SSCL" value={formatNumber(selected.sscl)} tone="violet" />
              </div>
              <p className="mt-5 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Routes serving {DISTRICT_NAME[selected.code]}</p>
              <div className="mt-3 max-h-[300px] space-y-2 overflow-y-auto pr-1">
                {selectedRoutes.map((r) => (
                  <button key={getRouteKey(r)} type="button" onClick={() => onSelectRoute?.(r)}
                    className="group flex w-full items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3.5 py-2.5 text-left transition-all hover:bg-emerald-50">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-900">{r.routeCode}</p>
                      <p className="truncate text-xs font-bold text-slate-500">{r.routeName}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-right">
                        <span className="block text-sm font-black text-emerald-700">{r.fleetRequired} bus</span>
                        <span className="block text-[10px] font-bold text-slate-400">every {r.headwayMin} min</span>
                      </span>
                      <ArrowUpRight size={15} className="text-slate-300 transition-colors group-hover:text-emerald-600" />
                    </div>
                  </button>
                ))}
              </div>
            </aside>
          )}
        </div>
      </section>
    </div>
  );
}

const TOOLTIP_STYLE = {
  borderRadius: 14,
  border: '1px solid #e2e8f0',
  boxShadow: '0 10px 30px rgba(15,23,42,0.12)',
  fontSize: 12,
  fontWeight: 700,
};

function ChartCard({ icon: Icon, title, subtitle, children }: { icon: typeof Clock; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Icon size={17} /></span>
        <div>
          <h3 className="text-base font-black text-slate-950">{title}</h3>
          <p className="text-xs font-semibold text-slate-500">{subtitle}</p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone: 'slate' | 'emerald' | 'violet' }) {
  const cls = { slate: 'bg-slate-50 text-slate-900', emerald: 'bg-emerald-50 text-emerald-800', violet: 'bg-violet-50 text-violet-800' }[tone];
  return (
    <div className={`rounded-2xl p-3 text-center ${cls}`}>
      <p className="text-2xl font-black leading-none">{value}</p>
      <p className="mt-1.5 text-[10px] font-black uppercase tracking-[0.14em] opacity-70">{label}</p>
    </div>
  );
}

function FleetBar({ label, value, max, tone, caption }: { label: string; value: number; max: number; tone: 'slate' | 'emerald'; caption: string }) {
  const pct = max ? (value / max) * 100 : 0;
  const barCls = tone === 'emerald' ? 'bg-gradient-to-t from-emerald-600 to-teal-500' : 'bg-slate-300';
  const textCls = tone === 'emerald' ? 'text-emerald-700' : 'text-slate-500';
  return (
    <div className="flex h-full flex-1 flex-col items-center justify-end">
      <span className={`mb-2 text-xl font-black ${textCls}`}>{formatNumber(value)}</span>
      <div className="flex w-full max-w-[120px] items-end" style={{ height: '70%' }}>
        <div className={`w-full rounded-t-2xl ${barCls}`} style={{ height: `${Math.max(8, pct)}%` }} />
      </div>
      <p className="mt-3 text-sm font-black text-slate-900">{label}</p>
      <p className="text-xs font-semibold text-slate-400">{caption}</p>
    </div>
  );
}
