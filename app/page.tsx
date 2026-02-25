'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Trip } from '@/types/trip';
import { TripService } from '@/services/tripService';
import { format } from 'date-fns';
import ProtectedRoute from '@/components/ProtectedRoute';
import DriverStatsCharts from '@/components/DriverStatsCharts';
import { downloadMultipleTripsAsZip } from '@/utils/csvExport';
import { doc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Paste this near the top of both files (under imports)
const getMovingRatio = (points: any[]) => {
  if (!points || points.length < 2) return 1; 
  
  let movingCount = 0;
  let validComparisons = 0;

  for (let i = 1; i < points.length; i++) {
    const p1 = points[i - 1];
    const p2 = points[i];

    // Force values to be numbers in case Firebase saved them as strings
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

       // Dropped threshold to 3 meters to catch slow traffic creeping
       if (distanceMeters > 3) {
         movingCount++;
       }
    }
  }
  
  return validComparisons > 0 ? (movingCount / validComparisons) : 1;
};
// ---------------------------------------------------------
function Home() {
  const handleDeleteTrip = async (tripId: string) => {
    const confirm = window.confirm("🗑️ Are you sure you want to delete this trip record?");
    if (!confirm) return;

    try {
      await deleteDoc(doc(db, "trips", tripId));
      alert("Trip deleted successfully.");
      window.location.reload(); // Refresh the list
    } catch (error) {
      console.error("Error deleting trip:", error);
      alert("Error: You might not have permission.");
    }
  };
  const [driverRegions, setDriverRegions] = useState<Record<string, string>>({});
  const [filterRegion, setFilterRegion] = useState('all');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalTrips: 0,
    totalDistance: 0,
    averageDistance: 0,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDriver, setFilterDriver] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [driverCapacities, setDriverCapacities] = useState<Record<string, string>>({});
  const [totalRegisteredDrivers, setTotalRegisteredDrivers] = useState(0);
  const [activeYesterday, setActiveYesterday] = useState<string[]>([]);
  useEffect(() => {
    loadTrips();
    loadStats();
    loadDriverDetails();
  }, []);
  useEffect(() => {
    if (trips.length === 0) return;

    // 1. Figure out exact timestamps for "Yesterday"
    const now = new Date();
    const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).getTime();
    const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - 1;

    // 2. Filter trips that happened yesterday
    const yesterdayTrips = trips.filter(
      (trip) => trip.startTime >= startOfYesterday && trip.startTime <= endOfYesterday
    );

    // 3. Extract unique driver names
    const uniqueDrivers = Array.from(new Set(yesterdayTrips.map((t) => t.driverName || t.driverEmail)));
    setActiveYesterday(uniqueDrivers);
  }, [trips]);
  // -----------------------------------------
  // ADD THIS FUNCTION:
const loadDriverDetails = async () => {
    try {
      console.log("🚀 Starting to fetch driver details...");
      const querySnapshot = await getDocs(collection(db, "drivers"));
      setTotalRegisteredDrivers(querySnapshot.size);
      const capacityMap: Record<string, string> = {};
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const capacity = data.vehicleCapacity || 'Unknown';
        
        // Debugging Log: Check your browser console (F12) to see these!
        console.log(`Found Driver: ${data.name} | ID: ${doc.id} | Capacity: ${capacity}`);

        // 1. Map ID -> Capacity
        capacityMap[doc.id] = capacity;
        
        // 2. Map Clean Name -> Capacity (Lowercase & Trimmed)
        if (data.name) {
          const cleanName = data.name.toString().toLowerCase().trim();
          capacityMap[cleanName] = capacity;
        }
      });
      
      console.log("✅ Final Capacity Map:", capacityMap);
      setDriverCapacities(capacityMap);
    } catch (err) {
      console.error("❌ Error loading drivers:", err);
    }
  };

  const loadTrips = async () => {
    try {
      setLoading(true);
      const data = await TripService.getAllTrips();
      setTrips(data);
      setError(null);
    } catch (err) {
      setError('Failed to load trips. Please check your Firebase configuration.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await TripService.getTripStats();
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

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
    
    // Use our new ultra-accurate math
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
    
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes}m`;
  };
  // --- MY GHOST TRIP LOGIC ---
  const validTrips = trips.filter(trip => {
    // 1. Must have at least 2 points to calculate anything
    if (!trip.routePoints || trip.routePoints.length < 2) return false;
    
    // 2. If distance is under 100 meters AND duration is under 2 minutes, it's a glitch/accidental tap
    const durationMs = trip.endTime ? (trip.endTime - trip.startTime) : 0;
    if (trip.totalDistance < 0.1 && durationMs < 120000) return false;

    return true; // It's a real trip!
  });

  // Now we run your search filters ONLY on the valid trips
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
    
    return matchesSearch && matchesDriver && matchesDateRange && matchesType;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading trips...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h2 className="text-red-800 font-semibold mb-2">Error Loading Data</h2>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
        
        {/* NEW CARD 1: Registered Drivers */}
        <div className="card bg-gray-50 border border-gray-100">
          <h3 className="text-gray-600 text-sm font-medium mb-2">Registered Drivers</h3>
          <p className="text-3xl font-bold text-gray-800">{totalRegisteredDrivers}</p>
        </div>

      {/* NEW CARD 2: Active Yesterday (Clickable Link) */}
        <Link 
          href="/active-drivers" 
          className="card bg-blue-50 border border-blue-100 hover:bg-blue-100 transition-colors block cursor-pointer group"
        >
          <div className="flex justify-between items-start">
            <h3 className="text-blue-800 text-sm font-medium mb-2">Active Yesterday</h3>
            <span className="text-blue-500 text-xs flex items-center gap-1 font-medium group-hover:text-blue-700 transition-colors">
              View All
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </div>
          <p className="text-3xl font-bold text-blue-600">{activeYesterday.length}</p>
        </Link>

        {/* Existing Card 1 */}
        <div className="card">
          <h3 className="text-gray-600 text-sm font-medium mb-2">Total Trips</h3>
          <p className="text-3xl font-bold text-primary-600">{stats.totalTrips}</p>
        </div>
        
        {/* Existing Card 2 */}
        <div className="card">
          <h3 className="text-gray-600 text-sm font-medium mb-2">Total Distance</h3>
          <p className="text-3xl font-bold text-primary-600">
            {stats.totalDistance.toFixed(2)} km
          </p>
        </div>
        
        {/* Existing Card 3 */}
        <div className="card">
          <h3 className="text-gray-600 text-sm font-medium mb-2">Avg Distance</h3>
          <p className="text-3xl font-bold text-primary-600">
            {stats.averageDistance.toFixed(2)} km
          </p>
        </div>
      </div>  

    {/* Driver Statistics Charts */}
          {/* UPDATE THIS LINE: */}
          {trips.length > 0 && (
            <DriverStatsCharts 
              trips={validTrips} 
              topN={10} 
              driverCapacities={driverCapacities} // <--- Pass the data here
            />
          )}

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Trips
              </label>
              <input
                type="text"
                placeholder="Search by ID, driver name, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div className="md:w-64">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Driver
              </label>
              <select
                value={filterDriver}
                onChange={(e) => setFilterDriver(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All Drivers</option>
                {uniqueDrivers.map((driver) => (
                  <option key={driver.driverId} value={driver.driverId}>
                    {driver.driverName || driver.driverEmail}
                  </option>
                ))}
              </select>
            </div>
            {/* New Filter: Vehicle Type */}
            <div className="md:w-64">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Vehicle Type
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All Vehicle Types</option>
                <option value="32 to 52 seater (HPV)">32 to 52 seater (HPV)</option>
                <option value="17 to 21 seater (MPV)">17 to 21 seater (MPV)</option>
                <option value="5 to 13 seater (LPV)">5 to 13 seater (LPV)</option>
              </select>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterDriver('all');
                  setStartDate('');
                  setEndDate('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors whitespace-nowrap"
              >
                Clear Filters
              </button>
              <button
                onClick={handleDownloadFiltered}
                disabled={filteredTrips.length === 0 || isDownloading}
                className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {isDownloading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Downloading...
                  </>
                ) : (
                  <>
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
                    Download Filtered ({filteredTrips.length})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Trips Table */}
      <div className="card">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
  <h2 className="text-xl font-bold text-gray-800">Recent Trips</h2>
  
  <Link 
    href="/map-visualizer" 
    className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-medium transition-all shadow-sm active:scale-95"
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
        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" 
      />
    </svg>
    View Map (God Mode)
  </Link>
</div>
        {filteredTrips.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No trips found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trip ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Driver
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Start Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Moving Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Idle Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Distance
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTrips.map((trip) => {
                  const times = calculateTripTimes(trip);
                  return ( //
                  <tr key={trip.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {trip.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div className="font-medium">{trip.driverName}</div>
                        <div className="text-gray-500 text-xs">{trip.driverEmail}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(trip.startTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {calculateDuration(trip.startTime, trip.endTime)}
                    </td>
                    {/* --- PASTE THESE TWO NEW CELLS HERE --- */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                      {times.moving}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-500 font-medium">
                      {times.idle}
                    </td>
                    {/* -------------------------------------- */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {trip.totalDistance.toFixed(2)} km
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-4">
                   <Link
                     href={`/trip/${trip.id}`}
                     className="text-blue-600 hover:text-blue-900 font-medium"
                      >
                      View Details
                      </Link>
  
                      <button
                      onClick={() => handleDeleteTrip(trip.id)}
                      className="text-red-600 hover:text-red-900 font-medium"
                      >
                     Delete
                    </button>
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

function HomeWithAuth() {
  return (
    <ProtectedRoute>
      <Home />
    </ProtectedRoute>
  );
}

export default HomeWithAuth;
