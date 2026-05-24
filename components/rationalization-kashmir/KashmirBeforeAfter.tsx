'use client';

import { useMemo, useState } from 'react';
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  GitMerge,
  History,
  MapPin,
  Search,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import type {
  RationalizationLogKashmirEntry,
  RationalizedRouteKashmir,
  RouteRationalizationKashmirSummary,
} from '@/lib/routeRationalizationKashmir';
import { formatActionLabel, formatNumber, getActionPillClass } from '@/components/rationalization-kashmir/KashmirCards';
import { getRouteKey } from '@/components/rationalization-kashmir/KashmirRouteUtils';

type KashmirBeforeAfterProps = {
  routes: RationalizedRouteKashmir[];
  log: RationalizationLogKashmirEntry[];
  summary: RouteRationalizationKashmirSummary;
  selectedRouteKey: string | null;
  onSelectRoute: (route: RationalizedRouteKashmir) => void;
  mapAnchorId: string;
};

type TrunkConsolidation = {
  trunk: RationalizedRouteKashmir;
  absorbed: RationalizedRouteKashmir[];
};

export default function KashmirBeforeAfter({
  routes,
  log,
  summary,
  selectedRouteKey,
  onSelectRoute,
  mapAnchorId,
}: KashmirBeforeAfterProps) {
  const [expandedTrunkKey, setExpandedTrunkKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const trunkConsolidations = useMemo<TrunkConsolidation[]>(() => {
    const trunks = routes.filter(
      (route) => route.newRouteId.startsWith('TRK-') && route.actionTaken !== 'MERGED_INTO_TRUNK'
    );

    const absorbedByTrunk = new Map<string, RationalizedRouteKashmir[]>();
    routes
      .filter((route) => route.actionTaken === 'MERGED_INTO_TRUNK')
      .forEach((route) => {
        const list = absorbedByTrunk.get(route.newRouteId) || [];
        list.push(route);
        absorbedByTrunk.set(route.newRouteId, list);
      });

    return trunks
      .map((trunk) => ({
        trunk,
        absorbed: absorbedByTrunk.get(trunk.newRouteId) || [],
      }))
      .sort((a, b) => b.absorbed.length - a.absorbed.length);
  }, [routes]);

  const logByOldRouteId = useMemo(() => {
    const map = new Map<string, RationalizationLogKashmirEntry>();
    log.forEach((entry) => map.set(entry.routeId, entry));
    return map;
  }, [log]);

  const lookupResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];

    return routes
      .filter((route) => {
        const haystack = `${route.routeId} ${route.routeName} ${route.newRouteId}`.toLowerCase();
        return haystack.includes(query);
      })
      .slice(0, 8);
  }, [routes, searchQuery]);

  const handleViewOnMap = (route: RationalizedRouteKashmir) => {
    onSelectRoute(route);
    if (typeof document !== 'undefined') {
      const target = document.getElementById(mapAnchorId);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const toggleTrunk = (key: string) => {
    setExpandedTrunkKey((current) => (current === key ? null : key));
  };

  return (
    <section
      id="before-after"
      className="overflow-hidden rounded-[2.4rem] border border-slate-200 bg-white shadow-sm"
    >
      <div className="border-b border-slate-100 bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950 px-6 py-7 text-white md:px-8">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-emerald-200">
          <History size={14} /> Evidence for RTO sign-off
        </div>
        <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
          Before <span className="text-slate-500">→</span> After
        </h2>
        <p className="mt-2 max-w-3xl text-sm font-semibold leading-7 text-slate-200/85">
          How {formatNumber(summary.totalRouteRows)} legacy RTO permits — some duplicated 38 and 42 times on the same corridor — were
          consolidated into {formatNumber(summary.activeRoutes)} rationalised routes. Click any trunk below to see which old permits it absorbed.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 border-b border-slate-100 bg-slate-50/60 px-6 py-6 md:grid-cols-[1fr_auto_1fr] md:items-center md:px-8">
        <div className="rounded-[1.6rem] border border-rose-200 bg-rose-50/60 p-5">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-rose-700">Before</p>
          <p className="mt-2 text-5xl font-black text-rose-900">{formatNumber(summary.totalRouteRows)}</p>
          <p className="text-sm font-bold text-rose-700">individual RTO permits</p>
          <ul className="mt-3 space-y-1.5 text-xs font-semibold leading-5 text-rose-900/85">
            <li>• 38 separate permits for Soura ↔ LD alone</li>
            <li>• 42 separate permits for Hazratbal ↔ LD</li>
            <li>• No standardised route codes</li>
            <li>• Headways fixed by historical allocation, not demand</li>
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
          <p className="text-sm font-bold text-emerald-700">unique rationalised routes</p>
          <ul className="mt-3 space-y-1.5 text-xs font-semibold leading-5 text-emerald-900/85">
            <li>• 5 high-capacity trunk corridors (TRK)</li>
            <li>• {summary.ssclBackboneRoutes} SSCL e-bus backbone routes</li>
            <li>• {summary.feederRoutes} feeders with CDI-based headways</li>
            <li>• 12-character codes encoding district + sector + stop</li>
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 border-b border-slate-100 px-6 py-6 md:grid-cols-3 md:px-8">
        <ActionStatCard
          label="Merged into trunk"
          count={summary.mergedRoutes}
          description="Old permits absorbed into a high-capacity trunk corridor. No longer operate independently."
          icon={GitMerge}
          tone="rose"
        />
        <ActionStatCard
          label="Upgraded to trunk"
          count={routes.filter((route) => route.actionTaken === 'UPGRADED_TO_TRUNK').length}
          description="Routes promoted to trunk status based on high demand score (CDI). Includes 5 named trunks + SSCL backbone."
          icon={TrendingUp}
          tone="emerald"
        />
        <ActionStatCard
          label="Retained as feeder"
          count={summary.feederRoutes}
          description="Routes kept as feeders connecting neighbourhoods to trunk corridors. Each gets its own fleet allocation."
          icon={Sparkles}
          tone="teal"
        />
      </div>

      <div className="border-b border-slate-100 px-6 py-7 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-700">Trunk consolidation evidence</p>
            <h3 className="mt-2 text-2xl font-black text-slate-950">5 trunk corridors absorbed {summary.mergedRoutes} duplicate permits</h3>
            <p className="mt-1 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
              These five corridors carried massive duplication — the same origin/destination pair had dozens of separate
              permits. They are now consolidated into single high-capacity trunks. Click a card to see every permit absorbed.
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {trunkConsolidations.map(({ trunk, absorbed }) => {
            const key = getRouteKey(trunk);
            const isExpanded = expandedTrunkKey === key;
            const isSelected = selectedRouteKey === key;

            return (
              <TrunkConsolidationCard
                key={key}
                trunk={trunk}
                absorbed={absorbed}
                isExpanded={isExpanded}
                isSelected={isSelected}
                onToggle={() => toggleTrunk(key)}
                onViewMap={() => handleViewOnMap(trunk)}
              />
            );
          })}
        </div>
      </div>

      <div className="px-6 py-7 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-orange-600">Old permit lookup</p>
            <h3 className="mt-2 text-2xl font-black text-slate-950">Find what happened to any old permit</h3>
            <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
              Type an old RTO permit ID (e.g. <span className="font-black text-slate-700">R0001</span>) or a route name
              (e.g. <span className="font-black text-slate-700">Soura</span>) to see what happened to it.
            </p>
          </div>
        </div>

        <div className="mt-5 max-w-2xl">
          <div className="relative">
            <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="R0001, R0026, Soura, Hazratbal..."
              className="w-full rounded-2xl border border-slate-200 bg-white px-11 py-3.5 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
            />
          </div>
        </div>

        {searchQuery.trim() && (
          <div className="mt-5">
            {lookupResults.length === 0 ? (
              <p className="rounded-2xl bg-slate-100 px-4 py-6 text-center text-sm font-semibold text-slate-500">
                No permits found matching <span className="font-black text-slate-700">{searchQuery}</span>.
              </p>
            ) : (
              <div className="space-y-3">
                {lookupResults.map((route) => {
                  const reasoning = logByOldRouteId.get(route.routeId)?.reasoning;
                  return (
                    <LookupResultCard
                      key={getRouteKey(route)}
                      route={route}
                      reasoning={reasoning}
                      onViewMap={() => handleViewOnMap(route)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function ActionStatCard({
  label,
  count,
  description,
  icon: Icon,
  tone,
}: {
  label: string;
  count: number;
  description: string;
  icon: typeof GitMerge;
  tone: 'rose' | 'emerald' | 'teal';
}) {
  const toneClass = {
    rose: 'border-rose-100 bg-rose-50/60',
    emerald: 'border-emerald-100 bg-emerald-50/60',
    teal: 'border-teal-100 bg-teal-50/60',
  }[tone];

  const numberClass = {
    rose: 'text-rose-900',
    emerald: 'text-emerald-900',
    teal: 'text-teal-900',
  }[tone];

  const labelClass = {
    rose: 'text-rose-700',
    emerald: 'text-emerald-700',
    teal: 'text-teal-700',
  }[tone];

  return (
    <div className={`rounded-[1.5rem] border p-5 ${toneClass}`}>
      <p className={`flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] ${labelClass}`}>
        <Icon size={14} /> {label}
      </p>
      <p className={`mt-2 text-4xl font-black ${numberClass}`}>{formatNumber(count)}</p>
      <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">{description}</p>
    </div>
  );
}

function TrunkConsolidationCard({
  trunk,
  absorbed,
  isExpanded,
  isSelected,
  onToggle,
  onViewMap,
}: {
  trunk: RationalizedRouteKashmir;
  absorbed: RationalizedRouteKashmir[];
  isExpanded: boolean;
  isSelected: boolean;
  onToggle: () => void;
  onViewMap: () => void;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-[1.5rem] border bg-white p-5 shadow-sm transition-all ${
        isSelected ? 'border-emerald-400 ring-2 ring-emerald-100' : 'border-slate-100 hover:border-emerald-200'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">{trunk.newRouteId}</p>
          <h4 className="mt-1 text-lg font-black tracking-tight text-slate-950">{trunk.routeCode}</h4>
          <p className="mt-1 text-sm font-bold leading-5 text-slate-500">{trunk.routeName}</p>
        </div>
        <div className="rounded-2xl bg-rose-50 px-3 py-2 text-right">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-rose-700">Absorbed</p>
          <p className="mt-1 text-2xl font-black text-rose-900">{absorbed.length}</p>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-rose-700">permits</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-600">
        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-800">
          {trunk.fleetRequired} buses
        </span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-700">
          bus every {trunk.headwayMin} min
        </span>
        <span className="rounded-full bg-orange-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-orange-800">
          CDI {trunk.finalCdi.toFixed(3)}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-slate-600 transition-all hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
        >
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {isExpanded ? 'Hide' : 'Show'} permits
        </button>
        <button
          type="button"
          onClick={onViewMap}
          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-white transition-all hover:bg-emerald-700"
        >
          <MapPin size={14} /> View on map
        </button>
      </div>

      {isExpanded && (
        <div className="mt-4 max-h-64 overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <p className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
            Old RTO permits absorbed into this trunk
          </p>
          <ul className="space-y-1.5">
            {absorbed.map((permit) => (
              <li
                key={permit.routeId}
                className="flex items-baseline gap-3 rounded-xl bg-white px-3 py-2 text-xs"
              >
                <span className="shrink-0 font-black text-slate-900">{permit.routeId}</span>
                <span className="font-semibold text-slate-500">{permit.routeName}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function LookupResultCard({
  route,
  reasoning,
  onViewMap,
}: {
  route: RationalizedRouteKashmir;
  reasoning?: string;
  onViewMap: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white">
              Old: {route.routeId}
            </span>
            <ArrowRight size={14} className="text-slate-400" />
            <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white">
              Now: {route.newRouteId}
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${getActionPillClass(
                route.actionTaken
              )}`}
            >
              {formatActionLabel(route.actionTaken)}
            </span>
          </div>
          <p className="mt-2 text-sm font-bold text-slate-700">{route.routeName}</p>
          {route.routeCode && (
            <p className="mt-1 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
              Code: {route.routeCode}
            </p>
          )}
          {reasoning && (
            <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">{reasoning}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onViewMap}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-emerald-700 transition-all hover:bg-emerald-100"
        >
          <MapPin size={14} /> Map
        </button>
      </div>
    </div>
  );
}
