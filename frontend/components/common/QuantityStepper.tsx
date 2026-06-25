import { Minus, Plus } from 'lucide-react';

import { cn } from '../../lib/cn';

interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  allowNegative?: boolean;
  step?: number;
  size?: 'sm' | 'md';
  className?: string;
  disabled?: boolean;
  ariaLabel?: string;
}

export function QuantityStepper({
  value,
  onChange,
  min,
  max,
  allowNegative = false,
  step = 1,
  size = 'md',
  className,
  disabled = false,
  ariaLabel = 'Jumlah'
}: QuantityStepperProps) {
  const effectiveMin = allowNegative ? (min ?? Number.NEGATIVE_INFINITY) : Math.max(0, min ?? 0);
  const isAtMin = value <= effectiveMin;
  const isAtMax = max !== undefined && value >= max;

  const handleDecrement = () => {
    if (disabled || isAtMin) {
      return;
    }
    onChange(value - step);
  };

  const handleIncrement = () => {
    if (disabled || isAtMax) {
      return;
    }
    onChange(value + step);
  };

  const clampValue = (raw: number) => {
    if (!Number.isFinite(raw)) {
      return allowNegative ? 0 : effectiveMin;
    }

    let next = Math.trunc(raw);

    if (max !== undefined) {
      next = Math.min(next, max);
    }

    if (!allowNegative) {
      next = Math.max(effectiveMin, next);
    } else if (min !== undefined) {
      next = Math.max(min, next);
    }

    return next;
  };

  const handleInputChange = (raw: string) => {
    if (raw === '' || raw === '-') {
      if (allowNegative && raw === '-') {
        return;
      }
      onChange(allowNegative ? 0 : effectiveMin);
      return;
    }

    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
      return;
    }

    onChange(clampValue(parsed));
  };

  const handleInputBlur = (raw: string) => {
    if (raw === '' || raw === '-') {
      onChange(allowNegative ? 0 : Math.max(effectiveMin, min ?? 0));
      return;
    }

    const parsed = Number(raw);
    onChange(clampValue(parsed));
  };

  const buttonSize = size === 'sm' ? 'p-2' : 'p-3';
  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  const inputSize = size === 'sm' ? 'min-w-10 px-2 py-2 text-sm' : 'min-w-12 px-3 py-3 text-sm';

  return (
    <div
      className={cn(
        'inline-flex w-full max-w-[200px] items-stretch rounded-2xl border border-slate-200 bg-slate-50',
        disabled && 'opacity-60',
        className
      )}
      role="group"
      aria-label={ariaLabel}
    >
      <button
        type="button"
        onClick={handleDecrement}
        onPointerDown={(event) => event.preventDefault()}
        disabled={disabled || isAtMin}
        aria-label="Kurangi"
        className={cn(
          buttonSize,
          'shrink-0 rounded-l-2xl text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40'
        )}
      >
        <Minus className={iconSize} />
      </button>
      <input
        type="text"
        inputMode={allowNegative ? 'text' : 'numeric'}
        autoComplete="off"
        value={Number.isFinite(value) ? String(value) : '0'}
        disabled={disabled}
        onChange={(event) => handleInputChange(event.target.value)}
        onBlur={(event) => handleInputBlur(event.target.value)}
        aria-label={ariaLabel}
        className={cn(
          inputSize,
          'w-full border-x border-slate-200 bg-white text-center font-medium text-slate-900 outline-none'
        )}
      />
      <button
        type="button"
        onClick={handleIncrement}
        onPointerDown={(event) => event.preventDefault()}
        disabled={disabled || isAtMax}
        aria-label="Tambah"
        className={cn(
          buttonSize,
          'shrink-0 rounded-r-2xl text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40'
        )}
      >
        <Plus className={iconSize} />
      </button>
    </div>
  );
}
