import { Plus } from 'lucide-react';

import { cn } from '../../lib/cn';

interface PositiveQuantityInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  presets?: number[];
  unit?: string;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}

export function PositiveQuantityInput({
  value,
  onChange,
  min = 1,
  max,
  presets = [1, 5, 10, 25],
  unit = 'unit',
  disabled = false,
  className,
  ariaLabel = 'Jumlah'
}: PositiveQuantityInputProps) {
  const clamp = (raw: number) => {
    if (!Number.isFinite(raw)) {
      return min;
    }

    let next = Math.max(min, Math.trunc(raw));

    if (max !== undefined) {
      next = Math.min(next, max);
    }

    return next;
  };

  const handleInputChange = (raw: string) => {
    if (raw === '') {
      return;
    }

    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
      return;
    }

    onChange(clamp(parsed));
  };

  const handleInputBlur = (raw: string) => {
    if (raw === '') {
      onChange(min);
      return;
    }

    onChange(clamp(Number(raw)));
  };

  const isAtMax = max !== undefined && value >= max;

  return (
    <div className={cn('space-y-3', className)}>
      <div className="grid grid-cols-4 gap-2">
        {presets.map((preset) => {
          const isDisabled = disabled || (max !== undefined && preset > max);
          const isActive = value === preset;

          return (
            <button
              key={preset}
              type="button"
              disabled={isDisabled}
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => onChange(clamp(preset))}
              aria-label={`${preset} ${unit}`}
              className={cn(
                'rounded-2xl border px-2 py-2.5 text-center text-sm font-semibold transition sm:px-3 sm:py-2',
                isActive
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300',
                isDisabled && 'cursor-not-allowed opacity-40'
              )}
            >
              <span className="block leading-none">{preset}</span>
              <span className="mt-1 block text-[10px] font-medium uppercase tracking-wide opacity-80 sm:text-[11px]">
                {unit}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-stretch gap-2">
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          disabled={disabled}
          value={Number.isFinite(value) ? String(value) : String(min)}
          onChange={(event) => handleInputChange(event.target.value)}
          onBlur={(event) => handleInputBlur(event.target.value)}
          aria-label={ariaLabel}
          className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-center text-lg font-semibold text-slate-900 outline-none focus:border-slate-400 sm:px-4"
        />
        <button
          type="button"
          disabled={disabled || isAtMax}
          onPointerDown={(event) => event.preventDefault()}
          onClick={() => onChange(clamp(value + 1))}
          aria-label="Tambah satu"
          title="Tambah 1"
          className="inline-flex h-auto min-w-[3rem] shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 sm:min-w-[4.5rem] sm:gap-1.5 sm:px-4"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">1</span>
        </button>
      </div>
    </div>
  );
}
