'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { TripService } from '@/services/tripService';
import { format, isAfter, subDays } from 'date-fns';
import { Search, MapPin, Bus, Download } from 'lucide-react';

interface DriverProfile {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  vehicleNo?: string;
  vehicleCapacity?: string;
  region?: string;
}

function DriverDatabase() {
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [lastActiveMap, setLastActiveMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [regionFilter, setRegionFilter] = useState('all');
  const [capacityFilter, setCapacityFilter] = useState('all');

  useEffect(() => {
    const fetchPersonnelData = async () => {
      try {
        setLoading(true);
        
        // 1. Fetch all registered drivers from Firebase
        const querySnapshot = await getDocs(collection(db, "drivers"));
        const driverList: DriverProfile[] = [];
        querySnapshot.forEach((doc) => {
          driverList.push({ id: doc.id, ...doc.data() });
        });
        setDrivers(driverList);

        // 2. Fetch trips to calculate "Last Active" status
        const trips = await TripService.getAllTrips();
        const activeMap: Record<string, number> = {};
        
        trips.forEach(trip => {
          const driverId = trip.driverId;
          // Keep the most recent timestamp for each driver
          if (!activeMap[driverId] || trip.startTime > activeMap[driverId]) {
            activeMap[driverId] = trip.startTime;
          }
        });
        setLastActiveMap(activeMap);

      } catch (err) {
        console.error("Error fetching drivers:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPersonnelData();
  }, []);

  // Filter Logic
  const filteredDrivers = drivers.filter(driver => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      (driver.name || '').toLowerCase().includes(searchLower) ||
      (driver.email || '').toLowerCase().includes(searchLower) ||
      (driver.vehicleNo || '').toLowerCase().includes(searchLower);

    const rawRegion = driver.region || 'Unknown';
    const finalRegion = rawRegion.toLowerCase().includes('srinagar') ? 'Kashmir' : rawRegion;
    const matchesRegion = regionFilter === 'all' || finalRegion.toLowerCase() === regionFilter.toLowerCase();

    const matchesCapacity = capacityFilter === 'all' || (driver.vehicleCapacity || '') === capacityFilter;

    return matchesSearch && matchesRegion && matchesCapacity;
  });

  // Calculate active drivers
  const activeLast7Days = drivers.filter(d => {
    const lastActive = lastActiveMap[d.id];
    if (!lastActive) return false;
    return isAfter(lastActive, subDays(new Date(), 7));
  }).length;

  // Excel / CSV Export Function
  const handleDownloadExcel = () => {
    if (filteredDrivers.length === 0) {
      alert("No drivers to download!");
      return;
    }

    const headers = ["S.No", "Driver Name", "Contact Details", "Region", "Vehicle Size", "Vehicle Plate No", "Last Active Date"];
    
    const csvRows = filteredDrivers.map((driver, index) => {
      const rawRegion = driver.region || 'Unknown';
      const finalRegion = rawRegion.toLowerCase().includes('srinagar') ? 'Kashmir' : rawRegion;
      const lastActiveTime = lastActiveMap[driver.id];
      const activeString = lastActiveTime ? format(new Date(lastActiveTime), 'MMM dd yyyy, hh:mm a') : 'No Trips Yet';

      return [
        index + 1,
        `"${driver.name || 'Unknown'}"`,
        `"${driver.email || driver.phone || 'No Contact'}"`,
        `"${finalRegion}"`,
        `"${driver.vehicleCapacity || 'Unassigned'}"`,
        `"${driver.vehicleNo || 'Not Saved'}"`,
        `"${activeString}"`
      ].join(",");
    });

    const csvContent = headers.join(",") + "\n" + csvRows.join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Registered_Drivers_${format(new Date(), 'dd-MM-yyyy')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
        <p className="text-gray-500 font-bold tracking-widest uppercase text-sm">Loading Driver Database...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 max-w-7xl mx-auto">
      
     {/* 1. Header with Logos and Export Button (Responsive Fix) */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 border-b border-gray-200 pb-6">
        
        {/* Logos & Title */}
        <div className="flex-1 w-full">
          <div className="flex items-center gap-4 mb-4 border-b border-gray-100 pb-4 w-max">
            <img src="/logo-transparent.png" alt="Bus Sathi" className="h-10 w-auto object-contain" />
            <div className="w-px h-6 bg-gray-300"></div>
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Powered By</span>
              <img src="/karroh.png" alt="Karroh" className="h-4 w-auto object-contain opacity-75 grayscale" />
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">Driver Database</h1>
          <p className="text-base text-gray-500 font-medium mt-2 max-w-2xl">
            View all registered drivers, check their vehicles, and see when they last used the app.
          </p>
        </div>
        
        {/* Stats & Download Action Container (Squish-proof) */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto shrink-0">
          
          {/* Stats Box */}
          <div className="flex w-full sm:w-auto items-center bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden shrink-0">
            <div className="px-5 py-3 border-r border-gray-100 flex-1 sm:flex-none text-center sm:text-left">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Drivers</p>
              <p className="text-2xl font-black text-gray-900">{drivers.length}</p>
            </div>
            <div className="px-5 py-3 flex-1 sm:flex-none text-center sm:text-left">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Active (Last 7 Days)</p>
              <p className="text-2xl font-black text-green-600">{activeLast7Days}</p>
            </div>
          </div>
          
          {/* Download Button */}
          <button 
            onClick={handleDownloadExcel}
            className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 bg-[#4ca154] hover:bg-[#3d8b45] text-white px-6 py-4 rounded-2xl text-sm font-bold shadow-sm transition-colors"
          >
            <Download size={18} /> Download Excel
          </button>
          
        </div>
      </div>

      {/* 2. Control Console (Filters) */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Search Box */}
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Search Drivers</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Name, Email, or Bus No..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all font-medium text-gray-700 shadow-inner"
              />
            </div>
          </div>

          {/* Region Dropdown */}
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Assigned Region</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none appearance-none transition-all font-medium text-gray-700 shadow-inner"
              >
                <option value="all">All J&K Regions</option>
                <option value="jammu">Jammu</option>
                <option value="kashmir">Kashmir</option>
              </select>
            </div>
          </div>

          {/* Capacity Dropdown */}
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Vehicle Size</label>
            <div className="relative">
              <Bus className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <select
                value={capacityFilter}
                onChange={(e) => setCapacityFilter(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none appearance-none transition-all font-medium text-gray-700 shadow-inner"
              >
                <option value="all">All Vehicle Types</option>
                <option value="32 to 52 seater (HPV)">32 to 52 seater (HPV)</option>
                <option value="17 to 21 seater (MPV)">17 to 21 seater (MPV)</option>
                <option value="5 to 13 seater (LPV)">5 to 13 seater (LPV)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 3. The Driver Grid (Table) */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <h2 className="text-sm font-black text-gray-800 uppercase tracking-widest">Registered Drivers List</h2>
          <span className="px-4 py-1.5 bg-blue-100 text-blue-800 text-xs font-black rounded-full uppercase tracking-wider">
            {filteredDrivers.length} Found
          </span>
        </div>
        
        {filteredDrivers.length === 0 ? (
          <div className="text-center py-20">
            <span className="text-5xl mb-4 block">🪪</span>
            <p className="text-gray-500 font-bold text-lg">No drivers match your search.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-white">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest">S.No.</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Driver Details</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Region</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Vehicle Details</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Last Active</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredDrivers.map((driver, index) => {
                  const rawRegion = driver.region || 'Unknown';
                  const finalRegion = rawRegion.toLowerCase().includes('srinagar') ? 'Kashmir' : rawRegion;
                  
                  // Capacity Badge styling
                  const capacity = driver.vehicleCapacity?.toLowerCase() || '';
                  let badgeStyle = 'bg-gray-100 text-gray-700 border-gray-200';
                  if (capacity.includes('hpv')) badgeStyle = 'bg-red-50 text-red-700 border-red-200';
                  else if (capacity.includes('mpv')) badgeStyle = 'bg-blue-50 text-blue-700 border-blue-200';
                  else if (capacity.includes('lpv')) badgeStyle = 'bg-amber-50 text-amber-700 border-amber-200';

                  // Last Active Status
                  const lastActiveTime = lastActiveMap[driver.id];

                  return (
                    <tr key={driver.id} className="hover:bg-blue-50/50 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-400">
                        {String(index + 1).padStart(3, '0')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-black text-sm border border-slate-200">
                            {(driver.name || '?').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 text-sm">{driver.name || 'Unknown Name'}</div>
                            <div className="text-gray-500 text-xs">{driver.email || driver.phone || 'No Contact Info'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-lg border border-gray-200 uppercase tracking-wider">
                          {finalRegion}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span className={`px-2 py-1 text-[10px] font-bold rounded-md border w-max uppercase tracking-wider ${badgeStyle}`}>
                            {driver.vehicleCapacity || 'Unassigned'}
                          </span>
                          <span className="text-xs font-mono font-medium text-gray-500">
                            {driver.vehicleNo || 'Plate Not Saved'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {lastActiveTime ? (
                          <div>
                            <p className="text-sm font-bold text-gray-900">{format(new Date(lastActiveTime), 'MMM dd, yyyy')}</p>
                            <p className="text-xs text-gray-500">{format(new Date(lastActiveTime), 'hh:mm a')}</p>
                          </div>
                        ) : (
                          <span className="px-2 py-1 bg-gray-100 text-gray-400 text-xs font-bold rounded-md">
                            No Trips Yet
                          </span>
                        )}
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

export default function RegisteredDriversPage() {
  return (
    <ProtectedRoute>
      <DriverDatabase />
    </ProtectedRoute>
  );
} 