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
  return /(rationali[sz]|feeder|trunk|passenger impact|time saved|wait time|headway|coverage|population served|fleet required|new route|old route|merged|upgraded|retained|\b(?:TRK|FDR)-\d{3}\b|\bR\d{4}\b)/i.test(
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

type RationalizationReplyOptions = {
  preferSummaryFallback?: boolean;
};

const ROUTE_QUERY_STOP_WORDS = new Set([
  'a',
  'about',
  'all',
  'am',
  'an',
  'and',
  'are',
  'as',
  'became',
  'become',
  'did',
  'does',
  'explain',
  'for',
  'from',
  'get',
  'give',
  'happen',
  'happened',
  'has',
  'have',
  'how',
  'i',
  'is',
  'map',
  'me',
  'network',
  'of',
  'on',
  'please',
  'rationalization',
  'rationalisation',
  'route',
  'routes',
  'show',
  'tell',
  'that',
  'the',
  'this',
  'to',
  'what',
  'why',
]);

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .replace(/\u2194/g, ' ')
    .replaceAll('↔', ' ')
    .replaceAll('&', ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeSearchText(value: string) {
  return normalizeSearchText(value)
    .split(' ')
    .filter((token) => token.length > 2 && !ROUTE_QUERY_STOP_WORDS.has(token));
}

function scoreAliasMatch(alias: string, normalizedQuestion: string, questionTokens: string[]) {
  const normalizedAlias = normalizeSearchText(alias);
  if (!normalizedAlias) return 0;

  let score = 0;
  const aliasTokens = tokenizeSearchText(alias);
  const overlapCount = aliasTokens.filter((token) => questionTokens.includes(token)).length;

  if (normalizedQuestion.includes(normalizedAlias) && normalizedAlias.length >= 5) {
    score += 80;
  }

  score += overlapCount * 16;

  if (aliasTokens.length >= 2 && overlapCount === aliasTokens.length) {
    score += 30;
  }

  if (aliasTokens.some((token) => questionTokens.includes(token) && token.length >= 7)) {
    score += 12;
  }

  return score;
}

function findRouteMatch(question: string, dataset: RouteRationalizationDataset) {
  const routeIdentifier = extractRouteIdentifier(question);

  if (routeIdentifier) {
    const logEntries = dataset.log.filter(
      (entry) => entry.oldRouteId.toUpperCase() === routeIdentifier || entry.newRouteId.toUpperCase() === routeIdentifier
    );
    const route =
      dataset.routes.find(
        (item) => item.routeId.toUpperCase() === routeIdentifier || item.newRouteId.toUpperCase() === routeIdentifier
      ) || null;

    if (route || logEntries.length > 0) {
      return { type: 'single' as const, route, logEntries };
    }
  }

  const normalizedQuestion = normalizeSearchText(question);
  const questionTokens = tokenizeSearchText(question);

  if (questionTokens.length === 0) {
    return null;
  }

  const scoredRoutes = dataset.routes
    .map((route) => {
      const relatedLogEntries = dataset.log.filter(
        (entry) => entry.newRouteId === route.newRouteId || entry.oldRouteId === route.routeId || entry.newRouteId === route.routeId
      );

      const aliases = [
        route.newRouteId,
        route.routeId,
        route.routeName,
        ...relatedLogEntries.map((entry) => entry.oldRouteId),
        ...relatedLogEntries.map((entry) => entry.oldName),
      ];

      const score = aliases.reduce((maxScore, alias) => {
        return Math.max(maxScore, scoreAliasMatch(alias, normalizedQuestion, questionTokens));
      }, 0);

      return {
        route,
        logEntries: relatedLogEntries,
        score,
      };
    })
    .filter((item) => item.score >= 24)
    .sort((a, b) => b.score - a.score);

  if (!scoredRoutes.length) {
    return null;
  }

  if (scoredRoutes.length > 1 && scoredRoutes[1].score >= scoredRoutes[0].score - 8 && scoredRoutes[0].score < 90) {
    return {
      type: 'ambiguous' as const,
      candidates: scoredRoutes.slice(0, 5).map((item) => item.route),
    };
  }

  return {
    type: 'single' as const,
    route: scoredRoutes[0].route,
    logEntries: scoredRoutes[0].logEntries,
  };
}

export function buildRationalizationReply(
  question: string,
  dataset: RouteRationalizationDataset,
  options: RationalizationReplyOptions = {}
) {
  const normalized = question.toLowerCase();
  const routeMatch = findRouteMatch(question, dataset);

  if (routeMatch?.type === 'ambiguous') {
    const suggestions = routeMatch.candidates.map((route, index) => {
      return `${index + 1}. ${route.newRouteId} (${route.routeName})`;
    });

    return [
      'I found a few possible route matches.',
      ...suggestions,
      'Ask again with the exact route ID or the full route name for a precise reasoning note.',
    ].join('\n');
  }

  if (routeMatch?.type === 'single') {
    const matchingLogEntries = routeMatch.logEntries;
    const matchingRoute = routeMatch.route;

    if (matchingLogEntries.length > 0) {
      const primary = matchingLogEntries[0];
      const intro = matchingRoute
        ? `${matchingRoute.newRouteId} (${matchingRoute.routeName}) is marked as ${matchingRoute.actionTaken.replaceAll('_', ' ').toLowerCase()}.`
        : `Here is the rationalisation note for ${primary.newRouteId || primary.oldRouteId}.`;

      const detailLines = [
        intro,
        primary.reasoning,
      ];

      if (matchingLogEntries.length > 1 && primary.newRouteId) {
        const oldRoutes = matchingLogEntries.slice(0, 4).map((entry) => entry.oldRouteId).join(', ');
        detailLines.push(`This final route groups ${matchingLogEntries.length} source routes, including ${oldRoutes}.`);
      }

      if (matchingRoute) {
        detailLines.push(
          `Operational snapshot: ${formatNumber(matchingRoute.populationServed)} people served, ${matchingRoute.fleetRequired} vehicles, ${matchingRoute.headwayMin}-minute headway, and wait time ${matchingRoute.oldWaitTime} -> ${matchingRoute.newWaitTime} minutes.`
        );

        if (matchingRoute.viewMapPath) {
          detailLines.push(`Detailed route map: /route-rationalization/${matchingRoute.viewMapPath}`);
        }
      }

      return detailLines.join('\n\n');
    }

    if (matchingRoute) {
      const detailLines = [
        `${matchingRoute.newRouteId} (${matchingRoute.routeName}) is marked as ${matchingRoute.actionTaken.replaceAll('_', ' ').toLowerCase()}.`,
        `Operational snapshot: ${formatNumber(matchingRoute.populationServed)} people served, ${matchingRoute.fleetRequired} vehicles, ${matchingRoute.headwayMin}-minute headway, and wait time ${matchingRoute.oldWaitTime} -> ${matchingRoute.newWaitTime} minutes.`,
      ];

      if (matchingRoute.viewMapPath) {
        detailLines.push(`Detailed route map: /route-rationalization/${matchingRoute.viewMapPath}`);
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

  if (options.preferSummaryFallback) {
    return [
      'I can answer route rationalisation questions about trunk routes, feeder routes, wait-time changes, passenger impact, and specific route IDs like FDR-297, TRK-005, or R0129.',
      '',
      `Current network snapshot: ${dataset.summary.totalRoutes} final routes, ${dataset.summary.trunkRoutes} trunks, ${dataset.summary.feederRoutes} feeders, and ${formatCompactNumber(dataset.summary.totalDailyPersonMinutesSaved)} passenger-minutes saved daily.`,
    ].join('\n');
  }

  return null;
}
