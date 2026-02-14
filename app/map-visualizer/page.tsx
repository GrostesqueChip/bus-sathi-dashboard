"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase"; // Make sure this path is correct

// Dynamically import our NEW multi-trip map
const MultiTripMap = dynamic(() => import("@/components/MultiTripMap"), { ssr: false });

export default function MapVisualizerPage() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  
  const [selectedDriver, setSelectedDriver] = useState("ALL");
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  useEffect(() => {
    const fetchData = async () => {
      // Fetch Drivers
      const driverSnap = await getDocs(collection(db, "drivers"));
      const driverData = driverSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDrivers(driverData);

      // Fetch Trips 
      const tripSnap = await getDocs(collection(db, "trips"));
      const tripData = tripSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTrips(tripData);
    };
    fetchData();
  }, []);

  const driversMap = useMemo(() => {
    return drivers.reduce((acc, driver) => {
      acc[driver.uid] = driver;
      return acc;
    }, {});
  }, [drivers]);

  const filteredTrips = trips.filter((trip) => {
    const driver = driversMap[trip.uid];
    if (!driver) return false;

    const matchDriver = selectedDriver === "ALL" || driver.uid === selectedDriver;
    const matchCategory = selectedCategory === "ALL" || driver.vehicleCapacity === selectedCategory;
    
    return matchDriver && matchCategory;
  });

  return (
    <div className="flex flex-col h-screen p-6 bg-gray-50 text-black">
      <h1 className="text-3xl font-bold mb-6">Bus Route Visualizer</h1>
      
      <div className="flex flex-wrap gap-4 mb-6 bg-white p-4 rounded-xl shadow-sm border">
        <select 
          className="border border-gray-300 p-2 rounded-lg bg-white"
          value={selectedDriver} 
          onChange={(e) => setSelectedDriver(e.target.value)}
        >
          <option value="ALL">All Drivers</option>
          {drivers.map(d => (
            <option key={d.uid} value={d.uid}>{d.name}</option>
          ))}
        </select>

        <select 
          className="border border-gray-300 p-2 rounded-lg bg-white"
          value={selectedCategory} 
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="ALL">All Categories</option>
          <option value="17 to 21 seater (MPV)">17 to 21 seater (MPV)</option>
          <option value="32 to 52 seater (HPV)">32 to 52 seater (HPV)</option>
          <option value="5 to 13 seater (LPV)">5 to 13 seater (LPV)</option>
        </select>
      </div>

      <div className="flex-1 rounded-xl overflow-hidden border shadow-sm z-0 relative">
         <MultiTripMap trips={filteredTrips} driversMap={driversMap} />
      </div>
    </div>
  );
}