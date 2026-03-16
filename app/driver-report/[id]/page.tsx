'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { TripService } from '@/services/tripService';
import { Trip } from '@/types/trip';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format } from 'date-fns';
import { User, Map, Bus, Mail, Phone, MapPin, ArrowLeft, Download, Clock, Activity, Timer } from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import Link from 'next/link';

interface DriverProfile {
  name?: string;
  email?: string;
  phone?: string;
  vehicleNo?: string;
  vehicleCapacity?: string;
  region?: string;
}

// Math to figure out if the bus is moving or stuck/idle
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

// Helper to format milliseconds into readable "2h 15m" format
const formatMs = (ms: number) => {
  if (!ms || ms <= 0) return '0m';
  const totalMins = Math.floor(ms / 60000);
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
};

function DriverReport() {
  const params = useParams();
  const router = useRouter();
  const driverId = params.id as string;
  
  const [trips, setTrips] = useState<Trip[]>([]);
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Totals
  const [totalDistance, setTotalDistance] = useState(0);
  const [driverName, setDriverName] = useState('Loading...');
  const [totalMovingMs, setTotalMovingMs] = useState(0);
  const [totalIdleMs, setTotalIdleMs] = useState(0);
  const [averageSpeed, setAverageSpeed] = useState(0);

  useEffect(() => {
    const fetchDriverData = async () => {
      try {
        setLoading(true);
        
        // 1. Fetch Driver Profile Details
        const driverDoc = await getDoc(doc(db, "drivers", driverId));
        if (driverDoc.exists()) {
          setDriverProfile(driverDoc.data() as DriverProfile);
        }

        // 2. Fetch Trips
        const allTrips = await TripService.getAllTrips();
        const driverTrips = allTrips.filter(t => t.driverId === driverId);
        
        driverTrips.sort((a, b) => b.startTime - a.startTime);
        setTrips(driverTrips);

        if (driverTrips.length > 0) {
          setDriverName(driverTrips[0].driverName || driverDoc.data()?.name || 'Unknown Driver');
          
          let dist = 0;
          let movingMs = 0;
          let idleMs = 0;
          let totalDurationHours = 0;

          driverTrips.forEach(trip => {
            dist += trip.totalDistance;
            
            const durationMs = (trip.endTime && trip.endTime > trip.startTime) ? (trip.endTime - trip.startTime) : 0;
            if (durationMs > 0) {
              totalDurationHours += (durationMs / 3600000);
              
              if (trip.routePoints && trip.routePoints.length > 0) {
                const ratio = getMovingRatio(trip.routePoints);
                movingMs += (durationMs * ratio);
                idleMs += (durationMs * (1 - ratio));
              } else {
                movingMs += durationMs;
              }
            }
          });

          setTotalDistance(dist);
          setTotalMovingMs(movingMs);
          setTotalIdleMs(idleMs);
          setAverageSpeed(totalDurationHours > 0 ? (dist / totalDurationHours) : 0);

        } else if (driverDoc.exists()) {
          setDriverName(driverDoc.data()?.name || 'Unknown Driver');
        }

      } catch (err) {
        console.error("Error loading driver report:", err);
      } finally {
        setLoading(false);
      }
    };

    if (driverId) {
      fetchDriverData();
    }
  }, [driverId]);

  // Download PDF Function
  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.text("Official Driver Performance Report", 14, 20);
    
    doc.setFontSize(11);
    doc.text(`Driver Name: ${driverName}`, 14, 30);
    doc.text(`Contact: ${driverProfile?.phone || 'N/A'} | ${driverProfile?.email || 'N/A'}`, 14, 36);
    doc.text(`Region: ${driverProfile?.region || 'N/A'}`, 14, 42);
    doc.text(`Total Distance: ${totalDistance.toFixed(2)} km`, 14, 48);
    doc.text(`Avg Speed: ${averageSpeed.toFixed(1)} km/h`, 14, 54);
    doc.text(`Driving Time: ${formatMs(totalMovingMs)} | Stopped Time: ${formatMs(totalIdleMs)}`, 14, 60);

    // Table
    const rows = trips.map((trip, index) => [
      index + 1,
      format(new Date(trip.startTime), 'MMM dd, yyyy'),
      format(new Date(trip.startTime), 'hh:mm a'),
      trip.endTime ? format(new Date(trip.endTime), 'hh:mm a') : 'Ongoing',
      `${trip.totalDistance.toFixed(2)} km`,
      trip.id
    ]);

    autoTable(doc, {
      head: [['#', 'Date', 'Start Time', 'End Time', 'Distance', 'Trip ID']],
      body: rows,
      startY: 68,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] }
    });

    doc.save(`Driver_Report_${driverName.replace(/\s+/g, '_')}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
        <p className="text-gray-500 font-bold tracking-widest uppercase text-sm">Generating Official Report...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-8 space-y-8">
      
      {/* Top Navigation Row */}
      <div className="flex justify-between items-center">
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-500 hover:text-blue-600 font-bold transition-colors bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm"
        >
          <ArrowLeft size={18} /> Back to Dashboard
        </button>
        
        <button 
          onClick={handleDownloadPDF}
          className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-5 py-2.5 rounded-xl text-sm font-black shadow-sm transition-colors"
        >
          <Download size={18} /> Download as PDF
        </button>
      </div>

      {/* Title Area */}
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">Driver Performance Report</h1>
        <p className="text-gray-500 font-medium text-sm">Official record of all identity details and trips logged by this operator.</p>
      </div>

      {/* Driver Identity & Metrics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Side: Contact & Identity */}
        <div className="bg-white border border-gray-200 rounded-3xl p-6 md:p-8 shadow-sm h-full flex flex-col">
          <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-gray-100 pb-4 shrink-0">
            <User size={16} /> Identity & Contact
          </h2>
          
          <div className="space-y-6 flex-1">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Operator Name</p>
              <p className="text-2xl font-black text-gray-900">{driverName}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <Phone size={16} className="text-blue-500 shrink-0" />
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Phone Number</p>
                  <p className="text-sm font-bold text-gray-700">{driverProfile?.phone || 'Not Provided'}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <Mail size={16} className="text-blue-500 shrink-0" />
                <div className="w-full">
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Email Address</p>
                  <p className="text-sm font-bold text-gray-700 break-all">{driverProfile?.email || 'Not Provided'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <MapPin size={16} className="text-blue-500 shrink-0" />
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Assigned Region</p>
                  <p className="text-sm font-bold text-gray-700 uppercase">{driverProfile?.region || 'Unknown'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <Bus size={16} className="text-blue-500 shrink-0" />
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Vehicle Size</p>
                  <p className="text-sm font-bold text-gray-700">{driverProfile?.vehicleCapacity || 'Unassigned'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Lifetime Stats (UPGRADED) */}
        <div className="bg-white border border-gray-200 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col justify-between">
          <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-gray-100 pb-4">
            <Activity size={16} /> Lifetime Operations
          </h2>
          
          <div className="grid grid-cols-2 gap-y-6 gap-x-4 mb-6">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Distance</p>
              <h3 className="text-3xl font-black text-blue-600">{totalDistance.toFixed(1)} <span className="text-sm text-gray-400">km</span></h3>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Trips</p>
              <h3 className="text-3xl font-black text-gray-900">{trips.length}</h3>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Timer size={12}/> Moving Time</p>
              <h3 className="text-xl font-black text-green-600">{formatMs(totalMovingMs)}</h3>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Clock size={12}/> Stopped Time</p>
              <h3 className="text-xl font-black text-red-500">{formatMs(totalIdleMs)}</h3>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Avg Speed</p>
              <p className="text-lg font-black text-blue-800">
                {averageSpeed.toFixed(1)} <span className="text-xs">km/h</span>
              </p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Avg Trip Length</p>
              <p className="text-lg font-black text-gray-800">
                {trips.length > 0 ? (totalDistance / trips.length).toFixed(1) : 0} <span className="text-xs">km</span>
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Complete Trip History */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <h2 className="text-sm font-black text-gray-800 uppercase tracking-widest">Complete Trip History</h2>
          <span className="px-3 py-1 bg-gray-200 text-gray-700 text-xs font-bold rounded-full">
            Showing all {trips.length} records
          </span>
        </div>
        
        {trips.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 font-bold">No trips have been recorded by this driver yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-white">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest">S.No.</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Time (Start - End)</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Distance</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {trips.map((trip, index) => (
                  <tr key={trip.id} className="hover:bg-blue-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-gray-400">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                      {format(new Date(trip.startTime), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                      {format(new Date(trip.startTime), 'hh:mm a')} - {trip.endTime ? format(new Date(trip.endTime), 'hh:mm a') : 'Ongoing'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-gray-800">
                      {trip.totalDistance.toFixed(2)} km
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {/* Fixed Link path & converted to a blue button */}
                      <Link 
                        href={`/trip/${trip.id}`} 
                        className="flex items-center gap-1.5 w-max bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 hover:text-blue-800 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                      >
                        <Map size={14} /> View Trip
                      </Link>
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

export default function DriverReportPage() {
  return (
    <ProtectedRoute>
      <DriverReport />
    </ProtectedRoute>
  );
}