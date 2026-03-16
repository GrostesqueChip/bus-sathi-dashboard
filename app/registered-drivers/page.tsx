'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import ProtectedRoute from '@/components/ProtectedRoute';
import { TripService } from '@/services/tripService'; 
import { format } from 'date-fns'; 

interface Driver {
  id: string;
  name: string;
  email: string;
  phone: string;
  region: string;
  vehicleCapacity: string;
  vehicleNumber: string;
  lastActiveStr: string; 
  lastActiveTime: number; 
}

function RegisteredDrivers() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRegion, setFilterRegion] = useState('all');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [driverSnapshot, allTrips] = await Promise.all([
          getDocs(collection(db, "drivers")),
          TripService.getAllTrips()
        ]);

        const lastActiveMap: Record<string, number> = {};
        allTrips.forEach(trip => {
          const tripTime = trip.endTime || trip.startTime;
          if (!lastActiveMap[trip.driverId] || tripTime > lastActiveMap[trip.driverId]) {
            lastActiveMap[trip.driverId] = tripTime;
          }
        });

        const driverData: Driver[] = [];
        
        driverSnapshot.forEach((doc) => {
          const data = doc.data();
          const rawRegion = data.region || 'Unknown';
          const finalRegion = rawRegion.toLowerCase().includes('srinagar') ? 'Kashmir' : rawRegion;

          const lastActiveTimestamp = lastActiveMap[doc.id] || 0;
          const lastActiveStr = lastActiveTimestamp > 0 
            ? format(new Date(lastActiveTimestamp), 'MMM dd, yyyy hh:mm a')
            : 'No Trips Yet';

          driverData.push({
            id: doc.id,
            name: data.name || 'Unknown',
            email: data.email || 'N/A',
            phone: data.phone || 'N/A',
            region: finalRegion,
            vehicleCapacity: data.vehicleCapacity || 'Unknown',
            vehicleNumber: data.vehicleNumber || 'N/A',
            lastActiveStr,
            lastActiveTime: lastActiveTimestamp
          });
        });
        
        driverData.sort((a, b) => b.lastActiveTime - a.lastActiveTime);

        setDrivers(driverData);
      } catch (error) {
        console.error("Error fetching drivers:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredDrivers = drivers.filter(driver => {
    const matchesSearch = driver.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          driver.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRegion = filterRegion === 'all' || driver.region === filterRegion;
    const matchesType = filterType === 'all' || driver.vehicleCapacity === filterType;

    return matchesSearch && matchesRegion && matchesType;
  });

  // Export to CSV (Excel)
  const exportToCSV = () => {
    // 1. Added S.No. to the headers
    const headers = ['S.No.', 'Name', 'Email', 'Phone', 'Region', 'Vehicle Capacity', 'Vehicle Number', 'Last Active'];
    
    // 2. Added the index + 1 to the rows
    const rows = filteredDrivers.map((d, index) => [
      (index + 1).toString(), // Serial Number
      d.name, 
      d.email, 
      d.phone, 
      d.region, 
      d.vehicleCapacity, 
      d.vehicleNumber,
      d.lastActiveStr 
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(item => `"${item || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `Registered_Drivers_${filterRegion}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-4">
        <Link href="/" className="text-gray-500 hover:text-gray-900">
          ← Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Registered Drivers Database</h1>
      </div>

      {/* Filters Section */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-2">Search Drivers</label>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="w-48">
          <label className="block text-sm font-medium text-gray-700 mb-2">Region Filter</label>
          <select
            value={filterRegion}
            onChange={(e) => setFilterRegion(e.target.value)}
            className="w-full px-4 py-2 border border-blue-300 bg-blue-50 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Regions</option>
            <option value="Jammu">Jammu</option>
            <option value="Kashmir">Kashmir</option>
          </select>
        </div>

        <div className="w-48">
          <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Type Filter</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Vehicles</option>
            <option value="32 to 52 seater (HPV)">32 to 52 seater (HPV)</option>
            <option value="17 to 21 seater (MPV)">17 to 21 seater (MPV)</option>
            <option value="5 to 13 seater (LPV)">5 to 13 seater (LPV)</option>
          </select>
        </div>

        <button
          onClick={exportToCSV}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export to Excel
        </button>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">S.No.</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Driver Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Region</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle No.</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-blue-600 uppercase">Last Active</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDrivers.map((driver, index) => (
                <tr key={driver.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                    {index + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{driver.name}</div>
                    <div className="text-sm text-gray-500 text-xs">ID: {driver.id}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{driver.phone}</div>
                    <div className="text-sm text-gray-500">{driver.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${driver.region === 'Kashmir' ? 'bg-blue-100 text-blue-800' : driver.region === 'Jammu' ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800'}`}>
                      {driver.region}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{driver.vehicleCapacity}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">{driver.vehicleNumber}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <span className={driver.lastActiveTime > 0 ? "text-blue-600" : "text-gray-400"}>
                      {driver.lastActiveStr}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredDrivers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No drivers found matching these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function RegisteredDriversPage() {
  return (
    <ProtectedRoute>
      <RegisteredDrivers />
    </ProtectedRoute>
  );
}