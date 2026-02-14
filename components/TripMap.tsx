'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocationPoint } from '@/types/trip';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Fix for default marker icons in Leaflet with Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface TripMapProps {
  routePoints: LocationPoint[];
}

export default function TripMap({ routePoints }: TripMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapContainerRef.current || routePoints.length === 0) return;

    // Initialize map
    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current).setView(
        [routePoints[0].latitude, routePoints[0].longitude],
        13
      );

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(mapRef.current);
    }

    const map = mapRef.current;

    // Clear existing layers
    map.eachLayer((layer) => {
      if (layer instanceof L.Polyline || layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    // Convert route points to LatLng array
    const latLngs: [number, number][] = routePoints.map((point) => [
      point.latitude,
      point.longitude,
    ]);

    // Draw route line
    const polyline = L.polyline(latLngs, {
      color: '#2563eb',
      weight: 4,
      opacity: 0.7,
    }).addTo(map);

    // Add start marker (green)
    const startIcon = L.divIcon({
      className: 'custom-marker',
      html: `<div style="background-color: #10b981; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    L.marker([routePoints[0].latitude, routePoints[0].longitude], {
      icon: startIcon,
    })
      .bindPopup('<b>Start</b>')
      .addTo(map);

    // Add end marker (red)
    const endIcon = L.divIcon({
      className: 'custom-marker',
      html: `<div style="background-color: #ef4444; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    const lastPoint = routePoints[routePoints.length - 1];
    L.marker([lastPoint.latitude, lastPoint.longitude], {
      icon: endIcon,
    })
      .bindPopup('<b>End</b>')
      .addTo(map);

    // Fit bounds to show entire route
    map.fitBounds(polyline.getBounds(), { padding: [50, 50] });

    // Cleanup
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [routePoints]);

  return (
    <div
      ref={mapContainerRef}
      className="h-96 w-full rounded-lg shadow-inner"
      style={{ zIndex: 0 }}
    />
  );
}
