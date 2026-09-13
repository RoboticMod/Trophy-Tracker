import React from 'react';
import { cn } from '../../lib/cn';

interface SwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  className?: string;
}

export const Switch: React.FC<SwitchProps> = ({ checked, onChange, label, className }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    title={label}
    onClick={() => onChange(!checked)}
    className={cn(
      'relative h-6 w-11 shrink-0 rounded-full p-0.5 transition-all',
      checked
        ? 'bg-accent-700 shadow-[0_0_12px_-4px_var(--color-accent-700)]'
        : 'bg-gray-300 shadow-[inset_0_1px_2px_rgb(0_0_0/0.5)]',
      className,
    )}
  >
    <span
      className={cn(
        'block h-5 w-5 rounded-full bg-gray-1000 shadow-sm transition-transform',
        checked ? 'translate-x-5' : 'translate-x-0',
      )}
    />
  </button>
);
