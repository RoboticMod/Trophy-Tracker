import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { EASE_OUT } from '../../lib/motion';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  /** Rendered to the left of the title, e.g. a platform icon. */
  icon?: React.ReactNode;
  /** Sticky action bar pinned to the bottom of the dialog. */
  footer?: React.ReactNode;
  children: React.ReactNode;
  /**
   * `split` is the wide details dialog: 980 across, 720 at most, a 24px title
   * and no icon well — the children lay out their own two columns, and the
   * body does not scroll as a whole so that only one of them has to.
   */
  size?: 'm' | 'l' | 'split';
  /**
   * Takes the opening focus instead of the panel. A dialog whose first job is
   * typing should land the caret in the field, and doing it here rather than in
   * the caller avoids racing the panel's own focus.
   */
  initialFocusRef?: React.RefObject<HTMLElement | null>;
}

/**
 * How many dialogs currently hold the page's scroll, and what it was before the
 * first of them took it.
 *
 * Each dialog used to save and restore `document.body.style.overflow` itself,
 * which is correct for one at a time and wrong the moment a second opens: the
 * first to close restores the page's scroll while the second is still up. That
 * became reachable when a dialog gained a button opening another one — and
 * because the exit animation outlives the close, *which* one closes first is a
 * matter of timing rather than of order. Counted here instead: the lock goes on
 * with the first and comes off with the last.
 */
let scrollLocks = 0;
let scrollLockPrevious = '';

const lockBodyScroll = () => {
  if (scrollLocks === 0) {
    scrollLockPrevious = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  scrollLocks += 1;
};

const unlockBodyScroll = () => {
  scrollLocks = Math.max(0, scrollLocks - 1);
  if (scrollLocks === 0) document.body.style.overflow = scrollLockPrevious;
};

/**
 * Modal shell shared by every dialog in the app: backdrop, escape handling,
 * body scroll lock, initial focus, and a consistent header/footer.
 */
export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  icon,
  footer,
  children,
  size = 'm',
  initialFocusRef,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const split = size === 'split';

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

    lockBodyScroll();
    (initialFocusRef?.current ?? panelRef.current)?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      unlockBodyScroll();
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className={cn(
              'fixed inset-0',
              size === 'split' ? 'bg-gray-25/72 backdrop-blur-[10px]' : 'bg-gray-25/85 backdrop-blur-md',
            )}
          />

          <motion.div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.18, ease: EASE_OUT }}
            className={cn(
              // Capped height with an internally scrolling body, so the footer
              // actions stay reachable no matter how long the form is.
              'relative my-8 flex w-full flex-col overflow-hidden',
              // Opaque rather than glass: a dialog sits over content it must
              // not let through, so it borrows the panel's edge and light but
              // keeps a solid ground.
              'border bg-gray-100 focus:outline-none',
              split
                ? 'max-h-[min(45rem,calc(100dvh-4rem))] max-w-245 rounded-2xl border-gray-300/80 shadow-[inset_0_1px_0_rgb(255_255_255/0.07),0_40px_120px_-30px_rgb(0_0_0/0.85)]'
                : cn(
                    'max-h-[calc(100dvh-4rem)] rounded-xl border-gray-300/70',
                    'shadow-[inset_0_1px_0_rgb(255_255_255/0.07),var(--shadow-xl)]',
                    size === 'l' ? 'max-w-4xl' : 'max-w-2xl',
                  ),
            )}
          >
            {split ? (
              // The title at a page's 24, with its platform mark in the line
              // under it rather than in a well beside it — at this size the
              // well was a second heading competing with the name.
              <header className="flex shrink-0 items-start gap-4 border-b border-gray-200 pb-4.5 pl-6 pr-5 pt-5">
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-550 font-bold tracking-tight text-gray-1000">
                    {title}
                  </h2>
                  {description || icon ? (
                    <p className="mt-1.25 flex items-center gap-2 text-90 text-gray-700">
                      {icon}
                      {description}
                    </p>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close dialog"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-gray-300 text-gray-700 transition-colors hover:border-gray-400 hover:text-gray-1000"
                >
                  <X size={18} />
                </button>
              </header>
            ) : (
              <header className="flex items-start justify-between gap-4 border-b border-gray-200 p-4 sm:p-5">
                <div className="flex min-w-0 items-center gap-3">
                  {icon ? (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gray-200 text-gray-800">
                      {icon}
                    </div>
                  ) : null}
                  <div className="min-w-0">
                    <h2 className="truncate text-300 font-bold tracking-tight text-gray-1000">
                      {title}
                    </h2>
                    {description ? (
                      <p className="text-75 text-gray-600">{description}</p>
                    ) : null}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close dialog"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-gray-700 transition-colors hover:bg-gray-200 hover:text-gray-1000"
                >
                  <X size={18} />
                </button>
              </header>
            )}

            <div
              className={cn(
                'min-h-0 flex-1',
                split ? 'flex overflow-hidden p-6' : 'overflow-y-auto p-4 sm:p-5',
              )}
            >
              {children}
            </div>

            {footer ? (
              <footer
                className={cn(
                  'flex shrink-0 flex-wrap items-center justify-end border-t border-gray-200 bg-black/25',
                  split ? 'gap-2.5 px-6 py-4' : 'gap-2 p-3 sm:p-4',
                )}
              >
                {footer}
              </footer>
            ) : null}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
