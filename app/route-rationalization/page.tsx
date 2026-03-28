import { format } from 'date-fns';
import {
  ArrowUpRight,
  Bot,
  BusFront,
  Clock3,
  Download,
  GitBranch,
  Map,
  Sparkles,
  Users,
} from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import RationalizationDashboard from '@/components/rationalization/RationalizationDashboard';
import { getRouteRationalizationDataset } from '@/lib/routeRationalization';

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat('en-IN', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

export default async function RouteRationalizationPage() {
  const dataset = await getRouteRationalizationDataset();

  const routesWithMaps = dataset.routes.filter((route) => Boolean(route.viewMapPath)).length;
  const topCoverageRoute = [...dataset.routes].sort((a, b) => b.populationServed - a.populationServed)[0];
  const topImpactRoute = [...dataset.impact]
    .sort((a, b) => b.cumulativePersonMinutesSavedDaily - a.cumulativePersonMinutesSavedDaily)[0];

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-7xl space-y-8 pb-12">
        <section className="overflow-hidden rounded-[2.5rem] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white shadow-[0_24px_80px_rgba(15,23,42,0.16)]">
          <div className="relative px-6 py-7 md:px-8 md:py-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.22),_transparent_26%),radial-gradient(circle_at_bottom_left,_rgba(45,212,191,0.16),_transparent_28%)]" />

            <div className="relative flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-4xl">
                <div className="mb-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/12 bg-white/8 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-blue-100">
                    Final network
                  </span>
                  <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-emerald-100">
                    Native explorer live
                  </span>
                  <span className="rounded-full border border-white/12 bg-white/8 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-slate-100">
                    Updated {format(new Date(dataset.updatedAt), 'dd MMM yyyy, hh:mm a')}
                  </span>
                </div>

                <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">
                  Route Rationalization Command Deck
                </h1>
                <p className="mt-3 max-w-3xl text-base font-medium leading-7 text-slate-200/92">
                  Explore the rationalised network with a native map, searchable route controls, full-route coverage, and
                  stakeholder-ready downloads while keeping the original generated planner one click away.
                </p>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <div className="rounded-[1.6rem] border border-white/10 bg-white/8 p-4 backdrop-blur">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-100">Coverage lead</p>
                    <p className="mt-2 text-lg font-black text-white">{topCoverageRoute?.newRouteId || 'n/a'}</p>
                    <p className="mt-1 text-sm font-medium text-slate-200/80">{topCoverageRoute?.routeName || 'No data'}</p>
                  </div>
                  <div className="rounded-[1.6rem] border border-white/10 bg-white/8 p-4 backdrop-blur">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-100">Top impact</p>
                    <p className="mt-2 text-lg font-black text-white">{topImpactRoute?.newRouteId || 'n/a'}</p>
                    <p className="mt-1 text-sm font-medium text-slate-200/80">
                      {topImpactRoute
                        ? `${formatCompactNumber(topImpactRoute.cumulativePersonMinutesSavedDaily)} passenger-minutes saved daily`
                        : 'No data'}
                    </p>
                  </div>
                  <div className="rounded-[1.6rem] border border-white/10 bg-white/8 p-4 backdrop-blur">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-100">Route maps ready</p>
                    <p className="mt-2 text-lg font-black text-white">{routesWithMaps}</p>
                    <p className="mt-1 text-sm font-medium text-slate-200/80">Per-route HTML maps hosted directly from the dashboard build.</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 xl:justify-end">
                <a
                  href="/route-rationalization/Master_Transit_Map.html"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/12 bg-white/10 px-4 py-3 text-sm font-bold text-white transition-all hover:border-blue-200/40 hover:bg-white/14"
                >
                  <ArrowUpRight size={16} /> Open original planner
                </a>
                <a
                  href="/route-rationalization/Rationalised_Routes.geojson"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/12 bg-white/10 px-4 py-3 text-sm font-bold text-white transition-all hover:border-blue-200/40 hover:bg-white/14"
                >
                  <Map size={16} /> View GeoJSON
                </a>
                <a
                  href="/route-rationalization/Rationalised_Routes.xlsx"
                  download
                  className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-900 shadow-lg transition-all hover:translate-y-[-1px]"
                >
                  <Download size={16} /> Download report
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
              <GitBranch size={15} className="text-blue-600" /> Published routes
            </p>
            <h2 className="mt-3 text-4xl font-black text-slate-950">{dataset.summary.totalRoutes}</h2>
            <p className="mt-2 text-sm font-medium text-slate-500">Every final route is now visible inside the filtered table below.</p>
          </div>

          <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
              <BusFront size={15} className="text-teal-600" /> Network mix
            </p>
            <h2 className="mt-3 text-4xl font-black text-slate-950">
              {dataset.summary.trunkRoutes}
              <span className="mx-2 text-2xl text-slate-300">/</span>
              {dataset.summary.feederRoutes}
            </h2>
            <p className="mt-2 text-sm font-medium text-slate-500">Trunk corridors compared with feeder services in the final design.</p>
          </div>

          <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
              <Clock3 size={15} className="text-emerald-600" /> Average wait cut
            </p>
            <h2 className="mt-3 text-4xl font-black text-emerald-600">{dataset.summary.averageWaitReduction.toFixed(1)} min</h2>
            <p className="mt-2 text-sm font-medium text-slate-500">
              Average wait moved from {dataset.summary.averageOldWaitTime.toFixed(1)} to {dataset.summary.averageNewWaitTime.toFixed(1)} minutes.
            </p>
          </div>

          <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
              <Users size={15} className="text-violet-600" /> Passenger benefit
            </p>
            <h2 className="mt-3 text-4xl font-black text-violet-600">
              {formatCompactNumber(dataset.summary.totalDailyPersonMinutesSaved)}
            </h2>
            <p className="mt-2 text-sm font-medium text-slate-500">Daily passenger-minutes saved across the published impact file.</p>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_0.9fr]">
          <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-blue-600">
              <Sparkles size={15} /> What changed
            </p>
            <h2 className="mt-3 text-2xl font-black text-slate-950">Cleaner route explorer, no dead space, and full-network browsing</h2>
            <p className="mt-3 max-w-3xl text-sm font-medium leading-7 text-slate-600">
              The route rationalization screen now uses a native interactive explorer first, keeps the original planner as a
              backup tab, and exposes all published routes with search, filters, sorting, route focus, and direct map links.
            </p>
          </div>

          <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-violet-600">
              <Bot size={15} /> Bus Sathi Bot
            </p>
            <h2 className="mt-3 text-2xl font-black text-slate-950">Route reasoning is wired in</h2>
            <p className="mt-3 text-sm font-medium leading-7 text-slate-600">
              Ask about route IDs like <span className="font-black text-slate-900">FDR-297</span> or
              {' '}
              <span className="font-black text-slate-900">TRK-005</span>, old IDs like
              {' '}
              <span className="font-black text-slate-900">R0129</span>, or natural route names such as
              {' '}
              <span className="font-black text-slate-900">Janipur Kulwal</span> to get the stored reasoning, wait-time change,
              fleet, and coverage snapshot.
            </p>
          </div>
        </section>

        <RationalizationDashboard
          routes={dataset.routes}
          impact={dataset.impact}
          summary={dataset.summary}
          updatedAt={dataset.updatedAt}
        />
      </div>
    </ProtectedRoute>
  );
}
