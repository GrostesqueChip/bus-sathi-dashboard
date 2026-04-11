import type { RationalizedRouteV3 } from '@/lib/routeRationalizationV3';

export type ActionFilter = 'all' | 'trunk' | 'feeder' | 'merged';
export type SocialFilter = 'all' | 'protected' | 'regular';
export type SortMode = 'fleet' | 'cdi' | 'population' | 'headway';

export const PRIORITY_ORDER = ['HP', 'MP', 'LP'];

export function getRouteKey(route: Pick<RationalizedRouteV3, 'newRouteId' | 'routeId'>) {
  return `${route.newRouteId}:${route.routeId}`;
}

export function getRouteMapHref(route: Pick<RationalizedRouteV3, 'mapFile' | 'newRouteId'>) {
  return `/route-rationalization-v3/${route.mapFile || `route_maps/${route.newRouteId}.html`}`;
}

export function actionMatchesFilter(route: RationalizedRouteV3, filter: ActionFilter) {
  if (filter === 'all') return true;
  if (filter === 'trunk') return route.actionTaken === 'UPGRADED_TO_TRUNK';
  if (filter === 'feeder') return route.actionTaken.includes('FEEDER');
  return route.actionTaken === 'MERGED_INTO_TRUNK';
}

export function routeMatchesSearch(route: RationalizedRouteV3, query: string) {
  if (!query.trim()) return true;

  const haystack = [
    route.routeId,
    route.newRouteId,
    route.routeName,
    route.actionTaken,
    route.routeType,
    route.priorityBand,
    route.cmpRouteId,
    route.congestionZone,
  ]
    .join(' ')
    .toLowerCase();

  return haystack.includes(query.toLowerCase().trim());
}
