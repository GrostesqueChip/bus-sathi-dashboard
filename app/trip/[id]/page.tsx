'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Trip } from '@/types/trip';
import { TripService } from '@/services/tripService';
import { format } from 'date-fns';
import ProtectedRoute from '@/components/ProtectedRoute';
import { downloadCSV } from '@/utils/csvExport';

// Math helper for moving/idle time
const getMovingRatio = (points: any[]) => {
  if (!points || points.length < 2) return 1; 
  
  let movingCount = 0;
  let validComparisons = 0;

  for (let i = 1; i < points.length; i++) {
    const p1 = points[i - 1];
    const p2 = points[i];

    const lat1 = Number(p1.lat || p1.latitude);
    const lon1 = Number(p1.lng || p1.longitude);
    const lat2 = Number(p2.lat || p2.latitude);
    const lon2 = Number(p2.lng || p2.longitude);

    if (lat1 && lon1 && lat2 && lon2 && !isNaN(lat1)) {
       validComparisons++;
       
       const R = 6371e3; 
       const dLat = (lat2 - lat1) * Math.PI / 180;
       const dLon = (lon2 - lon1) * Math.PI / 180;
       const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                 Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                 Math.sin(dLon/2) * Math.sin(dLon/2);
       const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
       const distanceMeters = R * c;

       if (distanceMeters > 3) {
         movingCount++;
       }
    }
  }
  return validComparisons > 0 ? (movingCount / validComparisons) : 1;
};

// Dynamically import map component
const TripMap = dynamic(() => import('@/components/TripMap'), {
  ssr: false,
  loading: () => (
    <div className="h-96 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="text-gray-400 font-bold tracking-widest uppercase text-xs">Loading Map...</p>
      </div>
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
      return format(new Date(timestamp), 'MMM dd, yyyy hh:mm a'); // Changed to 12-hour format with AM/PM for easier reading
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
    
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    return `${minutes}m ${seconds}s`;
  };

  const calculateSpeed = (index: number): number => {
    if (!trip || index === 0) return 0;
    
    const currentPoint = trip.routePoints[index];
    const prevPoint = trip.routePoints[index - 1];
    
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
    const distanceKm = R * c;
    
    const timeDiffSeconds = (currentPoint.timestamp - prevPoint.timestamp) / 1000;
    if (timeDiffSeconds > 0) {
      return (distanceKm / timeDiffSeconds) * 3600;
    }
    return 0;
  };

  const toRadians = (degrees: number): number => degrees * (Math.PI / 180);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
        <p className="text-gray-500 font-bold tracking-widest uppercase text-sm">Loading Trip Data...</p>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="space-y-4 max-w-7xl mx-auto">
        <button onClick={() => router.push('/')} className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-2">
          ← Back to Dashboard
        </button>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
          <span className="text-4xl mb-3 block">⚠️</span>
          <h2 className="text-red-800 font-black text-xl mb-2">Record Not Found</h2>
          <p className="text-red-600 font-medium">{error || 'This trip data may have been deleted or is unavailable.'}</p>
        </div>
      </div>
    );
  }

  // --- MATH CALCULATIONS ---
  const durationMs = trip.endTime ? (trip.endTime - trip.startTime) : 0;
  const ratio = getMovingRatio(trip.routePoints || []);
  const movingMs = durationMs * ratio;
  const idleMs = durationMs * (1 - ratio);

  const durationHours = durationMs / 3600000;
  const movingHours = movingMs / 3600000;

  // Calculate Overall vs Moving Speed
  const journeySpeed = durationHours > 0 ? (trip.totalDistance / durationHours) : 0;
  const movingSpeed = movingHours > 0 ? (trip.totalDistance / movingHours) : 0;

  const formatMs = (ms: number) => {
    const m = Math.floor(ms / 60000);
    const hrs = Math.floor(m / 60);
    const mins = m % 60;
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  return (
    <div className="space-y-8 pb-12 max-w-7xl mx-auto">
      
      {/* Top Report Header with Logos */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-gray-200">
        <div className="flex items-center gap-6">
          <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-blue-600 transition-colors">
            ←
          </button>
          <div className="flex items-center gap-4 border-l border-gray-200 pl-6">
            <img src="/logo-transparent.png" alt="Bus Sathi" className="h-10 w-auto object-contain" />
            <div className="w-px h-6 bg-gray-300"></div>
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Powered By</span>
              <img src="/karroh.png" alt="Karroh" className="h-4 w-auto object-contain opacity-75 grayscale" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <button
            onClick={() => downloadCSV(trip)}
            className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold transition-colors shadow-sm flex items-center justify-center gap-2 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download CSV
          </button>
          <span className={`px-4 py-2 text-xs font-black rounded-xl uppercase tracking-widest border ${
              trip.status === 'COMPLETED' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'
            }`}
          >
            {trip.status}
          </span>
        </div>
      </div>

      {/* Report Title Section */}
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Trip Details Report</h1>
        <p className="text-gray-500 font-medium text-sm mt-1">Reviewing full details for this specific journey.</p>
      </div>

      {/* Simple Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* 1. Driver Details */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-black text-2xl">
                {trip.driverName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Driver Details</p>
                <h3 className="text-xl font-black text-gray-900 leading-tight">{trip.driverName}</h3>
                <p className="text-sm text-gray-500">{trip.driverEmail}</p>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Trip Reference ID</p>
            <p className="text-xs font-mono text-gray-500 bg-gray-50 px-2 py-1 rounded inline-block">{trip.id}</p>
          </div>
        </div>

        {/* 2. Time Info */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Time Info</p>
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <span className="text-sm font-semibold text-gray-500">Started At</span>
              <span className="text-sm font-bold text-gray-900">{formatDate(trip.startTime)}</span>
            </div>
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <span className="text-sm font-semibold text-gray-500">Ended At</span>
              <span className="text-sm font-bold text-gray-900">{trip.endTime ? formatDate(trip.endTime) : 'Currently Active'}</span>
            </div>
            <div className="flex justify-between items-center pt-1">
              <span className="text-sm font-bold text-blue-600 uppercase tracking-wider">Total Time</span>
              <span className="text-lg font-black text-blue-600">{calculateDuration(trip.startTime, trip.endTime)}</span>
            </div>
          </div>
        </div>

        {/* 3. Distance & Speeds */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Distance & Speeds</p>
          
          <div className="mb-4 pb-4 border-b border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Distance</p>
            <p className="text-2xl font-black text-gray-900">{trip.totalDistance.toFixed(2)} <span className="text-sm text-gray-500">km</span></p>
          </div>

          <div className="grid grid-cols-2 gap-y-4 gap-x-2">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Overall Avg Speed</p>
              <p className="text-base font-bold text-gray-900">{journeySpeed.toFixed(1)} <span className="text-xs text-gray-500 font-normal">km/h</span></p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Moving Avg Speed</p>
              <p className="text-base font-bold text-blue-600">{movingSpeed.toFixed(1)} <span className="text-xs text-blue-400 font-normal">km/h</span></p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Moving Time</p>
              <p className="text-sm font-bold text-green-700 bg-green-50 px-2 py-1 rounded-lg w-max border border-green-100">{formatMs(movingMs)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Idle Time</p>
              <p className="text-sm font-bold text-orange-700 bg-orange-50 px-2 py-1 rounded-lg w-max border border-orange-100">{formatMs(idleMs)}</p>
            </div>
          </div>
        </div>

      </div>

      {/* Map Section */}
      <div className="bg-white p-2 rounded-3xl shadow-sm border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center mb-2">
          <h2 className="text-sm font-black text-gray-800 uppercase tracking-widest">Route Map</h2>
        </div>
        <div className="rounded-2xl overflow-hidden border border-gray-100">
          {trip.routePoints.length > 0 ? (
            <TripMap routePoints={trip.routePoints} />
          ) : (
            <div className="h-96 bg-gray-50 flex items-center justify-center">
              <p className="text-gray-400 font-bold tracking-widest uppercase">No Location Data Available</p>
            </div>
          )}
        </div>
      </div>

      {/* Location History Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <h2 className="text-sm font-black text-gray-800 uppercase tracking-widest">Location History</h2>
          <span className="px-3 py-1 bg-gray-200 text-gray-700 text-xs font-bold rounded-full">
            {trip.routePoints.length} Pings
          </span>
        </div>
        
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-black text-gray-400 uppercase tracking-widest">S.No.</th>
                <th className="px-6 py-3 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Time</th>
                <th className="px-6 py-3 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Location (Lat, Lng)</th>
                <th className="px-6 py-3 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Accuracy</th>
                <th className="px-6 py-3 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Speed</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {trip.routePoints.map((point, index) => {
                const speed = calculateSpeed(index);
                return (
                  <tr key={index} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-6 py-3 whitespace-nowrap text-sm font-bold text-gray-400">
                      {String(index + 1).padStart(3, '0')}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm font-bold text-gray-900">
                      {format(new Date(point.timestamp), 'hh:mm:ss a')}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm font-mono text-gray-500">
                      {point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500 font-medium">
                      ±{point.accuracy.toFixed(1)}m
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-md text-xs font-bold ${speed > 2 ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                        {speed.toFixed(1)} km/h
                      </span>
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