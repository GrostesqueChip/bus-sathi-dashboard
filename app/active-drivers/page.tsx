'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import ProtectedRoute from '@/components/ProtectedRoute';

// Interface for our table data
interface ActiveDriver {
  driverId: string;
  driverName: string;
  driverEmail: string;
  tripsYesterday: number;
  distanceYesterday: number;
}

function ActiveDriversPage() {
  const [activeDrivers, setActiveDrivers] = useState<ActiveDriver[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActiveDrivers = async () => {
      try {
        setLoading(true);

        // 1. Calculate timestamps for "Yesterday"
        const now = new Date();
        const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).getTime();
        const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - 1;

        // 2. Fetch all trips from Firebase (We could optimize this with a query later, but this works perfectly for now)
        const tripsSnapshot = await getDocs(collection(db, 'trips'));
        
        const driverStatsMap = new Map<string, ActiveDriver>();

        // 3. Loop through trips and only count the ones from yesterday
        tripsSnapshot.forEach((doc) => {
          const trip = doc.data();
          
          if (trip.startTime >= startOfYesterday && trip.startTime <= endOfYesterday) {
            const existing = driverStatsMap.get(trip.driverId);

            if (existing) {
              existing.tripsYesterday += 1;
              existing.distanceYesterday += (trip.totalDistance || 0);
            } else {
              driverStatsMap.set(trip.driverId, {
                driverId: trip.driverId,
                driverName: trip.driverName || 'Unknown Driver',
                driverEmail: trip.driverEmail || 'N/A',
                tripsYesterday: 1,
                distanceYesterday: trip.totalDistance || 0,
              });
            }
          }
        });

        // 4. Convert the map to an array and sort by most trips
        const sortedDrivers = Array.from(driverStatsMap.values()).sort(
          (a, b) => b.tripsYesterday - a.tripsYesterday
        );

        setActiveDrivers(sortedDrivers);
      } catch (error) {
        console.error("Error fetching active drivers:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchActiveDrivers();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading active drivers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header section with Back Button */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Dashboard
        </Link>
        <span className="px-4 py-2 bg-blue-100 text-blue-800 text-sm font-bold rounded-full">
          {activeDrivers.length} Active Yesterday
        </span>
      </div>

      {/* Main Content Card */}
      <div className="card bg-white shadow-sm border border-gray-100 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Drivers Active Yesterday</h1>
            <p className="text-sm text-gray-500 mt-1">
              Showing all drivers who completed at least one trip in the last 24-hour cycle.
            </p>
          </div>
        </div>

        {/* The Data Table */}
        {activeDrivers.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500 text-lg">No drivers were active yesterday.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-white">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Driver
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Contact Email
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Trips Yesterday
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Distance Yesterday
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {activeDrivers.map((driver) => (
                  <tr key={driver.driverId} className="hover:bg-blue-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-semibold text-gray-900">{driver.driverName}</div>
                      <div className="text-xs text-gray-400">ID: {driver.driverId}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {driver.driverEmail}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {driver.tripsYesterday} trips
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {driver.distanceYesterday.toFixed(2)} km
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// Wrap it in your existing authentication component
export default function ActiveDriversWithAuth() {
  return (
    <ProtectedRoute>
      <ActiveDriversPage />
    </ProtectedRoute>
  );
}