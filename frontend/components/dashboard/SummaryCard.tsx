import { LucideIcon } from 'lucide-react';

interface SummaryCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  accentClass: string;
}

export const SummaryCard = ({
  icon: Icon,
  label,
  value,
  accentClass
}: SummaryCardProps) => {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{label}</p>
          <p className="mt-3 break-words text-2xl font-semibold leading-tight text-slate-900 sm:text-3xl">
            {value}
          </p>
        </div>
        <div className={`shrink-0 rounded-2xl p-3 ${accentClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
};
