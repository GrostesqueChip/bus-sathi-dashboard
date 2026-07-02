'use client';

import { useEffect, useState } from 'react';
import {
  Activity, BusFront, Clock, ExternalLink, Gauge, MapPin, ShieldCheck, X,
} from 'lucide-react';
import type { RationalizedRouteKashmir } from '@/lib/routeRationalizationKashmir';
import { getRouteMapHref } from '@/components/rationalization-kashmir/KashmirRouteUtils';

/**
 * Everything about one route in a single panel: plan numbers, the independent
 * real-world verification verdict (v3.4.4 deep-dive), and the observed app-GPS
 * evidence (fragment road coverage) — data that otherwise lives in five tabs.
 */

type Evidence = Record<string, { obs: number; drv: number; runs: number; km: number }>;
type Verification = Record<string, { verdict: string; finding: string; service: string; sources: string }>;

let evCache: Evidence | null = null;
let vfCache: Verification | null = null;

function nf(v: number) {
  return new Intl.NumberFormat('en-IN').format(Math.round(v));
}

const VERDICT_STYLE: Record<string, string> = {
  PASS: 'bg-emerald-100 text-emerald-800',
  REVIEW: 'bg-amber-100 text-amber-800',
  FAIL: 'bg-red-100 text-red-800',
};

function Row({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-slate-100 py-2">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <div className="text-right">
        <p className="text-sm font-black text-slate-900">{value}</p>
        {sub && <p className="text-xs font-semibold text-slate-500">{sub}</p>}
      </div>
    </div>
  );
}

export default function KashmirRouteDrawer({
  route, onClose,
}: { route: RationalizedRouteKashmir; onClose: () => void }) {
  const [evidence, setEvidence] = useState<Evidence | null>(evCache);
  const [verification, setVerification] = useState<Verification | null>(vfCache);

  useEffect(() => {
    if (!evCache) {
      fetch('/route-rationalization-kashmir/data/evidence.json')
        .then((r) => r.json()).then((j) => { evCache = j; setEvidence(j); }).catch(() => null);
    }
    if (!vfCache) {
      fetch('/route-rationalization-kashmir/data/verification.json')
        .then((r) => r.json()).then((j) => { vfCache = j; setVerification(j); }).catch(() => null);
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const ev = evidence?.[route.newRouteId];
  const vf = verification?.[route.routeCode];
  const isSscl = route.newRouteId.startsWith('SSCL-');
  const mix = [
    route.hpvCount ? `${route.hpvCount} large` : '',
    route.mpvCount ? `${route.mpvCount} medium` : '',
    route.lpvCount ? `${route.lpvCount} small` : '',
  ].filter(Boolean).join(' · ');

  return (
    <div className="fixed inset-0 z-[1300]" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]" onClick={onClose} />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-2xl">
        {/* header */}
        <div className="sticky top-0 z-10 border-b border-slate-100 bg-gradient-to-r from-slate-950 to-emerald-950 px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-200">
                {route.routeCode || route.newRouteId}{isSscl ? ' · SSCL e-bus backbone' : ''}
              </p>
              <h3 className="mt-1 text-xl font-black leading-tight">{route.routeName}</h3>
              <p className="mt-1 text-xs font-semibold text-slate-300">
                {route.newRouteId} · {route.routeType.replaceAll('_', ' ')} · Priority {route.priorityBand}
              </p>
            </div>
            <button type="button" onClick={onClose} aria-label="Close"
              className="rounded-lg bg-white/10 p-1.5 transition-colors hover:bg-white/20">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="space-y-6 px-6 py-5">
          {/* plan numbers */}
          <section>
            <p className="mb-1 flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
              <BusFront size={14} /> Service plan (v3.4.5)
            </p>
            <Row label="Headway" value={`every ${route.headwayMin} min`} />
            <Row label="Fleet" value={`${route.fleetRequired} buses`} sub={mix} />
            <Row label="Route length" value={`${route.routeKm.toFixed(1)} km`} />
            <Row label="Round-trip cycle" value={`${Math.round(route.cycleTimeMin)} min`} />
            <Row label="Pop. within 400 m" value={nf(route.populationServedRaw)} />
            {(route.socialFlag || route.touristCorridor) && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {route.socialFlag && <span className="rounded-full bg-teal-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-teal-800">Social-obligation (protected)</span>}
                {route.touristCorridor && <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-sky-800">Tourist corridor</span>}
              </div>
            )}
          </section>

          {/* real-world verification */}
          <section>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
              <ShieldCheck size={14} /> Real-world verification (v3.4.4 deep-dive)
            </p>
            {vf ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${VERDICT_STYLE[vf.verdict] || 'bg-slate-200 text-slate-700'}`}>
                  {vf.verdict}
                </span>
                <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">{vf.finding}</p>
                {vf.service && vf.service !== 'nan' && (
                  <p className="mt-2 text-xs font-semibold leading-5 text-slate-500"><span className="font-black text-slate-600">On the ground:</span> {vf.service}</p>
                )}
                {vf.sources && vf.sources !== 'nan' && (
                  <p className="mt-2 text-[10px] font-semibold italic text-slate-400">Sources: {vf.sources}</p>
                )}
              </div>
            ) : (
              <p className="text-xs font-semibold text-slate-400">Loading verification…</p>
            )}
          </section>

          {/* observed evidence */}
          <section>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
              <Activity size={14} /> Observed on the ground (app GPS)
            </p>
            {ev ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <div className="flex items-center gap-3">
                  <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                    <div className={`h-full rounded-full ${ev.obs >= 0.5 ? 'bg-emerald-600' : ev.obs >= 0.2 ? 'bg-amber-500' : 'bg-slate-400'}`}
                      style={{ width: `${Math.max(3, ev.obs * 100)}%` }} />
                  </div>
                  <p className="text-sm font-black text-slate-900">{Math.round(ev.obs * 100)}%</p>
                </div>
                <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">
                  <span className="font-black">{Math.round(ev.obs * 100)}% of this route&apos;s road alignment</span> has been
                  driven by app-tracked buses — {nf(ev.runs)} run fragments from {ev.drv} distinct drivers ({ev.km} km observed).
                </p>
                <p className="mt-1.5 text-[10px] font-semibold italic text-slate-400">
                  Road-level evidence (buses drive this alignment) — not proof this exact permit runs end-to-end.
                  Partial app adoption: low evidence ≠ no service.
                </p>
              </div>
            ) : (
              <p className="text-xs font-semibold text-slate-400">Loading observed evidence…</p>
            )}
          </section>

          {/* links */}
          <section className="flex flex-wrap gap-2 pb-6">
            {route.actionTaken !== 'MERGED_INTO_TRUNK' && (
              <a href={getRouteMapHref(route)} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-black text-white transition-colors hover:bg-emerald-700">
                <MapPin size={13} /> Route map <ExternalLink size={12} />
              </a>
            )}
            <a href="/route-rationalization-kashmir/Kashmir_Timetables_v1.xlsx" download
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-black text-slate-700 transition-colors hover:bg-slate-50">
              <Clock size={13} /> Timetables (Excel)
            </a>
            <a href="/route-rationalization-kashmir/Kashmir_Observed_GroundTruth_v1.xlsx" download
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-black text-slate-700 transition-colors hover:bg-slate-50">
              <Gauge size={13} /> Ground-truth workbook
            </a>
          </section>
        </div>
      </aside>
    </div>
  );
}
