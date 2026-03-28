import { format } from 'date-fns';
import {
  ArrowUpRight,
  BusFront,
  Clock3,
  Download,
  ExternalLink,
  GitBranch,
  Map,
  TimerReset,
  Users,
} from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { getRouteRationalizationDataset } from '@/lib/routeRationalization';

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

export default async function RouteRationalizationPage() {
  const dataset = await getRouteRationalizationDataset();

  const topImpactRoutes = [...dataset.impact]
    .sort((a, b) => b.cumulativePersonMinutesSavedDaily - a.cumulativePersonMinutesSavedDaily)
    .slice(0, 6);

  const highestCoverageRoutes = [...dataset.routes]
    .sort((a, b) => b.populationServed - a.populationServed)
    .slice(0, 12);

  return (
    <ProtectedRoute>
      <div className="space-y-8 pb-12 max-w-7xl mx-auto">
        <div className="flex flex-col gap-5 border-b border-gray-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-[0.25em] text-blue-600">Network Upgrade</p>
            <h1 className="text-3xl font-black tracking-tight text-gray-900 md:text-4xl">Route Rationalization Hub</h1>
            <p className="mt-3 max-w-3xl text-base font-medium text-gray-500">
              Final trunk and feeder network, passenger-impact metrics, and the preserved master transit map UI from the
              route-rationalisation run.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="/route-rationalization/Master_Transit_Map.html"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 shadow-sm transition-all hover:border-blue-200 hover:text-blue-700"
            >
              <ExternalLink size={16} /> Open Master Map
            </a>
            <a
              href="/route-rationalization/Rationalised_Routes.xlsx"
              download
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-blue-700"
            >
              <Download size={16} /> Download Official Report
            </a>
            <a
              href="/route-rationalization/Rationalised_Routes.geojson"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700 transition-all hover:bg-blue-100"
            >
              <Map size={16} /> GeoJSON Layer
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 p-7 text-white shadow-lg">
            <p className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-slate-300">
              <GitBranch size={16} className="text-blue-400" /> Final Network
            </p>
            <h2 className="text-5xl font-black">{dataset.summary.totalRoutes}</h2>
            <p className="mt-2 text-sm font-medium text-slate-300">Active rationalised routes in the published network.</p>
          </div>

          <div className="rounded-3xl border border-gray-100 bg-white p-7 shadow-sm">
            <p className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-gray-400">
              <BusFront size={16} className="text-blue-600" /> Trunks vs Feeders
            </p>
            <h2 className="text-4xl font-black text-gray-900">
              {dataset.summary.trunkRoutes}
              <span className="mx-2 text-2xl text-gray-300">/</span>
              {dataset.summary.feederRoutes}
            </h2>
            <p className="mt-2 text-sm font-medium text-gray-500">Trunk corridors compared with feeder services.</p>
          </div>

          <div className="rounded-3xl border border-gray-100 bg-white p-7 shadow-sm">
            <p className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-gray-400">
              <TimerReset size={16} className="text-emerald-600" /> Wait Improvement
            </p>
            <h2 className="text-4xl font-black text-emerald-600">{dataset.summary.averageWaitReduction.toFixed(1)} min</h2>
            <p className="mt-2 text-sm font-medium text-gray-500">
              Average wait moved from {dataset.summary.averageOldWaitTime.toFixed(1)} to {dataset.summary.averageNewWaitTime.toFixed(1)} minutes.
            </p>
          </div>

          <div className="rounded-3xl border border-gray-100 bg-white p-7 shadow-sm">
            <p className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-gray-400">
              <Users size={16} className="text-violet-600" /> Passenger Impact
            </p>
            <h2 className="text-4xl font-black text-violet-600">
              {formatCompactNumber(dataset.summary.totalDailyPersonMinutesSaved)}
            </h2>
            <p className="mt-2 text-sm font-medium text-gray-500">Passenger-minutes saved per day across the published impact file.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.8fr_1fr]">
          <div className="overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-gray-100 px-6 py-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-black text-gray-900">Preserved Master Transit Map</h2>
                <p className="text-sm font-medium text-gray-500">
                  The original generated HTML is embedded below so the route-rationalisation UI stays intact.
                </p>
              </div>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-blue-700">
                Updated {format(new Date(dataset.updatedAt), 'dd MMM yyyy, hh:mm a')}
              </span>
            </div>

            <iframe
              src="/route-rationalization/Master_Transit_Map.html"
              title="Master Transit Map"
              className="h-[78vh] min-h-[720px] w-full bg-white"
            />
          </div>

          <div className="space-y-6">
            <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-black text-gray-900">Impact Leaders</h2>
              <p className="mt-1 text-sm font-medium text-gray-500">Highest daily passenger time savings from the rationalisation run.</p>

              <div className="mt-5 space-y-3">
                {topImpactRoutes.map((route, index) => (
                  <div key={`${route.newRouteId}-${route.routeId}-${index}`} className="rounded-2xl bg-gray-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-gray-900">{route.newRouteId}</p>
                        <p className="text-sm font-medium text-gray-600">{route.routeName}</p>
                      </div>
                      <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-violet-700">
                        #{index + 1}
                      </span>
                    </div>
                    <p className="mt-3 text-sm font-bold text-violet-700">
                      {formatCompactNumber(route.cumulativePersonMinutesSavedDaily)} passenger-minutes saved daily
                    </p>
                    <p className="mt-1 text-xs font-medium text-gray-500">
                      Wait time {route.oldWaitTime} {'->'} {route.newWaitTime} min
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-black text-gray-900">Network Notes</h2>
              <div className="mt-4 space-y-3 text-sm font-medium text-gray-600">
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                  <p className="font-black uppercase tracking-[0.18em] text-blue-700">Coverage</p>
                  <p className="mt-1">{formatCompactNumber(dataset.summary.totalPopulationServed)} route-level population served across the final network.</p>
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                  <p className="font-black uppercase tracking-[0.18em] text-emerald-700">Operations</p>
                  <p className="mt-1">Use the chatbot for why a route became a trunk or feeder by asking with IDs like FDR-297, TRK-005, or an old route like R0129.</p>
                </div>
                <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                  <p className="font-black uppercase tracking-[0.18em] text-amber-700">Static Assets</p>
                  <p className="mt-1">The Excel report, route map HTML, and GeoJSON layer are all hosted directly from this dashboard build.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-gray-100 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-gray-100 px-6 py-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-black text-gray-900">Final Network Routes</h2>
              <p className="text-sm font-medium text-gray-500">Highest-coverage routes from the rationalised network with direct links to per-route maps.</p>
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">Population sorted</p>
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
                  <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-[0.18em] text-gray-400">Map</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-white">
                {highestCoverageRoutes.map((route) => (
                  <tr key={`${route.newRouteId}-${route.routeId}`} className="hover:bg-blue-50/40 transition-colors">
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
                      <span className="inline-flex items-center gap-1">
                        <Clock3 size={14} className="text-gray-400" />
                        {route.oldWaitTime} {'->'} {route.newWaitTime} min
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-blue-700">{route.fleetRequired}</td>
                    <td className="px-6 py-4">
                      {route.viewMapPath ? (
                        <a
                          href={`/route-rationalization/${route.viewMapPath}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-800"
                        >
                          View map <ArrowUpRight size={14} />
                        </a>
                      ) : (
                        <span className="text-sm font-medium text-gray-400">No link</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
