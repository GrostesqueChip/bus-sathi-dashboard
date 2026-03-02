"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Search, Calendar, MapPin, Bus, RefreshCw } from "lucide-react";

// Dynamically import the map so it doesn't crash Next.js SSR
const GodModeMap = dynamic(() => import("@/components/map/GodModeMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-gray-100 animate-pulse flex items-center justify-center">Loading 3D Map Engine...</div>
});

export default function GodModePage() {
  const [geoData, setGeoData] = useState<any>(null);
  const [filteredData, setFilteredData] = useState<any>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [regionFilter, setRegionFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");

  // 1. Load the QGIS Master File exactly once
  useEffect(() => {
    fetch('/data/god_mode.geojson')
      .then(res => res.json())
      .then(data => {
        setGeoData(data);
        setFilteredData(data); // Initially show everything
      })
      .catch(err => console.error("Failed to load QGIS data:", err));
  }, []);

  // 2. Apply Filters whenever search, region, or date changes
  useEffect(() => {
    if (!geoData) return;

    // We filter the "features" array inside the GeoJSON
    const filteredFeatures = geoData.features.filter((feature: any) => {
      const props = feature.properties;

      // Check Region
      const matchesRegion = regionFilter === "all" || 
        (props.region && props.region.toLowerCase() === regionFilter.toLowerCase());

      // Check Date (Comparing string "YYYY-MM-DD")
      const matchesDate = !dateFilter || props.date === dateFilter;

      // Check Search (Driver Name, Vehicle No, or Trip ID)
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || 
        (props.driverName && props.driverName.toLowerCase().includes(searchLower)) ||
        (props.vehicle && props.vehicle.toLowerCase().includes(searchLower)) ||
        (props.tripId && props.tripId.toLowerCase().includes(searchLower));

      return matchesRegion && matchesDate && matchesSearch;
    });

    // Update the map data
    setFilteredData({
      ...geoData,
      features: filteredFeatures
    });

  }, [searchQuery, regionFilter, dateFilter, geoData]);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-gray-50 p-4">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">God Mode: Network Analysis</h1>
        <p className="text-gray-500">Post-trip spatial rationalization powered by QGIS.</p>
      </div>

      <div className="flex gap-4 h-full">
        {/* LEFT PANEL: Filters */}
        <div className="w-80 bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col gap-6">
          
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Search Entity</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Driver, Vehicle, or Trip ID"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Region</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
              >
                <option value="all">All Regions</option>
                <option value="jammu">Jammu</option>
                <option value="srinagar">Srinagar</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Trip Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="mt-auto pt-4 border-t border-gray-100">
             <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-sm mb-4">
                <b>Showing:</b> {filteredData ? filteredData.features.length : 0} routes
             </div>
             <button 
                onClick={() => { setSearchQuery(""); setRegionFilter("all"); setDateFilter(""); }}
                className="w-full flex items-center justify-center gap-2 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition"
             >
                <RefreshCw className="w-4 h-4" /> Reset Filters
             </button>
          </div>
        </div>

        {/* RIGHT PANEL: The Map */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {filteredData && <GodModeMap geoJsonData={filteredData} />}
        </div>
      </div>
    </div>
  );
}