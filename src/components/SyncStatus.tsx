import React from 'react';
import { Check, Loader2 } from 'lucide-react';
import { cn } from '../lib/cn';

/**
 * The shape both platforms' per-game sync panels take.
 *
 * Steam and PlayStation fetch nothing alike — one is an app id, the other a
 * trophy list matched by name — but what a player needs to know is the same
 * either way: whether this game is actually being kept current, and if not,
 * what to do about it. Keeping the chrome here is what stops the two panels
 * drifting into two different-looking answers to one question.
 */
export type SyncTone = 'good' | 'busy' | 'warn' | 'bad';

const TONE_DOT: Record<SyncTone, string> = {
  good: 'bg-positive-700 shadow-[0_0_8px_var(--color-positive-700)]',
  busy: 'bg-accent-800 shadow-[0_0_8px_var(--color-accent-700)] animate-pulse',
  warn: 'bg-notice-700 shadow-[0_0_8px_var(--color-notice-700)]',
  bad: 'bg-negative-700 shadow-[0_0_8px_var(--color-negative-700)]',
};

const TONE_TEXT: Record<SyncTone, string> = {
  good: 'text-positive-900',
  busy: 'text-accent-900',
  warn: 'text-notice-900',
  bad: 'text-negative-900',
};

interface SyncStatusHeaderProps {
  tone: SyncTone;
  heading: string;
  detail?: React.ReactNode;
  /** A control for the fix this state calls for, e.g. choosing a trophy list. */
  action?: React.ReactNode;
}

/** The lit dot, the verdict, and whatever can be done about it. */
export const SyncStatusHeader: React.FC<SyncStatusHeaderProps> = ({
  tone,
  heading,
  detail,
  action,
}) => (
  <div className="flex items-start gap-3">
    <span aria-hidden className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', TONE_DOT[tone])} />
    <div className="min-w-0 flex-1" role="status" aria-live="polite">
      <div className={cn('flex items-center gap-1.5 text-75 font-bold', TONE_TEXT[tone])}>
        {tone === 'busy' ? <Loader2 size={13} className="animate-spin" /> : null}
        {tone === 'good' ? <Check size={13} /> : null}
        {heading}
      </div>
      {detail ? <p className="mt-0.5 text-50 text-gray-600">{detail}</p> : null}
    </div>
    {action}
  </div>
);

export interface SyncFact {
  label: string;
  value: string;
}

/** The figures the platform is answering for, as a row of small wells. */
export const SyncStatusFacts: React.FC<{ facts: SyncFact[] }> = ({ facts }) =>
  facts.length === 0 ? null : (
    <dl className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {facts.map((fact) => (
        <div key={fact.label} className="min-w-0 rounded-sm bg-black/25 px-3 py-2">
          <dt className="eyebrow text-gray-600">{fact.label}</dt>
          <dd className="mt-1 truncate text-75 font-semibold text-gray-1000" title={fact.value}>
            {fact.value}
          </dd>
        </div>
      ))}
    </dl>
  );

/** The day a platform dates something, spelled out rather than relative. */
export const syncDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
