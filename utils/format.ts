export function formatDistance(km: number): string {
  if (km < 1) {
    return `${(km * 1000).toFixed(0)} m`;
  }
  return `${km.toFixed(2)} km`;
}

export function formatDuration(startTime: number, endTime: number | null): string {
  if (!endTime) return 'In Progress';
  
  const durationMs = endTime - startTime;
  const totalMinutes = Math.floor(durationMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const seconds = Math.floor((durationMs % 60000) / 1000);
  
  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 && hours === 0) parts.push(`${seconds}s`);
  
  return parts.join(' ') || '0s';
}

export function calculateSpeed(distance: number, startTime: number, endTime: number | null): string {
  if (!endTime) return 'N/A';
  
  const durationHours = (endTime - startTime) / 3600000;
  if (durationHours === 0) return 'N/A';
  
  const speedKmH = distance / durationHours;
  return `${speedKmH.toFixed(2)} km/h`;
}
