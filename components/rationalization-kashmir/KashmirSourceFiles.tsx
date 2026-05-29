'use client';

import { ArrowUpRight, Download, FileSpreadsheet, FolderDown, Map } from 'lucide-react';
import type { RationalizedRouteKashmir, KashmirSourceFile } from '@/lib/routeRationalizationKashmir';
import { getRouteMapHref } from '@/components/rationalization-kashmir/KashmirRouteUtils';

type KashmirSourceFilesProps = {
  files: KashmirSourceFile[];
  selectedRoute: RationalizedRouteKashmir | null;
};

function fileLinkProps(file: KashmirSourceFile) {
  return {
    href: file.href,
    target: file.download ? undefined : '_blank',
    rel: file.download ? undefined : 'noreferrer',
    download: file.download ? file.fileName : undefined,
  } as const;
}

export default function KashmirSourceFiles({ files, selectedRoute }: KashmirSourceFilesProps) {
  const primary = files.find((file) => file.tier === 'primary');
  const secondary = files.filter((file) => file.tier === 'secondary');
  const technical = files.filter((file) => file.tier === 'technical');

  return (
    <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
            <FileSpreadsheet size={14} /> Downloads
          </p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">Bus schedule &amp; supporting files</h2>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
            Start with the bus-schedule workbook below. Everything else is one click away — kept tidy so the file the
            RTO needs is never buried.
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

      {/* PRIMARY — the bus-schedule workbook the RTO submits */}
      {primary && (
        <a
          {...fileLinkProps(primary)}
          className="group mt-6 flex flex-col gap-4 rounded-[1.75rem] border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-50 p-6 transition-all hover:border-emerald-400 hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/25">
              <FileSpreadsheet size={26} />
            </span>
            <div>
              <p className="text-lg font-black text-slate-950">{primary.label}</p>
              <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-slate-600">{primary.description}</p>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-4 text-base font-black text-white shadow-lg shadow-emerald-600/20 transition-all group-hover:bg-emerald-700">
            <Download size={20} /> Download (.xlsx)
          </span>
        </a>
      )}

      {/* SECONDARY — master workbook + map */}
      {secondary.length > 0 && (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {secondary.map((file) => (
            <a
              key={file.href}
              {...fileLinkProps(file)}
              className="group flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-all hover:border-emerald-200 hover:bg-emerald-50"
            >
              <div>
                <p className="text-sm font-black text-slate-950">{file.label}</p>
                <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{file.description}</p>
              </div>
              {file.download ? (
                <Download size={16} className="shrink-0 text-slate-400 group-hover:text-emerald-700" />
              ) : (
                <ArrowUpRight size={16} className="shrink-0 text-slate-400 group-hover:text-emerald-700" />
              )}
            </a>
          ))}
        </div>
      )}

      {/* TECHNICAL — collapsed by default */}
      {technical.length > 0 && (
        <details className="group mt-4 rounded-2xl border border-slate-100 bg-slate-50/60">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-5 py-4 text-sm font-black text-slate-700 transition-colors hover:bg-slate-100">
            <span className="flex items-center gap-2">
              <FolderDown size={16} className="text-slate-400" />
              Technical files &amp; raw data ({technical.length})
            </span>
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400 group-open:hidden">Show</span>
            <span className="hidden text-xs font-bold uppercase tracking-[0.16em] text-slate-400 group-open:inline">Hide</span>
          </summary>
          <div className="grid grid-cols-1 gap-3 px-5 pb-5 md:grid-cols-2 xl:grid-cols-3">
            {technical.map((file) => (
              <a
                key={file.href}
                {...fileLinkProps(file)}
                className="group/file rounded-[1.25rem] border border-slate-100 bg-white p-4 transition-all hover:border-emerald-200 hover:bg-emerald-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-slate-950">{file.label}</p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{file.description}</p>
                  </div>
                  {file.download ? (
                    <Download size={16} className="shrink-0 text-slate-400 group-hover/file:text-emerald-700" />
                  ) : (
                    <ArrowUpRight size={16} className="shrink-0 text-slate-400 group-hover/file:text-emerald-700" />
                  )}
                </div>
              </a>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}
