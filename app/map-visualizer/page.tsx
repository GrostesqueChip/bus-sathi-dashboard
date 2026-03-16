"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Search, Calendar, MapPin, RefreshCw, Route } from "lucide-react";

// Dynamically import the map so it doesn't crash Next.js SSR
const GodModeMap = dynamic(() => import("@/components/map/GodModeMap"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 bg-slate-50 flex flex-col items-center justify-center z-0">
      <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mb-4"></div>
      <p className="text-blue-600 font-bold tracking-widest uppercase text-sm">Initializing God Mode...</p>
    </div>
  )
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
    // The main container is set to fill the screen minus the headers
    <div className="relative w-full h-[calc(100vh-6rem)] min-h-[700px] rounded-3xl overflow-hidden shadow-xl border border-gray-200">
      
      {/* BACKGROUND: The Map Layer takes up 100% of the space */}
      <div className="absolute inset-0 z-0 bg-slate-100">
       {filteredData && <GodModeMap geoJsonData={filteredData} selectedRegion={regionFilter} />}
      </div>

      {/* FOREGROUND: Floating Glassmorphism Control Panel */}
      <div className="absolute top-6 left-6 z-10 w-80 md:w-[350px] bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-white/40 flex flex-col overflow-hidden transition-all">
        
        {/* Panel Header */}
        <div className="bg-slate-900 p-6 text-white">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-blue-400"><Route size={24} /></span>
            <h1 className="text-xl font-black tracking-tight">God Mode</h1>
          </div>
          <p className="text-slate-400 text-xs font-medium uppercase tracking-widest">Network Route Analysis</p>
        </div>

        {/* Live HUD Badge */}
        <div className="bg-blue-50 border-b border-blue-100 px-6 py-3 flex justify-between items-center">
          <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">Active Routes</span>
          <span className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-black shadow-sm">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
            {filteredData ? filteredData.features.length : 0} Visible
          </span>
        </div>

        {/* Filters Section */}
        <div className="p-6 flex flex-col gap-5">
          
          {/* Search Box */}
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Search Records</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Driver, Vehicle, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all font-medium text-gray-700 placeholder-gray-400 shadow-inner"
              />
            </div>
          </div>

          {/* Region Dropdown */}
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Region Filter</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none appearance-none transition-all font-medium text-gray-700 shadow-inner"
              >
                <option value="all">All J&K Regions</option>
                <option value="jammu">Jammu</option>
                <option value="srinagar">Srinagar</option>
              </select>
            </div>
          </div>

          {/* Date Picker */}
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Date Filter</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all font-medium text-gray-700 shadow-inner"
              />
            </div>
          </div>

          {/* Reset Button */}
          <div className="mt-2">
             <button 
                onClick={() => { setSearchQuery(""); setRegionFilter("all"); setDateFilter(""); }}
                className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-700 rounded-xl text-sm font-bold transition-all shadow-sm"
             >
                <RefreshCw className="w-4 h-4" /> Reset Map Filters
             </button>
          </div>
        </div>

      </div>

    </div>
  );
}