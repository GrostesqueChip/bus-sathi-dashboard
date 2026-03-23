"use client";

import { useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapFitter({ selectedRegion }: { selectedRegion?: string }) {
  const map = useMap();
  
  useEffect(() => {
    // Force the camera strictly to J&K Regions. Ignores wild bounds.
    if (selectedRegion === 'jammu') {
      map.flyTo([32.7266, 74.8570], 10, { duration: 1.5 }); 
    } else if (selectedRegion === 'kashmir' || selectedRegion === 'srinagar') {
      map.flyTo([34.0837, 74.7973], 10, { duration: 1.5 }); 
    } else {
      // Default "All" view centered exactly between the two
      map.flyTo([33.4, 74.8], 8, { duration: 1.5 });
    }
  }, [selectedRegion, map]);
  
  return null;
}

export default function GodModeMap({ geoJsonData, selectedRegion }: { geoJsonData: any, selectedRegion?: string }) {
  
  // Approximate Boundaries of J&K to lock the map view
  const JNK_BOUNDS: L.LatLngBoundsExpression = [
    [31.5, 73.0], // South West
    [35.5, 80.0]  // North East
  ];

  return (
    <MapContainer 
      center={[33.4, 74.8]} 
      zoom={8} 
      minZoom={7} // <-- FIX: Stops users/map from zooming out to all of India
      maxBounds={JNK_BOUNDS} // <-- FIX: Hard-locks panning strictly to Northern India
      maxBoundsViscosity={1.0}
      className="w-full h-full z-0"
      zoomControl={false} 
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
      />
      
      <ZoomControl position="bottomright" />
      
      {/* Auto-Camera Mover */}
      <MapFitter selectedRegion={selectedRegion} />

      {geoJsonData && (
         <GeoJSON 
           key={JSON.stringify(geoJsonData)}
           data={geoJsonData}
           style={(feature: any) => {
             const props = feature?.properties || {};
             const vehicle = props.vehicleCapacity?.toLowerCase() || '';
             
             // Flagged Anomaly Styling
             if (props.isFlagged) {
               return { color: '#ef4444', weight: 5, opacity: 0.9, dashArray: '10, 10' };
             }

             // Standard Vehicle Styling
             let routeColor = '#9ca3af'; 
             if (vehicle.includes('lpv') || vehicle.includes('5 to 13')) routeColor = '#f59e0b';
             else if (vehicle.includes('mpv') || vehicle.includes('17 to 21')) routeColor = '#3b82f6'; 
             else if (vehicle.includes('hpv') || vehicle.includes('32 to 52')) routeColor = '#10b981'; 

             return { color: routeColor, weight: 5, opacity: 0.8 };
           }}
           onEachFeature={(feature, layer) => {
             const props = feature.properties || {};
             
             const warningHtml = props.isFlagged 
               ? `<div style="background: #fee2e2; border: 1px solid #f87171; color: #b91c1c; padding: 6px; border-radius: 6px; font-size: 10px; font-weight: 900; margin-bottom: 8px; text-transform: uppercase;">⚠️ Flagged: ${props.flagReasons}</div>` 
               : '';

             layer.bindPopup(`
               <div style="padding: 8px; min-width: 200px;">
                 ${warningHtml}
                 <h3 style="font-weight: 900; font-size: 16px; border-bottom: 2px solid #e5e7eb; padding-bottom: 6px; margin-bottom: 8px; color: #111827;">
                   ${props.driverName}
                 </h3>
                 <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                   <span style="font-size: 12px; color: #6b7280; font-weight: bold;">DISTANCE:</span>
                   <span style="font-size: 12px; color: #2563eb; font-weight: 900;">${props.distance} km</span>
                 </div>
                 <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                   <span style="font-size: 12px; color: #6b7280; font-weight: bold;">TIME DRIVEN:</span>
                   <span style="font-size: 12px; color: #10b981; font-weight: 900;">${props.duration}</span>
                 </div>
                 <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                   <span style="font-size: 12px; color: #6b7280; font-weight: bold;">VEHICLE:</span>
                   <span style="font-size: 12px; color: #ea580c; font-weight: 900;">${props.vehicleCapacity}</span>
                 </div>
                 <div style="background: #f3f4f6; padding: 6px; border-radius: 6px;">
                   <p style="margin: 0; font-size: 11px; color: #4b5563; font-weight: 600;">Started: ${props.date} at ${props.time}</p>
                   <p style="margin: 2px 0 0 0; font-size: 10px; color: #9ca3af; font-family: monospace;">ID: ${props.tripId}</p>
                 </div>
               </div>
             `);
           }}
         />
      )}
    </MapContainer>
  );
}