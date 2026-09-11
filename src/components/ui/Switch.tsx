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
      'relative h-6 w-11 shrink-0 rounded-full p-0.5 transition-colors',
      checked ? 'bg-accent-700' : 'bg-gray-300',
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
