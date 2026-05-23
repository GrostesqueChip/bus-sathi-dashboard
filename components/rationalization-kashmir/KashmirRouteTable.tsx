'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, ChevronLeft, ChevronRight, Layers3, Search } from 'lucide-react';
import type { RationalizedRouteKashmir } from '@/lib/routeRationalizationKashmir';
import {
  formatActionLabel,
  formatRouteType,
  getActionPillClass,
  getPriorityPillClass,
} from '@/components/rationalization-kashmir/KashmirCards';
import {
  actionMatchesFilter,
  getRouteKey,
  getRouteMapHref,
  PRIORITY_ORDER,
  routeMatchesSearch,
  type ActionFilter,
  type SocialFilter,
  type SortMode,
} from '@/components/rationalization-kashmir/KashmirRouteUtils';

type KashmirRouteTableProps = {
  routes: RationalizedRouteKashmir[];
  selectedRouteKey: string | null;
  onSelectRoute: (route: RationalizedRouteKashmir) => void;
};

const PAGE_SIZE = 16;

export default function KashmirRouteTable({ routes, selectedRouteKey, onSelectRoute }: KashmirRouteTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<ActionFilter>('all');
  const [routeTypeFilter, setRouteTypeFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [socialFilter, setSocialFilter] = useState<SocialFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('fleet');
  const [currentPage, setCurrentPage] = useState(1);

  const routeTypes = useMemo(() => {
    return Array.from(new Set(routes.map((route) => route.routeType).filter(Boolean))).sort();
  }, [routes]);

  const filteredRoutes = useMemo(() => {
    return routes
      .filter((route) => actionMatchesFilter(route, actionFilter))
      .filter((route) => routeTypeFilter === 'all' || route.routeType === routeTypeFilter)
      .filter((route) => priorityFilter === 'all' || route.priorityBand === priorityFilter)
      .filter((route) => {
        if (socialFilter === 'all') return true;
        return socialFilter === 'protected' ? route.socialFlag : !route.socialFlag;
      })
      .filter((route) => routeMatchesSearch(route, searchQuery))
      .sort((a, b) => {
        if (sortMode === 'demand') return b.finalCdi - a.finalCdi;
        if (sortMode === 'population') return b.populationServed - a.populationServed;
        if (sortMode === 'service') return a.headwayMin - b.headwayMin;
        return b.fleetRequired - a.fleetRequired;
      });
  }, [actionFilter, priorityFilter, routeTypeFilter, routes, searchQuery, socialFilter, sortMode]);

  useEffect(() => {
    setCurrentPage(1);
  }, [actionFilter, priorityFilter, routeTypeFilter, searchQuery, socialFilter, sortMode]);

  const pageCount = Math.max(1, Math.ceil(filteredRoutes.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, pageCount);
  const pagedRoutes = filteredRoutes.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const start = filteredRoutes.length ? (safePage - 1) * PAGE_SIZE + 1 : 0;
  const end = Math.min(safePage * PAGE_SIZE, filteredRoutes.length);

  return (
    <section className="rounded-[2rem] border border-slate-100 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-950">Kashmir Route Table</h2>
          <p className="text-sm font-semibold text-slate-500">
            Search by route ID, SSCL code, or route name. Click a row to focus the map and details.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
          <Layers3 size={14} />
          {filteredRoutes.length} visible
        </div>
      </div>

      <div className="border-b border-slate-100 bg-slate-50/70 px-6 py-5">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(18rem,1.4fr)_repeat(5,minmax(0,1fr))]">
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Search</span>
            <div className="relative">
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="PWSP..., SSCL-01, TRK-047, Soura..."
                className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-3 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Decision</span>
            <select
              value={actionFilter}
              onChange={(event) => setActionFilter(event.target.value as ActionFilter)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="all">All</option>
              <option value="trunk">Main routes</option>
              <option value="feeder">Feeder routes</option>
              <option value="merged">Merged routes</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Type</span>
            <select
              value={routeTypeFilter}
              onChange={(event) => setRouteTypeFilter(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="all">All types</option>
              {routeTypes.map((type) => (
                <option key={type} value={type}>
                  {formatRouteType(type)}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Priority</span>
            <select
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="all">All bands</option>
              {PRIORITY_ORDER.map((band) => (
                <option key={band} value={band}>
                  {band}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Social</span>
            <select
              value={socialFilter}
              onChange={(event) => setSocialFilter(event.target.value as SocialFilter)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="all">All routes</option>
              <option value="protected">Protected</option>
              <option value="regular">Regular</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Sort</span>
            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as SortMode)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="fleet">Buses needed</option>
              <option value="demand">Demand score</option>
              <option value="population">Population served</option>
              <option value="service">Fastest service</option>
            </select>
          </label>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-[0.18em] text-slate-400">Route</th>
              <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-[0.18em] text-slate-400">Route decision</th>
              <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-[0.18em] text-slate-400">Type</th>
              <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-[0.18em] text-slate-400">Priority</th>
              <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-[0.18em] text-slate-400">Bus every</th>
              <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-[0.18em] text-slate-400">Buses needed</th>
              <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-[0.18em] text-slate-400">Demand score</th>
              <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-[0.18em] text-slate-400">Map</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 bg-white">
            {pagedRoutes.map((route) => {
              const isSelected = selectedRouteKey === getRouteKey(route);
              const isSscl = route.newRouteId.startsWith('SSCL-');

              return (
                <tr
                  key={getRouteKey(route)}
                  onClick={() => onSelectRoute(route)}
                  className={`cursor-pointer transition-colors ${isSelected ? 'bg-emerald-50/70' : 'hover:bg-emerald-50/35'}`}
                >
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-lg font-black tracking-tight text-slate-950">{route.routeCode || route.newRouteId}</p>

                    </div>
                    {route.routeCode && (
                      <p className="text-xs font-bold text-slate-400">Map ID: {route.newRouteId}</p>
                    )}
                    <p className="text-xs font-bold text-slate-400">Old ID: {route.routeId}</p>
                    <p className="mt-1 max-w-xs text-sm font-semibold leading-5 text-slate-500">{route.routeName}</p>
                    {isSscl && (
                      <span className="mt-1 inline-block rounded-full bg-violet-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-violet-800">
                        SSCL backbone
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${getActionPillClass(route.actionTaken)}`}>
                      {formatActionLabel(route.actionTaken)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-600">{formatRouteType(route.routeType)}</td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${getPriorityPillClass(route.priorityBand)}`}>
                      {route.priorityBand}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-black text-emerald-700">{route.headwayMin} min</td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-black text-slate-900">{route.fleetRequired}</p>
                    <p className="text-xs font-bold text-slate-400">HPV {route.hpvCount} / MPV {route.mpvCount}</p>
                  </td>
                  <td className="px-6 py-4 text-sm font-black text-orange-600">{route.finalCdi.toFixed(4)}</td>
                  <td className="px-6 py-4">
                    {route.actionTaken !== 'MERGED_INTO_TRUNK' ? (
                      <a
                        href={getRouteMapHref(route)}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(event) => event.stopPropagation()}
                        className="inline-flex items-center gap-1 text-sm font-black text-emerald-700 hover:text-emerald-900"
                      >
                        View <ArrowUpRight size={14} />
                      </a>
                    ) : (
                      <span className="text-sm font-semibold text-slate-400">Merged</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-100 px-6 py-4 md:flex-row md:items-center md:justify-between">
        <p className="text-sm font-semibold text-slate-500">
          Showing {start}-{end} of {filteredRoutes.length} routes
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            disabled={safePage === 1}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronLeft size={16} /> Prev
          </button>
          <span className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-black text-slate-600">
            Page {safePage} / {pageCount}
          </span>
          <button
            type="button"
            onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}
            disabled={safePage === pageCount}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}
