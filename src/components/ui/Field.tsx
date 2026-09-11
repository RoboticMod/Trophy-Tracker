import React, { useId } from 'react';
import { cn } from '../../lib/cn';
import { FieldLabel } from './Panel';

/**
 * Inputs draw their edge as an inset shadow and swap it to the accent on focus,
 * so focusing a field never resizes it. `focus:shadow-*` needs the literal, as
 * Tailwind cannot compose an arbitrary inset shadow from a colour token alone.
 */
export const inputClass = cn(
  'w-full rounded-control border-0 bg-surface-2 px-3 text-ink',
  'shadow-[inset_0_0_0_1px_var(--tt-line)] transition-shadow duration-100 ease-tt',
  'focus:shadow-[inset_0_0_0_1px_var(--tt-accent)] focus:outline-none',
  'disabled:opacity-40',
);

interface FieldProps {
  label: string;
  description?: string;
  error?: string | null;
  children: (props: { id: string; 'aria-describedby'?: string }) => React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

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
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-center justify-between gap-2">
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        {action}
      </div>
      {children({ id, 'aria-describedby': help ? helpId : undefined })}
      {help ? (
        <p id={helpId} className={cn('m-0 text-[11px]', error ? 'text-danger' : 'text-faint')}>
          {help}
        </p>
      ) : null}
    </div>
  );
};

export const TextInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...rest }, ref) => (
  <input ref={ref} className={cn(inputClass, 'h-[38px] text-[14px]', className)} {...rest} />
));
TextInput.displayName = 'TextInput';

/** The tighter input used inside a settings row, where 38px crowds the row. */
export const RowInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...rest }, ref) => (
  <input ref={ref} className={cn(inputClass, 'h-[34px] px-2.5 text-[13px]', className)} {...rest} />
));
RowInput.displayName = 'RowInput';

export const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = ({
  className,
  ...rest
}) => <textarea className={cn(inputClass, 'py-2 text-[14px] leading-relaxed', className)} {...rest} />;

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({
  className,
  ...rest
}) => (
  <select
    className={cn(
      'h-9 cursor-pointer rounded-control border-0 bg-surface px-3 text-[13px] text-body',
      'shadow-[inset_0_0_0_1px_var(--tt-line)] focus:outline-none',
      className,
    )}
    {...rest}
  />
);

/**
 * The 0-100 slider used for both ratings in the edit dialog. `accentColor`
 * carries the thumb and filled track, so the control needs no custom track
 * painting to follow the theme.
 */
export const RangeInput: React.FC<
  React.InputHTMLAttributes<HTMLInputElement> & { accent?: string }
> = ({ accent = 'var(--tt-gold, #e5a83c)', className, ...rest }) => (
  <input
    type="range"
    min={0}
    max={100}
    step={1}
    style={{ accentColor: accent }}
    className={cn('w-full cursor-pointer', className)}
    {...rest}
  />
);
