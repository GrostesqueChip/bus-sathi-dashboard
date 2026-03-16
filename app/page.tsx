'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Trip } from '@/types/trip';
import { TripService } from '@/services/tripService';
import ProtectedRoute from '@/components/ProtectedRoute';
import DriverStatsCharts from '@/components/DriverStatsCharts';
import RegionAnalytics from '@/components/RegionAnalytics';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format } from 'date-fns';
import { Activity, Users, Route, Map, Zap, Clock, Award, Timer, Bus, PieChart, BarChart2, History, ArrowRight } from 'lucide-react';

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

function Home() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalTrips: 0, totalDistance: 0, averageDistance: 0 });
  const [totalDrivers, setTotalDrivers] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [driverCapacities, setDriverCapacities] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics'>('overview');
  
  // Quick Notes Data
  const [peakTime, setPeakTime] = useState('N/A');
  const [mainRegion, setMainRegion] = useState('N/A');
  const [topEarner, setTopEarner] = useState('N/A');
  const [totalHoursToday, setTotalHoursToday] = useState('0');
  const [longestTrip, setLongestTrip] = useState('0');
  const [mainVehicle, setMainVehicle] = useState('N/A');
  const [fleetUsage, setFleetUsage] = useState('0');

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        const [tripsData, statsData] = await Promise.all([
          TripService.getAllTrips(),
          TripService.getTripStats()
        ]);
        setTrips(tripsData);
        setStats(statsData);

        const querySnapshot = await getDocs(collection(db, "drivers"));
        const driverCount = querySnapshot.size;
        setTotalDrivers(driverCount);
        
        const capacityMap: Record<string, string> = {};
        const regionMap: Record<string, string> = {};
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          capacityMap[doc.id] = data.vehicleCapacity || 'Unknown';
          regionMap[doc.id] = data.region || 'Unknown';
          if (data.name) {
            capacityMap[data.name.toString().toLowerCase().trim()] = data.vehicleCapacity || 'Unknown';
            regionMap[data.name.toString().toLowerCase().trim()] = data.region || 'Unknown';
          }
        });
        setDriverCapacities(capacityMap);

        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000); 
        const recentTrips = tripsData.filter((t: Trip) => t.startTime >= oneDayAgo);
        const uniqueDrivers = new Set(recentTrips.map((t: Trip) => t.driverId));
        setActiveCount(uniqueDrivers.size);

        if (recentTrips.length > 0) {
          let jammu = 0, kashmir = 0;
          const hours = new Array(24).fill(0);
          const driverDistances: Record<string, number> = {};
          let totalMs = 0;
          let maxSingleTrip = 0;
          let heavy = 0, medium = 0, light = 0;

          recentTrips.forEach((t: Trip) => {
            const r = regionMap[t.driverId] || 'Unknown';
            if (r.toLowerCase().includes('jammu')) jammu++;
            else kashmir++;

            const hour = new Date(t.startTime).getHours();
            hours[hour]++;
            if (t.endTime && t.startTime) totalMs += (t.endTime - t.startTime);

            const dName = t.driverName || 'Unknown';
            driverDistances[dName] = (driverDistances[dName] || 0) + t.totalDistance;
            if (t.totalDistance > maxSingleTrip) maxSingleTrip = t.totalDistance;

            const cap = capacityMap[t.driverId] || capacityMap[t.driverName.toLowerCase().trim()] || '';
            if (cap.toLowerCase().includes('hpv')) heavy++;
            else if (cap.toLowerCase().includes('mpv')) medium++;
            else light++;
          });

          setMainRegion(jammu > kashmir ? 'Jammu Division' : 'Kashmir Division');

          const busiestHour = hours.indexOf(Math.max(...hours));
          const ampm = busiestHour >= 12 ? 'PM' : 'AM';
          const displayHour = busiestHour % 12 || 12;
          setPeakTime(`${displayHour}:00 ${ampm}`);

          let maxDist = 0;
          let bestDriver = 'N/A';
          for (const [name, dist] of Object.entries(driverDistances)) {
            if (dist > maxDist) { maxDist = dist; bestDriver = name; }
          }
          setTopEarner(bestDriver);
          setTotalHoursToday((totalMs / 3600000).toFixed(1));
          setLongestTrip(maxSingleTrip.toFixed(1));

          if (heavy >= medium && heavy >= light) setMainVehicle('Heavy Buses');
          else if (medium >= heavy && medium >= light) setMainVehicle('Medium Buses');
          else setMainVehicle('Light Vans');

          if (driverCount > 0) {
            setFleetUsage(((uniqueDrivers.size / driverCount) * 100).toFixed(1));
          }
        }
      } catch (err) {
        console.error("Error loading dashboard:", err);
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
  }, []);

  const validTrips = trips.filter(trip => trip.routePoints && trip.routePoints.length > 1);
  const recent10Trips = [...validTrips].sort((a, b) => b.startTime - a.startTime).slice(0, 10);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
        <p className="text-gray-500 font-bold tracking-widest uppercase text-sm">Loading System Data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-gray-200 pb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight mb-2">Executive Summary</h1>
          <p className="text-base text-gray-500 font-medium max-w-2xl">
            A simple overview of today's bus operations, distances, and active drivers.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/trip-logs" className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-all shadow-sm flex items-center gap-2">
            <Map size={18} /> View All Records
          </Link>
          <Link href="/map-visualizer" className="px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-md flex items-center gap-2">
            <Route size={18} /> Open Map
          </Link>
        </div>
      </div>

      {/* Top 4 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link href="/active-drivers" className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-3xl shadow-lg text-white block hover:scale-[1.02] transition-transform group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-10 -mt-10 group-hover:scale-110 transition-transform"></div>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2"><Activity size={16} className="text-blue-400" /> Drivers on Road</p>
          <div className="flex items-end gap-3"><h3 className="text-5xl font-black mb-1">{activeCount}</h3><span className="text-2xl mb-1 group-hover:translate-x-1 transition-transform text-slate-500">→</span></div>
          <p className="text-xs text-slate-300 font-medium mt-1">Active today</p>
        </Link>
        <Link href="/registered-drivers" className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all block group">
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2"><Users size={16} /> Total Drivers</p>
          <div className="flex items-end gap-3"><h3 className="text-5xl font-black text-gray-900">{totalDrivers}</h3><span className="text-2xl mb-1 group-hover:translate-x-1 transition-transform text-gray-300">→</span></div>
          <p className="text-sm text-gray-500 font-medium mt-1">Saved in system</p>
        </Link>
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Distance Covered</p>
          <h3 className="text-5xl font-black text-blue-600">{stats.totalDistance.toFixed(0)} <span className="text-2xl font-bold text-gray-400">km</span></h3>
          <p className="text-sm text-gray-500 font-medium mt-1">Total route distance</p>
        </div>
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Total Records</p>
          <h3 className="text-5xl font-black text-emerald-600">{validTrips.length}</h3>
          <p className="text-sm text-gray-500 font-medium mt-1">Clean trips saved</p>
        </div>
      </div>  

      {/* TAB SWITCHER UI */}
      <div className="flex justify-center mb-4">
        <div className="bg-gray-100 p-1.5 rounded-2xl inline-flex gap-2">
          <button onClick={() => setActiveTab('overview')} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all ${activeTab === 'overview' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>
            <PieChart size={16} /> General Overview
          </button>
          <button onClick={() => setActiveTab('analytics')} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all ${activeTab === 'analytics' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>
            <BarChart2 size={16} /> Regional Analytics
          </button>
        </div>
      </div>

      {activeTab === 'overview' ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
          
          {/* PRIORITY 1: FULL WIDTH LEADERBOARD & CHARTS */}
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
            <div className="mb-6">
              <h2 className="text-xl font-black text-gray-900">Fleet Performance & Leaderboard</h2>
              <p className="text-gray-500 text-sm font-medium">Your highest performing operators and daily route distributions.</p>
            </div>
            {trips.length > 0 ? (
              <DriverStatsCharts trips={validTrips} driverCapacities={driverCapacities} />
            ) : (
              <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl">
                <p className="text-gray-400 font-bold tracking-widest uppercase text-xs">Waiting for today's data...</p>
              </div>
            )}
          </div>

          {/* PRIORITY 2: HORIZONTAL QUICK NOTES GRID (NO SCROLLING NEEDED!) */}
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2">
              <Zap size={20} className="text-amber-500" /> Operations Summary
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
                <p className="text-xs font-bold text-orange-600 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Award size={14} /> Distance Leader</p>
                <p className="text-sm font-medium text-gray-800"><strong>{topEarner}</strong> drove the most today.</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100">
                <p className="text-xs font-bold text-purple-600 uppercase tracking-widest mb-1 flex items-center gap-1.5"><PieChart size={14} /> Fleet Usage</p>
                <p className="text-sm font-medium text-gray-800"><strong>{fleetUsage}%</strong> of drivers are active.</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Clock size={14} /> Busiest Hour</p>
                <p className="text-sm font-medium text-gray-800">Peak traffic at <strong>{peakTime}</strong>.</p>
              </div>
              <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Timer size={14} /> Drive Time</p>
                <p className="text-sm font-medium text-gray-800"><strong>{totalHoursToday} hours</strong> logged on road.</p>
              </div>
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Map size={14} /> Top Region</p>
                <p className="text-sm font-medium text-gray-800"><strong>{mainRegion}</strong> is most active.</p>
              </div>
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                <p className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Bus size={14} /> Main Vehicle</p>
                <p className="text-sm font-medium text-gray-800">Mostly <strong>{mainVehicle}</strong> trips.</p>
              </div>
              <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 lg:col-span-2">
                <p className="text-xs font-bold text-rose-600 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Route size={14} /> Longest Single Trip</p>
                <p className="text-sm font-medium text-gray-800">The longest continuous mapped route today was <strong>{longestTrip} km</strong>.</p>
              </div>
            </div>
          </div>

          {/* PRIORITY 3: RECENT 10 TRIPS WITH ADVANCED METRICS */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h2 className="text-sm font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
                <History size={16} className="text-blue-600" /> 10 Most Recent Trips
              </h2>
              <Link href="/trip-logs" className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">
                View All Trip Logs <ArrowRight size={14} />
              </Link>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-white">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Driver</th>
                    <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Time Logged</th>
                    <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Distance</th>
                    <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-1"><Zap size={12}/> Avg Speed</th>
                    <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest"><div className="flex items-center gap-1 text-emerald-600"><Timer size={12}/> Moving</div></th>
                    <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest"><div className="flex items-center gap-1 text-red-500"><Clock size={12}/> Idle</div></th>
                    <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-50">
                  {recent10Trips.length > 0 ? (
                    recent10Trips.map((trip) => {
                      const durationMs = (trip.endTime && trip.endTime > trip.startTime) ? (trip.endTime - trip.startTime) : 0;
                      let movingMs = 0, idleMs = 0;
                      
                      if (durationMs > 0) {
                        if (trip.routePoints && trip.routePoints.length > 0) {
                          const ratio = getMovingRatio(trip.routePoints);
                          movingMs = durationMs * ratio;
                          idleMs = durationMs * (1 - ratio);
                        } else { movingMs = durationMs; }
                      }
                      const durationHours = durationMs / 3600000;
                      const avgSpeed = durationHours > 0 ? (trip.totalDistance / durationHours) : 0;

                      return (
                        <tr key={trip.id} className="hover:bg-blue-50/30 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{trip.driverName || 'Unknown'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium"><span className="font-bold text-gray-700">{format(new Date(trip.startTime), 'MMM dd')}</span>, {format(new Date(trip.startTime), 'hh:mm a')}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-blue-600">{trip.totalDistance.toFixed(2)} km</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-amber-500">{avgSpeed.toFixed(1)} km/h</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-emerald-600">{formatMs(movingMs)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-500">{formatMs(idleMs)}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Link href={`/trip/${trip.id}`} className="flex items-center gap-1 w-max text-gray-500 hover:text-blue-600 font-bold text-xs transition-colors">
                              View Route Map <ArrowRight size={12} />
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr><td colSpan={7} className="px-6 py-8 text-center text-sm font-bold text-gray-400">No trips recorded recently.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="mb-6"><h2 className="text-2xl font-black text-gray-900">Regional Analytics Dashboard</h2><p className="text-gray-500 text-sm font-medium">Analyze efficiency and fleet distribution across J&K.</p></div>
          {trips.length > 0 ? <RegionAnalytics trips={validTrips} /> : <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl"><p className="text-gray-400 font-bold tracking-widest uppercase text-xs">Waiting for data...</p></div>}
        </div>
      )}
    </div>
  );
}

export default function HomeWithAuth() {
  return (
    <ProtectedRoute>
      <Home />
    </ProtectedRoute>
  );
}