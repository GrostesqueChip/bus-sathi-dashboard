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

// Helper component to auto-zoom the map to fit the filtered lines
function MapFitter({ geoJsonData }: { geoJsonData: any }) {
  const map = useMap();
  useEffect(() => {
    if (geoJsonData && geoJsonData.features && geoJsonData.features.length > 0) {
      const bounds = L.geoJSON(geoJsonData).getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [geoJsonData, map]);
  return null;
}

export default function GodModeMap({ geoJsonData }: { geoJsonData: any }) {
  return (
    <MapContainer 
      center={[32.73, 74.87]} 
      zoom={12} 
      className="w-full h-full"
      style={{ minHeight: '500px' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
      />
      
      <MapFitter geoJsonData={geoJsonData} />

      {/* The key forces Leaflet to redraw the map when filters change */}
      {geoJsonData && (
         <GeoJSON 
           key={JSON.stringify(geoJsonData)}
           data={geoJsonData}
           style={(feature: any) => {
             // Look at the capacity to determine the line color
             const vehicle = feature?.properties?.vehicleCapacity?.toLowerCase() || '';
             let routeColor = '#9ca3af'; // Default: Gray

             if (vehicle.includes('lpv') || vehicle.includes('5 to 13')) {
               routeColor = '#f59e0b'; // Amber/Yellow for Small Vans (LPV)
             } else if (vehicle.includes('mpv') || vehicle.includes('17 to 21')) {
               routeColor = '#3b82f6'; // Blue for Medium Buses (MPV)
             } else if (vehicle.includes('hpv') || vehicle.includes('32 to 52')) {
               routeColor = '#ef4444'; // Red for Heavy/Large Buses (HPV)
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