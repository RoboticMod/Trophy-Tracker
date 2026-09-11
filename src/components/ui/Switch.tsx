import React from 'react';
import { cn } from '../../lib/cn';

interface SwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  className?: string;
}

/** 46×26 track, 20px knob. Accent when on, the stronger hairline when off. */
export const Switch: React.FC<SwitchProps> = ({ checked, onChange, label, className }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    title={label}
    onClick={() => onChange(!checked)}
    className={cn(
      'relative block h-[26px] w-[46px] shrink-0 cursor-pointer rounded-full border-0 p-[3px]',
      'transition-colors duration-100 ease-tt',
      checked ? 'bg-accent' : 'bg-line-2',
      className,
    )}
  >
    <span
      className={cn(
        'block h-5 w-5 rounded-full bg-ink shadow-[0_1px_2px_rgb(0_0_0_/_.5)]',
        'transition-transform duration-100 ease-tt',
        checked ? 'translate-x-5' : 'translate-x-0',
      )}
    />
  </button>
);
