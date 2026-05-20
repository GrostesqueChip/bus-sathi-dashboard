import { readFile, readdir, stat } from 'fs/promises';
import path from 'path';

export interface RationalizedRouteKashmir {
  routeCode: string;
  routeId: string;
  routeName: string;
  actionTaken: string;
  newRouteId: string;
  displacedOperatorClass: string;
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
  lpvCount: number;
  cmpTrunk: boolean;
  cmpRouteId: string;
  populationServed: number;
  hvPoiCount: number;
  overlapMetric: number;
  geoSource: string;
  touristCorridor: boolean;
  seasonalOperability: string;
  districtHqFloor: boolean;
  ssclCdiConflict: boolean;
  dailyTrips: number;
  dailyKm: number;
  dailyCapacityPax: number;
  dailyDemandPax: number;
  loadRatio: number;
  loadFlag: string;
  paxJourneyTimeMin: number;
  journeyTimeFlag: boolean;
  dailyRevenueInr: number;
  dailyOpCostInr: number;
  viabilityRatio: number;
  subsidyRiskFlag: boolean;
  emissionsGco2Daily: number;
  equityScore: number;
  mapFile: string | null;
}

export interface PassengerImpactKashmirRecord {
  newRouteId: string;
  routeName: string;
  actionTaken: string;
  routeType: string;
  priorityBand: string;
  headwayMin: number;
  fleetRequired: number;
  hpvCount: number;
  mpvCount: number;
  lpvCount: number;
  cmpTrunk: boolean;
  cmpRouteId: string;
  populationServed: number;
  socialFlag: boolean;
}

export interface RationalizationLogKashmirEntry extends RationalizedRouteKashmir {
  reasoning: string;
}

export interface KashmirCountItem {
  label: string;
  count: number;
}

export interface RouteRationalizationKashmirSummary {
  totalRouteRows: number;
  activeRoutes: number;
  trunkRoutes: number;
  feederRoutes: number;
  mergedRoutes: number;
  ssclBackboneRoutes: number;
  socialObligationRoutes: number;
  regionalLifelines: number;
  totalFleetRequired: number;
  hpvTotal: number;
  mpvTotal: number;
  lpvTotal: number;
  totalPopulationServedRows: number;
  deduplicatedNetworkPopulation: number;
  studyAreaPopulation: number;
  networkCoveragePercent: number;
  averageFleetPerActiveRoute: number;
  routeMapHtmlCount: number;
  routeTypeCounts: KashmirCountItem[];
  priorityBandCounts: KashmirCountItem[];
  actionCounts: KashmirCountItem[];
  touristCorridorCount: number;
}

export interface RouteRationalizationKashmirDataset {
  updatedAt: number;
  routes: RationalizedRouteKashmir[];
  impact: PassengerImpactKashmirRecord[];
  log: RationalizationLogKashmirEntry[];
  summary: RouteRationalizationKashmirSummary;
}

export interface KashmirSourceFile {
  label: string;
  description: string;
  href: string;
  download?: boolean;
  fileName: string;
}

const PUBLIC_ROUTE = '/route-rationalization-kashmir';
const PUBLIC_DIR = path.join(process.cwd(), 'public', 'route-rationalization-kashmir');
const DATA_DIR = path.join(PUBLIC_DIR, 'data');
const ROUTE_MAPS_DIR = path.join(PUBLIC_DIR, 'route_maps_kashmir');

// Kashmir Valley population — from Census 2011 + SMC projection (README: 1,660,000)
// The engine's walk-catchment analysis produces a deduplicated served population.
// Using the README figure as the study-area total.
const STUDY_AREA_POPULATION = 1_660_000;

// Deduplicated network coverage — taken directly from the v3.3.4 engine log:
//   "Deduplicated network population: 1,158,399 (69.78% of CMP 2024 total: 1,660,000)"
// (Engine computes this via the dissolved-union of all active-route walksheds
// against the WorldPop raster, so it is exact rather than estimated.)
// v3.3.4 counts: 207 active routes, 1,113 total fleet (140 HPV / 827 MPV /
// 146 LPV), 69 tourist corridors tagged. SSCL empirical fleet (CHALO) is now
// used only as a FLOOR — when the cycle-time formula demands more buses to
// sustain the 15-min target headway, the engine recommends the higher number.
// This eliminated the 12 false Red_Overload signals seen in v3.3.4.
const DEDUPLICATED_NETWORK_POPULATION = 1_158_399;
const NETWORK_COVERAGE_PERCENT = 69.78;

let datasetPromise: Promise<RouteRationalizationKashmirDataset> | null = null;

export const KASHMIR_SOURCE_FILES: KashmirSourceFile[] = [
  {
    label: '4-sheet workbook',
    description: 'Main Excel report with route plan, priority summary, and type summary.',
    href: `${PUBLIC_ROUTE}/Kashmir_Route_Frequency_Plan_v3.xlsx`,
    download: true,
    fileName: 'Kashmir_Route_Frequency_Plan_v3.xlsx',
  },
  {
    label: 'Master transit map',
    description: 'Interactive Folium map with trunk, feeder, SSCL, and regional layers.',
    href: `${PUBLIC_ROUTE}/Master_Transit_Map_Kashmir_v3.html`,
    fileName: 'Master_Transit_Map_Kashmir_v3.html',
  },
  {
    label: 'Network GeoJSON',
    description: 'All 207 active route features (v3.3.4) for GIS integration.',
    href: `${PUBLIC_ROUTE}/Rationalised_Routes_Kashmir_v3.geojson`,
    fileName: 'Rationalised_Routes_Kashmir_v3.geojson',
  },
  {
    label: 'Operational CSV',
    description: 'Route-level plan with fleet, priority, headways, and operational metrics.',
    href: `${PUBLIC_ROUTE}/Rationalised_Routes_Kashmir_v3.csv`,
    download: true,
    fileName: 'Rationalised_Routes_Kashmir_v3.csv',
  },
  {
    label: 'Passenger impact CSV',
    description: 'Passenger-facing frequency summary for each active route.',
    href: `${PUBLIC_ROUTE}/Passenger_Impact_Kashmir_v3.csv`,
    download: true,
    fileName: 'Passenger_Impact_Kashmir_v3.csv',
  },
  {
    label: 'Audit log CSV',
    description: 'Route-by-route decision reasoning and CDI scores.',
    href: `${PUBLIC_ROUTE}/Rationalisation_Log_Kashmir_v3.csv`,
    download: true,
    fileName: 'Rationalisation_Log_Kashmir_v3.csv',
  },
  {
    label: 'Pipeline log',
    description: 'Quality checks and export run details from the v3.3.4 engine.',
    href: `${PUBLIC_ROUTE}/transit_v3.log.txt`,
    fileName: 'transit_v3.log.txt',
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

function normalizeRoute(row: Record<string, unknown>): RationalizedRouteKashmir {
  return {
    routeCode: readString(row, 'Route_Code'),
    routeId: readString(row, 'Route_ID'),
    routeName: readString(row, 'Route_Name'),
    actionTaken: readString(row, 'Action_Taken'),
    newRouteId: readString(row, 'New_Route_ID'),
    displacedOperatorClass: readString(row, 'Displaced_Operator_Class'),
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
    lpvCount: toNumber(row.LPV_Count),
    cmpTrunk: toBoolean(row.CMP_Trunk),
    cmpRouteId: readString(row, 'CMP_Route_ID'),
    populationServed: toNumber(row.Population_Served),
    hvPoiCount: toNumber(row.HV_POI_Count),
    overlapMetric: toNumber(row.Overlap_Metric),
    geoSource: readString(row, 'Geo_Source'),
    touristCorridor: toBoolean(row.Tourist_Corridor),
    seasonalOperability: readString(row, 'Seasonal_Operability'),
    districtHqFloor: toBoolean(row.District_HQ_Floor),
    ssclCdiConflict: toBoolean(row.SSCL_CDI_Conflict),
    dailyTrips: toNumber(row.Daily_Trips),
    dailyKm: toNumber(row.Daily_KM),
    dailyCapacityPax: toNumber(row.Daily_Capacity_Pax),
    dailyDemandPax: toNumber(row.Daily_Demand_Pax),
    loadRatio: toNumber(row.Load_Ratio),
    loadFlag: readString(row, 'Load_Flag'),
    paxJourneyTimeMin: toNumber(row.Pax_Journey_Time_Min),
    journeyTimeFlag: toBoolean(row.Journey_Time_Flag),
    dailyRevenueInr: toNumber(row.Daily_Revenue_INR),
    dailyOpCostInr: toNumber(row.Daily_Op_Cost_INR),
    viabilityRatio: toNumber(row.Viability_Ratio),
    subsidyRiskFlag: toBoolean(row.Subsidy_Risk_Flag),
    emissionsGco2Daily: toNumber(row.Emissions_GCO2_Daily),
    equityScore: toNumber(row.Equity_Score),
    mapFile: normalizeMapFile(row.Map_File),
  };
}

function normalizeImpact(row: Record<string, unknown>): PassengerImpactKashmirRecord {
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
    lpvCount: toNumber(row.LPV_Count),
    cmpTrunk: toBoolean(row.CMP_Trunk),
    cmpRouteId: readString(row, 'CMP_Route_ID'),
    populationServed: toNumber(row.Population_Served),
    socialFlag: toBoolean(row.Social_Flag),
  };
}

function normalizeLog(row: Record<string, unknown>): RationalizationLogKashmirEntry {
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

function buildSummary(routes: RationalizedRouteKashmir[], routeMapHtmlCount: number): RouteRationalizationKashmirSummary {
  const active = routes.filter((route) => route.actionTaken !== 'MERGED_INTO_TRUNK');
  const totalFleetRequired = active.reduce((sum, route) => sum + route.fleetRequired, 0);
  const hpvTotal = active.reduce((sum, route) => sum + route.hpvCount, 0);
  const mpvTotal = active.reduce((sum, route) => sum + route.mpvCount, 0);
  const lpvTotal = active.reduce((sum, route) => sum + route.lpvCount, 0);

  return {
    totalRouteRows: routes.length,
    activeRoutes: active.length,
    trunkRoutes: routes.filter((route) => route.actionTaken.includes('TRUNK') && route.actionTaken !== 'MERGED_INTO_TRUNK').length,
    feederRoutes: routes.filter((route) => route.actionTaken.includes('FEEDER')).length,
    mergedRoutes: routes.filter((route) => route.actionTaken === 'MERGED_INTO_TRUNK').length,
    ssclBackboneRoutes: routes.filter((route) => route.newRouteId.startsWith('SSCL-') && route.actionTaken !== 'MERGED_INTO_TRUNK').length,
    socialObligationRoutes: routes.filter((route) => route.socialFlag).length,
    regionalLifelines: routes.filter((route) => route.routeType === 'Regional_District').length,
    totalFleetRequired,
    hpvTotal,
    mpvTotal,
    lpvTotal,
    totalPopulationServedRows: routes.reduce((sum, route) => sum + route.populationServed, 0),
    deduplicatedNetworkPopulation: DEDUPLICATED_NETWORK_POPULATION,
    studyAreaPopulation: STUDY_AREA_POPULATION,
    networkCoveragePercent: NETWORK_COVERAGE_PERCENT,
    averageFleetPerActiveRoute: active.length ? totalFleetRequired / active.length : 0,
    routeMapHtmlCount,
    routeTypeCounts: countBy(routes, (route) => route.routeType),
    priorityBandCounts: countBy(routes, (route) => route.priorityBand),
    actionCounts: countBy(routes, (route) => route.actionTaken),
    touristCorridorCount: routes.filter((route) => route.touristCorridor).length,
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

async function loadDataset(): Promise<RouteRationalizationKashmirDataset> {
  const [routesRaw, impactRaw, logRaw, geojsonStats, routeMapHtmlCount] = await Promise.all([
    readJsonFile('routes.json'),
    readJsonFile('impact.json'),
    readJsonFile('log.json'),
    stat(path.join(PUBLIC_DIR, 'Rationalised_Routes_Kashmir_v3.geojson')),
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

export async function getRouteRationalizationKashmirDataset() {
  if (!datasetPromise) {
    datasetPromise = loadDataset();
  }

  return datasetPromise;
}

export function getRouteKashmirMapHref(route: Pick<RationalizedRouteKashmir, 'mapFile' | 'newRouteId'>) {
  const mapFile = route.mapFile || `route_maps_kashmir/${route.newRouteId}.html`;
  return `${PUBLIC_ROUTE}/${mapFile}`;
}
