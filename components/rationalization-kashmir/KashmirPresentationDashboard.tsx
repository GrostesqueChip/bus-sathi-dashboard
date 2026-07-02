'use client';

import { format } from 'date-fns';
import dynamic from 'next/dynamic';
import { useMemo, useRef, useState } from 'react';
import {
  Activity, ArrowUpRight, BarChart3, BusFront, Download, GitBranch, LayoutDashboard,
  Map as MapIcon, Mountain, Network, ShieldCheck, Sparkles, Table2,
} from 'lucide-react';
import type {
  RationalizationLogKashmirEntry,
  RationalizedRouteKashmir,
  RouteRationalizationKashmirSummary,
  KashmirSourceFile,
} from '@/lib/routeRationalizationKashmir';
import {
  formatActionLabel, formatNumber, getActionPillClass,
  getPriorityPillClass, KpiCard, PolicyCard,
} from '@/components/rationalization-kashmir/KashmirCards';
import KashmirRouteTable from '@/components/rationalization-kashmir/KashmirRouteTable';
import KashmirSourceFiles from '@/components/rationalization-kashmir/KashmirSourceFiles';
import KashmirBeforeAfter from '@/components/rationalization-kashmir/KashmirBeforeAfter';
import KashmirServicePlans from '@/components/rationalization-kashmir/KashmirServicePlans';
import KashmirAssurance from '@/components/rationalization-kashmir/KashmirAssurance';
import KashmirMethodology from '@/components/rationalization-kashmir/KashmirMethodology';
import KashmirStopsCodes from '@/components/rationalization-kashmir/KashmirStopsCodes';
import KashmirDataDistricts from '@/components/rationalization-kashmir/KashmirDataDistricts';
import { getRouteKey, getRouteMapHref } from '@/components/rationalization-kashmir/KashmirRouteUtils';

const KashmirRealityLayer = dynamic(() => import('@/components/rationalization-kashmir/KashmirRealityLayer'), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 items-center justify-center rounded-3xl border border-slate-200 bg-white">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-4 border-emerald-600" />
        <p className="mt-3 text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Loading observed reality</p>
      </div>
    </div>
  ),
});

const KashmirNetworkMap = dynamic(() => import('@/components/rationalization-kashmir/KashmirNetworkMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-4 border-emerald-600" />
        <p className="mt-4 text-sm font-black uppercase tracking-[0.18em] text-emerald-700">Preparing Kashmir map</p>
      </div>
    </div>
  ),
});

type Props = {
  routes: RationalizedRouteKashmir[];
  log: RationalizationLogKashmirEntry[];
  summary: RouteRationalizationKashmirSummary;
  updatedAt: number;
  sourceFiles: KashmirSourceFile[];
};

type TabId = 'overview' | 'map' | 'reality' | 'data' | 'routes' | 'method' | 'downloads';
const TABS: { id: TabId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'map', label: 'Network Map', icon: MapIcon },
  { id: 'reality', label: 'Reality Layer', icon: Activity },
  { id: 'data', label: 'Data & Districts', icon: BarChart3 },
  { id: 'routes', label: 'Routes & Stops', icon: Table2 },
  { id: 'method', label: 'Method & Checks', icon: ShieldCheck },
  { id: 'downloads', label: 'Downloads', icon: Download },
];

const PRETTY = '/route-rationalization-kashmir/Kashmir_Route_Frequency_Plan_v3.4.5_RTO_Pretty.xlsx';

export default function KashmirPresentationDashboard({ routes, log, summary, updatedAt, sourceFiles }: Props) {
  const [tab, setTab] = useState<TabId>('overview');
  const [viewMode, setViewMode] = useState<'native' | 'generated'>('native');
  const [selectedRouteKey, setSelectedRouteKey] = useState(routes[0] ? getRouteKey(routes[0]) : null);
  const topRef = useRef<HTMLDivElement>(null);

  const selectedRoute = routes.find((r) => getRouteKey(r) === selectedRouteKey) || routes[0] || null;
  const topFleetRoutes = useMemo(
    () => routes.filter((r) => r.actionTaken !== 'MERGED_INTO_TRUNK').sort((a, b) => b.fleetRequired - a.fleetRequired).slice(0, 6),
    [routes]
  );
  const logByRouteKey = useMemo(() => {
    const m = new Map<string, RationalizationLogKashmirEntry>();
    log.forEach((e) => m.set(getRouteKey(e), e));
    return m;
  }, [log]);
  const selectedLog = selectedRoute ? logByRouteKey.get(getRouteKey(selectedRoute)) : null;

  const goTab = (id: TabId) => {
    setTab(id);
    // bring the section nav back into view on switch
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  return (
    <div className="mx-auto max-w-7xl pb-12">
      {/* ───────────────── HERO (always visible) ───────────────── */}
      <section className="overflow-hidden rounded-[2.4rem] border border-slate-200 bg-gradient-to-br from-slate-950 via-emerald-950 to-teal-950 text-white shadow-[0_28px_90px_rgba(15,23,42,0.18)]">
        <div className="relative px-6 py-7 md:px-9">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(249,115,22,0.16),_transparent_30%)]" />
          <div className="relative grid gap-7 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
            <div>
              <div className="mb-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-white/12 bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-emerald-100">kashmir valley v3.4.5</span>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/30 bg-emerald-400/15 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-emerald-100"><ShieldCheck size={12} /> {summary.activeRoutes} routes verified</span>
                <span className="rounded-full border border-violet-300/20 bg-violet-400/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-violet-100">{summary.ssclBackboneRoutes} sscl backbone</span>
                <span className="rounded-full border border-white/12 bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-slate-100">Updated {format(new Date(updatedAt), 'dd MMM yyyy')}</span>
              </div>
              <h1 className="max-w-4xl text-3xl font-black tracking-tight md:text-[2.7rem] md:leading-[1.05]">Kashmir Valley Route Rationalisation</h1>
              <p className="mt-3 max-w-3xl text-[15px] font-semibold leading-7 text-slate-200/85">
                A data-driven frequency plan for {summary.activeRoutes} active routes across the Kashmir Division, built on the 30-route SSCL e-bus backbone and independently verified against the real world.
              </p>
              <div className="mt-5 flex flex-wrap gap-2.5">
                <a href={PRETTY} download className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950 shadow-lg transition-all hover:translate-y-[-1px]"><Download size={16} /> Bus Schedule (Excel)</a>
                <button type="button" onClick={() => goTab('map')} className="inline-flex items-center gap-2 rounded-2xl border border-white/12 bg-white/10 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-white/15"><MapIcon size={16} /> Explore network</button>
                <button type="button" onClick={() => goTab('downloads')} className="inline-flex items-center gap-2 rounded-2xl border border-white/12 bg-white/10 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-white/15"><ArrowUpRight size={16} /> All downloads</button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-[1.7rem] border border-white/12 bg-white/10 p-5 backdrop-blur">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-100">Network coverage</p>
                <p className="mt-1.5 text-4xl font-black">{summary.networkCoveragePercent.toFixed(1)}%</p>
                <p className="mt-1 text-sm font-semibold text-slate-200/80">~{formatNumber(summary.deduplicatedNetworkPopulation)} of {formatNumber(summary.studyAreaPopulation)} residents.</p>
              </div>
              <div className="rounded-[1.7rem] border border-white/12 bg-white/10 p-5 backdrop-blur">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-100">Buses needed</p>
                <p className="mt-1.5 text-4xl font-black">{formatNumber(summary.totalFleetRequired)}</p>
                <p className="mt-1 text-sm font-semibold text-slate-200/80">{formatNumber(summary.hpvTotal)} large + {formatNumber(summary.mpvTotal)} medium + {formatNumber(summary.lpvTotal)} small.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────── STICKY SECTION NAV ───────────────── */}
      <div ref={topRef} className="sticky top-2 z-[1100] mt-5 scroll-mt-2">
        <nav className="flex gap-1.5 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_10px_30px_rgba(15,23,42,0.12)]">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => goTab(id)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black transition-all ${
                tab === id ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
              }`}>
              <Icon size={16} /> {label}
            </button>
          ))}
        </nav>
      </div>

      {/* ───────────────── PANELS ───────────────── */}
      <div className="mt-6 space-y-8">
        {/* OVERVIEW */}
        {tab === 'overview' && (
          <>
            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <KpiCard label="Active routes" value={formatNumber(summary.activeRoutes)} detail={`From ${formatNumber(summary.totalRouteRows)} legacy permits — ${summary.mergedRoutes} absorbed into trunks.`} icon={GitBranch} tone="slate" />
              <KpiCard label="Main / feeder" value={`${summary.trunkRoutes} / ${summary.feederRoutes}`} detail={`${summary.ssclBackboneRoutes} SSCL e-bus trunks at 15-min headway.`} icon={Network} tone="emerald" />
              <KpiCard label="Social routes" value={formatNumber(summary.socialObligationRoutes)} detail="Protected because they serve townships, hospitals & lifelines." icon={ShieldCheck} tone="teal" />
              <KpiCard label="Route maps" value={formatNumber(summary.routeMapHtmlCount)} detail="Per-route HTML maps bundled for presentation." icon={MapIcon} tone="orange" />
            </section>

            <section className="overflow-hidden rounded-[2.2rem] border border-slate-200 bg-slate-950 text-white shadow-sm">
              <div className="grid gap-5 p-6 md:grid-cols-2 xl:grid-cols-4">
                <PolicyCard title="SSCL e-bus backbone" detail="30 SSCL routes from CHALO ridership form the trunk backbone — 15-min headways, 98 deployed buses." icon={BusFront} />
                <PolicyCard title="3-tier POI system" detail="Year-round anchors, secondary facilities, and seasonal tourism POIs drive demand scoring." icon={Mountain} />
                <PolicyCard title="Gender-aware demand" detail="64.5% women riders (SSCL data) — routes near women-anchor POIs get a +25% demand boost." icon={Sparkles} />
                <PolicyCard title="Social protection" detail="Routes serving townships, SKIMS/SMHS hospitals and remote communities are shielded from rationalisation." icon={ShieldCheck} />
              </div>
            </section>

            {summary.touristCorridorCount > 0 && (
              <section className="rounded-[2rem] border border-emerald-100 bg-emerald-50 p-6 shadow-sm">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Tourist corridor note</p>
                <h2 className="mt-2 text-xl font-black text-slate-950">{summary.touristCorridorCount} routes flagged as tourist corridors</h2>
                <p className="mt-2 max-w-4xl text-sm font-semibold leading-7 text-slate-600">Routes serving Gulmarg, Pahalgam, Sonmarg and other seasonal destinations are flagged in the data. The plan provides year-round recommended sizes; the RTO can scale these at execution.</p>
              </section>
            )}

            <KashmirBeforeAfter summary={summary} />
            <KashmirServicePlans />
          </>
        )}

        {/* NETWORK MAP */}
        {tab === 'map' && (
          <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.55fr)_24rem]">
            <div className="space-y-6">
              <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm">
                <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-xl font-black text-slate-950">Kashmir Network Explorer</h2>
                    <p className="text-sm font-semibold text-slate-500">Focus routes on the live map, or open the generated master map from the pipeline.</p>
                  </div>
                  <div className="inline-flex rounded-2xl bg-slate-100 p-1.5">
                    <button type="button" onClick={() => setViewMode('native')} className={`rounded-xl px-4 py-2 text-sm font-black transition-all ${viewMode === 'native' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>Native map</button>
                    <button type="button" onClick={() => setViewMode('generated')} className={`rounded-xl px-4 py-2 text-sm font-black transition-all ${viewMode === 'generated' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>Original map</button>
                  </div>
                </div>
                <div className="h-[58vh] min-h-[460px] bg-slate-50">
                  {viewMode === 'native' ? (
                    <KashmirNetworkMap selectedRouteId={selectedRoute?.newRouteId || null} />
                  ) : (
                    <iframe src="/route-rationalization-kashmir/Master_Transit_Map_Kashmir_v3.html" title="Kashmir Master Transit Map" className="h-full w-full bg-white" />
                  )}
                </div>
              </div>
            </div>

            <aside className="space-y-6">
              <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Focused route</p>
                {selectedRoute ? (
                  <div className="mt-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-2xl font-black tracking-tight text-slate-950">{selectedRoute.routeCode || selectedRoute.newRouteId}</h3>
                        <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-slate-400">Map ID: {selectedRoute.newRouteId}</p>
                        <p className="mt-1 text-sm font-bold leading-6 text-slate-500">{selectedRoute.routeName}</p>
                      </div>
                      {selectedRoute.actionTaken !== 'MERGED_INTO_TRUNK' && (
                        <a href={getRouteMapHref(selectedRoute)} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-700 transition-colors hover:bg-emerald-100">Map <ArrowUpRight size={14} /></a>
                      )}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${getActionPillClass(selectedRoute.actionTaken)}`}>{formatActionLabel(selectedRoute.actionTaken)}</span>
                      <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${getPriorityPillClass(selectedRoute.priorityBand)}`}>{selectedRoute.priorityBand} priority</span>
                      {selectedRoute.socialFlag && <span className="rounded-full bg-orange-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-orange-800">social</span>}
                      {selectedRoute.touristCorridor && <span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-800">tourist</span>}
                    </div>
                    {selectedRoute.actionTaken === 'MERGED_INTO_TRUNK' ? (
                      <div className="mt-5 rounded-2xl bg-slate-100 p-4 text-center"><p className="text-sm font-bold text-slate-600">Merged into a trunk route — its fleet/headway are combined with the trunk.</p></div>
                    ) : (
                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-slate-50 p-3"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Buses</p><p className="mt-1.5 text-2xl font-black text-slate-950">{selectedRoute.fleetRequired}</p></div>
                        <div className="rounded-2xl bg-slate-50 p-3"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Bus every</p><p className="mt-1.5 text-2xl font-black text-emerald-700">{selectedRoute.headwayMin} min</p></div>
                        <div className="rounded-2xl bg-slate-50 p-3"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">HPV/MPV</p><p className="mt-1.5 text-2xl font-black text-blue-700">{selectedRoute.hpvCount}/{selectedRoute.mpvCount}</p></div>
                        <div className="rounded-2xl bg-slate-50 p-3"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Demand score</p><p className="mt-1.5 text-2xl font-black text-orange-600">{selectedRoute.finalCdi.toFixed(3)}</p></div>
                      </div>
                    )}
                    {selectedLog?.reasoning && (
                      <div className="mt-4 max-h-36 overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50 p-4"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Why this decision</p><p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{selectedLog.reasoning}</p></div>
                    )}
                  </div>
                ) : <p className="mt-4 text-sm font-semibold text-slate-500">No route selected.</p>}
              </div>

              <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
                <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-orange-600"><BarChart3 size={14} /> Routes needing the most buses</p>
                <div className="mt-4 space-y-3">
                  {topFleetRoutes.map((route, i) => (
                    <button key={getRouteKey(route)} type="button" onClick={() => setSelectedRouteKey(getRouteKey(route))} className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-left transition-all hover:bg-orange-50">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-black text-slate-950">{route.routeCode || route.newRouteId}</p>
                          <p className="text-xs font-bold leading-5 text-slate-500">{route.routeName}</p>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-600">#{i + 1}</span>
                      </div>
                      <p className="mt-2 text-sm font-black text-orange-700">{route.fleetRequired} buses / every {route.headwayMin} min</p>
                    </button>
                  ))}
                </div>
              </div>
            </aside>
          </section>
        )}

        {/* DATA & DISTRICTS */}
        {/* REALITY LAYER (observed app-GPS ground truth) */}
        {tab === 'reality' && <KashmirRealityLayer />}

        {tab === 'data' && (
          <KashmirDataDistricts
            routes={routes}
            summary={summary}
            onSelectRoute={(r) => { setSelectedRouteKey(getRouteKey(r)); goTab('map'); }}
          />
        )}

        {/* ROUTES & STOPS */}
        {tab === 'routes' && (
          <>
            <KashmirRouteTable routes={routes} selectedRouteKey={selectedRouteKey} onSelectRoute={(r) => setSelectedRouteKey(getRouteKey(r))} />
            <KashmirStopsCodes />
          </>
        )}

        {/* METHOD & CHECKS */}
        {tab === 'method' && (
          <>
            <KashmirMethodology />
            <KashmirAssurance />
          </>
        )}

        {/* DOWNLOADS */}
        {tab === 'downloads' && (
          <KashmirSourceFiles files={sourceFiles} selectedRoute={selectedRoute} />
        )}
      </div>
    </div>
  );
}
