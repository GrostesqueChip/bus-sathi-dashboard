'use client';

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Search, Calendar, MapPin, RefreshCw, Route, Activity, ShieldAlert, List } from "lucide-react";
import { TripService } from '@/services/tripService';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format } from 'date-fns';

const GodModeMap = dynamic(() => import("@/components/map/GodModeMap"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 bg-slate-50 flex flex-col items-center justify-center z-0">
      <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mb-4"></div>
      <p className="text-blue-600 font-bold tracking-widest uppercase text-sm">Initializing Live Satellite Feed...</p>
    </div>
  )
});

export default function GodModePage() {
  const [geoData, setGeoData] = useState<any>(null);
  const [filteredData, setFilteredData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [regionFilter, setRegionFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [qualityFilter, setQualityFilter] = useState("all");

  // 1. Fetch Data & Identify Anomalies
  useEffect(() => {
    const fetchLiveRoutes = async () => {
      try {
        setLoading(true);
        const [allTrips, driversSnapshot] = await Promise.all([
          TripService.getAllTrips(),
          getDocs(collection(db, "drivers"))
        ]);

        const driverMap: Record<string, any> = {};
        driversSnapshot.forEach(doc => {
          const data = doc.data();
          driverMap[doc.id] = data;
          if (data.name) driverMap[data.name.toLowerCase().trim()] = data;
        });

        const features: any[] = [];

        allTrips.forEach(trip => {
          if (!trip.routePoints || trip.routePoints.length < 2) return;

          const coordinates = trip.routePoints.map((p: any) => {
            const lat = Number(p.lat || p.latitude);
            const lng = Number(p.lng || p.longitude);
            return [lng, lat]; 
          }).filter((c: any) => !isNaN(c[0]) && !isNaN(c[1]));

          if (coordinates.length < 2) return;

          const driverDetails = driverMap[trip.driverId] || driverMap[trip.driverName?.toLowerCase().trim()] || {};
          const durationMs = (trip.endTime && trip.startTime) ? (trip.endTime - trip.startTime) : 0;
          const durationHours = durationMs / 3600000;
// ANOMALY DETECTION LOGIC (Now 100% synced with Flagged Trips page!)
          let isFlagged = false;
          const reasons: string[] = [];
          
          // 1. Zero Distance
          if (trip.totalDistance < 0.1 && durationHours > 0.08) {
            isFlagged = true; reasons.push("0 Distance");
          }
          // 2. Impossible Average Speed
          if (durationHours > 0 && (trip.totalDistance / durationHours) > 100) {
            isFlagged = true; reasons.push("Speed >100km/h");
          }
          // 3. Abandoned Trip
          if (!trip.endTime && (Date.now() - trip.startTime) > 86400000) {
            isFlagged = true; reasons.push("Abandoned Trip");
          }
          
          // 4. GPS Teleportation / Jumps (This was missing!)
          if (trip.routePoints && trip.routePoints.length > 2) {
            for (let i = 1; i < trip.routePoints.length; i++) {
              const p1 = trip.routePoints[i - 1];
              const p2 = trip.routePoints[i];
              
            const lat1 = Number((p1 as any).lat || (p1 as any).latitude);
            const lon1 = Number((p1 as any).lng || (p1 as any).longitude);
            const lat2 = Number((p2 as any).lat || (p2 as any).latitude);
            const lon2 = Number((p2 as any).lng || (p2 as any).longitude);
            
              const time1 = p1.timestamp || (p1 as any).time || 0;
              const time2 = p2.timestamp || (p2 as any).time || 0;

              if (lat1 && lon1 && lat2 && lon2 && time1 && time2 && time2 > time1) {
                const R = 6371; 
                const dLat = (lat2 - lat1) * Math.PI / 180;
                const dLon = (lon2 - lon1) * Math.PI / 180;
                const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                const distKm = R * c;
                
                const timeDiffHours = (time2 - time1) / 3600000;
                if (timeDiffHours > 0) {
                  const speed = distKm / timeDiffHours;
                  if (speed > 130) { 
                    isFlagged = true;
                    reasons.push("GPS Jumps");
                    break;
                  }
                }
              }
            }
          }
          features.push({
            type: "Feature",
            properties: {
              tripId: trip.id,
              driverName: trip.driverName || 'Unknown Driver',
              date: format(new Date(trip.startTime), 'yyyy-MM-dd'),
              time: format(new Date(trip.startTime), 'hh:mm a'),
              distance: trip.totalDistance?.toFixed(2) || '0.00',
              duration: durationHours > 0 ? `${Math.floor(durationHours)}h ${Math.floor((durationHours % 1) * 60)}m` : 'N/A',
              vehicle: driverDetails.vehicleNo || 'Unknown',
              vehicleCapacity: driverDetails.vehicleCapacity || 'Unassigned',
              region: driverDetails.region || 'Unknown',
              isFlagged: isFlagged,
              flagReasons: reasons.join(", ")
            },
            geometry: {
              type: "LineString",
              coordinates: coordinates
            }
          });
        });

        const masterGeoJson = { type: "FeatureCollection", features };
        setGeoData(masterGeoJson);
        setFilteredData(masterGeoJson);

      } catch (error) {
        console.error("Failed to load live map data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLiveRoutes();
  }, []);

  // 2. Apply Filters LIVE
  useEffect(() => {
    if (!geoData) return;

    const filteredFeatures = geoData.features.filter((feature: any) => {
      const props = feature.properties;
      const regionLower = props.region?.toLowerCase() || '';

      // FIX: Kashmir Division Database check (Catching "Srinagar" and "Kashmir")
      let matchesRegion = false;
      if (regionFilter === 'all') {
        matchesRegion = true;
      } else if (regionFilter === 'kashmir') {
        matchesRegion = regionLower.includes('kashmir') || regionLower.includes('srinagar');
      } else if (regionFilter === 'jammu') {
        matchesRegion = regionLower.includes('jammu');
      }

      const matchesDate = !dateFilter || props.date === dateFilter;

      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || 
        (props.driverName && props.driverName.toLowerCase().includes(searchLower)) ||
        (props.vehicle && props.vehicle.toLowerCase().includes(searchLower)) ||
        (props.tripId && props.tripId.toLowerCase().includes(searchLower));

      const matchesQuality = 
        qualityFilter === "all" || 
        (qualityFilter === "clean" && !props.isFlagged) || 
        (qualityFilter === "flagged" && props.isFlagged);

      return matchesRegion && matchesDate && matchesSearch && matchesQuality;
    });

    setFilteredData({ ...geoData, features: filteredFeatures });
  }, [searchQuery, regionFilter, dateFilter, qualityFilter, geoData]);

  return (
    <div className="relative w-full h-[calc(100vh-6rem)] min-h-[700px] rounded-3xl overflow-hidden shadow-xl border border-gray-200">
      
      {/* Map Layer */}
      <div className="absolute inset-0 z-0 bg-slate-100">
       {filteredData && <GodModeMap geoJsonData={filteredData} selectedRegion={regionFilter} />}
      </div>

      {/* Control Panel */}
      <div className="absolute top-6 left-6 z-10 w-80 md:w-[350px] bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-white/40 flex flex-col overflow-hidden transition-all max-h-[90vh] overflow-y-auto custom-scrollbar">
        
        <div className="bg-slate-900 p-6 text-white shrink-0">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-blue-400"><Route size={24} /></span>
            <h1 className="text-xl font-black tracking-tight">God Mode</h1>
          </div>
          <p className="text-slate-400 text-xs font-medium uppercase tracking-widest">Live Network Route Analysis</p>
        </div>

        <div className="bg-blue-50 border-b border-blue-100 px-6 py-4 flex justify-between items-center shrink-0">
          <span className="text-xs font-bold text-blue-800 uppercase tracking-wider flex items-center gap-2">
            <Activity size={14} className="animate-pulse text-blue-600"/> Mapped Routes
          </span>
          {loading ? (
             <span className="text-xs font-bold text-gray-400">Loading...</span>
          ) : (
            <span className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-black shadow-sm">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
              {filteredData ? filteredData.features.length : 0} Visible
            </span>
          )}
        </div>

        <div className="p-6 flex flex-col gap-5">
          
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1"><ShieldAlert size={12}/> Data Quality</label>
            <div className="flex bg-gray-100 p-1 rounded-xl">
              <button onClick={() => setQualityFilter('all')} className={`flex-1 text-xs font-bold py-2 rounded-lg transition-all ${qualityFilter === 'all' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>All Routes</button>
              <button onClick={() => setQualityFilter('clean')} className={`flex-1 text-xs font-bold py-2 rounded-lg transition-all ${qualityFilter === 'clean' ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}>Clean Only</button>
              <button onClick={() => setQualityFilter('flagged')} className={`flex-1 text-xs font-bold py-2 rounded-lg transition-all ${qualityFilter === 'flagged' ? 'bg-white shadow-sm text-red-600' : 'text-gray-500 hover:text-gray-700'}`}>Flagged</button>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Search Records</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input type="text" placeholder="Driver, Vehicle, or ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all font-medium text-gray-700 placeholder-gray-400 shadow-inner" />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Region Filter</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} className="w-full pl-9 pr-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none appearance-none transition-all font-medium text-gray-700 shadow-inner">
                <option value="all">All J&K Regions</option>
                <option value="jammu">Jammu Division</option>
                <option value="kashmir">Kashmir Division</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Date Filter</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="w-full pl-9 pr-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all font-medium text-gray-700 shadow-inner" />
            </div>
          </div>

          <div className="mt-2 shrink-0">
             <button onClick={() => { setSearchQuery(""); setRegionFilter("all"); setDateFilter(""); setQualityFilter("all"); }} className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-700 rounded-xl text-sm font-bold transition-all shadow-sm">
                <RefreshCw className="w-4 h-4" /> Reset Filters
             </button>
          </div>
        </div>
      </div>

      {/* NEW: Floating Map Legend (Bottom Left) */}
<div className="absolute bottom-24 right-6 z-10 bg-white/95 backdrop-blur-md px-4 py-3 rounded-2xl shadow-lg border border-gray-200 pointer-events-none">        <h4 className="text-[10px] font-black text-gray-800 uppercase tracking-widest mb-2 flex items-center gap-1.5"><List size={12}/> Route Legend</h4>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
            <div className="w-4 h-1 rounded-full bg-[#10b981]"></div> Heavy Buses (HPV)
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
            <div className="w-4 h-1 rounded-full bg-[#3b82f6]"></div> Medium Buses (MPV)
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
            <div className="w-4 h-1 rounded-full bg-[#f59e0b]"></div> Light Vans (LPV)
          </div>
          <div className="flex items-center gap-2 text-xs font-black text-red-500 mt-1 pt-1 border-t border-gray-100">
            <div className="w-4 h-1 rounded-full bg-[#ef4444] border-t-2 border-dashed border-white"></div> Flagged Anomalies
          </div>
        </div>
      </div>

    </div>
  );
}