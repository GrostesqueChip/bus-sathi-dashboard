import type { Firestore } from 'firebase-admin/firestore';

export interface SnapshotTrip {
  id: string;
  driverId: string;
  driverName: string;
  driverEmail: string;
  startTime: number;
  endTime: number | null;
  totalDistance: number;
  status: string;
  pointCount: number;
}

export interface SnapshotAnomaly {
  id: string;
  tripId: string;
  driverId: string;
  label: string;
  severity: 'low' | 'medium' | 'high';
  createdAt: number;
}

export interface FleetSnapshot {
  generatedAt: number;
  totalTrips: number;
  activeTrips: number;
  completedTrips: number;
  totalDistanceKm: number;
  uniqueDrivers: number;
  flaggedTripCount: number;
  flaggedTrips: Array<{
    tripId: string;
    driverName: string;
    driverId: string;
    reasons: string[];
    startTime: number;
    totalDistance: number;
  }>;
  trips: SnapshotTrip[];
  anomalies: SnapshotAnomaly[];
}

const toNumber = (value: unknown, fallback = 0) => {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export function readTimestamp(value: any): number {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  if (typeof value?.toMillis === 'function') return value.toMillis();
  return Number(value) || 0;
}

export function buildFlagReasons(trip: any): string[] {
  const reasons: string[] = [];
  const startTime = toNumber(trip?.startTime);
  const endTime = trip?.endTime ? toNumber(trip?.endTime) : null;
  const totalDistance = toNumber(trip?.totalDistance);
  const durationMs = endTime && startTime ? endTime - startTime : 0;
  const durationHours = durationMs / 3_600_000;

  if (totalDistance < 0.1 && durationHours > 0.08) {
    reasons.push('Zero distance despite elapsed trip time.');
  }

  if (durationHours > 0 && totalDistance / durationHours > 100) {
    reasons.push('Unrealistic trip average speed above 100 km/h.');
  }

  if (!endTime && startTime > 0 && Date.now() - startTime > 86_400_000) {
    reasons.push('Trip appears abandoned (running for >24h without end).');
  }

  const routePoints = Array.isArray(trip?.routePoints) ? trip.routePoints : [];
  let hasTeleportation = false;

  for (let i = 1; i < routePoints.length; i++) {
    const p1 = routePoints[i - 1] as any;
    const p2 = routePoints[i] as any;

    const lat1 = toNumber(p1?.lat ?? p1?.latitude, NaN);
    const lon1 = toNumber(p1?.lng ?? p1?.longitude, NaN);
    const lat2 = toNumber(p2?.lat ?? p2?.latitude, NaN);
    const lon2 = toNumber(p2?.lng ?? p2?.longitude, NaN);

    const t1 = toNumber(p1?.timestamp ?? p1?.time, 0);
    const t2 = toNumber(p2?.timestamp ?? p2?.time, 0);

    if (![lat1, lon1, lat2, lon2].every(Number.isFinite) || t2 <= t1) {
      continue;
    }

    const rKm = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = rKm * c;
    const hours = (t2 - t1) / 3_600_000;

    if (hours > 0 && distanceKm / hours > 130) {
      hasTeleportation = true;
      break;
    }
  }

  if (hasTeleportation) {
    reasons.push('Erratic GPS jump/teleportation pattern detected.');
  }

  return reasons;
}

export function compactTrip(docId: string, trip: any): SnapshotTrip {
  return {
    id: String(trip?.id || docId),
    driverId: String(trip?.driverId || ''),
    driverName: String(trip?.driverName || 'Unknown'),
    driverEmail: String(trip?.driverEmail || ''),
    startTime: toNumber(trip?.startTime),
    endTime: trip?.endTime ? toNumber(trip?.endTime) : null,
    totalDistance: toNumber(trip?.totalDistance),
    status: String(trip?.status || 'UNKNOWN'),
    pointCount: Array.isArray(trip?.routePoints) ? trip.routePoints.length : 0,
  };
}

export async function generateFleetSnapshot(adminDb: Firestore): Promise<FleetSnapshot> {
  const [tripsSnap, anomaliesSnap] = await Promise.all([
    adminDb.collection('trips').get(),
    adminDb.collection('anomalies').get().catch(() => null),
  ]);

  const rawTrips: Array<Record<string, any>> = tripsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  const compactTrips = rawTrips.map((trip) => compactTrip(String(trip.id), trip));

  const activeTrips = compactTrips.filter((trip) => !trip.endTime || trip.status === 'ACTIVE').length;
  const completedTrips = compactTrips.length - activeTrips;
  const totalDistanceKm = compactTrips.reduce((sum, trip) => sum + trip.totalDistance, 0);
  const uniqueDrivers = new Set(compactTrips.map((trip) => trip.driverId).filter(Boolean)).size;

  const flaggedTrips = rawTrips
    .map((trip) => {
      const reasons = buildFlagReasons(trip);
      return {
        tripId: String(trip.id),
        driverName: String(trip.driverName || 'Unknown'),
        driverId: String(trip.driverId || ''),
        reasons,
        startTime: Number(trip.startTime) || 0,
        totalDistance: Number(trip.totalDistance) || 0,
      };
    })
    .filter((trip) => trip.reasons.length > 0)
    .sort((a, b) => b.startTime - a.startTime)
    .slice(0, 150);

  const anomalies = (anomaliesSnap?.docs || []).map((doc) => {
    const data: any = doc.data();
    return {
      id: doc.id,
      tripId: String(data.tripId || ''),
      driverId: String(data.driverId || ''),
      label: String(data.label || data.type || 'Unknown anomaly'),
      severity: (String(data.severity || 'medium').toLowerCase() as 'low' | 'medium' | 'high'),
      createdAt: readTimestamp(data.createdAt || data.timestamp),
    };
  });

  return {
    generatedAt: Date.now(),
    totalTrips: compactTrips.length,
    activeTrips,
    completedTrips,
    totalDistanceKm: Number(totalDistanceKm.toFixed(2)),
    uniqueDrivers,
    flaggedTripCount: flaggedTrips.length,
    flaggedTrips,
    trips: compactTrips.slice(0, 1500),
    anomalies: anomalies.slice(0, 800),
  };
}
