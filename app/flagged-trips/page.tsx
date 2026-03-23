'use client';

import { useEffect, useState, useMemo } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { TripService } from '@/services/tripService';
import { Trip } from '@/types/trip';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format } from 'date-fns';
import Link from 'next/link';
import { AlertOctagon, Trash2, Map, ShieldAlert, Activity, MapPin, Zap, Clock, RouteOff, FilterX } from 'lucide-react';

interface FlaggedTrip extends Trip {
  reasons: string[];
}

function AnomalyConsole() {
  const [flaggedTrips, setFlaggedTrips] = useState<FlaggedTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // NEW: State to track which filter card is currently clicked
  const [activeFilter, setActiveFilter] = useState<'zeroDist' | 'gps' | 'speed' | 'abandoned' | null>(null);

  useEffect(() => {
    fetchAndAnalyzeTrips();
  }, []);

  const fetchAndAnalyzeTrips = async () => {
    try {
      setLoading(true);
      const allTrips = await TripService.getAllTrips();
      
      const anomalies: FlaggedTrip[] = [];

      allTrips.forEach((trip: Trip) => {
        const reasons: string[] = [];
        const durationMs = (trip.endTime && trip.startTime) ? (trip.endTime - trip.startTime) : 0;
        const durationHours = durationMs / 3600000;

        if (trip.totalDistance < 0.1 && durationHours > 0.08) {
          reasons.push("0 Distance logged despite time elapsed.");
        }

        if (durationHours > 0 && (trip.totalDistance / durationHours) > 100) {
          reasons.push("Unrealistic overall average speed (>100 km/h).");
        }

        if (!trip.endTime && (Date.now() - trip.startTime) > 86400000) {
          reasons.push("Trip abandoned (No end time logged after 24h).");
        }

        let hasTeleportation = false;
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
                  hasTeleportation = true;
                  break;
                }
              }
            }
          }
        }

        if (hasTeleportation) {
          reasons.push("Erratic GPS jumps or Teleportation detected.");
        }

        if (reasons.length > 0) {
          anomalies.push({ ...trip, reasons });
        }
      });

      setFlaggedTrips(anomalies.sort((a, b) => b.startTime - a.startTime));
    } catch (err) {
      console.error("Error analyzing trips:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (tripId: string) => {
    const confirmDelete = window.confirm("Are you sure you want to permanently delete this corrupted trip? This cannot be undone.");
    if (!confirmDelete) return;

    try {
      setDeletingId(tripId);
      await deleteDoc(doc(db, "trips", tripId)); 
      setFlaggedTrips(prev => prev.filter(t => t.id !== tripId));
    } catch (error) {
      console.error("Failed to delete trip:", error);
      alert("Failed to delete the trip. Check console for errors.");
    } finally {
      setDeletingId(null);
    }
  };

  // Group anomalies for the columns
  const zeroDistTrips = useMemo(() => flaggedTrips.filter(t => t.reasons.some(r => r.includes("0 Distance"))), [flaggedTrips]);
  const gpsErrorTrips = useMemo(() => flaggedTrips.filter(t => t.reasons.some(r => r.includes("GPS jumps"))), [flaggedTrips]);
  const speedErrorTrips = useMemo(() => flaggedTrips.filter(t => t.reasons.some(r => r.includes("average speed"))), [flaggedTrips]);
  const abandonedTrips = useMemo(() => flaggedTrips.filter(t => t.reasons.some(r => r.includes("abandoned"))), [flaggedTrips]);

  // NEW: Decide which trips to actually show in the table based on the clicked card
  const displayedTrips = useMemo(() => {
    if (activeFilter === 'zeroDist') return zeroDistTrips;
    if (activeFilter === 'gps') return gpsErrorTrips;
    if (activeFilter === 'speed') return speedErrorTrips;
    if (activeFilter === 'abandoned') return abandonedTrips;
    return flaggedTrips; // If no filter is active, show all
  }, [activeFilter, flaggedTrips, zeroDistTrips, gpsErrorTrips, speedErrorTrips, abandonedTrips]);

  // NEW: Helper to toggle filters on click
  const toggleFilter = (filter: 'zeroDist' | 'gps' | 'speed' | 'abandoned') => {
    if (activeFilter === filter) setActiveFilter(null); // Click again to turn off
    else setActiveFilter(filter);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-red-600"></div>
        <p className="text-gray-500 font-bold tracking-widest uppercase text-sm">Scanning database for anomalies...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-gray-200 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <AlertOctagon size={28} className="text-red-500" />
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">Flagged Anomalies</h1>
          </div>
          <p className="text-base text-gray-500 font-medium max-w-2xl">
            Review and clear trips with corrupted GPS data, impossible speeds, or zero-distance logs to keep analytics accurate.
          </p>
        </div>
        
        {/* Global Delete All Button (Disabled) */}
        <button 
          disabled
          className="bg-red-50 border border-red-200 text-red-400 px-6 py-3 rounded-2xl flex items-center gap-2 shadow-sm font-black transition-colors opacity-60 cursor-not-allowed"
          title="Delete All functionality is currently locked for safety."
        >
          <Trash2 size={20} />
          WIPE ALL {flaggedTrips.length} ERRORS
        </button>
      </div>

      {/* MAJOR COLUMNS: Error Categories Breakdown (NOW CLICKABLE FILTERS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        
        {/* Column 1: Zero Distance */}
        <div 
          onClick={() => toggleFilter('zeroDist')}
          className={`bg-white rounded-3xl p-6 shadow-sm flex flex-col justify-between cursor-pointer transition-all duration-200 hover:shadow-md ${activeFilter === 'zeroDist' ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50/10' : 'border border-gray-200 hover:border-blue-300'}`}
        >
          <div>
            <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center mb-4">
              <RouteOff size={20} />
            </div>
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-1">0 Distance Logged</h3>
            <p className="text-xs text-gray-500 font-medium mb-4">Timer ran, but bus did not move.</p>
            <p className="text-4xl font-black text-orange-500 mb-6">{zeroDistTrips.length}</p>
          </div>
          <button disabled className="w-full flex justify-center items-center gap-2 py-3 bg-gray-50 border border-gray-200 text-gray-400 rounded-xl text-xs font-bold opacity-60 cursor-not-allowed">
            <Trash2 size={14} /> Delete All ({zeroDistTrips.length})
          </button>
        </div>

        {/* Column 2: GPS Errors */}
        <div 
          onClick={() => toggleFilter('gps')}
          className={`bg-white rounded-3xl p-6 shadow-sm flex flex-col justify-between cursor-pointer transition-all duration-200 hover:shadow-md ${activeFilter === 'gps' ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50/10' : 'border border-gray-200 hover:border-blue-300'}`}
        >
          <div>
            <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-4">
              <MapPin size={20} />
            </div>
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-1">GPS Teleportation</h3>
            <p className="text-xs text-gray-500 font-medium mb-4">Impossible jumps between points.</p>
            <p className="text-4xl font-black text-red-500 mb-6">{gpsErrorTrips.length}</p>
          </div>
          <button disabled className="w-full flex justify-center items-center gap-2 py-3 bg-gray-50 border border-gray-200 text-gray-400 rounded-xl text-xs font-bold opacity-60 cursor-not-allowed">
            <Trash2 size={14} /> Delete All ({gpsErrorTrips.length})
          </button>
        </div>

        {/* Column 3: Impossible Speeds */}
        <div 
          onClick={() => toggleFilter('speed')}
          className={`bg-white rounded-3xl p-6 shadow-sm flex flex-col justify-between cursor-pointer transition-all duration-200 hover:shadow-md ${activeFilter === 'speed' ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50/10' : 'border border-gray-200 hover:border-blue-300'}`}
        >
          <div>
            <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
              <Zap size={20} />
            </div>
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-1">Speed Spikes</h3>
            <p className="text-xs text-gray-500 font-medium mb-4">Average speed above 100km/h.</p>
            <p className="text-4xl font-black text-purple-500 mb-6">{speedErrorTrips.length}</p>
          </div>
          <button disabled className="w-full flex justify-center items-center gap-2 py-3 bg-gray-50 border border-gray-200 text-gray-400 rounded-xl text-xs font-bold opacity-60 cursor-not-allowed">
            <Trash2 size={14} /> Delete All ({speedErrorTrips.length})
          </button>
        </div>

        {/* Column 4: Abandoned Trips */}
        <div 
          onClick={() => toggleFilter('abandoned')}
          className={`bg-white rounded-3xl p-6 shadow-sm flex flex-col justify-between cursor-pointer transition-all duration-200 hover:shadow-md ${activeFilter === 'abandoned' ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50/10' : 'border border-gray-200 hover:border-blue-300'}`}
        >
          <div>
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <Clock size={20} />
            </div>
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-1">Abandoned Logs</h3>
            <p className="text-xs text-gray-500 font-medium mb-4">Running over 24hrs without end.</p>
            <p className="text-4xl font-black text-blue-500 mb-6">{abandonedTrips.length}</p>
          </div>
          <button disabled className="w-full flex justify-center items-center gap-2 py-3 bg-gray-50 border border-gray-200 text-gray-400 rounded-xl text-xs font-bold opacity-60 cursor-not-allowed">
            <Trash2 size={14} /> Delete All ({abandonedTrips.length})
          </button>
        </div>

      </div>

      {/* Detailed Review Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden mt-8">
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
              <Activity size={16} className="text-red-500" /> Detailed Anomaly Log
            </h2>
            {activeFilter && (
              <button 
                onClick={() => setActiveFilter(null)}
                className="flex items-center gap-1 px-2 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-[10px] font-black rounded-md uppercase tracking-widest transition-colors"
              >
                <FilterX size={12} /> Clear Filter
              </button>
            )}
          </div>
          <span className={`px-3 py-1 text-xs font-black rounded-lg uppercase tracking-widest ${activeFilter ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
            {displayedTrips.length} {activeFilter ? 'Filtered Logs' : 'Total Logs'}
          </span>
        </div>
        
        {displayedTrips.length === 0 ? (
          <div className="text-center py-20">
            <span className="text-5xl mb-4 block">✨</span>
            <p className="text-gray-500 font-bold text-lg">No trips found in this category!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-white">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Driver</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Time Logged</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Flagged Reasons</th>
                  <th className="px-6 py-4 text-right text-xs font-black text-gray-400 uppercase tracking-widest">Manual Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {displayedTrips.map((trip) => (
                  <tr key={trip.id} className="hover:bg-red-50/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-bold text-gray-900">{trip.driverName || 'Unknown Driver'}</div>
                      <div className="text-xs font-mono text-gray-500 mt-1 flex items-center gap-1">
                         ID: {trip.id.substring(0, 8)}...
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-700">{format(new Date(trip.startTime), 'MMM dd, yyyy')}</div>
                      <div className="text-xs text-gray-500">{format(new Date(trip.startTime), 'hh:mm a')}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-2">
                        {trip.reasons.map((reason, idx) => (
                          <span key={idx} className="bg-red-50 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-bold w-max flex items-center gap-2 shadow-sm">
                            <AlertOctagon size={12} /> {reason}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link 
                          href={`/trip/${trip.id}`} 
                          className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-gray-50 border border-gray-200 hover:border-blue-300 text-gray-700 hover:text-blue-600 rounded-xl text-xs font-bold transition-all shadow-sm"
                        >
                          <Map size={14} /> Map
                        </Link>
                        {/* NEW: Individual Delete Button (Completely Disabled for safety) */}
                        <button 
                          disabled
                          className="flex items-center gap-1.5 px-4 py-2 bg-red-50 border border-red-200 text-red-400 rounded-xl text-xs font-bold opacity-60 cursor-not-allowed shadow-sm"
                          title="Manual deletion is currently locked for safety."
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>
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

export default function AnomalyPage() {
  return (
    <ProtectedRoute>
      <AnomalyConsole />
    </ProtectedRoute>
  );
}