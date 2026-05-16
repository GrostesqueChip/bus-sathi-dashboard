import type { LucideIcon } from 'lucide-react';
import type { KashmirCountItem } from '@/lib/routeRationalizationKashmir';

export function formatNumber(value: number) {
  return new Intl.NumberFormat('en-IN').format(Math.round(value));
}

export function formatCompactNumber(value: number) {
  return new Intl.NumberFormat('en-IN', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatActionLabel(action: string) {
  if (action === 'UPGRADED_TO_TRUNK') return 'Main route';
  if (action === 'RETAINED_AS_FEEDER') return 'Feeder route';
  if (action === 'MERGED_INTO_TRUNK') return 'Merged into main route';
  return action.replaceAll('_', ' ').toLowerCase();
}

export function formatRouteType(type: string) {
  return type.replaceAll('_', ' ');
}

export function getActionPillClass(action: string) {
  if (action === 'UPGRADED_TO_TRUNK') return 'bg-emerald-100 text-emerald-800';
  if (action === 'MERGED_INTO_TRUNK') return 'bg-slate-200 text-slate-700';
  return 'bg-teal-100 text-teal-800';
}

export function getPriorityPillClass(priority: string) {
  if (priority === 'HP') return 'bg-orange-100 text-orange-800';
  if (priority === 'MP') return 'bg-teal-100 text-teal-800';
  return 'bg-slate-100 text-slate-700';
}

export function KpiCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone: 'slate' | 'blue' | 'teal' | 'orange' | 'violet' | 'emerald';
}) {
  const toneClass = {
    slate: 'from-slate-950 to-slate-800 text-white border-slate-800',
    blue: 'from-blue-600 to-cyan-500 text-white border-blue-300',
    teal: 'from-teal-600 to-emerald-500 text-white border-teal-300',
    orange: 'from-orange-500 to-amber-400 text-white border-orange-200',
    violet: 'from-violet-600 to-fuchsia-500 text-white border-violet-300',
    emerald: 'from-emerald-600 to-teal-500 text-white border-emerald-300',
  }[tone];

  return (
    <div className={`relative overflow-hidden rounded-[2rem] border bg-gradient-to-br p-6 shadow-sm ${toneClass}`}>
      <div className="absolute right-[-2rem] top-[-2rem] h-24 w-24 rounded-full bg-white/10" />
      <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-white/72">
        <Icon size={15} /> {label}
      </p>
      <h3 className="mt-4 text-4xl font-black tracking-tight">{value}</h3>
      <p className="mt-2 text-sm font-bold leading-6 text-white/78">{detail}</p>
    </div>
  );
}

export function DistributionCard({
  title,
  items,
  total,
  tone,
}: {
  title: string;
  items: KashmirCountItem[];
  total: number;
  tone: 'blue' | 'teal' | 'orange' | 'emerald';
}) {
  const barClass = {
    blue: 'bg-blue-600',
    teal: 'bg-teal-600',
    orange: 'bg-orange-500',
    emerald: 'bg-emerald-600',
  }[tone];

  return (
    <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
      <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">{title}</h3>
      <div className="mt-5 space-y-4">
        {items.map((item) => {
          const percentage = total ? (item.count / total) * 100 : 0;

          return (
            <div key={item.label}>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <span className="text-sm font-black text-slate-800">{formatRouteType(item.label)}</span>
                <span className="text-sm font-bold text-slate-500">{formatNumber(item.count)}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${barClass}`} style={{ width: `${Math.max(4, percentage)}%` }} />
              </div>
              <p className="mt-1 text-xs font-bold text-slate-400">{percentage.toFixed(1)}% of route rows</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PolicyCard({
  title,
  detail,
  icon: Icon,
}: {
  title: string;
  detail: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-[1.8rem] border border-white/12 bg-white/9 p-5 backdrop-blur">
      <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-100">
        <Icon size={15} /> kashmir v3 policy
      </p>
      <h3 className="mt-3 text-lg font-black text-white">{title}</h3>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-200/82">{detail}</p>
    </div>
  );
}
