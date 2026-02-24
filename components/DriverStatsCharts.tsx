'use client';

import { Trip } from '@/types/trip';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase'; 
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
interface DriverStatsChartsProps {
  trips: Trip[];
  topN?: number;
  driverCapacities?: Record<string, string>;
}
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
interface DriverStats {
  driverId: string;
  driverName: string;
  totalTrips: number;
  totalDistance: number;
  averageDistance: number;
  averageSpeed: number;
  totalIdleTimeMs: number; 
  totalDurationMs: number;   // <--- ADD THIS
  totalMovingTimeMs: number;
}

const COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
  '#6366f1', // indigo
  '#06b6d4', // cyan
];
export default function DriverStatsCharts({ trips, topN = 10, driverCapacities }: DriverStatsChartsProps) {
  // Calculate driver statistics
  const driverStatsMap = new Map<string, DriverStats>();

  trips.forEach((trip) => {
    const existing = driverStatsMap.get(trip.driverId);
    
// NEW LOGIC: Calculate Average Moving Speed (Filters out stops)
    let tripSpeed = 0;
    let tripIdleMs = 0;
    let tripMovingMs = 0;
    const durationMs = (trip.endTime && trip.endTime > trip.startTime) ? (trip.endTime - trip.startTime) : 0;
    if (durationMs > 0) {
       // Use our new math
       if (trip.routePoints && trip.routePoints.length > 0) {
          const ratio = getMovingRatio(trip.routePoints);
          tripMovingMs = durationMs * ratio;
          tripIdleMs = durationMs * (1 - ratio);
       } else {
          tripMovingMs = durationMs; // fallback
       }

       const durationHours = durationMs / 3600000;
       tripSpeed = durationHours > 0 ? (trip.totalDistance / durationHours) : 0;
    }

    if (existing) {
      existing.totalTrips += 1;
      existing.totalDistance += trip.totalDistance;
      existing.averageDistance = existing.totalDistance / existing.totalTrips;
      existing.averageSpeed = (existing.averageSpeed * (existing.totalTrips - 1) + tripSpeed) / existing.totalTrips;
      existing.totalIdleTimeMs += tripIdleMs;     // <--- NEW
      existing.totalMovingTimeMs += tripMovingMs;
    } else {
      driverStatsMap.set(trip.driverId, {
        driverName: trip.driverName,
        driverId: trip.driverId,
        totalTrips: 1,
        totalDistance: trip.totalDistance,
        averageDistance: trip.totalDistance,
        averageSpeed: tripSpeed,
        totalIdleTimeMs: tripIdleMs,     // <--- NEW
        totalMovingTimeMs: tripMovingMs,
        totalDurationMs: durationMs, //<--- NEW
      
      });
    }
  });

  // Helper to format milliseconds to "Xh Ym" for the table
  const formatMs = (ms: number) => {
    if (!ms || ms <= 0) return '0m';
    const totalMins = Math.floor(ms / 60000);
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };
  // Convert to array and sort
  const allDriverStats = Array.from(driverStatsMap.values());
  
  // Get top N drivers by total distance
  const topDriversByDistance = [...allDriverStats]
    .sort((a, b) => b.totalDistance - a.totalDistance)
    .slice(0, topN);

  // Get top N drivers by number of trips
  const topDriversByTrips = [...allDriverStats]
    .sort((a, b) => b.totalTrips - a.totalTrips)
    .slice(0, topN);

  // Get top N drivers by average speed
  const topDriversBySpeed = [...allDriverStats]
    .filter((d) => d.averageSpeed > 0)
    .sort((a, b) => b.averageSpeed - a.averageSpeed)
    .slice(0, topN);

  // Prepare data for pie chart (total trips distribution)
  const pieData = topDriversByTrips.map((driver) => ({
    name: driver.driverName,
    value: driver.totalTrips,
  }));

// NEW: Deletes trips for ANY specific driver
  const handleDeleteDriverTrips = async (driverId: string, driverName: string) => {
    const confirm = window.confirm(`⚠️ Are you sure you want to delete ALL trip data for "${driverName}"? This cannot be undone.`);
    if (!confirm) return;

    try {
      // Find trips belonging to this specific ID
      const q = query(collection(db, 'trips'), where('driverId', '==', driverId));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) return alert("No trip data found for this driver!");

      const batch = writeBatch(db);
      snapshot.docs.forEach((d) => batch.delete(doc(db, 'trips', d.id)));
      await batch.commit();

      alert(`✅ All trip data for ${driverName} has been deleted.`);
      window.location.reload(); 
    } catch (err) {
      console.error(err);
      alert("Error: Check your permissions or Firebase connection.");
    }
  };
  // Function to generate the PDF
  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    doc.text("Bus Sathi - Driver Performance Report", 14, 15);
    
    const rows = topDriversByDistance.map((d, i) => [
      i + 1, d.driverName, d.totalTrips, `${d.totalDistance.toFixed(2)} km`, `${d.averageSpeed.toFixed(2)} km/h`
    ]);

    autoTable(doc, {
      head: [['Rank', 'Driver', 'Trips', 'Distance', 'Avg Speed']],
      body: rows,
      startY: 25,
    });

    doc.save("Bus-Sathi-Report.pdf");
  };

  if (trips.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        No trip data available for charts
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Charts - Distance and Trip Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Drivers by Total Distance */}
        <div className="card lg:col-span-2">
          <h2 className="text-xl font-bold mb-4">Top {topN} Drivers by Total Distance</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topDriversByDistance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="driverName" 
                angle={-45} 
                textAnchor="end" 
                height={100}
                interval={0}
              />
              <YAxis label={{ value: 'Distance (km)', angle: -90, position: 'insideLeft' }} />
              <Tooltip 
                formatter={(value: number | undefined) => value ? [`${value.toFixed(2)} km`, 'Total Distance'] : ['0 km', 'Total Distance']}
              />
              <Legend />
              <Bar dataKey="totalDistance" fill="#3b82f6" name="Total Distance (km)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Trip Distribution Pie Chart */}
        <div className="card lg:col-span-1">
          <h2 className="text-xl font-bold mb-4">Trip Distribution (Top {topN})</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${percent ? (percent * 100).toFixed(0) : 0}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number | undefined) => value ? [`${value} trips`, 'Total Trips'] : ['0 trips', 'Total Trips']} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Driver Statistics Table */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4">Driver Performance Summary</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Driver Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Total Trips
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Total Distance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Avg Distance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Avg Speed
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Total Moving
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Total Idle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Vehicle Type
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {topDriversByDistance.map((driver, index) => (
                <tr key={driver.driverName} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {index + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {driver.driverName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {driver.totalTrips}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {driver.totalDistance.toFixed(2)} km
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {driver.averageDistance.toFixed(2)} km
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {driver.averageSpeed > 0 ? `${driver.averageSpeed.toFixed(2)} km/h` : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                  {formatMs(driver.totalMovingTimeMs)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                    {formatMs(driver.totalIdleTimeMs)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {(() => {
                      if (!driverCapacities) return 'Loading...';
                      
                      // 1. Try matching by Driver ID
                      if (driverCapacities[driver.driverId]) {
                        return driverCapacities[driver.driverId];
                      }

                      // 2. Try matching by Name (Cleaned up)
                      const cleanName = driver.driverName.toLowerCase().trim();
                      if (driverCapacities[cleanName]) {
                        return driverCapacities[cleanName];
                      }

                      return 'N/A';
                    })()}
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
