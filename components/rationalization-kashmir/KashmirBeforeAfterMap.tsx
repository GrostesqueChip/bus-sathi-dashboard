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

type MapMode = 'before' | 'after';

type KashmirBeforeAfterMapProps = {
  mode: MapMode;
};

const BEFORE_GEOJSON_URL = '/route-rationalization-kashmir/existing-routes.geojson';
const AFTER_GEOJSON_URL = '/route-rationalization-kashmir/Rationalised_Routes_Kashmir_v3.geojson';

// Bounds covering Srinagar city core + Anantnag (south), Baramulla (west),
// Bandipora (north), Pampore (southeast). Both maps fit to the same bounds
// so the visual diff lines up.
const SHARED_BOUNDS: L.LatLngBoundsExpression = [
  [33.85, 74.45],
  [34.40, 75.15],
];

function formatNumber(value: unknown) {
  return new Intl.NumberFormat('en-IN').format(Math.round(Number(value) || 0));
}

function formatDecimal(value: unknown, digits = 2) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(digits) : '0';
}

function formatAction(action: unknown) {
  if (action === 'UPGRADED_TO_TRUNK') return 'Main route';
  if (action === 'RETAINED_AS_FEEDER') return 'Feeder route';
  if (action === 'MERGED_INTO_TRUNK') return 'Merged into main route';
  return String(action || 'Unknown').replaceAll('_', ' ').toLowerCase();
}

function SyncMapSize() {
  const map = useMap();
  useEffect(() => {
    const refresh = () => map.invalidateSize({ pan: false });
    const af = window.requestAnimationFrame(refresh);
    const t = window.setTimeout(refresh, 220);
    const observer = new ResizeObserver(refresh);
    observer.observe(map.getContainer());
    window.addEventListener('resize', refresh);
    return () => {
      window.cancelAnimationFrame(af);
      window.clearTimeout(t);
      observer.disconnect();
      window.removeEventListener('resize', refresh);
    };
  }, [map]);
  return null;
}

function FitToSharedBounds() {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize({ pan: false });
    map.fitBounds(SHARED_BOUNDS, { padding: [12, 12] });
  }, [map]);
  return null;
}

// Red line styling for the chaotic "before" view. Heavier corridors get
// slightly thicker / more opaque lines so the visual weight matches the
// duplication count without being unreadable.
function beforeLineStyle(feature: any) {
  const dupes = Number(feature?.properties?.duplicateCount || 1);
  const intensity = Math.min(1, 0.25 + dupes / 40);

  return {
    color: '#dc2626',
    weight: dupes >= 20 ? 4 : dupes >= 10 ? 2.8 : 1.8,
    opacity: 0.22 + intensity * 0.55,
  };
}

function afterLineStyle(feature: any) {
  const p = feature?.properties || {};
  const id = String(p.New_Route_ID || '');
  const isSscl = id.startsWith('SSCL-');
  const isTrunk = String(p.Action_Taken || '') === 'UPGRADED_TO_TRUNK';
  const priority = String(p.Priority_Band || '');

  // Hierarchy palette — matches the legend in KashmirBeforeAfter:
  // SSCL purple, trunk green, main (HP) feeder blue, local (MP/LP) feeder teal-dashed.
  let color = '#0f766e';
  if (isSscl) color = '#7c3aed';
  else if (isTrunk) color = '#059669';
  else if (priority === 'HP') color = '#2563eb';

  return {
    color,
    weight: isSscl ? 4.5 : isTrunk ? 4 : priority === 'HP' ? 3.5 : 2.5,
    opacity: isTrunk || isSscl ? 0.9 : 0.72,
    dashArray: !isTrunk && !isSscl && priority !== 'HP' ? '8 7' : undefined,
  };
}

export default function KashmirBeforeAfterMap({ mode }: KashmirBeforeAfterMapProps) {
  const [geoJsonData, setGeoJsonData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setGeoJsonData(null);
    setError(null);

    const url = mode === 'before' ? BEFORE_GEOJSON_URL : AFTER_GEOJSON_URL;
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load ${mode} map data`);
        return r.json();
      })
      .then((data) => {
        if (mounted) setGeoJsonData(data);
      })
      .catch((e) => {
        if (mounted) setError(e instanceof Error ? e.message : 'Map data unavailable');
      });

    return () => {
      mounted = false;
    };
  }, [mode]);

  const styleFn = useMemo(() => (mode === 'before' ? beforeLineStyle : afterLineStyle), [mode]);

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
          <div className={`mx-auto h-10 w-10 animate-spin rounded-full border-b-4 ${mode === 'before' ? 'border-rose-600' : 'border-emerald-600'}`} />
          <p className="mt-3 text-xs font-black uppercase tracking-[0.18em] text-slate-500">Loading {mode} network</p>
        </div>
      </div>
    );
  }

  return (
    <MapContainer
      bounds={SHARED_BOUNDS}
      className="h-full w-full"
      zoomControl={false}
      scrollWheelZoom={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution="&copy; OpenStreetMap contributors &copy; CARTO"
      />
      <ZoomControl position="bottomright" />
      <SyncMapSize />
      <FitToSharedBounds />

      <GeoJSON
        key={`${mode}-${geoJsonData?.features?.length || 0}`}
        data={geoJsonData}
        style={styleFn as any}
        onEachFeature={(feature: any, layer) => {
          const p = feature?.properties || {};

          if (mode === 'before') {
            layer.bindPopup(`
              <div style="min-width:230px;padding:6px">
                <div style="font-size:11px;font-weight:900;letter-spacing:0.14em;color:#b91c1c;text-transform:uppercase">RTO permit ${p.permitId || ''}</div>
                <div style="font-size:14px;font-weight:800;color:#0f172a;margin-top:4px">${p.origin || ''} &rarr; ${p.destination || ''}</div>
                ${p.via ? `<div style="font-size:12px;color:#64748b;margin-top:2px">via ${p.via}</div>` : ''}
                <div style="margin-top:8px;display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px;color:#334155">
                  <div><strong>Vehicle:</strong> ${p.vehicleCategory || 'n/a'}</div>
                  <div><strong>Service:</strong> ${p.serviceType || 'n/a'}</div>
                </div>
                <div style="margin-top:8px;padding:6px 10px;border-radius:10px;background:#fef2f2;color:#991b1b;font-size:12px;font-weight:800">
                  ${formatNumber(p.duplicateCount)} permits on this same corridor
                </div>
              </div>
            `);
          } else {
            const routeId = String(p.New_Route_ID || '');
            const routeCode = String(p.Route_Code || routeId);
            const isSscl = routeId.startsWith('SSCL-');
            const isTrunk = String(p.Action_Taken || '') === 'UPGRADED_TO_TRUNK';

            layer.bindPopup(`
              <div style="min-width:240px;padding:6px">
                <div style="display:flex;justify-content:space-between;gap:12px;margin-bottom:8px">
                  <div>
                    <div style="font-size:16px;font-weight:900;color:#0f172a">${routeCode !== routeId ? routeCode : routeId}</div>
                    <div style="font-size:11px;font-weight:900;letter-spacing:0.12em;color:#64748b;text-transform:uppercase">ID: ${routeId}</div>
                    <div style="font-size:12px;font-weight:700;color:#475569;margin-top:2px">${p.Route_Name || ''}</div>
                  </div>
                  <span style="height:fit-content;padding:5px 9px;border-radius:999px;font-size:10px;font-weight:900;letter-spacing:0.12em;text-transform:uppercase;background:${isSscl ? '#ede9fe' : isTrunk ? '#d1fae5' : '#ccfbf1'};color:${isSscl ? '#5b21b6' : isTrunk ? '#065f46' : '#0f766e'}">
                    ${isSscl ? 'SSCL backbone' : formatAction(p.Action_Taken)}
                  </span>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px;color:#334155">
                  <div><strong>Bus every:</strong> ${formatNumber(p.Headway_Min)} min</div>
                  <div><strong>Buses:</strong> ${formatNumber(p.Fleet_Required)}</div>
                  <div><strong>Band:</strong> ${p.Priority_Band || 'n/a'}</div>
                  <div><strong>CDI:</strong> ${formatDecimal(p.Final_CDI, 4)}</div>
                </div>
              </div>
            `);
          }
        }}
      />
    </MapContainer>
  );
}
