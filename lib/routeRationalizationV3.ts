import { readFile, readdir, stat } from 'fs/promises';
import path from 'path';

export interface RationalizedRouteV3 {
  routeId: string;
  routeName: string;
  actionTaken: string;
  newRouteId: string;
  routeKm: number;
  routeType: string;
  osrmDurationSeconds: number;
  cycleTimeMin: number;
  congestionZone: string;
  stopsEstimated: number;
  stopPenaltyMin: number;
  sharpTurns: number;
  junctionPenaltyMin: number;
  popScore: number;
  poiScore: number;
  roadMultiplier: number;
  finalCdi: number;
  socialFlag: boolean;
  priorityBand: string;
  headwayMin: number;
  fleetRequired: number;
  hpvCount: number;
  mpvCount: number;
  cmpTrunk: boolean;
  cmpRouteId: string;
  populationServed: number;
  hvPoiCount: number;
  overlapMetric: number;
  geoSource: string;
  mapFile: string | null;
}

export interface PassengerImpactV3Record {
  newRouteId: string;
  routeName: string;
  actionTaken: string;
  routeType: string;
  priorityBand: string;
  headwayMin: number;
  fleetRequired: number;
  hpvCount: number;
  mpvCount: number;
  cmpTrunk: boolean;
  cmpRouteId: string;
  populationServed: number;
  socialFlag: boolean;
}

export interface RationalizationLogV3Entry extends RationalizedRouteV3 {
  reasoning: string;
}

export interface V3CountItem {
  label: string;
  count: number;
}

export interface RouteRationalizationV3Summary {
  totalRouteRows: number;
  activeRoutes: number;
  trunkRoutes: number;
  feederRoutes: number;
  mergedRoutes: number;
  cmpBackboneTrunks: number;
  socialObligationRoutes: number;
  regionalLifelines: number;
  totalFleetRequired: number;
  hpvTotal: number;
  mpvTotal: number;
  lpvTotal: number;
  totalPopulationServedRows: number;
  deduplicatedNetworkPopulation: number;
  cmpPopulationTotal: number;
  cmpCoveragePercent: number;
  averageFleetPerActiveRoute: number;
  routeMapHtmlCount: number;
  routeTypeCounts: V3CountItem[];
  priorityBandCounts: V3CountItem[];
  actionCounts: V3CountItem[];
}

export interface RouteRationalizationV3Dataset {
  updatedAt: number;
  routes: RationalizedRouteV3[];
  impact: PassengerImpactV3Record[];
  log: RationalizationLogV3Entry[];
  summary: RouteRationalizationV3Summary;
}

export interface V3SourceFile {
  label: string;
  description: string;
  href: string;
  download?: boolean;
  fileName: string;
}

const PUBLIC_ROUTE = '/route-rationalization-v3';
const PUBLIC_DIR = path.join(process.cwd(), 'public', 'route-rationalization-v3');
const DATA_DIR = path.join(PUBLIC_DIR, 'data');
const ROUTE_MAPS_DIR = path.join(PUBLIC_DIR, 'route_maps');
const DEDUPLICATED_NETWORK_POPULATION = 1_390_409;
const CMP_POPULATION_TOTAL = 1_653_873;
const CMP_COVERAGE_PERCENT = 84.07;

let datasetPromise: Promise<RouteRationalizationV3Dataset> | null = null;

export const V3_SOURCE_FILES: V3SourceFile[] = [
  {
    label: '4-sheet workbook',
    description: 'Presentation-ready route frequency plan.',
    href: `${PUBLIC_ROUTE}/Jammu_Route_Frequency_Plan_v3.xlsx`,
    download: true,
    fileName: 'Jammu_Route_Frequency_Plan_v3.xlsx',
  },
  {
    label: 'Master transit map',
    description: 'Generated sidebar + KPI map from the v3 pipeline.',
    href: `${PUBLIC_ROUTE}/Master_Transit_Map_v3.html`,
    fileName: 'Master_Transit_Map_v3.html',
  },
  {
    label: 'Network GeoJSON',
    description: 'All 507 active route features.',
    href: `${PUBLIC_ROUTE}/Rationalised_Routes_v3.geojson`,
    fileName: 'Rationalised_Routes_v3.geojson',
  },
  {
    label: 'Operational CSV',
    description: 'Full route-level plan with fleet and priority fields.',
    href: `${PUBLIC_ROUTE}/Rationalised_Routes_v3.csv`,
    download: true,
    fileName: 'Rationalised_Routes_v3.csv',
  },
  {
    label: 'Passenger impact CSV',
    description: 'Frequency and passenger-facing route summary.',
    href: `${PUBLIC_ROUTE}/Passenger_Impact_v3.csv`,
    download: true,
    fileName: 'Passenger_Impact_v3.csv',
  },
  {
    label: 'Audit log CSV',
    description: 'Route-by-route rationalisation reasoning.',
    href: `${PUBLIC_ROUTE}/Rationalisation_Log_v3.csv`,
    download: true,
    fileName: 'Rationalisation_Log_v3.csv',
  },
  {
    label: 'Pipeline log',
    description: 'QC checks and export run details.',
    href: `${PUBLIC_ROUTE}/transit_v3.log.txt`,
    fileName: 'transit_v3.log.txt',
  },
  {
    label: 'Route maps ZIP',
    description: 'Original package of generated per-route HTML maps.',
    href: `${PUBLIC_ROUTE}/route_maps.zip`,
    download: true,
    fileName: 'route_maps.zip',
  },
];

function toNumber(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toBoolean(value: unknown) {
  if (typeof value === 'boolean') return value;
  return String(value || '').trim().toLowerCase() === 'true';
}

function readString(row: Record<string, unknown>, key: string) {
  return String(row[key] || '').trim();
}

function normalizeMapFile(value: unknown) {
  const raw = String(value || '').trim().replaceAll('\\', '/');
  return raw || null;
}

function normalizeRoute(row: Record<string, unknown>): RationalizedRouteV3 {
  return {
    routeId: readString(row, 'Route_ID'),
    routeName: readString(row, 'Route_Name'),
    actionTaken: readString(row, 'Action_Taken'),
    newRouteId: readString(row, 'New_Route_ID'),
    routeKm: toNumber(row.Route_KM),
    routeType: readString(row, 'Route_Type'),
    osrmDurationSeconds: toNumber(row.OSRM_Duration_S),
    cycleTimeMin: toNumber(row.Cycle_Time_Min),
    congestionZone: readString(row, 'Congestion_Zone'),
    stopsEstimated: toNumber(row.N_Stops_Estimated),
    stopPenaltyMin: toNumber(row.Stop_Penalty_Min),
    sharpTurns: toNumber(row.Sharp_Turns),
    junctionPenaltyMin: toNumber(row.Junction_Penalty_Min),
    popScore: toNumber(row.Pop_Score),
    poiScore: toNumber(row.POI_Score),
    roadMultiplier: toNumber(row.Road_Multiplier),
    finalCdi: toNumber(row.Final_CDI),
    socialFlag: toBoolean(row.Social_Flag),
    priorityBand: readString(row, 'Priority_Band'),
    headwayMin: toNumber(row.Headway_Min),
    fleetRequired: toNumber(row.Fleet_Required),
    hpvCount: toNumber(row.HPV_Count),
    mpvCount: toNumber(row.MPV_Count),
    cmpTrunk: toBoolean(row.CMP_Trunk),
    cmpRouteId: readString(row, 'CMP_Route_ID'),
    populationServed: toNumber(row.Population_Served),
    hvPoiCount: toNumber(row.HV_POI_Count),
    overlapMetric: toNumber(row.Overlap_Metric),
    geoSource: readString(row, 'Geo_Source'),
    mapFile: normalizeMapFile(row.Map_File),
  };
}

function normalizeImpact(row: Record<string, unknown>): PassengerImpactV3Record {
  return {
    newRouteId: readString(row, 'New_Route_ID'),
    routeName: readString(row, 'Route_Name'),
    actionTaken: readString(row, 'Action_Taken'),
    routeType: readString(row, 'Route_Type'),
    priorityBand: readString(row, 'Priority_Band'),
    headwayMin: toNumber(row.Headway_Min),
    fleetRequired: toNumber(row.Fleet_Required),
    hpvCount: toNumber(row.HPV_Count),
    mpvCount: toNumber(row.MPV_Count),
    cmpTrunk: toBoolean(row.CMP_Trunk),
    cmpRouteId: readString(row, 'CMP_Route_ID'),
    populationServed: toNumber(row.Population_Served),
    socialFlag: toBoolean(row.Social_Flag),
  };
}

function normalizeLog(row: Record<string, unknown>): RationalizationLogV3Entry {
  return {
    ...normalizeRoute(row),
    reasoning: readString(row, 'Reasoning_String'),
  };
}

function countBy<T>(items: T[], getKey: (item: T) => string) {
  const counts = new Map<string, number>();

  items.forEach((item) => {
    const key = getKey(item) || 'Unknown';
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function buildSummary(routes: RationalizedRouteV3[], routeMapHtmlCount: number): RouteRationalizationV3Summary {
  const active = routes.filter((route) => route.actionTaken !== 'MERGED_INTO_TRUNK');
  const totalFleetRequired = active.reduce((sum, route) => sum + route.fleetRequired, 0);
  const hpvTotal = active.reduce((sum, route) => sum + route.hpvCount, 0);
  const mpvTotal = active.reduce((sum, route) => sum + route.mpvCount, 0);

  return {
    totalRouteRows: routes.length,
    activeRoutes: active.length,
    trunkRoutes: routes.filter((route) => route.actionTaken.includes('TRUNK') && route.actionTaken !== 'MERGED_INTO_TRUNK').length,
    feederRoutes: routes.filter((route) => route.actionTaken.includes('FEEDER')).length,
    mergedRoutes: routes.filter((route) => route.actionTaken === 'MERGED_INTO_TRUNK').length,
    cmpBackboneTrunks: active.filter((route) => route.cmpTrunk).length,
    socialObligationRoutes: routes.filter((route) => route.socialFlag).length,
    regionalLifelines: routes.filter((route) => route.routeType === 'Regional_District').length,
    totalFleetRequired,
    hpvTotal,
    mpvTotal,
    lpvTotal: 0,
    totalPopulationServedRows: routes.reduce((sum, route) => sum + route.populationServed, 0),
    deduplicatedNetworkPopulation: DEDUPLICATED_NETWORK_POPULATION,
    cmpPopulationTotal: CMP_POPULATION_TOTAL,
    cmpCoveragePercent: CMP_COVERAGE_PERCENT,
    averageFleetPerActiveRoute: active.length ? totalFleetRequired / active.length : 0,
    routeMapHtmlCount,
    routeTypeCounts: countBy(routes, (route) => route.routeType),
    priorityBandCounts: countBy(routes, (route) => route.priorityBand),
    actionCounts: countBy(routes, (route) => route.actionTaken),
  };
}

async function readJsonFile(fileName: string) {
  const filePath = path.join(DATA_DIR, fileName);
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw.replace(/^\uFEFF/, ''));
}

async function countRouteMaps() {
  try {
    const entries = await readdir(ROUTE_MAPS_DIR);
    return entries.filter((entry) => entry.toLowerCase().endsWith('.html')).length;
  } catch {
    return 0;
  }
}

async function loadDataset(): Promise<RouteRationalizationV3Dataset> {
  const [routesRaw, impactRaw, logRaw, geojsonStats, routeMapHtmlCount] = await Promise.all([
    readJsonFile('routes.json'),
    readJsonFile('impact.json'),
    readJsonFile('log.json'),
    stat(path.join(PUBLIC_DIR, 'Rationalised_Routes_v3.geojson')),
    countRouteMaps(),
  ]);

  const routes = (Array.isArray(routesRaw) ? routesRaw : [routesRaw]).map(normalizeRoute);
  const impact = (Array.isArray(impactRaw) ? impactRaw : [impactRaw]).map(normalizeImpact);
  const log = (Array.isArray(logRaw) ? logRaw : [logRaw]).map(normalizeLog);

  return {
    updatedAt: geojsonStats.mtimeMs,
    routes,
    impact,
    log,
    summary: buildSummary(routes, routeMapHtmlCount),
  };
}

export async function getRouteRationalizationV3Dataset() {
  if (!datasetPromise) {
    datasetPromise = loadDataset();
  }

  return datasetPromise;
}

export function getRouteV3MapHref(route: Pick<RationalizedRouteV3, 'mapFile' | 'newRouteId'>) {
  const mapFile = route.mapFile || `route_maps/${route.newRouteId}.html`;
  return `${PUBLIC_ROUTE}/${mapFile}`;
}
