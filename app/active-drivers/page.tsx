'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { TripService } from '@/services/tripService';
import { format } from 'date-fns';
import { Search, MapPin, Download } from 'lucide-react';

interface ActiveDriver {
  driverId: string;
  driverName: string;
  email: string;
  lastActive: number;
  region: string;
  vehicle: string;
  tripCount: number; // NEW: Added this to track their total trips!
}

function ActiveDriversList() {
  const [activeDrivers, setActiveDrivers] = useState<ActiveDriver[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [regionFilter, setRegionFilter] = useState('all');

  useEffect(() => {
    const loadActiveDrivers = async () => {
      try {
        setLoading(true);
        
        // Fetch all trips and drivers
        const [tripsData, querySnapshot] = await Promise.all([
          TripService.getAllTrips(),
          getDocs(collection(db, "drivers"))
        ]);

        // Map out capacities and regions from the database
        const capacityMap: Record<string, string> = {};
        const regionMap: Record<string, string> = {};
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          capacityMap[doc.id] = data.vehicleCapacity || 'Unknown';
          regionMap[doc.id] = data.region || 'Unknown';
          if (data.name) {
            const cleanName = data.name.toString().toLowerCase().trim();
            capacityMap[cleanName] = data.vehicleCapacity || 'Unknown';
            regionMap[cleanName] = data.region || 'Unknown';
          }
        });

        // Filter trips to just the last 24 hours
        const cutoff = Date.now() - (24 * 60 * 60 * 1000);
        const recentTrips = tripsData.filter(t => t.startTime >= cutoff);
        
        // Find the most recent ping AND count the trips
        const activeMap = new Map<string, ActiveDriver>();
        
        recentTrips.forEach(t => {
          const current = activeMap.get(t.driverId);
          
          if (!current) {
            // First time seeing this driver today, set count to 1
            const rawReg = regionMap[t.driverId] || regionMap[t.driverName.toLowerCase().trim()] || 'Unknown';
            const cap = capacityMap[t.driverId] || capacityMap[t.driverName.toLowerCase().trim()] || 'Unknown';
            
            activeMap.set(t.driverId, {
              driverId: t.driverId,
              driverName: t.driverName || 'Unknown',
              email: t.driverEmail || 'No email',
              lastActive: t.startTime,
              region: rawReg.toLowerCase().includes('srinagar') ? 'Kashmir' : rawReg,
              vehicle: cap,
              tripCount: 1 
            });
          } else {
            // We already saw them today! Add 1 to their trip count
            current.tripCount += 1;
            // If this specific trip is newer than the one we saved, update the "Last Ping" time
            if (t.startTime > current.lastActive) {
              current.lastActive = t.startTime;
            }
          }
        });
        
        // Sort newest to oldest
        const sortedActive = Array.from(activeMap.values()).sort((a, b) => b.lastActive - a.lastActive);
        setActiveDrivers(sortedActive);

      } catch (err) {
        console.error("Error loading active drivers:", err);
      } finally {
        setLoading(false);
      }
    };

    loadActiveDrivers();
  }, []);

  // Search and Filter Logic
  const filteredDrivers = activeDrivers.filter(driver => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = driver.driverName.toLowerCase().includes(searchLower);
    const matchesRegion = regionFilter === 'all' || driver.region.toLowerCase() === regionFilter.toLowerCase();
    return matchesSearch && matchesRegion;
  });

  // Excel Export
  const handleDownloadExcel = () => {
    if (filteredDrivers.length === 0) {
      alert("No active drivers to download!");
      return;
    }

    const headers = ["S.No", "Driver Name", "Region", "Vehicle Size", "Trips Today", "Last Ping Date", "Last Ping Time"];
    
    const csvRows = filteredDrivers.map((driver, index) => {
      const dateStr = format(new Date(driver.lastActive), 'dd-MM-yyyy');
      const timeStr = format(new Date(driver.lastActive), 'hh:mm a');
      return [
        index + 1,
        `"${driver.driverName}"`,
        `"${driver.region}"`,
        `"${driver.vehicle}"`,
        `"${driver.tripCount}"`,
        `"${dateStr}"`,
        `"${timeStr}"`
      ].join(",");
    });

    const csvContent = headers.join(",") + "\n" + csvRows.join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Active_Fleet_${format(new Date(), 'dd-MM-yyyy')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
        <p className="text-gray-500 font-bold tracking-widest uppercase text-sm">Loading Active Fleet...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 border-b border-gray-200 pb-6">
        <div>
          <div className="flex items-center gap-4 mb-4 border-b border-gray-100 pb-4 w-max">
            <img src="/logo-transparent.png" alt="Bus Sathi" className="h-10 w-auto object-contain" />
            <div className="w-px h-6 bg-gray-300"></div>
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Powered By</span>
              <img src="/karroh.png" alt="Karroh" className="h-4 w-auto object-contain opacity-75 grayscale" />
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">Active Fleet</h1>
          <p className="text-base text-gray-500 font-medium mt-2">
            Drivers who have recorded trips in the last 24 hours.
          </p>
        </div>
        
        <button 
          onClick={handleDownloadExcel}
          className="w-full lg:w-auto flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-2xl font-bold shadow-sm transition-colors"
        >
          <Download size={20} /> Download List
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Search Name</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input type="text" placeholder="Find driver..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none" />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Filter Region</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none appearance-none">
                <option value="all">All Regions</option>
                <option value="jammu">Jammu</option>
                <option value="kashmir">Kashmir</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <h2 className="text-sm font-black text-gray-800 uppercase tracking-widest">Active Drivers List</h2>
          <span className="px-4 py-1.5 bg-green-100 text-green-800 text-xs font-black rounded-full uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            {filteredDrivers.length} Online Recently
          </span>
        </div>
        
        {filteredDrivers.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 font-bold text-lg">No drivers active in the selected region.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-white">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest">S.No.</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Driver</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Region</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Vehicle Size</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Trips Today</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Last Ping</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredDrivers.map((driver, index) => (
                  <tr key={driver.driverId} className="hover:bg-blue-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-400">
                      {String(index + 1).padStart(3, '0')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-bold text-gray-900 text-sm">{driver.driverName}</div>
                      <div className="text-gray-500 text-xs">{driver.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-lg border border-gray-200 uppercase tracking-wider">
                        {driver.region}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded">
                        {driver.vehicle}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-3 py-1 bg-blue-50 text-blue-700 text-sm font-black rounded-lg border border-blue-100">
                        {driver.tripCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm font-bold text-blue-600">{format(new Date(driver.lastActive), 'MMM dd, yyyy')}</p>
                      <p className="text-xs font-bold text-gray-500">{format(new Date(driver.lastActive), 'hh:mm a')}</p>
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

export default function ActiveDriversPage() {
  return (
    <ProtectedRoute>
      <ActiveDriversList />
    </ProtectedRoute>
  );
}