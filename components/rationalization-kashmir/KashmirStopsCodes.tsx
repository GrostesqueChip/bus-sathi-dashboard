'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download, Hash, MapPin, Search, Signpost } from 'lucide-react';

type Stop = {
  code: string; name: string; district: string; tehsil: string;
  sector: number; stopNo: number; lat: number; lon: number; routes: number;
};
type RouteCode = {
  code: string; name: string;
  oCode: string; oName: string; oDist: string;
  dCode: string; dName: string; dDist: string;
  fleet: number; headway: number;
};

const BASE = '/route-rationalization-kashmir/data';
const DISTRICTS: { code: string; name: string }[] = [
  { code: 'SR', name: 'Srinagar' }, { code: 'BG', name: 'Budgam' }, { code: 'GB', name: 'Ganderbal' },
  { code: 'BR', name: 'Baramulla' }, { code: 'BP', name: 'Bandipora' }, { code: 'PW', name: 'Pulwama' },
  { code: 'SP', name: 'Shopian' }, { code: 'AN', name: 'Anantnag' }, { code: 'KG', name: 'Kulgam' },
  { code: 'KW', name: 'Kupwara' },
];

export default function KashmirStopsCodes() {
  const [stops, setStops] = useState<Stop[]>([]);
  const [codes, setCodes] = useState<RouteCode[]>([]);
  const [tab, setTab] = useState<'stops' | 'codes'>('stops');
  const [query, setQuery] = useState('');
  const [district, setDistrict] = useState<string>('All');

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch(`${BASE}/stops_master.json`).then((r) => r.json()).catch(() => []),
      fetch(`${BASE}/route_codes.json`).then((r) => r.json()).catch(() => []),
    ]).then(([s, c]) => {
      if (!alive) return;
      setStops(s); setCodes(c);
    });
    return () => { alive = false; };
  }, []);

  const stopCountByDistrict = useMemo(() => {
    const m = new Map<string, number>();
    stops.forEach((s) => m.set(s.district, (m.get(s.district) || 0) + 1));
    return m;
  }, [stops]);

  const filteredStops = useMemo(() => {
    const q = query.trim().toLowerCase();
    return stops.filter((s) =>
      (district === 'All' || s.district === district) &&
      (!q || s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q) || s.tehsil.toLowerCase().includes(q))
    );
  }, [stops, query, district]);

  const filteredCodes = useMemo(() => {
    const q = query.trim().toLowerCase();
    return codes.filter((c) =>
      (district === 'All' || c.oDist === district || c.dDist === district) &&
      (!q || c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q) ||
        c.oName.toLowerCase().includes(q) || c.dName.toLowerCase().includes(q))
    );
  }, [codes, query, district]);

  return (
    <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm md:p-8">
      <div className="flex flex-col gap-2">
        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
          <Signpost size={15} /> Stops, districts &amp; route codes
        </p>
        <h2 className="text-2xl font-black text-slate-950">The 12-character route-code register</h2>
        <p className="max-w-4xl text-sm font-semibold leading-7 text-slate-600">
          Every route carries a geo-canonical code built from its endpoints. Read{' '}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[12px] font-bold text-slate-800">SRGB-0102-0305</code>{' '}
          as <b>origin district SR</b> + <b>destination district GB</b>, then origin/destination sector
          (<b>01</b>/<b>02</b>) and stop number (<b>03</b>/<b>05</b>). District is resolved by point-in-polygon
          against OSM admin boundaries, so the code is exact and reproducible.
        </p>
      </div>

      {/* District legend */}
      <div className="mt-5 flex flex-wrap gap-2">
        {DISTRICTS.map((d) => (
          <button
            key={d.code}
            type="button"
            onClick={() => setDistrict(district === d.name ? 'All' : d.name)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-all ${
              district === d.name
                ? 'border-emerald-400 bg-emerald-600 text-white'
                : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-emerald-200 hover:bg-emerald-50'
            }`}
          >
            <span className="font-mono font-black">{d.code}</span>
            {d.name}
            <span className={`rounded-full px-1.5 text-[10px] font-black ${district === d.name ? 'bg-white/20' : 'bg-slate-200 text-slate-500'}`}>
              {stopCountByDistrict.get(d.name) || 0}
            </span>
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-2xl bg-slate-100 p-1.5">
          <button
            type="button"
            onClick={() => setTab('stops')}
            className={`rounded-xl px-4 py-2 text-sm font-black transition-all ${tab === 'stops' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <MapPin size={14} className="mr-1 inline" /> Stops ({stops.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('codes')}
            className={`rounded-xl px-4 py-2 text-sm font-black transition-all ${tab === 'codes' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <Hash size={14} className="mr-1 inline" /> Route codes ({codes.length})
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-72">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tab === 'stops' ? 'Search stop / code / tehsil' : 'Search code / route / stop'}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm font-semibold text-slate-800 outline-none transition-colors focus:border-emerald-300 focus:bg-white"
            />
          </div>
          <a
            href="/route-rationalization-kashmir/Kashmir_Stops_Master_v4.csv"
            download
            className="inline-flex shrink-0 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-all hover:bg-slate-50"
          >
            <Download size={15} className="text-slate-400" /> CSV
          </a>
        </div>
      </div>

      {/* Tables */}
      <div className="mt-4 max-h-[30rem] overflow-auto rounded-2xl border border-slate-100">
        {tab === 'stops' ? (
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-slate-50 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Stop code</th><th className="px-4 py-3">Stop name</th>
                <th className="px-4 py-3">District</th><th className="px-4 py-3">Tehsil / sector</th>
                <th className="px-4 py-3 text-right">Routes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredStops.map((s) => (
                <tr key={s.code} className="hover:bg-emerald-50/40">
                  <td className="px-4 py-2.5 font-mono text-xs font-bold text-emerald-700">{s.code}</td>
                  <td className="px-4 py-2.5 font-bold text-slate-900">{s.name}</td>
                  <td className="px-4 py-2.5 font-semibold text-slate-600">{s.district}</td>
                  <td className="px-4 py-2.5 font-semibold text-slate-500">{s.tehsil} · S{s.sector}</td>
                  <td className="px-4 py-2.5 text-right font-black text-slate-700">{s.routes}</td>
                </tr>
              ))}
              {filteredStops.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-sm font-semibold text-slate-400">No stops match.</td></tr>
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-slate-50 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Route code</th><th className="px-4 py-3">Origin</th>
                <th className="px-4 py-3">Destination</th><th className="px-4 py-3 text-right">Fleet · headway</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredCodes.map((c) => (
                <tr key={c.code} className="hover:bg-emerald-50/40">
                  <td className="px-4 py-2.5 font-mono text-xs font-bold text-emerald-700">{c.code}</td>
                  <td className="px-4 py-2.5"><span className="font-bold text-slate-900">{c.oName}</span><span className="ml-1 text-xs font-semibold text-slate-400">{c.oDist}</span></td>
                  <td className="px-4 py-2.5"><span className="font-bold text-slate-900">{c.dName}</span><span className="ml-1 text-xs font-semibold text-slate-400">{c.dDist}</span></td>
                  <td className="px-4 py-2.5 text-right font-bold text-slate-600">{c.fleet} · {c.headway}m</td>
                </tr>
              ))}
              {filteredCodes.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-sm font-semibold text-slate-400">No routes match.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
      <p className="mt-3 text-xs font-semibold text-slate-400">
        143 canonical stops across 10 districts · 186 active route codes · registry: Kashmir_Stops_Master_v4 (v3.4.0 geo-canonical, point-in-polygon districts).
      </p>
    </section>
  );
}
