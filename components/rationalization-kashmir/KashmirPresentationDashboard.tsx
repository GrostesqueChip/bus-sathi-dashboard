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
  Mountain,
  Network,
  Route,
  ShieldCheck,
  Sparkles,
  TreePine,
} from 'lucide-react';
import type {
  RationalizationLogKashmirEntry,
  RationalizedRouteKashmir,
  RouteRationalizationKashmirSummary,
  KashmirSourceFile,
} from '@/lib/routeRationalizationKashmir';
import {
  DistributionCard,
  formatActionLabel,
  formatNumber,
  formatRouteType,
  getActionPillClass,
  getPriorityPillClass,
  KpiCard,
  PolicyCard,
} from '@/components/rationalization-kashmir/KashmirCards';
import KashmirRouteTable from '@/components/rationalization-kashmir/KashmirRouteTable';
import KashmirSourceFiles from '@/components/rationalization-kashmir/KashmirSourceFiles';
import { getRouteKey, getRouteMapHref, PRIORITY_ORDER } from '@/components/rationalization-kashmir/KashmirRouteUtils';

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

type KashmirPresentationDashboardProps = {
  routes: RationalizedRouteKashmir[];
  log: RationalizationLogKashmirEntry[];
  summary: RouteRationalizationKashmirSummary;
  updatedAt: number;
  sourceFiles: KashmirSourceFile[];
};

export default function KashmirPresentationDashboard({
  routes,
  log,
  summary,
  updatedAt,
  sourceFiles,
}: KashmirPresentationDashboardProps) {
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
    const map = new Map<string, RationalizationLogKashmirEntry>();
    log.forEach((entry) => map.set(getRouteKey(entry), entry));
    return map;
  }, [log]);

  const selectedLog = selectedRoute ? logByRouteKey.get(getRouteKey(selectedRoute)) : null;
  const hpvShare = summary.totalFleetRequired ? (summary.hpvTotal / summary.totalFleetRequired) * 100 : 0;
  const mpvShare = summary.totalFleetRequired ? (summary.mpvTotal / summary.totalFleetRequired) * 100 : 0;

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-12">
      <section className="overflow-hidden rounded-[2.6rem] border border-slate-200 bg-gradient-to-br from-slate-950 via-emerald-950 to-teal-950 text-white shadow-[0_28px_90px_rgba(15,23,42,0.18)]">
        <div className="relative px-6 py-8 md:px-8 lg:px-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(249,115,22,0.18),_transparent_30%)]" />
          <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1.3fr)_minmax(20rem,0.7fr)]">
            <div>
              <div className="mb-5 flex flex-wrap gap-2">
                <span className="rounded-full border border-white/12 bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-emerald-100">
                  kashmir valley v3.3.3
                </span>
                <span className="rounded-full border border-violet-300/20 bg-violet-400/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-violet-100">
                  {summary.ssclBackboneRoutes} sscl backbone routes
                </span>
                <span className="rounded-full border border-white/12 bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-slate-100">
                  Updated {format(new Date(updatedAt), 'dd MMM yyyy, hh:mm a')}
                </span>
              </div>

              <h1 className="max-w-4xl text-3xl font-black tracking-tight text-white md:text-5xl">
                Kashmir Valley Route Rationalisation
              </h1>
              <p className="mt-4 max-w-3xl text-base font-semibold leading-8 text-slate-200/88">
                A data-driven frequency plan for 342 in-scope routes in the Srinagar Valley, built on the SSCL e-bus
                backbone with 30 trunk routes from CHALO ridership data.
              </p>
              <p className="mt-2 max-w-3xl text-xs font-semibold leading-5 text-amber-100/90">
                Route codes shown with a <span className="rounded bg-amber-200/20 px-1 font-black uppercase tracking-[0.14em] text-amber-100">TEMP</span> pill are placeholders
                (format <code className="font-mono">TMP-K####</code>). The slot is wired through every list and detail panel and will fill in
                automatically once the stops-derived <code className="font-mono">Route_Code</code> values are generated from
                <code className="font-mono"> Kashmir_Stops_Sectored_V2.csv</code>.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href="/route-rationalization-kashmir/Master_Transit_Map_Kashmir_v3.html"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/12 bg-white/10 px-4 py-3 text-sm font-bold text-white transition-all hover:border-emerald-200/50 hover:bg-white/15"
                >
                  <ArrowUpRight size={16} /> Open master map
                </a>
                <a
                  href="/route-rationalization-kashmir/Rationalised_Routes_Kashmir_v3.geojson"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/12 bg-white/10 px-4 py-3 text-sm font-bold text-white transition-all hover:border-emerald-200/50 hover:bg-white/15"
                >
                  <MapIcon size={16} /> View GeoJSON
                </a>
                <a
                  href="/route-rationalization-kashmir/Kashmir_Route_Frequency_Plan_v3.xlsx"
                  download
                  className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950 shadow-lg transition-all hover:translate-y-[-1px]"
                >
                  <Download size={16} /> Download workbook
                </a>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-[2rem] border border-white/12 bg-white/10 p-5 backdrop-blur">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-100">Network coverage</p>
                <p className="mt-2 text-4xl font-black">{summary.networkCoveragePercent.toFixed(1)}%</p>
                <p className="mt-1 text-sm font-semibold text-slate-200/80">
                  ~{formatNumber(summary.deduplicatedNetworkPopulation)} residents covered from {formatNumber(summary.studyAreaPopulation)} study area population.
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
          detail={`${summary.ssclBackboneRoutes} SSCL e-bus backbone trunk routes with 15-min headway.`}
          icon={Network}
          tone="emerald"
        />
        <KpiCard
          label="Social routes"
          value={formatNumber(summary.socialObligationRoutes)}
          detail="Routes kept because they serve KP townships, hospitals, and public needs."
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
            title="SSCL e-bus backbone"
            detail="30 SSCL routes from CHALO ridership data form the trunk backbone with 15-minute headways and 98 deployed buses."
            icon={BusFront}
          />
          <PolicyCard
            title="3-tier POI system"
            detail="Year-round anchors, secondary facilities, and seasonal tourism POIs — with a winter mode that zeroes tourist-only corridors."
            icon={Mountain}
          />
          <PolicyCard
            title="Gender-aware demand"
            detail="64.5% women riders from SSCL data — routes near women-anchor POIs receive a +25% demand boost."
            icon={Sparkles}
          />
          <PolicyCard
            title="Social protection"
            detail="Routes serving KP townships (Sheikhpora, Vessu), SKIMS/SMHS hospitals, and remote communities are protected from rationalisation."
            icon={ShieldCheck}
          />
        </div>
      </section>

      {summary.touristCorridorCount > 0 && (
        <section className="rounded-[2rem] border border-emerald-100 bg-emerald-50 p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Tourist corridor note</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">
            {summary.touristCorridorCount} routes flagged as tourist corridors
          </h2>
          <p className="mt-2 max-w-4xl text-sm font-semibold leading-7 text-slate-600">
            Routes serving Gulmarg, Pahalgam, Sonmarg, and other seasonal tourist destinations are flagged in the data.
            Under the winter scenario these corridors drop to LP or are deactivated. Use the seasonal toggle in the engine
            to see the delta.
          </p>
        </section>
      )}



      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.55fr)_24rem]">
        <div className="space-y-6">
          <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-950">Kashmir Network Explorer</h2>
                <p className="text-sm font-semibold text-slate-500">
                  Use the native map for live route focusing, or open the exact generated master map from the pipeline.
                </p>
              </div>
              <div className="inline-flex rounded-2xl bg-slate-100 p-1.5">
                <button
                  type="button"
                  onClick={() => setViewMode('native')}
                  className={`rounded-xl px-4 py-2 text-sm font-black transition-all ${
                    viewMode === 'native' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Native map
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('generated')}
                  className={`rounded-xl px-4 py-2 text-sm font-black transition-all ${
                    viewMode === 'generated' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Original map
                </button>
              </div>
            </div>
            <div className="h-[54vh] min-h-[430px] bg-slate-50 lg:h-[60vh] lg:min-h-[520px]">
              {viewMode === 'native' ? (
                <KashmirNetworkMap selectedRouteId={selectedRoute?.newRouteId || null} />
              ) : (
                <iframe
                  src="/route-rationalization-kashmir/Master_Transit_Map_Kashmir_v3.html"
                  title="Kashmir Master Transit Map"
                  className="h-full w-full bg-white"
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <DistributionCard title="Route type mix" items={summary.routeTypeCounts} total={summary.totalRouteRows} tone="emerald" />
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
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-700">HPV (12m)</p>
                  <p className="mt-2 text-2xl font-black text-blue-900">{formatNumber(summary.hpvTotal)}</p>
                  <p className="mt-1 text-xs font-bold text-blue-700">{hpvShare.toFixed(1)}%</p>
                </div>
                <div className="rounded-2xl bg-teal-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-teal-700">MPV (9m)</p>
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
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Focused route</p>
            {selectedRoute ? (
              <div className="mt-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-3xl font-black tracking-tight text-slate-950">{selectedRoute.routeCode || selectedRoute.newRouteId}</h3>
                      {selectedRoute.routeCode?.startsWith('TMP-') && (
                        <span
                          title="Temporary placeholder code — will be replaced by stops-derived Route_Code in the next data refresh."
                          className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-amber-700"
                        >
                          temp
                        </span>
                      )}
                    </div>
                    {selectedRoute.routeCode && (
                      <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                        Map ID: {selectedRoute.newRouteId}
                      </p>
                    )}
                    <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                      Old ID: {selectedRoute.routeId}
                    </p>
                    <p className="mt-1 text-sm font-bold leading-6 text-slate-500">{selectedRoute.routeName}</p>
                  </div>
                  {selectedRoute.actionTaken !== 'MERGED_INTO_TRUNK' && (
                    <a
                      href={getRouteMapHref(selectedRoute)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-700 transition-colors hover:bg-emerald-100"
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
                  {selectedRoute.newRouteId.startsWith('SSCL-') && (
                    <span className="rounded-full bg-violet-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-violet-800">
                      sscl backbone
                    </span>
                  )}
                  {selectedRoute.touristCorridor && (
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-800">
                      tourist corridor
                    </span>
                  )}
                </div>

                {selectedRoute.actionTaken === 'MERGED_INTO_TRUNK' ? (
                  <div className="mt-5 rounded-2xl bg-slate-100 p-4 text-center">
                    <p className="text-sm font-bold text-slate-600">
                      This route was merged into a main trunk route. Its operational metrics (fleet, headway) are combined with the trunk route.
                    </p>
                  </div>
                ) : (
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Buses needed</p>
                      <p className="mt-2 text-2xl font-black text-slate-950">{selectedRoute.fleetRequired}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Bus every</p>
                      <p className="mt-2 text-2xl font-black text-emerald-700">{selectedRoute.headwayMin} min</p>
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
                )}

                {selectedRoute.displacedOperatorClass && (
                  <div className="mt-3 rounded-2xl bg-amber-50 p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">Displaced operator</p>
                    <p className="mt-1 text-sm font-bold text-amber-900">{selectedRoute.displacedOperatorClass}</p>
                  </div>
                )}

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
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-base font-black text-slate-950">{route.routeCode || route.newRouteId}</p>
                        {route.routeCode?.startsWith('TMP-') && (
                          <span className="rounded-full border border-amber-300 bg-amber-50 px-1.5 py-0 text-[9px] font-black uppercase tracking-[0.16em] text-amber-700">
                            temp
                          </span>
                        )}
                      </div>
                      {route.routeCode && (
                        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
                          Map ID: {route.newRouteId}
                        </p>
                      )}
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

      <KashmirRouteTable
        routes={routes}
        selectedRouteKey={selectedRouteKey}
        onSelectRoute={(route) => setSelectedRouteKey(getRouteKey(route))}
      />

      <KashmirSourceFiles files={sourceFiles} selectedRoute={selectedRoute} />
    </div>
  );
}
