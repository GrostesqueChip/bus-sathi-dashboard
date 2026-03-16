'use client';

import { useEffect, useMemo, useState } from 'react';
import { Trip } from '@/types/trip';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { MapPin, Activity, Map, Timer, Zap } from 'lucide-react';

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
       const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
       const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
       const distanceMeters = R * c;

       if (distanceMeters > 3) movingCount++;
    }
  }
  return validComparisons > 0 ? (movingCount / validComparisons) : 1;
};

const formatMs = (ms: number) => {
  if (!ms || ms <= 0) return '0m';
  const totalMins = Math.floor(ms / 60000);
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
};

interface Props {
  trips: Trip[];
}

export default function RegionAnalytics({ trips }: Props) {
  const [regionFilter, setRegionFilter] = useState('all');
  const [regionMap, setRegionMap] = useState<Record<string, string>>({});

  // Fetch driver regions directly to ensure 100% accuracy
  useEffect(() => {
    const fetchDriverRegions = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "drivers"));
        const rMap: Record<string, string> = {};
        querySnapshot.forEach(doc => {
          const data = doc.data();
          if (data.region) {
            rMap[doc.id] = data.region.toLowerCase();
            if (data.name) {
              rMap[data.name.toLowerCase().trim()] = data.region.toLowerCase();
            }
          }
        });
        setRegionMap(rMap);
      } catch (error) {
        console.error("Failed to fetch regions:", error);
      }
    };
    fetchDriverRegions();
  }, []);

  // Helper to find the actual region of a trip
  const getRegion = (trip: Trip) => {
    const r = regionMap[trip.driverId] || regionMap[trip.driverName?.toLowerCase().trim() || ''] || String((trip as any).region || '').toLowerCase();
    return r;
  };

  // 1. Filter Trips based on dropdown
  const filteredTrips = useMemo(() => {
    return trips.filter(trip => {
      const regionStr = getRegion(trip);
      const isJammu = regionStr.includes('jammu');
      const isKashmir = regionStr.includes('kashmir') || regionStr.includes('srinagar');
      
      if (regionFilter === 'jammu' && !isJammu) return false;
      if (regionFilter === 'kashmir' && !isKashmir) return false;
      return true;
    });
  }, [trips, regionFilter, regionMap]);

  // 2. Calculate Personalized Regional KPIs
  const regionalStats = useMemo(() => {
    const activeDrivers = new Set(filteredTrips.map(t => t.driverId)).size;
    let totalDist = 0;
    let movingMs = 0;
    let idleMs = 0;
    let durationHours = 0;

    filteredTrips.forEach(trip => {
      totalDist += trip.totalDistance;
      const durMs = (trip.endTime && trip.endTime > trip.startTime) ? (trip.endTime - trip.startTime) : 0;
      
      if (durMs > 0) {
        durationHours += (durMs / 3600000);
        if (trip.routePoints && trip.routePoints.length > 0) {
          const ratio = getMovingRatio(trip.routePoints);
          movingMs += (durMs * ratio);
          idleMs += (durMs * (1 - ratio));
        } else {
          movingMs += durMs;
        }
      }
    });

    const avgSpeed = durationHours > 0 ? (totalDist / durationHours) : 0;
    const movingPercent = (movingMs + idleMs) > 0 ? (movingMs / (movingMs + idleMs)) * 100 : 0;

    return { activeDrivers, totalDist, avgSpeed, movingMs, idleMs, movingPercent };
  }, [filteredTrips]);

  // 3. Hourly Traffic for Selected Region
  const hourlyData = useMemo(() => {
    const hours = Array(24).fill(0);
    filteredTrips.forEach(trip => {
      const h = new Date(trip.startTime).getHours();
      hours[h] += 1;
    });

    const data = [];
    for (let i = 5; i <= 22; i++) { 
      const ampm = i >= 12 ? 'PM' : 'AM';
      const hour12 = i % 12 || 12;
      data.push({ time: `${hour12} ${ampm}`, trips: hours[i] });
    }
    return data;
  }, [filteredTrips]);

  // 4. Overall J&K Split
  const pieData = useMemo(() => {
    let jammu = 0, kashmir = 0;
    trips.forEach(trip => {
      const regionStr = getRegion(trip);
      if (regionStr.includes('jammu')) jammu++;
      else if (regionStr.includes('kashmir') || regionStr.includes('srinagar')) kashmir++;
    });
    
    // Using actual values now! (Removed the "|| 1" hack)
    return [
      { name: 'Jammu Trips', value: jammu, color: '#3b82f6' }, 
      { name: 'Kashmir Trips', value: kashmir, color: '#10b981' } 
    ];
  }, [trips, regionMap]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Dynamic Dropdown Filter */}
      <div className="flex justify-between items-center bg-blue-50/50 border border-blue-100 p-5 rounded-3xl">
        <div>
          <h3 className="text-sm font-black text-blue-900 uppercase tracking-widest flex items-center gap-2">
            <MapPin size={18} className="text-blue-600" /> Regional Control
          </h3>
          <p className="text-xs font-medium text-blue-600/70 mt-1">Filtering {filteredTrips.length} active trips</p>
        </div>
        <select 
          value={regionFilter} 
          onChange={(e) => setRegionFilter(e.target.value)}
          className="bg-white border border-blue-200 rounded-xl px-5 py-3 text-sm font-black text-blue-900 outline-none focus:ring-4 focus:ring-blue-500/20 shadow-sm cursor-pointer hover:border-blue-300 transition-all appearance-none"
        >
          <option value="all">🌐 All J&K Regions</option>
          <option value="jammu">📍 Jammu Division</option>
          <option value="kashmir">📍 Kashmir Division</option>
        </select>
      </div>

      {/* Personalized Region KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Activity size={14}/> Active Fleet</p>
          <h3 className="text-2xl font-black text-gray-900">{regionalStats.activeDrivers}</h3>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Map size={14}/> Region Distance</p>
          <h3 className="text-2xl font-black text-blue-600">{regionalStats.totalDist.toFixed(0)} <span className="text-sm text-gray-400">km</span></h3>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Zap size={14}/> Average Speed</p>
          <h3 className="text-2xl font-black text-amber-500">{regionalStats.avgSpeed.toFixed(1)} <span className="text-sm text-gray-400">km/h</span></h3>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Timer size={14}/> Fleet Efficiency</p>
          <h3 className="text-2xl font-black text-emerald-600">{regionalStats.movingPercent.toFixed(0)}% <span className="text-sm text-gray-400">Moving</span></h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Hourly Traffic - Left Column (Wider) */}
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Traffic Volume (Filtered Region)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTrips" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="time" tick={{fontSize: 10}} tickLine={false} axisLine={false} />
              <YAxis tick={{fontSize: 10}} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Area type="monotone" dataKey="trips" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorTrips)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Donut Chart - Right Column */}
        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex flex-col items-center justify-center relative">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 w-full text-left">Total J&K Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} innerRadius={55} outerRadius={75} paddingAngle={5} dataKey="value" stroke="none">
                {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
            </PieChart>
          </ResponsiveContainer>
          
          <div className="flex w-full justify-center gap-6 mt-2">
             <div className="text-center">
                <p className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase"><span className="w-2 h-2 rounded-full bg-blue-500"></span>Jammu</p>
                <p className="text-lg font-black text-blue-600">{pieData[0].value}</p>
             </div>
             <div className="w-px h-8 bg-gray-200"></div>
             <div className="text-center">
                <p className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>Kashmir</p>
                <p className="text-lg font-black text-emerald-600">{pieData[1].value}</p>
             </div>
          </div>
        </div>

      </div>

      {/* Sleek Custom Moving vs Idle Bar */}
      <div className="bg-white border border-gray-100 rounded-3xl p-6 md:p-8 shadow-sm">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Time Analysis (Filtered Region)</h3>
            <p className="text-sm font-black text-gray-900">Driving vs. Stopped Time</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Logged Time</p>
            <p className="text-lg font-black text-gray-900">{formatMs(regionalStats.movingMs + regionalStats.idleMs)}</p>
          </div>
        </div>

        <div className="h-6 w-full bg-red-100 rounded-full flex overflow-hidden mb-3">
          <div 
            className="h-full bg-emerald-500 transition-all duration-1000 flex items-center justify-end pr-2"
            style={{ width: `${regionalStats.movingPercent}%` }}
          ></div>
        </div>
        
        <div className="flex justify-between text-xs font-bold">
          <div className="flex items-center gap-2 text-emerald-600">
            <span className="w-3 h-3 rounded bg-emerald-500"></span> 
            Moving: {formatMs(regionalStats.movingMs)} ({regionalStats.movingPercent.toFixed(0)}%)
          </div>
          <div className="flex items-center gap-2 text-red-500">
            Idle: {formatMs(regionalStats.idleMs)} ({(100 - regionalStats.movingPercent).toFixed(0)}%)
            <span className="w-3 h-3 rounded bg-red-500"></span> 
          </div>
        </div>
      </div>

    </div>
  );
}