'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet with Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MultiTripMapProps {
  trips: any[];
  driversMap: any;
}

const getRouteColor = (capacity: string) => {
  if (capacity?.includes("17 to 21")) return "#3b82f6"; // Blue for MPV
  if (capacity?.includes("32 to 52")) return "#ef4444"; // Red for HPV
  if (capacity?.includes("5 to 13")) return "#22c55e";  // Green for LPV
  return "#6b7280"; // Gray default
};

export default function MultiTripMap({ trips, driversMap }: MultiTripMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map centered roughly on Jammu
    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current).setView([32.7266, 74.8570], 12);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(mapRef.current);
    }

    const map = mapRef.current;

    // Clear existing layers so lines don't duplicate when you change the filters
    map.eachLayer((layer) => {
      if (layer instanceof L.Polyline || layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    // Create a bounds object so we can auto-zoom to fit all selected trips
    const bounds = L.latLngBounds([]);

    // Loop through filtered trips and draw them
    trips.forEach((trip) => {
      const driver = driversMap[trip.uid];
      if (!driver || !trip.routePoints || trip.routePoints.length === 0) return;

      const latLngs: [number, number][] = trip.routePoints.map((point: any) => [
        point.latitude,
        point.longitude,
      ]);

      const polyline = L.polyline(latLngs, {
        color: getRouteColor(driver.vehicleCapacity),
        weight: 5,
        opacity: 0.6,
        smoothFactor: 3, // Simplifies the polyline for better performance
      }).addTo(map);

      // Add HTML popup to the line
      const popupContent = `
        <div style="padding: 4px; font-family: sans-serif;">
          <p style="font-weight: bold; font-size: 15px; margin: 0 0 4px 0;">${driver.name}</p>
          <p style="font-size: 13px; margin: 2px 0;"><b>Vehicle:</b> ${driver.vehicleNumber}</p>
          <p style="font-size: 13px; margin: 2px 0;"><b>Type:</b> ${driver.vehicleCapacity}</p>
          ${trip.distance ? `<p style="font-size: 13px; margin: 2px 0;"><b>Distance:</b> ${trip.distance} km</p>` : ''}
        </div>
      `;
      polyline.bindPopup(popupContent);

      // Extend bounds to include this line
      bounds.extend(polyline.getBounds());
    });

    // Fit map bounds to show all plotted routes (if any exist)
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }

  }, [trips, driversMap]); // Re-run this effect whenever the filters change the trips

  return (
    <div
      ref={mapContainerRef}
      className="h-full w-full min-h-[600px] rounded-lg shadow-inner"
      style={{ zIndex: 0 }}
    />
  );
}