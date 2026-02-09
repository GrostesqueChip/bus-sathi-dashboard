import { Trip, LocationPoint } from '@/types/trip';
import { format } from 'date-fns';
import JSZip from 'jszip';

/**
 * Convert trip data to CSV format
 */
export function tripToCSV(trip: Trip): string {
  const lines: string[] = [];
  
  // Add metadata as comments
  lines.push(`# tripId: ${trip.id}`);
  lines.push(`# firestoreDocId: ${trip.id}`);
  lines.push(`# driverId: ${trip.driverId}`);
  lines.push(`# driverName: ${trip.driverName}`);
  lines.push(`# startTime: ${trip.startTime}`);
  lines.push(`# startTimeString: ${trip.startTimeString}`);
  lines.push(`# endTime: ${trip.endTime || 'N/A'}`);
  lines.push(`# endTimeString: ${trip.endTimeString}`);
  lines.push('');
  
  // Add CSV header
  lines.push('timestamp,latitude,longitude,accuracy,cumulative_m,speed_kmh');
  
  // Add route points with cumulative distance and speed
  let cumulativeDistance = 0;
  trip.routePoints.forEach((point, index) => {
    let speed = 0;
    
    if (index > 0) {
      const prevPoint = trip.routePoints[index - 1];
      const distanceKm = calculateDistance(
        prevPoint.latitude,
        prevPoint.longitude,
        point.latitude,
        point.longitude
      );
      cumulativeDistance += distanceKm * 1000; // Convert km to meters
      
      // Calculate speed (km/h)
      const timeDiffSeconds = (point.timestamp - prevPoint.timestamp) / 1000;
      if (timeDiffSeconds > 0) {
        speed = (distanceKm / timeDiffSeconds) * 3600; // Convert to km/h
      }
    }
    
    const timestamp = new Date(point.timestamp).toISOString();
    lines.push(
      `${timestamp},${point.latitude},${point.longitude},${point.accuracy},${cumulativeDistance.toFixed(2)},${speed.toFixed(2)}`
    );
  });
  
  return lines.join('\n');
}

/**
 * Calculate distance between two points using Haversine formula
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Trigger CSV file download in browser
 */
export function downloadCSV(trip: Trip): void {
  const csv = tripToCSV(trip);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${trip.id}.csv`;
  link.click();
  
  URL.revokeObjectURL(url);
}

/**
 * Download multiple trips as CSV files in a zip archive
 */
export async function downloadMultipleTripsAsZip(trips: Trip[]): Promise<void> {
  if (trips.length === 0) {
    alert('No trips to download');
    return;
  }

  const zip = new JSZip();
  
  // Add each trip's CSV to the zip
  trips.forEach((trip) => {
    const csv = tripToCSV(trip);
    zip.file(`${trip.id}.csv`, csv);
  });
  
  // Generate the zip file
  const blob = await zip.generateAsync({ type: 'blob' });
  
  // Trigger download
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const timestamp = format(new Date(), 'yyyy-MM-dd_HHmmss');
  link.download = `trips_export_${timestamp}.zip`;
  link.click();
  
  URL.revokeObjectURL(url);
}
