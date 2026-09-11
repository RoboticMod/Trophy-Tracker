import React, { useEffect, useRef } from 'react';
import { CloseIcon } from '../icons';
import { Eyebrow } from './Panel';
import { cn } from '../../lib/cn';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Small caps line above the title, e.g. "Edit entry". */
  eyebrow?: string;
  title: string;
  /** Sticky action bar pinned to the bottom of the panel. */
  footer?: React.ReactNode;
  children: React.ReactNode;
  size?: 'm' | 'l';
}

/**
 * Modal shell shared by every dialog: scrim, escape handling, body scroll lock,
 * initial focus, and a header/footer that stay put while the body scrolls.
 */
export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  eyebrow,
  title,
  footer,
  children,
  size = 'm',
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  // Callers routinely pass an inline arrow for onClose, so its identity changes
  // on every parent render. Reading it through a ref keeps that churn out of the
  // effect below, which would otherwise re-run and steal focus back to the panel
  // after every keystroke in a field inside the dialog.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="tt-fade fixed inset-0 z-100 flex items-center justify-center bg-[rgb(8_7_6_/_.78)] p-4 backdrop-blur-[6px]"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'tt-rise flex max-h-[88vh] w-full flex-col overflow-hidden rounded-panel bg-surface',
          'shadow-[inset_0_0_0_1px_var(--tt-line-2),0_32px_80px_-24px_rgb(0_0_0_/_.9)]',
          'focus:outline-none',
          size === 'l' ? 'max-w-[720px]' : 'max-w-[520px]',
        )}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 px-5 pb-4 pt-5 shadow-[inset_0_-1px_0_var(--tt-line)]">
          <div className="min-w-0">
            {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
            <h2 className="m-0 mt-[3px] truncate font-display text-[20px] font-bold text-ink">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-control border-0 bg-transparent text-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <CloseIcon size={16} />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5">{children}</div>

        {footer ? (
          <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2.5 px-5 py-4 shadow-[inset_0_1px_0_var(--tt-line)]">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
};
