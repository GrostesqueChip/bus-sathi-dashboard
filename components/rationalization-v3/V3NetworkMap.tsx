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

type V3NetworkMapProps = {
  selectedRouteId?: string | null;
};

function formatNumber(value: unknown) {
  return new Intl.NumberFormat('en-IN').format(Math.round(Number(value) || 0));
}

function formatDecimal(value: unknown, digits = 2) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(digits) : '0';
}

function formatAction(action: unknown) {
  return String(action || 'Unknown').replaceAll('_', ' ').toLowerCase();
}

function getRouteColor(properties: Record<string, unknown>, isSelected: boolean) {
  if (isSelected) return '#f97316';

  const action = String(properties.Action_Taken || '');
  const priority = String(properties.Priority_Band || '');

  if (action === 'UPGRADED_TO_TRUNK') return '#2563eb';
  if (priority === 'HP') return '#7c3aed';
  if (priority === 'LP') return '#94a3b8';

  return '#0f766e';
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

    const allBounds = L.geoJSON(geoJsonData).getBounds();
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

export default function V3NetworkMap({ selectedRouteId }: V3NetworkMapProps) {
  const [geoJsonData, setGeoJsonData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    fetch('/route-rationalization-v3/Rationalised_Routes_v3.geojson')
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to load v3 route network');
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
          setError(fetchError instanceof Error ? fetchError.message : 'Unable to load the v3 route network');
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const routeStyle = useMemo(() => {
    return (feature: any) => {
      const properties = feature?.properties || {};
      const routeId = String(properties.New_Route_ID || '');
      const action = String(properties.Action_Taken || '');
      const priority = String(properties.Priority_Band || '');
      const isSelected = Boolean(selectedRouteId) && routeId === selectedRouteId;

      return {
        color: getRouteColor(properties, isSelected),
        weight: isSelected ? 7 : action === 'UPGRADED_TO_TRUNK' ? 5 : priority === 'HP' ? 4.5 : 3.5,
        opacity: isSelected ? 0.98 : action === 'RETAINED_AS_FEEDER' ? 0.76 : 0.88,
        dashArray: action === 'RETAINED_AS_FEEDER' ? '9 8' : undefined,
      };
    };
  }, [selectedRouteId]);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50 text-center">
        <div>
          <p className="text-base font-black text-slate-800">V3 map unavailable</p>
          <p className="mt-2 text-sm font-medium text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!geoJsonData) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-4 border-cyan-600" />
          <p className="mt-4 text-sm font-black uppercase tracking-[0.18em] text-cyan-700">Loading v3 network map</p>
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
        key={selectedRouteId || 'v3-all-routes'}
        data={geoJsonData}
        style={routeStyle}
        onEachFeature={(feature: any, layer) => {
          const properties = feature?.properties || {};
          const routeId = String(properties.New_Route_ID || 'Unknown route');
          const isTrunk = String(properties.Action_Taken || '') === 'UPGRADED_TO_TRUNK';
          const isSocial = Boolean(properties.Social_Flag);

          layer.bindPopup(`
            <div style="min-width: 260px; padding: 8px 5px;">
              <div style="display:flex; justify-content:space-between; gap:12px; margin-bottom:10px;">
                <div>
                  <div style="font-size:18px; font-weight:900; color:#0f172a;">${routeId}</div>
                  <div style="font-size:13px; font-weight:700; color:#475569;">${properties.Route_Name || 'Unnamed route'}</div>
                </div>
                <span style="height:fit-content; padding:6px 10px; border-radius:999px; font-size:10px; font-weight:900; letter-spacing:0.12em; text-transform:uppercase; background:${isTrunk ? '#dbeafe' : '#ccfbf1'}; color:${isTrunk ? '#1d4ed8' : '#0f766e'};">
                  ${formatAction(properties.Action_Taken)}
                </span>
              </div>
              <div style="display:grid; grid-template-columns: 1fr 1fr; gap:7px; font-size:12px; color:#334155;">
                <div><strong>Type:</strong> ${properties.Route_Type || 'n/a'}</div>
                <div><strong>Band:</strong> ${properties.Priority_Band || 'n/a'}</div>
                <div><strong>Headway:</strong> ${formatNumber(properties.Headway_Min)} min</div>
                <div><strong>Fleet:</strong> ${formatNumber(properties.Fleet_Required)}</div>
                <div><strong>HPV/MPV:</strong> ${formatNumber(properties.HPV_Count)} / ${formatNumber(properties.MPV_Count)}</div>
                <div><strong>CDI:</strong> ${formatDecimal(properties.Final_CDI, 4)}</div>
                <div><strong>Population:</strong> ${formatNumber(properties.Population_Served)}</div>
                <div><strong>Zone:</strong> ${properties.Congestion_Zone || 'n/a'}</div>
              </div>
              ${
                isSocial
                  ? '<div style="margin-top:10px; padding:8px 10px; border-radius:12px; background:#fff7ed; color:#9a3412; font-size:12px; font-weight:800;">Social-obligation route protected in v3</div>'
                  : ''
              }
              <a href="/route-rationalization-v3/route_maps/${routeId}.html" target="_blank" rel="noreferrer" style="display:inline-block; margin-top:12px; color:#2563eb; font-size:12px; font-weight:900; text-decoration:none;">
                Open detailed route map ->
              </a>
            </div>
          `);
        }}
      />
    </MapContainer>
  );
}
