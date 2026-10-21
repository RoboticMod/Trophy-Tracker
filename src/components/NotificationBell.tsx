import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Bell } from 'lucide-react';
import { useNotifications } from '../context/NotificationsContext';
import { EASE_OUT } from '../lib/motion';
import { cn } from '../lib/cn';
import { NotificationsPanel } from './NotificationsPanel';
import { Dialog } from './ui';

/**
 * The bell in the top bar, and the progress waiting behind it.
 *
 * While anything is unread it rings every few seconds and carries a count
 * with a halo spreading off it — gold when one of them finished a game, the
 * news most worth not missing. Opened, it is a panel under the bell on a wide
 * screen and a sheet on a phone, like every other dialog there.
 */
export const NotificationBell: React.FC<{ variant: 'bar' | 'phone' }> = ({ variant }) => {
  const { unreadCount, hasUnreadCompletion } = useNotifications();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const phone = variant === 'phone';

  // The popover closes on a press elsewhere, on Escape and on a page change.
  useEffect(() => {
    if (!open || phone) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, phone]);

  useEffect(() => setOpen(false), [location.pathname]);

  const waiting = unreadCount > 0;
  const label = waiting
    ? `Notifications, ${unreadCount} new`
    : 'Notifications';

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={label}
        title={label}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={cn(
          'relative flex items-center justify-center transition-colors',
          phone
            ? 'h-11 w-11 rounded-md text-gray-800 hover:bg-white/5'
            : 'h-11 w-11 rounded-control border bg-black/25 hover:text-gray-1000 lg:h-9 lg:w-9',
          !phone &&
            (open
              ? 'border-accent-700/45 bg-accent-700/12 text-accent-900'
              : 'border-gray-300 text-gray-700'),
          waiting && (hasUnreadCompletion ? 'text-trophy-900' : 'text-accent-900'),
        )}
      >
        <Bell size={phone ? 19 : 16} className={cn(waiting && !open && 'bell-ring')} />

        {waiting ? (
          <span
            className={cn(
              'notify-halo absolute flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1',
              phone ? 'right-1.5 top-1.5' : '-right-1.5 -top-1.5',
              hasUnreadCompletion ? 'bg-trophy-900 text-trophy-900' : 'bg-accent-600 text-accent-700',
            )}
          >
            <span
              className={cn(
                'text-50 font-bold leading-none tabular-nums',
                hasUnreadCompletion ? 'text-gray-25' : 'text-gray-1000',
              )}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          </span>
        ) : null}
      </button>

      {phone ? (
        <Dialog isOpen={open} onClose={() => setOpen(false)} title="Notifications">
          <NotificationsPanel onClose={() => setOpen(false)} />
        </Dialog>
      ) : (
        <AnimatePresence>
          {open ? (
            <motion.div
              role="dialog"
              aria-label="Notifications"
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.18, ease: EASE_OUT }}
              className="absolute right-0 top-full z-50 mt-2 w-100 origin-top-right rounded-lg border border-gray-300/70 bg-gray-100 shadow-[inset_0_1px_0_rgb(255_255_255/0.07),var(--shadow-xl)]"
            >
              <div className="border-b border-gray-200 px-4 py-3 text-100 font-bold text-gray-1000">
                Notifications
              </div>
              <div className="max-h-[70vh] overflow-y-auto p-3">
                <NotificationsPanel onClose={() => setOpen(false)} />
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      )}
    </div>
  );
};
