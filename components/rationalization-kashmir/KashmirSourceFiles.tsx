'use client';

import { ArrowUpRight, Download, FileText, Map } from 'lucide-react';
import type { RationalizedRouteKashmir, KashmirSourceFile } from '@/lib/routeRationalizationKashmir';
import { getRouteMapHref } from '@/components/rationalization-kashmir/KashmirRouteUtils';

type KashmirSourceFilesProps = {
  files: KashmirSourceFile[];
  selectedRoute: RationalizedRouteKashmir | null;
};

export default function KashmirSourceFiles({ files, selectedRoute }: KashmirSourceFilesProps) {
  return (
    <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
            <FileText size={14} /> Source files
          </p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">Bundled Kashmir v3 outputs for presentation</h2>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
            These files are stored inside the dashboard build, so the demo does not depend on loose desktop files.
          </p>
        </div>
        {selectedRoute && selectedRoute.actionTaken !== 'MERGED_INTO_TRUNK' && (
          <a
            href={getRouteMapHref(selectedRoute)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition-all hover:bg-slate-800"
          >
            <Map size={16} /> Open selected route map
          </a>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {files.map((file) => (
          <a
            key={file.href}
            href={file.href}
            target={file.download ? undefined : '_blank'}
            rel={file.download ? undefined : 'noreferrer'}
            download={file.download ? file.fileName : undefined}
            className="group rounded-[1.5rem] border border-slate-100 bg-slate-50 p-4 transition-all hover:border-emerald-200 hover:bg-emerald-50"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black text-slate-950">{file.label}</p>
                <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{file.description}</p>
              </div>
              {file.download ? (
                <Download size={16} className="shrink-0 text-slate-400 group-hover:text-emerald-700" />
              ) : (
                <ArrowUpRight size={16} className="shrink-0 text-slate-400 group-hover:text-emerald-700" />
              )}
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
