import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';

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
  size?: 'm' | 'l';
  /**
   * Takes the opening focus instead of the panel. A dialog whose first job is
   * typing should land the caret in the field, and doing it here rather than in
   * the caller avoids racing the panel's own focus.
   */
  initialFocusRef?: React.RefObject<HTMLElement | null>;
}

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
    (initialFocusRef?.current ?? panelRef.current)?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
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
            className="fixed inset-0 bg-gray-25/80 backdrop-blur-sm"
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
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className={cn(
              // Capped height with an internally scrolling body, so the footer
              // actions stay reachable no matter how long the form is.
              'relative my-8 flex max-h-[calc(100dvh-4rem)] w-full flex-col overflow-hidden rounded-xl',
              'border border-gray-200 bg-gray-100 shadow-xl focus:outline-none',
              size === 'l' ? 'max-w-4xl' : 'max-w-2xl',
            )}
          >
            <header className="flex items-start justify-between gap-4 border-b border-gray-200 p-5">
              <div className="flex min-w-0 items-center gap-3">
                {icon ? (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gray-200 text-gray-800">
                    {icon}
                  </div>
                ) : null}
                <div className="min-w-0">
                  <h2 className="truncate text-300 font-bold text-gray-1000">{title}</h2>
                  {description ? (
                    <p className="text-75 text-gray-700">{description}</p>
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

            <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>

            {footer ? (
              <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-200 bg-gray-75 p-4">
                {footer}
              </footer>
            ) : null}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
