'use client';

import { useEffect, useMemo, useState } from 'react';
import { GeoJSON, MapContainer, TileLayer, useMap, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

type RationalizationNetworkMapProps = {
  selectedRouteId?: string | null;
};

function formatNumber(value: unknown) {
  return new Intl.NumberFormat('en-IN').format(Number(value) || 0);
}

function FitToData({
  geoJsonData,
  selectedRouteId,
}: {
  geoJsonData: any;
  selectedRouteId?: string | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!geoJsonData?.features?.length) return;
    map.invalidateSize({ pan: false });

    const allRoutesLayer = L.geoJSON(geoJsonData);
    const selectedLayer = selectedRouteId
      ? L.geoJSON(geoJsonData, {
          filter: (feature: any) => feature?.properties?.New_Route_ID === selectedRouteId,
        })
      : null;

    const selectedBounds = selectedLayer?.getBounds();
    if (selectedBounds?.isValid()) {
      map.fitBounds(selectedBounds.pad(0.35), { maxZoom: 12 });
      return;
    }

    const allBounds = allRoutesLayer.getBounds();
    if (allBounds.isValid()) {
      map.fitBounds(allBounds.pad(0.08));
    }
  }, [geoJsonData, map, selectedRouteId]);

  return null;
}

function SyncMapSize() {
  const map = useMap();

  useEffect(() => {
    const refresh = () => map.invalidateSize({ pan: false });

    const animationFrame = window.requestAnimationFrame(refresh);
    const delayedRefresh = window.setTimeout(refresh, 220);
    const observer = new ResizeObserver(refresh);

    observer.observe(map.getContainer());
    window.addEventListener('resize', refresh);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(delayedRefresh);
      observer.disconnect();
      window.removeEventListener('resize', refresh);
    };
  }, [map]);

  return null;
}

export default function RationalizationNetworkMap({ selectedRouteId }: RationalizationNetworkMapProps) {
  const [geoJsonData, setGeoJsonData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    fetch('/route-rationalization/Rationalised_Routes.geojson')
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to load route network');
        }

        return response.json();
      })
      .then((data) => {
        if (isMounted) {
          setGeoJsonData(data);
        }
      })
      .catch((fetchError) => {
        if (isMounted) {
          setError(fetchError instanceof Error ? fetchError.message : 'Unable to load the route network');
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const routeStyle = useMemo(() => {
    return (feature: any) => {
      const properties = feature?.properties || {};
      const routeId = properties.New_Route_ID;
      const isSelected = Boolean(selectedRouteId) && routeId === selectedRouteId;
      const isTrunk = String(properties.Action_Taken || '').includes('TRUNK');

      if (isSelected) {
        return {
          color: '#7c3aed',
          weight: 7,
          opacity: 0.95,
        };
      }

      if (isTrunk) {
        return {
          color: '#2563eb',
          weight: 5,
          opacity: 0.86,
        };
      }

      return {
        color: '#0f766e',
        weight: 4,
        opacity: 0.75,
        dashArray: '10 8',
      };
    };
  }, [selectedRouteId]);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50 text-center">
        <div>
          <p className="text-base font-black text-slate-800">Map unavailable</p>
          <p className="mt-2 text-sm font-medium text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!geoJsonData) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-4 border-blue-600" />
          <p className="mt-4 text-sm font-black uppercase tracking-[0.18em] text-blue-700">Loading network map</p>
        </div>
      </div>
    );
  }

  return (
    <MapContainer center={[32.7266, 74.857]} zoom={10} className="h-full w-full" zoomControl={false}>
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution="&copy; OpenStreetMap contributors &copy; CARTO"
      />

      <ZoomControl position="bottomright" />
      <SyncMapSize />
      <FitToData geoJsonData={geoJsonData} selectedRouteId={selectedRouteId} />

      <GeoJSON
        key={selectedRouteId || 'all-routes'}
        data={geoJsonData}
        style={routeStyle}
        onEachFeature={(feature: any, layer) => {
          const properties = feature?.properties || {};
          const isTrunk = String(properties.Action_Taken || '').includes('TRUNK');
          const routeId = String(properties.New_Route_ID || 'Unknown route');

          layer.bindPopup(`
            <div style="min-width: 240px; padding: 6px 4px;">
              <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:10px;">
                <div>
                  <div style="font-size:18px; font-weight:900; color:#0f172a;">${routeId}</div>
                  <div style="font-size:13px; font-weight:700; color:#475569;">${properties.Route_Name || 'Unnamed route'}</div>
                </div>
                <span style="padding:6px 10px; border-radius:999px; font-size:10px; font-weight:900; letter-spacing:0.14em; text-transform:uppercase; background:${isTrunk ? '#dbeafe' : '#ccfbf1'}; color:${isTrunk ? '#1d4ed8' : '#0f766e'};">
                  ${String(properties.Action_Taken || '').replaceAll('_', ' ')}
                </span>
              </div>
              <div style="display:grid; gap:6px; font-size:12px; color:#334155;">
                <div><strong>Population:</strong> ${formatNumber(properties.Population_Served)}</div>
                <div><strong>Fleet Required:</strong> ${formatNumber(properties.Fleet_Required)}</div>
                <div><strong>Headway:</strong> ${formatNumber(properties.Headway_Min)} min</div>
                <div><strong>Wait Time:</strong> ${formatNumber(properties.Old_Wait_Time)} -> ${formatNumber(properties.New_Wait_Time)} min</div>
                <div><strong>Length:</strong> ${properties.Route_KM || 0} km</div>
              </div>
              <a href="/route-rationalization/route_maps/${routeId}.html" target="_blank" rel="noreferrer" style="display:inline-block; margin-top:12px; color:#2563eb; font-size:12px; font-weight:800; text-decoration:none;">
                Open detailed route map ->
              </a>
            </div>
          `);
        }}
      />
    </MapContainer>
  );
}
