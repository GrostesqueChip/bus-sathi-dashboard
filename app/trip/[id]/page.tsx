'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Trip } from '@/types/trip';
import { TripService } from '@/services/tripService';
import { format } from 'date-fns';
import ProtectedRoute from '@/components/ProtectedRoute';
import { downloadCSV } from '@/utils/csvExport';

// Dynamically import map component to avoid SSR issues with Leaflet
const TripMap = dynamic(() => import('@/components/TripMap'), {
  ssr: false,
  loading: () => (
    <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
      <p className="text-gray-500">Loading map...</p>
    </div>
  ),
});

function TripDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.id as string;
  
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tripId) {
      loadTrip();
    }
  }, [tripId]);

  const loadTrip = async () => {
    try {
      setLoading(true);
      const data = await TripService.getTripById(tripId);
      if (data) {
        setTrip(data);
        setError(null);
      } else {
        setError('Trip not found');
      }
    } catch (err) {
      setError('Failed to load trip details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: number) => {
    try {
      return format(new Date(timestamp), 'MMMM dd, yyyy HH:mm:ss');
    } catch {
      return 'Invalid date';
    }
  };

  const calculateDuration = (startTime: number, endTime: number | null) => {
    if (!endTime) return 'N/A';
    const durationMs = endTime - startTime;
    const totalMinutes = Math.floor(durationMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const seconds = Math.floor((durationMs % 60000) / 1000);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    }
    return `${minutes}m ${seconds}s`;
  };

const calculateAverageSpeed = () => {
    // 1. Safety checks
    if (!trip || !trip.routePoints || trip.routePoints.length < 2) {
      return 'N/A';
    }

    let movingDistanceKm = 0;
    let movingTimeHours = 0;

    // 2. Loop through points to sum up DISTANCE and TIME separately
    for (let i = 1; i < trip.routePoints.length; i++) {
      const currentPoint = trip.routePoints[i];
      const prevPoint = trip.routePoints[i - 1];
      
      // Calculate distance for this tiny segment
      const R = 6371; 
      const dLat = toRadians(currentPoint.latitude - prevPoint.latitude);
      const dLon = toRadians(currentPoint.longitude - prevPoint.longitude);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(prevPoint.latitude)) *
          Math.cos(toRadians(currentPoint.latitude)) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const segmentDistance = R * c;

      // Calculate time for this segment
      const timeDiffHours = (currentPoint.timestamp - prevPoint.timestamp) / 3600000; // convert ms to hours

      // Calculate speed for this segment just to check if we are moving
      let segmentSpeed = 0;
      if (timeDiffHours > 0) segmentSpeed = segmentDistance / timeDiffHours;

      // 3. FILTER: Only count this segment if speed is reasonable (> 2 km/h and < 150 km/h to filter GPS glitches)
      if (segmentSpeed > 2 && segmentSpeed < 150) {
        movingDistanceKm += segmentDistance;
        movingTimeHours += timeDiffHours;
      }
    }

    // 4. Final Calculation: Total Moving Distance / Total Moving Time
    if (movingTimeHours > 0) {
      const finalAvg = movingDistanceKm / movingTimeHours;
      return `${finalAvg.toFixed(2)} km/h`;
    }

    return '0.00 km/h';
  };
  const calculateSpeed = (index: number): number => {
    if (!trip || index === 0) return 0;
    
    const currentPoint = trip.routePoints[index];
    const prevPoint = trip.routePoints[index - 1];
    
    // Calculate distance using Haversine formula
    const R = 6371; // Earth's radius in km
    const dLat = toRadians(currentPoint.latitude - prevPoint.latitude);
    const dLon = toRadians(currentPoint.longitude - prevPoint.longitude);
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(prevPoint.latitude)) *
        Math.cos(toRadians(currentPoint.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = R * c;
    
    // Calculate speed (km/h)
    const timeDiffSeconds = (currentPoint.timestamp - prevPoint.timestamp) / 1000;
    if (timeDiffSeconds > 0) {
      return (distanceKm / timeDiffSeconds) * 3600;
    }
    return 0;
  };

  const toRadians = (degrees: number): number => {
    return degrees * (Math.PI / 180);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading trip details...</p>
        </div>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => router.push('/')}
          className="text-primary-600 hover:text-primary-800 font-medium"
        >
          ← Back to Dashboard
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-red-800 font-semibold mb-2">Error</h2>
          <p className="text-red-600">{error || 'Trip not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push('/')}
          className="text-primary-600 hover:text-primary-800 font-medium"
        >
          ← Back to Dashboard
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={() => downloadCSV(trip)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Download CSV
          </button>
          <span
            className={`px-3 py-1 text-sm font-semibold rounded-full ${
              trip.status === 'COMPLETED'
                ? 'bg-green-100 text-green-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}
          >
            {trip.status}
          </span>
        </div>
      </div>

      {/* Trip Info */}
      <div className="card">
        <h1 className="text-2xl font-bold mb-6">Trip Details</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Trip ID</h3>
            <p className="text-lg font-semibold">{trip.id}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Driver</h3>
            <p className="text-lg font-semibold">{trip.driverName}</p>
            <p className="text-sm text-gray-600">{trip.driverEmail}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Start Time</h3>
            <p className="text-lg">{formatDate(trip.startTime)}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">End Time</h3>
            <p className="text-lg">
              {trip.endTime ? formatDate(trip.endTime) : 'In Progress'}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Duration</h3>
            <p className="text-lg font-semibold text-primary-600">
              {calculateDuration(trip.startTime, trip.endTime)}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Total Distance</h3>
            <p className="text-lg font-semibold text-primary-600">
              {trip.totalDistance.toFixed(2)} km
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Route Points</h3>
            <p className="text-lg">{trip.routePoints.length} points</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Average Speed</h3>
            <p className="text-lg">{calculateAverageSpeed()}</p>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4">Route Map</h2>
        {trip.routePoints.length > 0 ? (
          <TripMap routePoints={trip.routePoints} />
        ) : (
          <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
            <p className="text-gray-500">No route data available</p>
          </div>
        )}
      </div>

      {/* Route Points Table */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4">Route Points</h2>
        <div className="overflow-x-auto max-h-96">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Latitude
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Longitude
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Accuracy (m)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Speed (km/h)
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {trip.routePoints.map((point, index) => {
                const speed = calculateSpeed(index);
                return (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(new Date(point.timestamp), 'HH:mm:ss')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {point.latitude.toFixed(6)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {point.longitude.toFixed(6)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {point.accuracy.toFixed(1)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {speed.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TripDetailsWithAuth() {
  return (
    <ProtectedRoute>
      <TripDetailsPage />
    </ProtectedRoute>
  );
}

export default TripDetailsWithAuth;
