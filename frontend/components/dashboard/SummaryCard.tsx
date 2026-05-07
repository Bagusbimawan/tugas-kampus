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
    <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[28px] sm:p-5">
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400 sm:text-xs sm:tracking-[0.3em]">
            {label}
          </p>
          <p className="mt-2 break-words text-xl font-semibold leading-tight text-slate-900 sm:mt-3 sm:text-3xl">
            {value}
          </p>
        </div>
        <div className={`shrink-0 rounded-2xl p-2.5 sm:p-3 ${accentClass}`}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
      </div>
    </div>
  );
};
