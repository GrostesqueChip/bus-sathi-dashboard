'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Trip } from '@/types/trip';
import { TripService } from '@/services/tripService';
import { format } from 'date-fns';
import ProtectedRoute from '@/components/ProtectedRoute';
import { downloadMultipleTripsAsZip } from '@/utils/csvExport';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Helper for moving/idle time
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

function TripLogs() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDriver, setFilterDriver] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterRegion, setFilterRegion] = useState('all');
  const [filterType, setFilterType] = useState('all');
  
  const [isDownloading, setIsDownloading] = useState(false);
  const [driverCapacities, setDriverCapacities] = useState<Record<string, string>>({});
  const [driverRegions, setDriverRegions] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchEverything = async () => {
      try {
        setLoading(true);
        const tripsData = await TripService.getAllTrips();
        setTrips(tripsData);

        const querySnapshot = await getDocs(collection(db, "drivers"));
        const capacityMap: Record<string, string> = {};
        const regionMap: Record<string, string> = {};
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const capacity = data.vehicleCapacity || 'Unknown';
          const rawRegion = data.region || 'Unknown';
          const finalRegion = rawRegion.toLowerCase().includes('srinagar') ? 'Kashmir' : rawRegion;

          capacityMap[doc.id] = capacity;
          regionMap[doc.id] = finalRegion; 
          
          if (data.name) {
            const cleanName = data.name.toString().toLowerCase().trim();
            capacityMap[cleanName] = capacity;
            regionMap[cleanName] = finalRegion; 
          }
        });
        setDriverCapacities(capacityMap);
        setDriverRegions(regionMap); 
      } catch (err) {
        setError('Failed to load trips data.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchEverything();
  }, []);

  const formatDate = (timestamp: number) => {
    try {
      return format(new Date(timestamp), 'MMM dd, yyyy HH:mm');
    } catch {
      return 'Invalid date';
    }
  };

  const calculateTripTimes = (trip: Trip) => {
    const durationMs = trip.endTime ? (trip.endTime - trip.startTime) : 0;
    if (durationMs <= 0 || !trip.routePoints || trip.routePoints.length === 0) {
      return { moving: 'N/A', idle: 'N/A' };
    }
    const ratio = getMovingRatio(trip.routePoints);
    const formatMs = (ms: number) => {
      const m = Math.floor(ms / 60000);
      const hrs = Math.floor(m / 60);
      const mins = m % 60;
      return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
    };
    return {
      moving: formatMs(durationMs * ratio),
      idle: formatMs(durationMs * (1 - ratio))
    };
  };

  const calculateDuration = (startTime: number, endTime: number | null) => {
    if (!endTime) return 'N/A';
    const durationMs = endTime - startTime;
    const minutes = Math.floor(durationMs / 60000);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours > 0) return `${hours}h ${remainingMinutes}m`;
    return `${minutes}m`;
  };

  // 1. Filter out completely invalid/empty trips
  const validTrips = trips.filter(trip => {
    if (!trip.routePoints || trip.routePoints.length < 2) return false;
    const durationMs = trip.endTime ? (trip.endTime - trip.startTime) : 0;
    if (trip.totalDistance < 0.1 && durationMs < 120000) return false;
    return true; 
  });

  // 2. Apply user filters
  const filteredTrips = validTrips.filter(trip => {
    const matchesSearch = 
      trip.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trip.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trip.driverEmail.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDriver = filterDriver === 'all' || trip.driverId === filterDriver;
    
    let matchesDateRange = true;
    if (startDate) {
      const startTimestamp = new Date(startDate).getTime();
      matchesDateRange = matchesDateRange && trip.startTime >= startTimestamp;
    }
    if (endDate) {
      const endTimestamp = new Date(endDate).setHours(23, 59, 59, 999);
      matchesDateRange = matchesDateRange && trip.startTime <= endTimestamp;
    }

    let driverCapacity = driverCapacities[trip.driverId];
    if (!driverCapacity) {
       const cleanName = trip.driverName.toLowerCase().trim();
       driverCapacity = driverCapacities[cleanName];
    }
    const matchesType = filterType === 'all' || (driverCapacity || '') === filterType;
    
    let driverRegion = driverRegions[trip.driverId];
    if (!driverRegion) {
       const cleanName = trip.driverName.toLowerCase().trim();
       driverRegion = driverRegions[cleanName];
    }
    const matchesRegion = filterRegion === 'all' || (driverRegion || 'Unknown') === filterRegion;

    return matchesSearch && matchesDriver && matchesDateRange && matchesType && matchesRegion;
  });

  const handleDownloadFiltered = async () => {
    if (filteredTrips.length === 0) {
      alert('No trips to download');
      return;
    }
    setIsDownloading(true);
    try {
      await downloadMultipleTripsAsZip(filteredTrips);
    } catch (error) {
      console.error('Error downloading trips:', error);
      alert('Failed to download trips. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const uniqueDrivers = Array.from(new Set(trips.map(t => t.driverId)))
    .map(id => trips.find(t => t.driverId === id))
    .filter(Boolean) as Trip[];

  // Lifetime Stats Calculations
  const lifetimeTrips = validTrips.length;
  const lifetimeDistance = validTrips.reduce((acc, trip) => acc + (trip.totalDistance || 0), 0);
  const lifetimeHours = validTrips.reduce((acc, trip) => acc + (trip.endTime ? (trip.endTime - trip.startTime) : 0), 0) / 3600000;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
        <p className="text-gray-500 font-bold tracking-widest uppercase text-sm">Syncing Fleet Logs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 max-w-7xl mx-auto">
      
      {/* Header with Lifetime Stats */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 border-b border-gray-200 pb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">Data & Trip Logs</h1>
          <p className="text-base text-gray-500 font-medium mt-2 max-w-2xl">
            Detailed tracking console. Filter, review, and export route data for rationalization reporting.
          </p>
        </div>
        
        {/* NEW: Lifetime Aggregates Widget */}
        <div className="flex gap-4 items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-200 w-full lg:w-auto">
          <div className="text-right border-r border-gray-100 pr-4 flex-1 lg:flex-none">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Trips</p>
            <p className="text-2xl font-black text-blue-600">{lifetimeTrips}</p>
          </div>
          <div className="text-right border-r border-gray-100 pr-4 flex-1 lg:flex-none">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Distance</p>
            <p className="text-2xl font-black text-emerald-600">{lifetimeDistance.toFixed(0)} <span className="text-sm font-bold text-gray-400">km</span></p>
          </div>
          <div className="text-right flex-1 lg:flex-none">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Time Logged</p>
            <p className="text-2xl font-black text-orange-500">{lifetimeHours.toFixed(0)} <span className="text-sm font-bold text-gray-400">hrs</span></p>
          </div>
        </div>
      </div>

      {/* The Filter Console */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>
        
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
            <span>⚙️</span> Filter Console
          </h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Search Records</label>
            <input
              type="text"
              placeholder="Search ID, driver, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 shadow-inner text-sm transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Select Driver</label>
            <select
              value={filterDriver}
              onChange={(e) => setFilterDriver(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 shadow-inner text-sm font-medium transition-all"
            >
              <option value="all">All Fleet Drivers</option>
              {uniqueDrivers.map((driver) => (
                <option key={driver.driverId} value={driver.driverId}>
                  {driver.driverName || driver.driverEmail}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Vehicle Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 shadow-inner text-sm font-medium transition-all"
            >
              <option value="all">All Types</option>
              <option value="32 to 52 seater (HPV)">32 to 52 seater (HPV)</option>
              <option value="17 to 21 seater (MPV)">17 to 21 seater (MPV)</option>
              <option value="5 to 13 seater (LPV)">5 to 13 seater (LPV)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Region</label>
            <select
              value={filterRegion}
              onChange={(e) => setFilterRegion(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 shadow-inner text-sm font-medium transition-all"
            >
              <option value="all">All J&K</option>
              <option value="Jammu">Jammu</option>
              <option value="Kashmir">Kashmir</option>
            </select>
          </div>
        </div>
        
        {/* Date Filters & Export Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 items-end pt-6 border-t border-gray-100">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">From Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-gray-50 shadow-inner text-sm transition-all" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">To Date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-gray-50 shadow-inner text-sm transition-all" />
          </div>
          <div className="flex gap-3 h-[46px]">
            <button onClick={() => { setSearchTerm(''); setFilterDriver('all'); setStartDate(''); setEndDate(''); setFilterRegion('all'); setFilterType('all'); }} className="px-6 py-2 border border-gray-300 bg-white rounded-xl hover:bg-gray-50 font-bold text-gray-700 transition-colors shadow-sm text-sm">
              Reset
            </button>
            <button onClick={handleDownloadFiltered} disabled={filteredTrips.length === 0 || isDownloading} className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-sm text-sm disabled:opacity-50">
              {isDownloading ? 'Exporting...' : `Export Excel (${filteredTrips.length})`}
            </button>
          </div>
        </div>
      </div>

      {/* The Data Grid */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <h2 className="text-lg font-black text-gray-900">System Logs</h2>
          <span className="px-4 py-1.5 bg-blue-100 text-blue-800 text-xs font-black rounded-full uppercase tracking-wider">
            {filteredTrips.length} Records Found
          </span>
        </div>
        
        {filteredTrips.length === 0 ? (
          <div className="text-center py-20">
            <span className="text-5xl mb-4 block">📭</span>
            <p className="text-gray-500 font-bold text-lg">No trips match your current filters.</p>
            <p className="text-gray-400 text-sm mt-2">Try adjusting the date range or region.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-white">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest">S.No.</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Driver / ID</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Start Time</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Duration</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Moving</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Idle</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Distance</th>
                  <th className="px-6 py-4 text-center text-xs font-black text-gray-400 uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredTrips.map((trip, index) => {
                  const times = calculateTripTimes(trip);
                  return (
                    <tr key={trip.id} className="hover:bg-blue-50/50 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-400">
                        {/* Formats the serial number to always have at least 2 digits (e.g., 01, 02) */}
                        {String(index + 1).padStart(2, '0')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-black text-sm">
                            {trip.driverName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 text-sm">{trip.driverName}</div>
                            <div className="text-gray-400 text-xs font-mono">{trip.id.substring(0, 8)}...</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                        {formatDate(trip.startTime)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-bold rounded-lg border border-gray-200">
                          {calculateDuration(trip.startTime, trip.endTime)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-3 py-1.5 bg-green-100 text-green-700 border border-green-200 text-xs font-bold rounded-full flex items-center gap-2 w-max shadow-sm">
                          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                          {times.moving}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-3 py-1.5 bg-orange-100 text-orange-700 border border-orange-200 text-xs font-bold rounded-full w-max inline-block shadow-sm">
                          {times.idle}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-blue-600">
                        {trip.totalDistance.toFixed(2)} <span className="text-gray-400 font-medium text-xs ml-1">km</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <div className="flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link href={`/trip/${trip.id}`} className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl transition-colors font-bold shadow-sm inline-flex items-center gap-2">
                            View Route <span className="text-lg">🗺️</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TripLogsPage() {
  return (
    <ProtectedRoute>
      <TripLogs />
    </ProtectedRoute>
  );
}