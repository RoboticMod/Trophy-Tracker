import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, LogOut, Settings } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { useAuth } from '../context/AuthContext';
import { EASE_OUT } from '../lib/motion';
import { cn } from '../lib/cn';

/**
 * The account button at the end of the desktop bar, and the two things it is
 * for: Settings, and signing out.
 *
 * It used to go straight to Settings, which left signing out three levels down
 * a page of cards. A menu is what the chevron beside the name had been
 * promising all along.
 */
export const ProfileMenu: React.FC = () => {
  const { profile } = useGame();
  const { signOut } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Closes on a press anywhere else, on Escape, and whenever the page changes.
  useEffect(() => {
    if (!open) return;
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
  }, [open]);

  useEffect(() => setOpen(false), [location.pathname]);

  const onSettings = location.pathname === '/settings';

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Account"
        className={cn(
          'flex h-9 items-center gap-2 rounded-control border pl-2 pr-2.5 text-75 font-bold transition-colors',
          open || onSettings
            ? 'border-accent-700/45 bg-accent-700/12 text-accent-900'
            : 'border-gray-300 text-gray-800 hover:border-gray-400 hover:text-gray-1000',
        )}
      >
        {profile.avatarUrl ? (
          <img src={profile.avatarUrl} alt="" className="h-5.5 w-5.5 shrink-0 rounded-full object-cover" />
        ) : (
          <span className="flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-full bg-gray-300 text-75 font-extrabold text-gray-800">
            {profile.username?.charAt(0)?.toUpperCase() || 'P'}
          </span>
        )}
        <span className="hidden max-w-24 truncate lg:inline">{profile.username || 'Account'}</span>
        <ChevronDown
          size={14}
          className={cn('shrink-0 text-gray-600 transition-transform', open && 'rotate-180')}
        />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: EASE_OUT }}
            // Opaque, like the select lists: it opens over whatever the page
            // has under the bar, cover art included.
            className="absolute right-0 top-full z-50 mt-1.5 w-52 rounded-md border border-gray-300/70 bg-gray-100 p-1 shadow-[inset_0_1px_0_rgb(255_255_255/0.07),var(--shadow-xl)]"
          >
            <NavLink
              to="/settings"
              role="menuitem"
              className="flex h-9 items-center gap-2.5 rounded-sm px-2.5 text-90 font-bold text-gray-800 transition-colors hover:bg-white/8 hover:text-gray-1000"
            >
              <Settings size={15} className="shrink-0 text-gray-600" />
              Settings
            </NavLink>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                void signOut();
              }}
              className="flex h-9 w-full items-center gap-2.5 rounded-sm px-2.5 text-left text-90 font-bold text-negative-900 transition-colors hover:bg-negative-700/12"
            >
              <LogOut size={15} className="shrink-0" />
              Log out
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};
