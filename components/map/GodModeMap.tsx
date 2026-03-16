"use client";

import { useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default Leaflet icons in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// The upgraded camera helper with City Presets!
function MapFitter({ geoJsonData, selectedRegion }: { geoJsonData: any, selectedRegion?: string }) {
  const map = useMap();
  
  useEffect(() => {
    // 1. COMMAND CENTER PRESETS: Force the camera to the exact city coordinates
    if (selectedRegion === 'jammu') {
      map.flyTo([32.7266, 74.8570], 11, { duration: 1.5 }); // Jammu Coordinates
      return;
    }
    
    if (selectedRegion === 'srinagar') {
      map.flyTo([34.0837, 74.7973], 11, { duration: 1.5 }); // Srinagar Coordinates
      return;
    }

    // 2. DYNAMIC FIT: If searching or viewing "All", fit to the data bounds
    if (geoJsonData && geoJsonData.features && geoJsonData.features.length > 0) {
      try {
        const geoJsonLayer = L.geoJSON(geoJsonData);
        const bounds = geoJsonLayer.getBounds();
        
        if (bounds.isValid()) {
          setTimeout(() => {
            map.invalidateSize(); 
            map.flyToBounds(bounds, { 
              padding: [50, 50], 
              maxZoom: 12,
              duration: 1.5 
            });
          }, 100);
        }
      } catch (error) {
        console.error("Camera swoop failed:", error);
      }
    }
  }, [geoJsonData, selectedRegion, map]);
  
  return null;
}

export default function GodModeMap({ geoJsonData, selectedRegion }: { geoJsonData: any, selectedRegion?: string }) {
  return (
    <MapContainer 
      center={[33.4, 74.8]} // Default center between Jammu and Srinagar
      zoom={8} 
      className="w-full h-full z-0"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
      />
      
      {/* Our preset camera helper sits right here */}
      <MapFitter geoJsonData={geoJsonData} selectedRegion={selectedRegion} />

      {/* The key forces Leaflet to redraw the map when filters change */}
      {geoJsonData && (
         <GeoJSON 
           key={JSON.stringify(geoJsonData)}
           data={geoJsonData}
           style={(feature: any) => {
             const vehicle = feature?.properties?.vehicleCapacity?.toLowerCase() || '';
             let routeColor = '#9ca3af'; 

             if (vehicle.includes('lpv') || vehicle.includes('5 to 13')) {
               routeColor = '#f59e0b'; 
             } else if (vehicle.includes('mpv') || vehicle.includes('17 to 21')) {
               routeColor = '#3b82f6'; 
             } else if (vehicle.includes('hpv') || vehicle.includes('32 to 52')) {
               routeColor = '#ef4444'; 
             }

             return {
               color: routeColor,
               weight: 4,
               opacity: 0.7,
             };
           }}
           onEachFeature={(feature, layer) => {
             const props = feature.properties || {};
             layer.bindPopup(`
               <div style="padding: 5px;">
                 <h3 style="font-weight: bold; font-size: 16px; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-bottom: 8px;">${props.driverName || 'Unknown Driver'}</h3>
                 <p style="margin: 2px 0; font-size: 13px;"><b>Bus No:</b> ${props.vehicle || 'N/A'}</p>
                 <p style="margin: 2px 0; font-size: 13px;"><b>Type:</b> <span style="color: #ea580c; font-weight: bold;">${props.vehicleCapacity || 'Unknown'}</span></p>
                 <p style="margin: 2px 0; font-size: 13px;"><b>Date:</b> ${props.date || 'N/A'}</p>
                 <p style="margin: 2px 0; font-size: 13px;"><b>Region:</b> <span style="text-transform: uppercase; color: #2563eb; font-weight: bold;">${props.region || 'N/A'}</span></p>
                 <p style="margin: 8px 0 0 0; font-size: 11px; color: #666;">ID: ${props.tripId || 'N/A'}</p>
               </div>
             `);
           }}
         />
      )}
    </MapContainer>
  );
}