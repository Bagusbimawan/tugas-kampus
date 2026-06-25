import { ChangeEvent } from 'react';

import { cn } from '../../lib/cn';
import { formatRupiahInput, parseRupiahInput } from '../../lib/format';

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  maxAmount?: number;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  id?: string;
}

export function CurrencyInput({
  value,
  onChange,
  placeholder = '0',
  maxAmount,
  className,
  inputClassName,
  disabled = false,
  id
}: CurrencyInputProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(parseRupiahInput(event.target.value, maxAmount));
  };

  return (
    <div className={cn('relative', className)}>
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500">
        Rp
      </span>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        value={formatRupiahInput(value)}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          'w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-400 disabled:opacity-60',
          inputClassName
        )}
      />
    </div>
  );
}
