'use client';

import { format } from 'date-fns';
import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  BarChart3,
  BusFront,
  Download,
  GitBranch,
  Map as MapIcon,
  Network,
  Route,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import type {
  RationalizationLogV3Entry,
  RationalizedRouteV3,
  RouteRationalizationV3Summary,
  V3SourceFile,
} from '@/lib/routeRationalizationV3';
import {
  DistributionCard,
  formatActionLabel,
  formatNumber,
  formatRouteType,
  getActionPillClass,
  getPriorityPillClass,
  KpiCard,
  PolicyCard,
} from '@/components/rationalization-v3/V3Cards';
import V3RouteTable from '@/components/rationalization-v3/V3RouteTable';
import V3SourceFiles from '@/components/rationalization-v3/V3SourceFiles';
import { getRouteKey, getRouteMapHref, PRIORITY_ORDER } from '@/components/rationalization-v3/V3RouteUtils';

const V3NetworkMap = dynamic(() => import('@/components/rationalization-v3/V3NetworkMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-4 border-cyan-600" />
        <p className="mt-4 text-sm font-black uppercase tracking-[0.18em] text-cyan-700">Preparing v3 map</p>
      </div>
    </div>
  ),
});

type V3PresentationDashboardProps = {
  routes: RationalizedRouteV3[];
  log: RationalizationLogV3Entry[];
  summary: RouteRationalizationV3Summary;
  updatedAt: number;
  sourceFiles: V3SourceFile[];
};

export default function V3PresentationDashboard({
  routes,
  log,
  summary,
  updatedAt,
  sourceFiles,
}: V3PresentationDashboardProps) {
  const [viewMode, setViewMode] = useState<'native' | 'generated'>('native');
  const [selectedRouteKey, setSelectedRouteKey] = useState(routes[0] ? getRouteKey(routes[0]) : null);

  const selectedRoute = routes.find((route) => getRouteKey(route) === selectedRouteKey) || routes[0] || null;
  const topFleetRoutes = useMemo(() => {
    return routes
      .filter((route) => route.actionTaken !== 'MERGED_INTO_TRUNK')
      .sort((a, b) => b.fleetRequired - a.fleetRequired)
      .slice(0, 6);
  }, [routes]);

  const logByRouteKey = useMemo(() => {
    const map = new Map<string, RationalizationLogV3Entry>();
    log.forEach((entry) => map.set(getRouteKey(entry), entry));
    return map;
  }, [log]);

  const selectedLog = selectedRoute ? logByRouteKey.get(getRouteKey(selectedRoute)) : null;
  const hpvShare = summary.totalFleetRequired ? (summary.hpvTotal / summary.totalFleetRequired) * 100 : 0;
  const mpvShare = summary.totalFleetRequired ? (summary.mpvTotal / summary.totalFleetRequired) * 100 : 0;

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-12">
      <section className="overflow-hidden rounded-[2.6rem] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 text-white shadow-[0_28px_90px_rgba(15,23,42,0.18)]">
        <div className="relative px-6 py-8 md:px-8 lg:px-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.18),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(249,115,22,0.18),_transparent_30%)]" />
          <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1.3fr)_minmax(20rem,0.7fr)]">
            <div>
              <div className="mb-5 flex flex-wrap gap-2">
                <span className="rounded-full border border-white/12 bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-cyan-100">
                  v3 final network
                </span>
                <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-emerald-100">
                  offline bundle ready
                </span>
                <span className="rounded-full border border-white/12 bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-slate-100">
                  Updated {format(new Date(updatedAt), 'dd MMM yyyy, hh:mm a')}
                </span>
              </div>

              <h1 className="max-w-4xl text-3xl font-black tracking-tight text-white md:text-5xl">
                Route Rationalization V3 Presentation Deck
              </h1>
              <p className="mt-4 max-w-3xl text-base font-semibold leading-8 text-slate-200/88">
                A simple presentation view of the Jammu frequency plan. Route codes are shown first so every route can be
                matched back to the Excel workbook during your presentation.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href="/route-rationalization-v3/Master_Transit_Map_v3.html"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/12 bg-white/10 px-4 py-3 text-sm font-bold text-white transition-all hover:border-cyan-200/50 hover:bg-white/15"
                >
                  <ArrowUpRight size={16} /> Open master map
                </a>
                <a
                  href="/route-rationalization-v3/Rationalised_Routes_v3.geojson"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/12 bg-white/10 px-4 py-3 text-sm font-bold text-white transition-all hover:border-cyan-200/50 hover:bg-white/15"
                >
                  <MapIcon size={16} /> View GeoJSON
                </a>
                <a
                  href="/route-rationalization-v3/Jammu_Route_Frequency_Plan_v3.xlsx"
                  download
                  className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950 shadow-lg transition-all hover:translate-y-[-1px]"
                >
                  <Download size={16} /> Download workbook
                </a>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-[2rem] border border-white/12 bg-white/10 p-5 backdrop-blur">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100">Network coverage</p>
                <p className="mt-2 text-4xl font-black">{summary.cmpCoveragePercent.toFixed(2)}%</p>
                <p className="mt-1 text-sm font-semibold text-slate-200/80">
                  {formatNumber(summary.deduplicatedNetworkPopulation)} residents covered from CMP 2024 population.
                </p>
              </div>
              <div className="rounded-[2rem] border border-white/12 bg-white/10 p-5 backdrop-blur">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-100">Buses needed</p>
                <p className="mt-2 text-4xl font-black">{formatNumber(summary.totalFleetRequired)}</p>
                <p className="mt-1 text-sm font-semibold text-slate-200/80">
                  {formatNumber(summary.hpvTotal)} large buses + {formatNumber(summary.mpvTotal)} medium buses.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Active routes"
          value={formatNumber(summary.activeRoutes)}
          detail={`${formatNumber(summary.totalRouteRows)} total rows, including ${summary.mergedRoutes} merged records.`}
          icon={GitBranch}
          tone="slate"
        />
        <KpiCard
          label="Main / feeder"
          value={`${summary.trunkRoutes} / ${summary.feederRoutes}`}
          detail={`${summary.cmpBackboneTrunks} important corridors get faster service.`}
          icon={Network}
          tone="blue"
        />
        <KpiCard
          label="Social routes"
          value={formatNumber(summary.socialObligationRoutes)}
          detail="Routes kept because they serve important public needs."
          icon={ShieldCheck}
          tone="teal"
        />
        <KpiCard
          label="Route maps"
          value={formatNumber(summary.routeMapHtmlCount)}
          detail="Generated HTML route maps bundled for presentation access."
          icon={MapIcon}
          tone="orange"
        />
      </section>

      <section className="overflow-hidden rounded-[2.4rem] border border-slate-200 bg-slate-950 text-white shadow-sm">
        <div className="grid gap-5 p-6 md:grid-cols-2 xl:grid-cols-4">
          <PolicyCard
            title="More main routes selected"
            detail="The plan promotes stronger corridors into main routes so the busiest links are easier to serve."
            icon={Sparkles}
          />
          <PolicyCard
            title="Important corridors get faster service"
            detail="Routes on key city corridors are planned with shorter waiting times."
            icon={Route}
          />
          <PolicyCard
            title="Social protection"
            detail="Routes serving important communities are kept in the plan instead of being dropped."
            icon={ShieldCheck}
          />
          <PolicyCard
            title="Only large and medium buses"
            detail="The v3 plan removes LPV service and uses large buses for main routes and medium buses for feeders."
            icon={BusFront}
          />
        </div>
      </section>

      <section className="rounded-[2rem] border border-cyan-100 bg-cyan-50 p-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700">Route code guide</p>
        <h2 className="mt-2 text-2xl font-black text-slate-950">Use route codes to match the dashboard with the Excel plan</h2>
        <p className="mt-2 max-w-4xl text-sm font-semibold leading-7 text-slate-600">
          Route code is the official code from the frequency plan workbook. Use it to match a dashboard route with the
          Excel report. Dashboard IDs like FDR-351 or CMP-08 are still shown, but they are now secondary labels.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.55fr)_24rem]">
        <div className="space-y-6">
          <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-950">V3 Network Explorer</h2>
                <p className="text-sm font-semibold text-slate-500">
                  Use the native map for live route focusing, or open the exact generated master map from the pipeline.
                </p>
              </div>
              <div className="inline-flex rounded-2xl bg-slate-100 p-1.5">
                <button
                  type="button"
                  onClick={() => setViewMode('native')}
                  className={`rounded-xl px-4 py-2 text-sm font-black transition-all ${
                    viewMode === 'native' ? 'bg-white text-cyan-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Native map
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('generated')}
                  className={`rounded-xl px-4 py-2 text-sm font-black transition-all ${
                    viewMode === 'generated' ? 'bg-white text-cyan-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Original map
                </button>
              </div>
            </div>
            <div className="h-[54vh] min-h-[430px] bg-slate-50 lg:h-[60vh] lg:min-h-[520px]">
              {viewMode === 'native' ? (
                <V3NetworkMap selectedRouteId={selectedRoute?.newRouteId || null} />
              ) : (
                <iframe
                  src="/route-rationalization-v3/Master_Transit_Map_v3.html"
                  title="V3 Master Transit Map"
                  className="h-full w-full bg-white"
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <DistributionCard title="Route type mix" items={summary.routeTypeCounts} total={summary.totalRouteRows} tone="blue" />
            <DistributionCard
              title="Priority bands"
              items={[...summary.priorityBandCounts].sort(
                (a, b) => PRIORITY_ORDER.indexOf(a.label) - PRIORITY_ORDER.indexOf(b.label)
              )}
              total={summary.totalRouteRows}
              tone="orange"
            />
            <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">Vehicle split</h3>
              <div className="mt-5 overflow-hidden rounded-2xl bg-slate-100">
                <div className="flex h-8">
                  <div className="bg-blue-600" style={{ width: `${hpvShare}%` }} />
                  <div className="bg-teal-500" style={{ width: `${mpvShare}%` }} />
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-blue-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-700">HPV</p>
                  <p className="mt-2 text-2xl font-black text-blue-900">{formatNumber(summary.hpvTotal)}</p>
                  <p className="mt-1 text-xs font-bold text-blue-700">{hpvShare.toFixed(1)}%</p>
                </div>
                <div className="rounded-2xl bg-teal-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-teal-700">MPV</p>
                  <p className="mt-2 text-2xl font-black text-teal-900">{formatNumber(summary.mpvTotal)}</p>
                  <p className="mt-1 text-xs font-bold text-teal-700">{mpvShare.toFixed(1)}%</p>
                </div>
              </div>
              <div className="mt-3 rounded-2xl bg-orange-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-700">LPV</p>
                <p className="mt-2 text-2xl font-black text-orange-900">{formatNumber(summary.lpvTotal)}</p>
                <p className="mt-1 text-xs font-bold text-orange-700">Removed by v3 policy</p>
              </div>
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700">Focused route</p>
            {selectedRoute ? (
              <div className="mt-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-3xl font-black tracking-tight text-slate-950">{selectedRoute.routeCode || selectedRoute.newRouteId}</h3>
                    <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                      Dashboard ID: {selectedRoute.newRouteId} / Old ID: {selectedRoute.routeId}
                    </p>
                    <p className="mt-1 text-sm font-bold leading-6 text-slate-500">{selectedRoute.routeName}</p>
                  </div>
                  {selectedRoute.actionTaken !== 'MERGED_INTO_TRUNK' && (
                    <a
                      href={getRouteMapHref(selectedRoute)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-cyan-50 px-3 py-2 text-sm font-black text-cyan-700 transition-colors hover:bg-cyan-100"
                    >
                      Map <ArrowUpRight size={14} />
                    </a>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${getActionPillClass(selectedRoute.actionTaken)}`}>
                    {formatActionLabel(selectedRoute.actionTaken)}
                  </span>
                  <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${getPriorityPillClass(selectedRoute.priorityBand)}`}>
                    {selectedRoute.priorityBand} priority
                  </span>
                  {selectedRoute.socialFlag && (
                    <span className="rounded-full bg-orange-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-orange-800">
                      social obligation
                    </span>
                  )}
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Buses needed</p>
                    <p className="mt-2 text-2xl font-black text-slate-950">{selectedRoute.fleetRequired}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Bus every</p>
                    <p className="mt-2 text-2xl font-black text-cyan-700">{selectedRoute.headwayMin} min</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">HPV/MPV</p>
                    <p className="mt-2 text-2xl font-black text-blue-700">
                      {selectedRoute.hpvCount}/{selectedRoute.mpvCount}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Demand score</p>
                    <p className="mt-2 text-2xl font-black text-orange-600">{selectedRoute.finalCdi.toFixed(3)}</p>
                  </div>
                </div>

                {selectedLog?.reasoning && (
                  <div className="mt-4 max-h-36 overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Why this decision was made</p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{selectedLog.reasoning}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-4 text-sm font-semibold text-slate-500">No route selected.</p>
            )}
          </div>

          <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-orange-600">
              <BarChart3 size={14} /> Routes needing the most buses
            </p>
            <div className="mt-4 space-y-3">
              {topFleetRoutes.map((route, index) => (
                <button
                  key={getRouteKey(route)}
                  type="button"
                  onClick={() => setSelectedRouteKey(getRouteKey(route))}
                  className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-left transition-all hover:bg-orange-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-black text-slate-950">{route.routeCode || route.newRouteId}</p>
                      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
                        Dashboard ID: {route.newRouteId}
                      </p>
                      <p className="text-xs font-bold leading-5 text-slate-500">{route.routeName}</p>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-600">#{index + 1}</span>
                  </div>
                  <p className="mt-2 text-sm font-black text-orange-700">
                    {route.fleetRequired} buses / bus every {route.headwayMin} min
                  </p>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </section>

      <V3RouteTable
        routes={routes}
        selectedRouteKey={selectedRouteKey}
        onSelectRoute={(route) => setSelectedRouteKey(getRouteKey(route))}
      />

      <V3SourceFiles files={sourceFiles} selectedRoute={selectedRoute} />
    </div>
  );
}
