import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Lock } from 'lucide-react';
import { CamoMode, CamoTier, TIER_SWATCH, challengeFor, checkImageLink, cssImage, masteryTiles, topMastery } from '../../lib/camo';
import { cn } from '../../lib/cn';
import { Button, Dialog, TextInput } from '../ui';

/**
 * A tier as a picture: its kind's swatch, and its image link drawn over that
 * when it has one. The swatch is underneath on purpose — a link that has died
 * shows the tier's swatch rather than a hole.
 */
export const TierSwatch: React.FC<{
  tier: CamoTier;
  className?: string;
  children?: React.ReactNode;
}> = ({ tier, className, children }) => {
  const link = checkImageLink(tier.imageUrl);
  return (
    <span className={cn('relative block overflow-hidden', TIER_SWATCH[tier.kind], className)}>
      {link.ok ? (
        <span
          aria-hidden
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: cssImage(link.url) }}
        />
      ) : null}
      {children}
    </span>
  );
};

/** What a camo's hover card says. Names live here, not on the page. */
export interface CamoInfo {
  name: string;
  /** What opens the challenge. */
  unlock?: string;
  challenge?: string;
  /** A line of the tracker's own, such as how many weapons are needed. */
  note?: string;
}

type Anchor = {
  ref: (el: HTMLElement | null) => void;
  onPointerEnter: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerLeave: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerDown: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
  onFocus: (e: React.FocusEvent<HTMLElement>) => void;
  onBlur: () => void;
  onContextMenu: (e: React.MouseEvent<HTMLElement>) => void;
  onClickCapture: (e: React.MouseEvent<HTMLElement>) => void;
};

const HOLD_MS = 450;

/**
 * A camo's name and challenge, on hover with a mouse, on keyboard focus, and
 * on a press-and-hold with a finger — a hold, so a tap still ticks. `tap`
 * makes a plain tap show it too, for anchors that do nothing else.
 *
 * Drawn in a portal at a fixed position: the table scrolls sideways, and a
 * card inside it would be clipped. Any scroll closes it.
 */
export const CamoHover: React.FC<{
  info: CamoInfo;
  tap?: boolean;
  children: (anchor: Anchor) => React.ReactNode;
}> = ({ info, tap = false, children }) => {
  const el = useRef<HTMLElement | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const hold = useRef<{ timer?: number; fired: boolean; touch: boolean }>({ fired: false, touch: false });
  const show = () => el.current && setRect(el.current.getBoundingClientRect());
  const hide = () => setRect(null);

  useEffect(() => {
    if (!rect) return;
    const outside = (e: PointerEvent) => !el.current?.contains(e.target as Node) && hide();
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    document.addEventListener('pointerdown', outside);
    return () => {
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
      document.removeEventListener('pointerdown', outside);
    };
  }, [rect]);
  useEffect(() => () => window.clearTimeout(hold.current.timer), []);

  const anchor: Anchor = {
    ref: (node) => {
      el.current = node;
    },
    onPointerEnter: (e) => e.pointerType === 'mouse' && show(),
    onPointerLeave: (e) => e.pointerType === 'mouse' && hide(),
    onPointerDown: (e) => {
      hold.current.touch = e.pointerType !== 'mouse';
      hold.current.fired = false;
      if (!hold.current.touch) return;
      window.clearTimeout(hold.current.timer);
      hold.current.timer = window.setTimeout(() => {
        hold.current.fired = true;
        show();
      }, HOLD_MS);
    },
    onPointerUp: () => window.clearTimeout(hold.current.timer),
    onPointerCancel: () => window.clearTimeout(hold.current.timer),
    onFocus: (e) => e.currentTarget.matches(':focus-visible') && show(),
    onBlur: hide,
    // A held finger opens the system menu on some phones.
    onContextMenu: (e) => hold.current.touch && e.preventDefault(),
    onClickCapture: (e) => {
      if (hold.current.fired) {
        // The hold showed the card; the tap that ends it changes nothing.
        e.preventDefault();
        e.stopPropagation();
        hold.current.fired = false;
      } else if (tap && hold.current.touch) {
        if (rect) hide();
        else show();
      }
    },
  };

  return (
    <>
      {children(anchor)}
      {rect ? createPortal(<HoverCard rect={rect} info={info} />, document.body) : null}
    </>
  );
};

const HoverCard: React.FC<{ rect: DOMRect; info: CamoInfo }> = ({ rect, info }) => {
  const card = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<{ left: number; top: number } | null>(null);
  useLayoutEffect(() => {
    const box = card.current?.getBoundingClientRect();
    if (!box) return;
    const margin = 8;
    const left = Math.min(
      Math.max(margin, rect.left + rect.width / 2 - box.width / 2),
      window.innerWidth - box.width - margin,
    );
    const above = rect.top - box.height - margin;
    setPlace({ left, top: above >= margin ? above : rect.bottom + margin });
  }, [rect]);
  return (
    <div
      ref={card}
      role="tooltip"
      style={place ? { left: place.left, top: place.top } : { left: 0, top: 0, visibility: 'hidden' }}
      className="pointer-events-none fixed z-50 w-max max-w-64 space-y-1 rounded-md border border-gray-300 bg-gray-100 px-3 py-2.5 text-75 text-gray-800 shadow-[0_8px_24px_-6px_rgb(0_0_0/0.7)]"
    >
      <p className="font-bold text-gray-1000">{info.name}</p>
      {info.unlock ? <p className="text-gray-600">{info.unlock}</p> : null}
      {info.challenge ? <p className="whitespace-pre-line">{info.challenge}</p> : null}
      {info.note ? <p className="text-gray-600">{info.note}</p> : null}
    </div>
  );
};

/**
 * One weapon's tier: lit when earned, dimmed when not, and a tap ticks it
 * (or clears it) by the chain rule — no Edit mode needed. `lit` shows a tier
 * every weapon has been given at once (MWII's Orion) as earned.
 */
export const TierCell: React.FC<{
  tier: CamoTier;
  done: boolean;
  lit?: boolean;
  info: CamoInfo;
  weaponName: string;
  onToggle: () => void;
  /** 56px, for the wide-screen table; 44px otherwise. */
  large?: boolean;
}> = ({ tier, done, lit = done, info, weaponName, onToggle, large = false }) => (
  <CamoHover info={info}>
    {(anchor) => (
      <button
        type="button"
        {...anchor}
        onClick={onToggle}
        aria-pressed={done}
        aria-label={`${weaponName}: ${tier.name} ${lit ? 'earned' : 'not earned'}`}
        className="block touch-manipulation select-none rounded-control focus-visible:outline-2"
      >
        <TierSwatch
          tier={tier}
          className={cn(
            'rounded-control border transition-all',
            large ? 'h-14 w-14' : 'h-11 w-11',
            lit
              ? 'border-gray-1000/40 shadow-[0_0_10px_-3px_rgb(255_255_255/0.5)]'
              : 'border-gray-400 opacity-25 grayscale',
          )}
        >
          {lit ? (
            <span className="absolute inset-0 flex items-center justify-center">
              <Check size={large ? 22 : 18} strokeWidth={3} className="text-gray-1000 drop-shadow-[0_1px_2px_rgb(0_0_0/0.9)]" />
            </span>
          ) : null}
        </TierSwatch>
      </button>
    )}
  </CamoHover>
);

/** A tick over a swatch, for a camo earned in full. */
const SwatchTick: React.FC<{ size: number }> = ({ size }) => (
  <span className="absolute inset-0 flex items-center justify-center">
    <Check size={size} strokeWidth={3} className="text-gray-1000 drop-shadow-[0_1px_2px_rgb(0_0_0/0.9)]" />
  </span>
);

/** The furthest mastery camo a mode has earned in full, ticked: a game cover's corner in Lists. */
export const MasteryBadge: React.FC<{ mode: CamoMode; className?: string }> = ({ mode, className }) => {
  const top = topMastery(mode);
  if (!top) return null;
  // The caller places and sizes the wrapper; the swatch is `relative` itself.
  return (
    <span className={cn('block', className)}>
      <TierSwatch
        tier={top.tier}
        className="h-full w-full rounded-sm border border-gray-1000/50 shadow-[0_1px_4px_rgb(0_0_0/0.8)]"
      >
        <SwatchTick size={13} />
      </TierSwatch>
    </span>
  );
};

/** Every mastery camo of a mode, ticked once earned in full and dimmed until then. */
export const MasteryRow: React.FC<{ mode: CamoMode; className?: string; swatchClassName: string }> = ({
  mode,
  className,
  swatchClassName,
}) => (
  <span className={cn('flex flex-wrap justify-center', className)}>
    {masteryTiles(mode).map((tile) => (
      <TierSwatch
        key={tile.tier.id}
        tier={tile.tier}
        className={cn(
          'rounded-sm border',
          swatchClassName,
          tile.complete ? 'border-gray-1000/40' : 'border-gray-400 opacity-30 grayscale',
        )}
      >
        {tile.complete ? <SwatchTick size={14} /> : null}
      </TierSwatch>
    ))}
  </span>
);

/** A tier's hover card: its name, what opens it and its challenge for this weapon. */
export const tierInfo = (tier: CamoTier, weapon?: { name: string }, cls?: { name: string }): CamoInfo => ({
  name: tier.name,
  unlock: tier.unlock,
  challenge: challengeFor(tier, weapon, cls),
});

/**
 * A gun's picture after its name. The box is always there, so pictures line up
 * whether or not a gun has one; a link that fails to load leaves it empty
 * rather than a broken-image mark. Mirrored, as the wiki's face right.
 */
export const WeaponIcon: React.FC<{ url?: string; className?: string }> = ({ url, className }) => {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);
  const link = checkImageLink(url);
  return (
    // Always a flex item where it is used, so no display class of its own: the
    // editor hides it on a phone with `hidden sm:block`.
    <span aria-hidden className={cn('shrink-0', className)}>
      {link.ok && !failed ? (
        <img
          src={link.url}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="h-full w-full -scale-x-100 object-contain"
        />
      ) : null}
    </span>
  );
};

/** "Locked", in place of a figure, for a tier not open yet. */
export const LockedLabel: React.FC = () => (
  <span className="inline-flex items-center gap-1 text-75 font-bold text-gray-600">
    <Lock size={12} />
    Locked
  </span>
);

/**
 * A text field that saves when you leave it or press Enter, not per key: a
 * name typed into the tracker is one write, not one per letter.
 */
export const CommitInput: React.FC<{
  value: string;
  onCommit: (next: string) => void;
  'aria-label': string;
  placeholder?: string;
  className?: string;
  /** Empty is allowed (an image link); otherwise it reverts. */
  allowEmpty?: boolean;
}> = ({ value, onCommit, placeholder, className, allowEmpty = false, ...rest }) => {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  const commit = () => {
    const next = draft.trim();
    if (!next && !allowEmpty) {
      setDraft(value);
      return;
    }
    if (next !== value) onCommit(next);
  };

  return (
    <TextInput
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') setDraft(value);
      }}
      placeholder={placeholder}
      aria-label={rest['aria-label']}
      className={className}
    />
  );
};

/** What deleting something costs, and the one button that does it. */
export const ConfirmDialog: React.FC<{
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}> = ({ isOpen, title, message, confirmLabel, onConfirm, onClose }) => (
  <Dialog
    isOpen={isOpen}
    onClose={onClose}
    title={title}
    footer={
      <div className="flex justify-end gap-2">
        <Button size="l" onClick={onClose}>
          Cancel
        </Button>
        <Button
          size="l"
          variant="negative"
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmLabel}
        </Button>
      </div>
    }
  >
    <p className="text-100 text-gray-800">{message}</p>
  </Dialog>
);
