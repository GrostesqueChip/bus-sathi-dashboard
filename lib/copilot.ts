import { FleetSnapshot } from '@/lib/snapshot';

type DriverRollup = {
  driverId: string;
  driverName: string;
  distance: number;
  tripCount: number;
  activeTrips: number;
  completedTrips: number;
};

function formatDistance(value: number) {
  if (!Number.isFinite(value)) return '0 km';
  return `${value >= 100 ? value.toFixed(0) : value.toFixed(1)} km`;
}

function formatAge(timestamp: number) {
  if (!timestamp) return 'just now';

  const diffMs = Math.max(0, Date.now() - timestamp);
  const diffMinutes = Math.round(diffMs / 60000);

  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

function formatDriverName(driverName: string, driverId: string) {
  const name = driverName?.trim();
  if (name && name.toLowerCase() !== 'unknown') {
    return name;
  }

  return driverId?.trim() || 'Unknown driver';
}

function buildDriverLeaderboard(snapshot: FleetSnapshot, completedOnly = false) {
  const totals = new Map<string, DriverRollup>();

  for (const trip of snapshot.trips) {
    const isCompleted = Boolean(trip.endTime) || trip.status !== 'ACTIVE';
    if (completedOnly && !isCompleted) continue;

    const key = trip.driverId || trip.driverName || trip.id;
    const existing = totals.get(key) || {
      driverId: trip.driverId,
      driverName: trip.driverName,
      distance: 0,
      tripCount: 0,
      activeTrips: 0,
      completedTrips: 0,
    };

    existing.distance += trip.totalDistance;
    existing.tripCount += 1;
    existing.activeTrips += isCompleted ? 0 : 1;
    existing.completedTrips += isCompleted ? 1 : 0;
    totals.set(key, existing);
  }

  return Array.from(totals.values()).sort((a, b) => b.distance - a.distance);
}

function buildOverview(snapshot: FleetSnapshot) {
  return [
    `Latest fleet snapshot (${formatAge(snapshot.generatedAt)}):`,
    `- ${snapshot.activeTrips} active trips and ${snapshot.completedTrips} completed trips.`,
    `- ${snapshot.uniqueDrivers} active or recently tracked drivers across ${snapshot.totalTrips} total trips.`,
    `- ${formatDistance(snapshot.totalDistanceKm)} covered in the latest snapshot.`,
    `- ${snapshot.flaggedTripCount} flagged trips and ${snapshot.anomalies.length} anomaly records detected.`,
  ].join('\n');
}

function buildActiveFleetReply(snapshot: FleetSnapshot) {
  const activeTrips = snapshot.trips
    .filter((trip) => !trip.endTime || trip.status === 'ACTIVE')
    .sort((a, b) => b.startTime - a.startTime)
    .slice(0, 5);

  if (activeTrips.length === 0) {
    return `${buildOverview(snapshot)}\n\nNo trips are marked active right now in the latest fleet snapshot.`;
  }

  const highlights = activeTrips.map((trip, index) => {
    const driver = formatDriverName(trip.driverName, trip.driverId);
    return `${index + 1}. ${driver} - ${formatDistance(trip.totalDistance)} so far (${trip.pointCount} points logged).`;
  });

  return [
    buildOverview(snapshot),
    '',
    'Active fleet right now:',
    ...highlights,
  ].join('\n');
}

function buildFlaggedTripsReply(snapshot: FleetSnapshot) {
  if (snapshot.flaggedTrips.length === 0) {
    return `${buildOverview(snapshot)}\n\nNo flagged trips are present in the latest fleet snapshot.`;
  }

  const highlights = snapshot.flaggedTrips.slice(0, 5).map((trip, index) => {
    const reasons = trip.reasons.slice(0, 2).join(' ');
    return `${index + 1}. ${formatDriverName(trip.driverName, trip.driverId)} on trip ${trip.tripId}: ${reasons}`;
  });

  return [
    `There are ${snapshot.flaggedTripCount} flagged trips in the latest fleet snapshot (${formatAge(snapshot.generatedAt)}).`,
    '',
    'Most urgent highlights:',
    ...highlights,
  ].join('\n');
}

function buildTopDriversReply(snapshot: FleetSnapshot, completedOnly: boolean) {
  const leaderboard = buildDriverLeaderboard(snapshot, completedOnly).slice(0, 5);

  if (leaderboard.length === 0) {
    return `${buildOverview(snapshot)}\n\nI do not have enough completed trip data to rank drivers yet.`;
  }

  const title = completedOnly ? 'Top drivers by completed distance:' : 'Top drivers by distance:';
  const lines = leaderboard.map((driver, index) => {
    const completedNote = completedOnly
      ? `${driver.completedTrips} completed trips`
      : `${driver.tripCount} trips`;

    return `${index + 1}. ${formatDriverName(driver.driverName, driver.driverId)} - ${formatDistance(driver.distance)} across ${completedNote}.`;
  });

  return [
    `${title} Snapshot from ${formatAge(snapshot.generatedAt)}.`,
    ...lines,
  ].join('\n');
}

function buildAnomalyReply(snapshot: FleetSnapshot) {
  if (snapshot.anomalies.length === 0) {
    return `${buildOverview(snapshot)}\n\nNo anomaly records are stored in the latest snapshot.`;
  }

  const highlights = snapshot.anomalies.slice(0, 5).map((anomaly, index) => {
    return `${index + 1}. ${anomaly.label} (${anomaly.severity}) on trip ${anomaly.tripId || 'unknown trip'}.`;
  });

  return [
    `Latest anomaly view (${formatAge(snapshot.generatedAt)}): ${snapshot.anomalies.length} anomaly records found.`,
    '',
    'Recent anomalies:',
    ...highlights,
  ].join('\n');
}

export function buildRecoveryReply(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '');
  const normalized = message.toLowerCase();

  if (normalized.includes('snapshot missing')) {
    return 'Bus Sathi Bot could not find a cached fleet snapshot yet. Open /api/cron/cache-snapshot once, then ask again.';
  }

  if (
    normalized.includes('private key') ||
    normalized.includes('credential') ||
    normalized.includes('decoder') ||
    normalized.includes('unsupported')
  ) {
    return 'Bus Sathi Bot cannot read the fleet database yet because the Firebase admin key still needs attention. Re-save FIREBASE_PRIVATE_KEY, restart the app, and try again.';
  }

  return 'Bus Sathi Bot hit a temporary backend issue and could not reach live fleet data. Please refresh the dashboard cache and try again.';
}

export function buildLocalCopilotReply(question: string, snapshot: FleetSnapshot) {
  const normalized = question.toLowerCase();

  if (/(flag|flagged|issue|issues|alert|alerts)/.test(normalized)) {
    return buildFlaggedTripsReply(snapshot);
  }

  if (/(anomaly|anomalies|health)/.test(normalized)) {
    return buildAnomalyReply(snapshot);
  }

  if (/(top|highest|best|leader|distance)/.test(normalized) && /(driver|drivers)/.test(normalized)) {
    return buildTopDriversReply(snapshot, /(completed|finished|closed)/.test(normalized));
  }

  if (/(active|right now|moving|live|status|on road)/.test(normalized)) {
    return buildActiveFleetReply(snapshot);
  }

  return [
    buildOverview(snapshot),
    '',
    'I can help with active fleet status, flagged trips, anomalies, and top driver distance rankings.',
  ].join('\n');
}
