'use client';

import { useEffect, useMemo, useState } from 'react';
import { CircleMarker, GeoJSON, MapContainer, TileLayer, Tooltip, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Activity, AlertTriangle, Clock, Gauge, MapPin, Route, Timer } from 'lucide-react';

/**
 * Reality Layer — what the Bus Sathi app's real driver GPS shows on the ground.
 * Data: /public/kashmir-reality/*, exported from the bus-sathi-trace-intelligence
 * repo (aggregate-only, PII-free). Honest scope: partial adoption (~157 drivers),
 * so this validates geometry/speeds/stops — it does NOT measure supply or demand.
 */

type Ops = {
  scope: string;
  drivers: number; driver_days: number; runs: number; observed_days: number;
  duty_span_h: number; in_service_h: number; utilisation: number;
  runs_per_day: number; km_per_day: number;
  turnaround_min: number | null; turnaround_n: number;
  day_start: string; day_end: string; peak_hour: number;
  moving_kmh: number; effective_kmh: number; dwell_share: number;
  in_service_by_hour: number[];
  corridor_tally: Record<string, number>;
  coverage_note: string;
};

const CLASS_STYLE: Record<string, { color: string; label: string }> = {
  matched: { color: '#059669', label: 'Matched to plan' },
  partial: { color: '#d97706', label: 'Partial / geometry diverges' },
  out_of_area: { color: '#94a3b8', label: 'Outside Kashmir division' },
  artifact: { color: '#cbd5e1', label: 'Data artifact (excluded)' },
  informal: { color: '#dc2626', label: 'Unmatched' },
};

function speedColor(kmh: number) {
  if (kmh < 10) return '#dc2626';
  if (kmh < 15) return '#f97316';
  if (kmh < 22) return '#eab308';
  return '#22c55e';
}

function StatCard({ icon: Icon, label, value, detail }: { icon: typeof Gauge; label: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
        <Icon size={14} className="text-emerald-600" /> {label}
      </div>
      <p className="mt-1.5 text-2xl font-black text-slate-900">{value}</p>
      <p className="mt-0.5 text-xs font-semibold leading-5 text-slate-500">{detail}</p>
    </div>
  );
}

export default function KashmirRealityLayer() {
  const [ops, setOps] = useState<Ops | null>(null);
  const [corridors, setCorridors] = useState<any>(null);
  const [stops, setStops] = useState<any>(null);
  const [stopsT2, setStopsT2] = useState<any>(null);
  const [speed, setSpeed] = useState<any>(null);
  const [planEvidence, setPlanEvidence] = useState<any>(null);
  const [show, setShow] = useState({ corridors: true, plan: false, speed: true, stops: false });

  useEffect(() => {
    fetch('/kashmir-reality/ops.json').then((r) => r.json()).then(setOps).catch(() => null);
    fetch('/kashmir-reality/corridors.geojson').then((r) => r.json()).then(setCorridors).catch(() => null);
    fetch('/kashmir-reality/stops.geojson').then((r) => r.json()).then(setStops).catch(() => null);
    fetch('/kashmir-reality/stops_tier2.geojson').then((r) => r.json()).then(setStopsT2).catch(() => null);
    fetch('/kashmir-reality/speed.geojson').then((r) => r.json()).then(setSpeed).catch(() => null);
    fetch('/kashmir-reality/plan_evidence.geojson').then((r) => r.json()).then(setPlanEvidence).catch(() => null);
  }, []);

  const maxCurve = useMemo(
    () => (ops ? Math.max(...ops.in_service_by_hour, 1) : 1),
    [ops]
  );

  if (!ops) {
    return (
      <div className="flex h-64 items-center justify-center rounded-3xl border border-slate-200 bg-white">
        <p className="text-sm font-bold text-slate-500">Loading observed-reality data…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* honest scope banner */}
      <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
        <p className="text-sm font-semibold leading-6 text-amber-900">
          <span className="font-black">Observed reality, partial adoption.</span> Everything below is
          measured from the Bus Sathi app&apos;s real driver GPS ({ops.drivers} self-selected drivers,
          {' '}{ops.runs.toLocaleString('en-IN')} service runs over {ops.observed_days} days). It validates
          route geometry, speeds and stops — it does <span className="font-black">not</span> measure network
          supply, frequency or demand. {ops.coverage_note}
        </p>
      </div>

      {/* measured KPIs */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard icon={Gauge} label="Moving speed" value={`${ops.moving_kmh} km/h`} detail="Median while in motion — real bus, not model." />
        <StatCard icon={Activity} label="Effective speed" value={`${ops.effective_kmh} km/h`} detail={`Incl. stops — dwell is ~${Math.round(ops.dwell_share * 100)}% of run time.`} />
        <StatCard icon={Clock} label="Duty day" value={`${ops.duty_span_h} h`} detail={`${ops.in_service_h} h in service (${Math.round(ops.utilisation * 100)}% utilisation), ~${ops.day_start}–${ops.day_end}.`} />
        <StatCard icon={Timer} label="Terminal turn" value={`${ops.turnaround_min} min`} detail={`Median door-to-door turn (n=${ops.turnaround_n.toLocaleString('en-IN')}), incl. layover.`} />
        <StatCard icon={Route} label="Corridors verified" value={`${ops.corridor_tally.matched + ops.corridor_tally.partial}`} detail={`${ops.corridor_tally.matched} match the plan, ${ops.corridor_tally.partial} diverge in geometry.`} />
        <StatCard icon={MapPin} label="Real stops" value={`${stops?.features?.length ?? '—'}`} detail={`Strong observed stops (≥3 drivers, ≥10 visits)${stopsT2?.features?.length ? ` + ${stopsT2.features.length} rural Tier-2 candidates` : ''}.`} />
      </section>

      {/* map */}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
          <h3 className="text-sm font-black uppercase tracking-[0.14em] text-slate-700">Observed corridors · measured speeds · real stops</h3>
          <div className="flex gap-1.5">
            {(['corridors', 'plan', 'speed', 'stops'] as const).map((k) => (
              <button key={k} type="button" onClick={() => setShow((s) => ({ ...s, [k]: !s[k] }))}
                className={`rounded-lg px-3 py-1.5 text-xs font-black capitalize transition-all ${
                  show[k] ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}>
                {k === 'plan' ? 'plan evidence' : k}
              </button>
            ))}
          </div>
        </div>
        <div className="h-[520px]">
          <MapContainer center={[34.08, 74.82]} zoom={11} zoomControl={false} className="h-full w-full">
            <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
            <ZoomControl position="bottomright" />
            {show.speed && speed?.features?.map((f: any, i: number) => (
              <CircleMarker key={`sp${i}`} center={[f.geometry.coordinates[1], f.geometry.coordinates[0]]}
                radius={3} pathOptions={{ color: speedColor(f.properties.kmh), fillOpacity: 0.5, weight: 0 }} />
            ))}
            {show.plan && planEvidence && (
              <GeoJSON data={planEvidence}
                style={(f: any) => {
                  const o = f?.properties?.obs ?? 0;
                  return {
                    color: o >= 0.5 ? '#059669' : o >= 0.2 ? '#d97706' : '#cbd5e1',
                    weight: o >= 0.5 ? 2.5 : 1.5,
                    opacity: o >= 0.2 ? 0.75 : 0.45,
                  };
                }}
                onEachFeature={(f: any, layer: any) => {
                  const p = f.properties;
                  layer.bindPopup(
                    `<div style="font-size:12px"><b>${p.name}</b> (${p.id})<br/>` +
                    `Road driven by app buses: <b>${Math.round((p.obs ?? 0) * 100)}%</b><br/>` +
                    `${p.runs} run fragments · ${p.drv} distinct drivers<br/>` +
                    `<i>Fragment evidence — road-level, not end-to-end proof.</i></div>`
                  );
                }} />
            )}
            {show.corridors && corridors && (
              <GeoJSON data={corridors}
                style={(f: any) => ({
                  color: CLASS_STYLE[f?.properties?.class]?.color ?? '#0f766e',
                  weight: 3, opacity: 0.85,
                })}
                onEachFeature={(f: any, layer: any) => {
                  const p = f.properties;
                  layer.bindPopup(
                    `<div style="font-size:12px"><b>C${p.corridor_id} — ${p.od ?? ''}</b><br/>` +
                    `${CLASS_STYLE[p.class]?.label ?? p.class}${p.matched_permit ? ` · ${p.matched_permit}` : ''}<br/>` +
                    `${p.n_runs} runs · ${p.n_drivers} drivers · ${p.median_km} km</div>`
                  );
                }} />
            )}
            {show.stops && stops?.features?.map((f: any, i: number) => (
              <CircleMarker key={`st${i}`} center={[f.geometry.coordinates[1], f.geometry.coordinates[0]]}
                radius={4} pathOptions={{ color: '#0f172a', fillColor: '#fbbf24', fillOpacity: 0.9, weight: 1 }}>
                <Tooltip>{`Stop ${f.properties.stop_id}: ${f.properties.visits} visits · ${f.properties.drivers} drivers`}</Tooltip>
              </CircleMarker>
            ))}
            {show.stops && stopsT2?.features?.map((f: any, i: number) => (
              <CircleMarker key={`s2${i}`} center={[f.geometry.coordinates[1], f.geometry.coordinates[0]]}
                radius={4} pathOptions={{ color: '#7f1d1d', fillColor: '#ef4444', fillOpacity: 0.85, weight: 1 }}>
                <Tooltip>{`Tier-2 ${f.properties.stop_id} (${f.properties.district}): ${f.properties.visits} visits · ${f.properties.drivers} drivers — field-validate`}</Tooltip>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
        <div className="flex flex-wrap gap-4 border-t border-slate-100 px-5 py-3">
          {Object.entries(CLASS_STYLE).filter(([k]) => (ops.corridor_tally[k] ?? 0) > 0).map(([k, v]) => (
            <span key={k} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600">
              <span className="h-2.5 w-4 rounded-full" style={{ background: v.color }} /> {v.label} ({ops.corridor_tally[k]})
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full bg-red-600" /> &lt;10 km/h
            <span className="ml-1 h-2.5 w-2.5 rounded-full bg-orange-500" /> 10–15
            <span className="ml-1 h-2.5 w-2.5 rounded-full bg-yellow-500" /> 15–22
            <span className="ml-1 h-2.5 w-2.5 rounded-full bg-green-500" /> &gt;22 km/h (measured)
          </span>
          {show.plan && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600">
              <span className="h-2.5 w-4 rounded-full bg-emerald-600" /> plan route driven ≥50%
              <span className="ml-1 h-2.5 w-4 rounded-full bg-amber-600" /> 20–50%
              <span className="ml-1 h-2.5 w-4 rounded-full bg-slate-300" /> little app data
            </span>
          )}
          {show.stops && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Tier-1 stop
              <span className="ml-1 h-2.5 w-2.5 rounded-full bg-red-500" /> Tier-2 (rural recovery, field-validate)
            </span>
          )}
        </div>
      </section>

      {/* in-service-by-hour */}
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-black uppercase tracking-[0.14em] text-slate-700">The observed operating day (IST)</h3>
        <p className="mt-1 text-xs font-semibold text-slate-500">
          Average minutes in service per driver-day, by hour. The <span className="font-black">shape</span> is
          adoption-robust: service ramps from ~08:00, peaks {ops.peak_hour}:00–17:00, and collapses after 19:00 —
          the observed fleet effectively stops running by evening.
        </p>
        <div className="mt-4 flex h-36 items-end gap-1">
          {ops.in_service_by_hour.map((v, h) => (
            <div key={h} className="group relative flex-1">
              <div className="w-full rounded-t bg-emerald-600/80 transition-all group-hover:bg-emerald-500"
                style={{ height: `${Math.max(2, (v / maxCurve) * 128)}px` }} />
              <p className="mt-1 text-center text-[9px] font-bold text-slate-400">{h % 3 === 0 ? `${h}h` : ''}</p>
              <span className="pointer-events-none absolute -top-6 left-1/2 hidden -translate-x-1/2 rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-bold text-white group-hover:block">
                {v} min
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
