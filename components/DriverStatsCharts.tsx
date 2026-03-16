'use client';

import { useMemo } from 'react';
import { Trip } from '@/types/trip';
import Link from 'next/link';
import { ExternalLink, Zap, Timer, Clock } from 'lucide-react';
import {
  BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

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
  driverCapacities: Record<string, string>;
}

export default function DriverStatsCharts({ trips, driverCapacities }: Props) {

  const distanceDistribution = useMemo(() => {
    let short = 0; 
    let medium = 0; 
    let long = 0; 

    trips.forEach(trip => {
      if (trip.totalDistance < 15) short++;
      else if (trip.totalDistance <= 50) medium++;
      else long++;
    });

    return [
      { category: 'Short (<15km)', trips: short, color: '#3b82f6' },
      { category: 'Medium (15-50km)', trips: medium, color: '#f59e0b' },
      { category: 'Long (>50km)', trips: long, color: '#ef4444' }
    ];
  }, [trips]);

  const vehicleData = useMemo(() => {
    let heavy = 0, medium = 0, light = 0;
    trips.forEach(trip => {
      const cap = driverCapacities[trip.driverId] || '';
      if (cap.toLowerCase().includes('hpv')) heavy++;
      else if (cap.toLowerCase().includes('mpv')) medium++;
      else light++; 
    });

    return [
      { name: 'Heavy Buses', value: heavy || 1, color: '#ef4444' }, 
      { name: 'Medium Buses', value: medium || 1, color: '#3b82f6' }, 
      { name: 'Light Vans', value: light || 1, color: '#f59e0b' } 
    ];
  }, [trips, driverCapacities]);

  const topDrivers = useMemo(() => {
    const driverMap: Record<string, { 
      id: string, name: string, distance: number, trips: number,
      movingMs: number, idleMs: number, durationHours: number
    }> = {};
    
    trips.forEach(t => {
      if (!driverMap[t.driverId]) {
        driverMap[t.driverId] = { 
          id: t.driverId, name: t.driverName || 'Unknown', distance: 0, 
          trips: 0, movingMs: 0, idleMs: 0, durationHours: 0
        };
      }
      
      const drv = driverMap[t.driverId];
      drv.distance += t.totalDistance;
      drv.trips += 1;

      const durMs = (t.endTime && t.endTime > t.startTime) ? (t.endTime - t.startTime) : 0;
      if (durMs > 0) {
        drv.durationHours += (durMs / 3600000);
        if (t.routePoints && t.routePoints.length > 0) {
          const ratio = getMovingRatio(t.routePoints);
          drv.movingMs += (durMs * ratio);
          drv.idleMs += (durMs * (1 - ratio));
        } else {
          drv.movingMs += durMs;
        }
      }
    });

    return Object.values(driverMap)
      .sort((a, b) => b.distance - a.distance)
      .slice(0, 10);
  }, [trips]);

  return (
    <div className="space-y-8 mt-2">
      
      {/* 1. ADVANCED TOP 10 LEADERBOARD (NOW AT THE VERY TOP!) */}
      <div className="border border-gray-100 rounded-2xl shadow-sm bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <h2 className="text-sm font-black text-gray-800 uppercase tracking-widest">Top 10 Drivers (Distance)</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-white">
              <tr>
                <th className="px-5 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Rank</th>
                <th className="px-5 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Driver</th>
                <th className="px-5 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Trips</th>
                <th className="px-5 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Distance</th>
                <th className="px-5 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1"><Zap size={12}/> Avg Speed</th>
                <th className="px-5 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest"><div className="flex items-center gap-1 text-emerald-600"><Timer size={12}/> Moving</div></th>
                <th className="px-5 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest"><div className="flex items-center gap-1 text-red-500"><Clock size={12}/> Idle</div></th>
                <th className="px-5 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {topDrivers.map((driver, index) => {
                const avgSpeed = driver.durationHours > 0 ? (driver.distance / driver.durationHours) : 0;
                return (
                  <tr key={driver.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-5 py-3 whitespace-nowrap text-sm font-black text-gray-400">#{index + 1}</td>
                    <td className="px-5 py-3 whitespace-nowrap text-sm font-bold text-gray-900">{driver.name}</td>
                    <td className="px-5 py-3 whitespace-nowrap text-sm text-gray-500 font-medium">{driver.trips}</td>
                    <td className="px-5 py-3 whitespace-nowrap text-sm text-blue-600 font-black">{driver.distance.toFixed(1)} km</td>
                    <td className="px-5 py-3 whitespace-nowrap text-sm font-bold text-amber-500">{avgSpeed.toFixed(1)} km/h</td>
                    <td className="px-5 py-3 whitespace-nowrap text-sm font-bold text-emerald-600">{formatMs(driver.movingMs)}</td>
                    <td className="px-5 py-3 whitespace-nowrap text-sm font-bold text-red-500">{formatMs(driver.idleMs)}</td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <Link href={`/driver-report/${driver.id}`} className="flex items-center w-max gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 text-gray-600 hover:text-blue-700 rounded-lg text-xs font-bold transition-colors">
                        View Report <ExternalLink size={12} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. CHARTS ROW (NOW PUSHED BELOW THE TABLE) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="border border-gray-100 rounded-2xl p-4 shadow-sm bg-slate-50">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Trip Length Distribution</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={distanceDistribution} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
              <XAxis type="number" tick={{fontSize: 10}} tickLine={false} axisLine={false} />
              <YAxis dataKey="category" type="category" width={110} tick={{fontSize: 10, fontWeight: 'bold', fill: '#64748b'}} tickLine={false} axisLine={false} />
              <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Bar dataKey="trips" radius={[0, 4, 4, 0]} barSize={32}>
                {distanceDistribution.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="border border-gray-100 rounded-2xl p-4 shadow-sm bg-slate-50 relative">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Vehicle Mix</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={vehicleData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                {vehicleData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute bottom-4 left-0 w-full flex justify-center gap-4 text-[10px] font-bold text-gray-500 uppercase">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Heavy</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Medium</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Light</span>
          </div>
        </div>
      </div>

    </div>
  );
}