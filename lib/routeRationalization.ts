import { readFile, stat } from 'fs/promises';
import path from 'path';

export interface RationalizedRoute {
  routeId: string;
  routeName: string;
  actionTaken: string;
  newRouteId: string;
  routeKm: number;
  cycleTimeMin: number;
  fleetRequired: number;
  headwayMin: number;
  populationServed: number;
  compositeDemandScore: number;
  oldWaitTime: number;
  newWaitTime: number;
  overlapMetric: number;
  viewMapPath: string | null;
}

export interface PassengerImpactRecord {
  routeId: string;
  routeName: string;
  actionTaken: string;
  newRouteId: string;
  oldWaitTime: number;
  newWaitTime: number;
  populationServed: number;
  timeSavedMins: number;
  cumulativePersonMinutesSavedDaily: number;
}

export interface RationalizationLogEntry {
  oldRouteId: string;
  oldName: string;
  actionTaken: string;
  newRouteId: string;
  populationServed: number;
  oldWaitTime: number;
  newWaitTime: number;
  fleetRequired: number;
  routeKm: number;
  reasoning: string;
}

export interface RouteRationalizationSummary {
  totalRoutes: number;
  trunkRoutes: number;
  feederRoutes: number;
  totalPopulationServed: number;
  totalDailyPersonMinutesSaved: number;
  averageOldWaitTime: number;
  averageNewWaitTime: number;
  averageWaitReduction: number;
}

export interface RouteRationalizationDataset {
  updatedAt: number;
  routes: RationalizedRoute[];
  impact: PassengerImpactRecord[];
  log: RationalizationLogEntry[];
  summary: RouteRationalizationSummary;
}

const DATA_DIR = path.join(process.cwd(), 'public', 'route-rationalization-data');
const PUBLIC_DIR = path.join(process.cwd(), 'public', 'route-rationalization');

let datasetPromise: Promise<RouteRationalizationDataset> | null = null;

function toNumber(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function extractViewMapPath(value: unknown) {
  const raw = String(value || '');
  const match = raw.match(/href=["']([^"']+)["']/i);
  return match?.[1] || null;
}

function normalizeRoute(row: any): RationalizedRoute {
  return {
    routeId: String(row.Route_ID || '').trim(),
    routeName: String(row.Route_Name || '').trim(),
    actionTaken: String(row.Action_Taken || '').trim(),
    newRouteId: String(row.New_Route_ID || '').trim(),
    routeKm: toNumber(row.Route_KM),
    cycleTimeMin: toNumber(row.Cycle_Time_Min),
    fleetRequired: toNumber(row.Fleet_Required),
    headwayMin: toNumber(row.Headway_Min),
    populationServed: toNumber(row.Population_Served),
    compositeDemandScore: toNumber(row.Composite_Demand_Score),
    oldWaitTime: toNumber(row.Old_Wait_Time),
    newWaitTime: toNumber(row.New_Wait_Time),
    overlapMetric: toNumber(row.Overlap_Metric),
    viewMapPath: extractViewMapPath(row.View_Map),
  };
}

function normalizeImpact(row: any): PassengerImpactRecord {
  return {
    routeId: String(row.Route_ID || '').trim(),
    routeName: String(row.Route_Name || '').trim(),
    actionTaken: String(row.Action_Taken || '').trim(),
    newRouteId: String(row.New_Route_ID || '').trim(),
    oldWaitTime: toNumber(row.Old_Wait_Time),
    newWaitTime: toNumber(row.New_Wait_Time),
    populationServed: toNumber(row.Population_Served),
    timeSavedMins: toNumber(row.Time_Saved_Mins),
    cumulativePersonMinutesSavedDaily: toNumber(row.Cumulative_Person_Minutes_Saved_Daily),
  };
}

function normalizeLog(row: any): RationalizationLogEntry {
  return {
    oldRouteId: String(row.Old_Route_ID || '').trim(),
    oldName: String(row.Old_Name || '').trim(),
    actionTaken: String(row.Action_Taken || '').trim(),
    newRouteId: String(row.New_Route_ID || '').trim(),
    populationServed: toNumber(row.Population_Served),
    oldWaitTime: toNumber(row.Old_Wait_Time),
    newWaitTime: toNumber(row.New_Wait_Time),
    fleetRequired: toNumber(row.Fleet_Required),
    routeKm: toNumber(row.Route_KM),
    reasoning: String(row.Reasoning_String || '').trim(),
  };
}

function buildSummary(routes: RationalizedRoute[], impact: PassengerImpactRecord[]): RouteRationalizationSummary {
  const totalRoutes = routes.length;
  const trunkRoutes = routes.filter((route) => route.actionTaken.includes('TRUNK')).length;
  const feederRoutes = routes.filter((route) => route.actionTaken.includes('FEEDER')).length;
  const totalPopulationServed = routes.reduce((sum, route) => sum + route.populationServed, 0);
  const totalDailyPersonMinutesSaved = impact.reduce(
    (sum, item) => sum + item.cumulativePersonMinutesSavedDaily,
    0
  );
  const averageOldWaitTime = totalRoutes > 0 ? routes.reduce((sum, route) => sum + route.oldWaitTime, 0) / totalRoutes : 0;
  const averageNewWaitTime = totalRoutes > 0 ? routes.reduce((sum, route) => sum + route.newWaitTime, 0) / totalRoutes : 0;

  return {
    totalRoutes,
    trunkRoutes,
    feederRoutes,
    totalPopulationServed,
    totalDailyPersonMinutesSaved,
    averageOldWaitTime,
    averageNewWaitTime,
    averageWaitReduction: averageOldWaitTime - averageNewWaitTime,
  };
}

async function readJsonFile(fileName: string) {
  const filePath = path.join(DATA_DIR, fileName);
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw.replace(/^\uFEFF/, ''));
}

async function loadDataset(): Promise<RouteRationalizationDataset> {
  const [routesRaw, impactRaw, logRaw, geojsonStats] = await Promise.all([
    readJsonFile('routes.json'),
    readJsonFile('impact.json'),
    readJsonFile('log.json'),
    stat(path.join(PUBLIC_DIR, 'Rationalised_Routes.geojson')),
  ]);

  const routes = (Array.isArray(routesRaw) ? routesRaw : [routesRaw]).map(normalizeRoute);
  const impact = (Array.isArray(impactRaw) ? impactRaw : [impactRaw]).map(normalizeImpact);
  const log = (Array.isArray(logRaw) ? logRaw : [logRaw]).map(normalizeLog);

  return {
    updatedAt: geojsonStats.mtimeMs,
    routes,
    impact,
    log,
    summary: buildSummary(routes, impact),
  };
}

export async function getRouteRationalizationDataset() {
  if (!datasetPromise) {
    datasetPromise = loadDataset();
  }

  return datasetPromise;
}

export function isRationalizationQuestion(question: string) {
  return /(rationali[sz]|feeder|trunk|passenger impact|time saved|wait time|new route|old route|\b(?:TRK|FDR)-\d{3}\b|\bR\d{4}\b)/i.test(
    question
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-IN').format(Math.round(value));
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat('en-IN', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function extractRouteIdentifier(question: string) {
  const match = question.toUpperCase().match(/\b(?:TRK|FDR)-\d{3}\b|\bR\d{4}\b/);
  return match?.[0] || null;
}

export function buildRationalizationReply(question: string, dataset: RouteRationalizationDataset) {
  const normalized = question.toLowerCase();
  const routeIdentifier = extractRouteIdentifier(question);

  if (routeIdentifier) {
    const matchingLogEntries = dataset.log.filter(
      (entry) => entry.oldRouteId.toUpperCase() === routeIdentifier || entry.newRouteId.toUpperCase() === routeIdentifier
    );
    const matchingRoute = dataset.routes.find(
      (route) => route.routeId.toUpperCase() === routeIdentifier || route.newRouteId.toUpperCase() === routeIdentifier
    );

    if (matchingLogEntries.length > 0) {
      const primary = matchingLogEntries[0];
      const intro = matchingRoute
        ? `${matchingRoute.newRouteId} is marked as ${matchingRoute.actionTaken.replaceAll('_', ' ').toLowerCase()}.`
        : `Here is the rationalisation note for ${routeIdentifier}.`;

      const detailLines = [
        intro,
        primary.reasoning,
      ];

      if (matchingLogEntries.length > 1 && primary.newRouteId.toUpperCase() === routeIdentifier) {
        const oldRoutes = matchingLogEntries.slice(0, 4).map((entry) => entry.oldRouteId).join(', ');
        detailLines.push(`This final route groups ${matchingLogEntries.length} source routes, including ${oldRoutes}.`);
      }

      if (matchingRoute) {
        detailLines.push(
          `Operational snapshot: ${formatNumber(matchingRoute.populationServed)} people served, ${matchingRoute.fleetRequired} vehicles, ${matchingRoute.headwayMin}-minute headway, and wait time ${matchingRoute.oldWaitTime} -> ${matchingRoute.newWaitTime} minutes.`
        );
      }

      return detailLines.join('\n\n');
    }
  }

  if (/(how many|count|summary|overview|network)/.test(normalized)) {
    return [
      'Route rationalisation network summary:',
      `- ${dataset.summary.totalRoutes} final routes in the active network.`,
      `- ${dataset.summary.trunkRoutes} trunk corridors and ${dataset.summary.feederRoutes} feeder services.`,
      `- ${formatCompactNumber(dataset.summary.totalPopulationServed)} total route-level population served.`,
      `- Average wait time moved from ${dataset.summary.averageOldWaitTime.toFixed(1)} to ${dataset.summary.averageNewWaitTime.toFixed(1)} minutes.`,
      `- About ${formatCompactNumber(dataset.summary.totalDailyPersonMinutesSaved)} passenger-minutes saved per day.`,
    ].join('\n');
  }

  if (/(time saved|passenger impact|highest impact|most impact)/.test(normalized)) {
    const topImpact = [...dataset.impact]
      .sort((a, b) => b.cumulativePersonMinutesSavedDaily - a.cumulativePersonMinutesSavedDaily)
      .slice(0, 5)
      .map((item, index) => {
        return `${index + 1}. ${item.newRouteId} (${item.routeName}) saves about ${formatCompactNumber(item.cumulativePersonMinutesSavedDaily)} passenger-minutes daily.`;
      });

    return [
      'Top passenger-impact routes:',
      ...topImpact,
    ].join('\n');
  }

  if (/(upgraded|trunk)/.test(normalized)) {
    const trunkRoutes = dataset.routes
      .filter((route) => route.actionTaken.includes('TRUNK'))
      .sort((a, b) => b.populationServed - a.populationServed)
      .slice(0, 5)
      .map((route, index) => {
        return `${index + 1}. ${route.newRouteId} serves ${formatNumber(route.populationServed)} people with ${route.headwayMin}-minute headway.`;
      });

    return [
      'Highest-coverage trunk routes in the final network:',
      ...trunkRoutes,
    ].join('\n');
  }

  if (/(retained|feeder)/.test(normalized)) {
    const feederRoutes = dataset.routes
      .filter((route) => route.actionTaken.includes('FEEDER'))
      .sort((a, b) => b.populationServed - a.populationServed)
      .slice(0, 5)
      .map((route, index) => {
        return `${index + 1}. ${route.newRouteId} serves ${formatNumber(route.populationServed)} people with ${route.headwayMin}-minute headway.`;
      });

    return [
      'Highest-coverage feeder routes in the final network:',
      ...feederRoutes,
    ].join('\n');
  }

  return [
    'I can answer route rationalisation questions about trunk routes, feeder routes, wait-time changes, passenger impact, and specific route IDs like FDR-297, TRK-005, or R0129.',
    '',
    `Current network snapshot: ${dataset.summary.totalRoutes} final routes, ${dataset.summary.trunkRoutes} trunks, ${dataset.summary.feederRoutes} feeders, and ${formatCompactNumber(dataset.summary.totalDailyPersonMinutesSaved)} passenger-minutes saved daily.`,
  ].join('\n');
}
