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
        <label htmlFor={id} className="text-75 font-semibold text-gray-800">
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

export const inputClass = cn(
  'w-full rounded-sm border bg-gray-75 px-3 text-100 text-gray-900',
  'border-gray-300 placeholder:text-gray-600',
  'transition-colors hover:border-gray-400 focus:border-accent-800 focus:outline-none',
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

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({
  className,
  ...rest
}) => (
  <select className={cn(inputClass, 'h-9 cursor-pointer pr-8', className)} {...rest} />
);
