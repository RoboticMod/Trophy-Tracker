import React from 'react';
import { cn } from '../../lib/cn';
import { softEdge } from '../../lib/tone';

interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /** Drops the default padding when the panel lays out its own header. */
  bare?: boolean;
  /**
   * Gives the panel the trophy treatment: a warm gradient body and a gold
   * hairline. Reserved for completion — the 100% club tile, the trophy room
   * banner, the showcase rows.
   */
  gold?: boolean;
}

/** The one surface every section of the app sits on. */
export const Panel: React.FC<PanelProps> = ({
  children,
  bare = false,
  gold = false,
  className,
  style,
  ...rest
}) => (
  <div
    style={
      gold
        ? {
            background:
              'linear-gradient(165deg, var(--color-gold-wash), var(--tt-surface, #1a1714) 72%)',
            boxShadow: `inset 0 0 0 1px ${softEdge('var(--tt-gold, #e5a83c)', 40)}`,
            ...style,
          }
        : style
    }
    className={cn(
      'rounded-panel',
      gold ? '' : 'bg-surface hairline',
      bare ? '' : 'p-[clamp(16px,2.4vw,22px)]',
      className,
    )}
    {...rest}
  >
    {children}
  </div>
);

/** A row nested inside a panel: one step lighter, tighter radius. */
export const InsetRow: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...rest
}) => (
  <div className={cn('rounded-inset bg-surface-2 p-3.5 hairline', className)} {...rest}>
    {children}
  </div>
);

/* -- Typography -------------------------------------------------------------
   The four label styles that recur across every screen. Kept here so a heading
   never picks up a one-off size or tracking.                                 */

/** Small caps line above a page title or a stat. */
export const Eyebrow: React.FC<{
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}> = ({ children, className, style }) => (
  <span
    style={style}
    className={cn(
      'block font-display text-[11px] font-semibold uppercase tracking-[0.16em] text-subtle',
      className,
    )}
  >
    {children}
  </span>
);

/** Panel-level heading, 16px. */
export const PanelHeading: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <h2 className={cn('m-0 font-display text-[16px] font-bold text-ink', className)}>{children}</h2>
);

/** Gold group heading inside the Advanced customization panel. */
export const GroupHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="m-0 font-display text-[11px] font-bold uppercase tracking-[0.16em] text-gold">
    {children}
  </h3>
);

/** Field label: the smallest caps rung, above an input. */
export const FieldLabel: React.FC<{
  children: React.ReactNode;
  htmlFor?: string;
  className?: string;
}> = ({ children, htmlFor, className }) => (
  <label
    htmlFor={htmlFor}
    className={cn(
      'font-display text-[10px] font-semibold uppercase tracking-[0.14em] text-subtle',
      className,
    )}
  >
    {children}
  </label>
);

/** The page header block: eyebrow, title, and an optional standfirst. */
export const PageHeading: React.FC<{
  eyebrow: string;
  eyebrowColor?: string;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
}> = ({ eyebrow, eyebrowColor, title, description, action }) => (
  <div className="flex flex-wrap items-end justify-between gap-4">
    <div className="min-w-0">
      <Eyebrow style={eyebrowColor ? { color: eyebrowColor } : undefined}>{eyebrow}</Eyebrow>
      <h1 className="m-0 mt-1 font-display text-[clamp(28px,4.2vw,42px)] font-bold leading-[1.05] tracking-[-0.02em] text-ink">
        {title}
      </h1>
      {description ? (
        <p className="m-0 mt-2 max-w-[56ch] text-[14px] text-muted [text-wrap:pretty]">
          {description}
        </p>
      ) : null}
    </div>
    {action}
  </div>
);
