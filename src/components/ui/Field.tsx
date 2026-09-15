import React, { useId } from 'react';
import { cn } from '../../lib/cn';

interface FieldProps {
  label: string;
  description?: string;
  error?: string | null;
  children: (props: { id: string; 'aria-describedby'?: string }) => React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

/** Spectrum field: label, control, and one slot for help or error text. */
export const Field: React.FC<FieldProps> = ({
  label,
  description,
  error,
  children,
  className,
  action,
}) => {
  const id = useId();
  const helpId = `${id}-help`;
  const help = error || description;

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="eyebrow text-gray-700">
          {label}
        </label>
        {action}
      </div>
      {children({ id, 'aria-describedby': help ? helpId : undefined })}
      {help ? (
        <p id={helpId} className={cn('text-50', error ? 'text-negative-900' : 'text-gray-600')}>
          {help}
        </p>
      ) : null}
    </div>
  );
};

/**
 * Fields are cut into the panel rather than laid on it: a dark well, a hairline
 * edge, and an inner shadow along the top. Focus lights the edge and blooms
 * outward instead of drawing a second ring around the control.
 */
export const inputClass = cn(
  'w-full rounded-sm border px-3 text-100 text-gray-900',
  'bg-black/25 border-gray-300 placeholder:text-gray-600',
  'shadow-[inset_0_1px_2px_rgb(0_0_0/0.4)]',
  'transition-colors hover:border-gray-400',
  'focus:border-accent-700 focus:shadow-[inset_0_1px_2px_rgb(0_0_0/0.4),0_0_0_3px_color-mix(in_srgb,var(--color-accent-700)_22%,transparent)] focus:outline-none',
  'disabled:opacity-40',
);

export const TextInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...rest }, ref) => (
    <input ref={ref} className={cn(inputClass, 'h-9', className)} {...rest} />
  ),
);
TextInput.displayName = 'TextInput';

export const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = ({
  className,
  ...rest
}) => <textarea className={cn(inputClass, 'py-2 leading-relaxed', className)} {...rest} />;

/**
 * The browser's own select, kept for a form control that genuinely wants native
 * behaviour. Every filter and sort in the app uses `Select` instead — the
 * native list cannot be styled, so it is the one surface the token layer cannot
 * reach.
 */
export const NativeSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({
  className,
  ...rest
}) => (
  <select className={cn(inputClass, 'h-9 cursor-pointer pr-8', className)} {...rest} />
);
