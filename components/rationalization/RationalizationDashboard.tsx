'use client';

import { format } from 'date-fns';
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import {
  Clock3,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Filter,
  Layers3,
  Search,
  Sparkles,
} from 'lucide-react';
import type {
  PassengerImpactRecord,
  RationalizedRoute,
  RouteRationalizationSummary,
} from '@/lib/routeRationalization';

const RationalizationNetworkMap = dynamic(
  () => import('@/components/rationalization/RationalizationNetworkMap'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-4 border-blue-600" />
          <p className="mt-4 text-sm font-black uppercase tracking-[0.18em] text-blue-700">Preparing native route map</p>
        </div>
      </div>
    ),
  }
);

type RationalizationDashboardProps = {
  routes: RationalizedRoute[];
  impact: PassengerImpactRecord[];
  summary: RouteRationalizationSummary;
  updatedAt: number;
};

const PAGE_SIZE = 18;

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat('en-IN', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function formatFullNumber(value: number) {
  return new Intl.NumberFormat('en-IN').format(Math.round(value));
}

function formatActionLabel(action: string) {
  return action.replaceAll('_', ' ').toLowerCase();
}

function routeMatchesSearch(route: RationalizedRoute, query: string) {
  if (!query) return true;

  const haystack = [
    route.newRouteId,
    route.routeId,
    route.routeName,
    route.actionTaken,
  ]
    .join(' ')
    .toLowerCase();

  return haystack.includes(query.toLowerCase());
}

export default function RationalizationDashboard({
  routes,
  impact,
  summary,
  updatedAt,
}: RationalizationDashboardProps) {
  const [viewMode, setViewMode] = useState<'native' | 'generated'>('native');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<'all' | 'trunk' | 'feeder'>('all');
  const [sortMode, setSortMode] = useState<'population' | 'impact' | 'fleet'>('population');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(routes[0]?.newRouteId || null);

  const impactByRouteId = useMemo(() => {
    const map = new Map<string, number>();
    impact.forEach((item) => {
      map.set(item.newRouteId, item.cumulativePersonMinutesSavedDaily);
    });
    return map;
  }, [impact]);

  const filteredRoutes = useMemo(() => {
    const actionFiltered = routes.filter((route) => {
      if (actionFilter === 'all') return true;
      if (actionFilter === 'trunk') return route.actionTaken.includes('TRUNK');
      return route.actionTaken.includes('FEEDER');
    });

    const searchedRoutes = actionFiltered.filter((route) => routeMatchesSearch(route, searchQuery));

    return [...searchedRoutes].sort((a, b) => {
      if (sortMode === 'fleet') return b.fleetRequired - a.fleetRequired;
      if (sortMode === 'impact') {
        return (impactByRouteId.get(b.newRouteId) || 0) - (impactByRouteId.get(a.newRouteId) || 0);
      }
      return b.populationServed - a.populationServed;
    });
  }, [actionFilter, impactByRouteId, routes, searchQuery, sortMode]);

  useEffect(() => {
    setCurrentPage(1);
  }, [actionFilter, searchQuery, sortMode]);

  useEffect(() => {
    if (!filteredRoutes.length) {
      setSelectedRouteId(null);
      return;
    }

    const selectedStillVisible = filteredRoutes.some((route) => route.newRouteId === selectedRouteId);
    if (!selectedStillVisible) {
      setSelectedRouteId(filteredRoutes[0].newRouteId);
    }
  }, [filteredRoutes, selectedRouteId]);

  const pageCount = Math.max(1, Math.ceil(filteredRoutes.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, pageCount);
  const pagedRoutes = filteredRoutes.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const selectedRoute =
    filteredRoutes.find((route) => route.newRouteId === selectedRouteId) ||
    routes.find((route) => route.newRouteId === selectedRouteId) ||
    null;

  const topImpactRoutes = useMemo(() => {
    return [...impact]
      .sort((a, b) => b.cumulativePersonMinutesSavedDaily - a.cumulativePersonMinutesSavedDaily)
      .slice(0, 5);
  }, [impact]);

  const selectedRouteImpact = selectedRoute ? impactByRouteId.get(selectedRoute.newRouteId) || 0 : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1.55fr)_24rem]">
        <div className="space-y-6">
          <div className="overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-gray-100 px-6 py-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-black text-gray-900">Network Explorer</h2>
                <p className="text-sm font-medium text-gray-500">
                  Native route map for quick browsing, plus the original generated planner when you need the exact source UI.
                </p>
              </div>

              <div className="inline-flex rounded-2xl bg-gray-100 p-1.5">
                <button
                  type="button"
                  onClick={() => setViewMode('native')}
                  className={`rounded-xl px-4 py-2 text-sm font-black transition-all ${
                    viewMode === 'native' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Native map
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('generated')}
                  className={`rounded-xl px-4 py-2 text-sm font-black transition-all ${
                    viewMode === 'generated' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Original map
                </button>
              </div>
            </div>

            <div className="h-[52vh] min-h-[420px] bg-slate-50 lg:h-[58vh] lg:min-h-[500px]">
              {viewMode === 'native' ? (
                <RationalizationNetworkMap selectedRouteId={selectedRouteId} />
              ) : (
                <iframe
                  src="/route-rationalization/Master_Transit_Map.html"
                  title="Original Master Transit Map"
                  className="h-full w-full bg-white"
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">Focused route</p>
                  <h3 className="mt-1 text-xl font-black text-gray-900">{selectedRoute?.newRouteId || 'Pick a route'}</h3>
                </div>
                {selectedRoute?.viewMapPath && (
                  <a
                    href={`/route-rationalization/${selectedRoute.viewMapPath}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-xl bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700 transition-colors hover:bg-blue-100"
                  >
                    Full map <ExternalLink size={14} />
                  </a>
                )}
              </div>

              {selectedRoute ? (
                <div className="mt-4 space-y-4">
                  <div>
                    <p className="text-base font-bold leading-8 text-gray-500">{selectedRoute.routeName}</p>
                    <span
                      className={`mt-3 inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${
                        selectedRoute.actionTaken.includes('TRUNK')
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-teal-100 text-teal-800'
                      }`}
                    >
                      {formatActionLabel(selectedRoute.actionTaken)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-gray-50 p-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">Population</p>
                      <p className="mt-2 text-2xl font-black text-gray-900">{formatFullNumber(selectedRoute.populationServed)}</p>
                    </div>
                    <div className="rounded-2xl bg-gray-50 p-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">Fleet</p>
                      <p className="mt-2 text-2xl font-black text-blue-700">{selectedRoute.fleetRequired}</p>
                    </div>
                    <div className="rounded-2xl bg-gray-50 p-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">Wait time</p>
                      <p className="mt-2 text-2xl font-black text-gray-900">
                        {selectedRoute.oldWaitTime} {'->'} {selectedRoute.newWaitTime}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-gray-50 p-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">Impact</p>
                      <p className="mt-2 text-2xl font-black text-violet-700">
                        {selectedRouteImpact ? formatCompactNumber(selectedRouteImpact) : 'n/a'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm font-medium text-gray-500">No routes match the current filters.</p>
              )}
            </div>

            <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-amber-600">
                <Sparkles size={14} /> Impact leaders
              </div>

              <div className="mt-4 max-h-[22rem] space-y-3 overflow-y-auto pr-1">
                {topImpactRoutes.map((route, index) => (
                  <button
                    key={`${route.newRouteId}-${index}`}
                    type="button"
                    onClick={() => setSelectedRouteId(route.newRouteId)}
                    className="w-full rounded-2xl bg-gray-50 px-4 py-3 text-left transition-all hover:bg-violet-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-gray-900">{route.newRouteId}</p>
                        <p className="text-sm font-medium text-gray-500">{route.routeName}</p>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-600">#{index + 1}</span>
                    </div>
                    <p className="mt-2 text-sm font-bold text-violet-700">
                      {formatCompactNumber(route.cumulativePersonMinutesSavedDaily)} passenger-minutes saved daily
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-blue-600">
              <Filter size={14} /> Route controls
            </div>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">Search routes</span>
                <div className="relative">
                  <Search className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="FDR-253, R0129, Janipur..."
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-10 py-3 text-sm font-medium text-gray-700 outline-none transition-all focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </label>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">Action</span>
                  <select
                    value={actionFilter}
                    onChange={(event) => setActionFilter(event.target.value as 'all' | 'trunk' | 'feeder')}
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 outline-none transition-all focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="all">All routes</option>
                    <option value="trunk">Trunks only</option>
                    <option value="feeder">Feeders only</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">Sort by</span>
                  <select
                    value={sortMode}
                    onChange={(event) => setSortMode(event.target.value as 'population' | 'impact' | 'fleet')}
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 outline-none transition-all focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="population">Population served</option>
                    <option value="impact">Passenger impact</option>
                    <option value="fleet">Fleet required</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-blue-50 p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-700">Visible</p>
                <p className="mt-2 text-2xl font-black text-blue-900">{filteredRoutes.length}</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">Trunks</p>
                <p className="mt-2 text-2xl font-black text-emerald-900">{summary.trunkRoutes}</p>
              </div>
              <div className="rounded-2xl bg-teal-50 p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-teal-700">Feeders</p>
                <p className="mt-2 text-2xl font-black text-teal-900">{summary.feederRoutes}</p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                <Clock3 size={13} className="text-blue-600" /> Published dataset
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-700">{format(new Date(updatedAt), 'dd MMM yyyy, hh:mm a')}</p>
              <p className="mt-1 text-xs font-medium text-slate-500">Click a row to focus it on the map and jump straight to the route details.</p>
            </div>
          </div>

          <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">Interaction tips</p>
            <div className="mt-4 space-y-3 text-sm font-medium text-gray-600">
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                Click any route in the table to refocus the network map and sync the detail cards.
              </div>
              <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4">
                Use search with route IDs like `FDR-297`, old IDs like `R0129`, or names like `Janipur Kulwal`.
              </div>
              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                Switch to the original planner when you want the exact exported map experience from the pipeline.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[2rem] border border-gray-100 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-100 px-6 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-black text-gray-900">All Rationalized Routes</h2>
            <p className="text-sm font-medium text-gray-500">
              Showing every route in the final network with filters, sorting, and direct map links.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-gray-500">
            <Layers3 size={14} />
            {filteredRoutes.length} routes visible
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-[0.18em] text-gray-400">New Route</th>
                <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-[0.18em] text-gray-400">Action</th>
                <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-[0.18em] text-gray-400">Population</th>
                <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-[0.18em] text-gray-400">Wait Time</th>
                <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-[0.18em] text-gray-400">Fleet</th>
                <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-[0.18em] text-gray-400">Impact</th>
                <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-[0.18em] text-gray-400">Map</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 bg-white">
              {pagedRoutes.map((route) => {
                const isSelected = route.newRouteId === selectedRouteId;
                const routeImpact = impactByRouteId.get(route.newRouteId) || 0;

                return (
                  <tr
                    key={`${route.newRouteId}-${route.routeId}`}
                    onClick={() => setSelectedRouteId(route.newRouteId)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-50/60' : 'hover:bg-blue-50/30'
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-black text-gray-900">{route.newRouteId}</p>
                        <p className="text-sm font-medium text-gray-500">{route.routeName}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${
                          route.actionTaken.includes('TRUNK')
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-teal-100 text-teal-800'
                        }`}
                      >
                        {formatActionLabel(route.actionTaken)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-700">{formatFullNumber(route.populationServed)}</td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-700">
                      {route.oldWaitTime} {'->'} {route.newWaitTime} min
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-blue-700">{route.fleetRequired}</td>
                    <td className="px-6 py-4 text-sm font-bold text-violet-700">
                      {routeImpact ? formatCompactNumber(routeImpact) : 'n/a'}
                    </td>
                    <td className="px-6 py-4">
                      {route.viewMapPath ? (
                        <a
                          href={`/route-rationalization/${route.viewMapPath}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(event) => event.stopPropagation()}
                          className="inline-flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-800"
                        >
                          View map <ExternalLink size={14} />
                        </a>
                      ) : (
                        <span className="text-sm font-medium text-gray-400">No link</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-gray-100 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm font-medium text-gray-500">
            Showing {(safePage - 1) * PAGE_SIZE + 1}-
            {Math.min(safePage * PAGE_SIZE, filteredRoutes.length)} of {filteredRoutes.length} routes
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={safePage === 1}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-bold text-gray-600 transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft size={16} /> Prev
            </button>
            <span className="rounded-xl bg-gray-100 px-3 py-2 text-sm font-black text-gray-600">
              Page {safePage} / {pageCount}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}
              disabled={safePage === pageCount}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-bold text-gray-600 transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
