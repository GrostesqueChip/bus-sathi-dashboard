import type { RationalizedRouteKashmir } from '@/lib/routeRationalizationKashmir';

export type ActionFilter = 'all' | 'trunk' | 'feeder' | 'merged';
export type SocialFilter = 'all' | 'protected' | 'regular';
export type SortMode = 'fleet' | 'demand' | 'population' | 'service';

export const PRIORITY_ORDER = ['HP', 'MP', 'LP'];

export function getRouteKey(route: Pick<RationalizedRouteKashmir, 'routeCode' | 'newRouteId' | 'routeId'>) {
  return `${route.routeCode || route.newRouteId}:${route.routeId}`;
}

export function getRouteMapHref(route: Pick<RationalizedRouteKashmir, 'mapFile' | 'newRouteId'>) {
  return `/route-rationalization-kashmir/${route.mapFile || `route_maps_kashmir/${route.newRouteId}.html`}`;
}

export function actionMatchesFilter(route: RationalizedRouteKashmir, filter: ActionFilter) {
  if (filter === 'all') return true;
  if (filter === 'trunk') return route.actionTaken === 'UPGRADED_TO_TRUNK';
  if (filter === 'feeder') return route.actionTaken.includes('FEEDER');
  return route.actionTaken === 'MERGED_INTO_TRUNK';
}

export function routeMatchesSearch(route: RationalizedRouteKashmir, query: string) {
  if (!query.trim()) return true;

  const haystack = [
    route.routeId,
    route.routeCode,
    route.newRouteId,
    route.routeName,
    route.actionTaken,
    route.routeType,
    route.priorityBand,
    route.cmpRouteId,
    route.congestionZone,
    route.displacedOperatorClass,
    route.seasonalOperability,
  ]
    .join(' ')
    .toLowerCase();

  return haystack.includes(query.toLowerCase().trim());
}
