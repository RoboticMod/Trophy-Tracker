import React, { useEffect, useState } from 'react';
import { Check, Lock } from 'lucide-react';
import { CamoTier, TIER_SWATCH, checkImageLink, cssImage } from '../../lib/camo';
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

/**
 * One weapon's tier: lit when earned, dimmed when not. A button only in Edit
 * mode — View mode is read-only so a stray tap on a phone changes nothing.
 */
export const TierCell: React.FC<{
  tier: CamoTier;
  done: boolean;
  editable: boolean;
  weaponName: string;
  onToggle: () => void;
  /** 56px, for the wide-screen table; 44px otherwise. */
  large?: boolean;
}> = ({ tier, done, editable, weaponName, onToggle, large = false }) => {
  const label = `${weaponName}: ${tier.name} ${done ? 'earned' : 'not earned'}`;
  const face = (
    <TierSwatch
      tier={tier}
      className={cn(
        'rounded-control border transition-all',
        large ? 'h-14 w-14' : 'h-11 w-11',
        done
          ? 'border-gray-1000/40 shadow-[0_0_10px_-3px_rgb(255_255_255/0.5)]'
          : 'border-gray-400 opacity-25 grayscale',
      )}
    >
      {done ? (
        <span className="absolute inset-0 flex items-center justify-center">
          <Check size={large ? 22 : 18} strokeWidth={3} className="text-gray-1000 drop-shadow-[0_1px_2px_rgb(0_0_0/0.9)]" />
        </span>
      ) : null}
    </TierSwatch>
  );

  if (!editable) {
    return (
      <span role="img" aria-label={label} title={label} className="block">
        {face}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={done}
      aria-label={label}
      title={label}
      className="block rounded-control focus-visible:outline-2"
    >
      {face}
    </button>
  );
};

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
