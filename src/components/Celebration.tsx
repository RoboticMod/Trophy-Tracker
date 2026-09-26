import React, { useMemo } from 'react';
import { Platform } from '../types';
import { PLATFORMS } from '../lib/constants';

/**
 * The spray, per surface. A card is a couple of hundred pixels across; the add
 * dialog's preview is three times that, and the card's 18 small sparks climbing
 * 190px were lost in it — a few dots in the bottom third, gold on the gold of
 * the pour, which read as no sparks at all. The large spray is denser, bigger
 * and climbs the whole preview.
 */
const SPRAY = {
  card: { count: 18, size: [3, 7], rise: [80, 190], drift: 26 },
  large: { count: 42, size: [5, 10], rise: [150, 300], drift: 60 },
} as const;

/** How long the celebration runs. The card clears it to match. */
export const CELEBRATION_MS = 2000;

/**
 * How long a celebration waits for its card to be looked at.
 *
 * A completion can land on a page you are not on, or below where you are
 * reading, and the burst belongs on screen rather than wherever the scroll
 * position happens to be. It waits, and if nothing ever brings the card into
 * view it is given up on rather than fired at nobody.
 */
export const CELEBRATION_WINDOW_MS = 15000;

/**
 * The beat between a card coming into view and its burst.
 *
 * Long enough for the meter underneath to finish sweeping up to full, so the
 * burst reads as the answer to the bar filling rather than as something
 * happening beside it.
 */
export const CELEBRATION_DELAY_MS = 650;

interface CelebrationProps {
  platform: Platform;
  /**
   * Which hue the glow and the shine are tinted with. Gold is a completion;
   * blue is the gentler "this arrived" version the add dialog uses, where
   * nothing has been earned and gold would be claiming something.
   */
  tone?: 'trophy' | 'accent';
  /** The rising sparks. Off for an arrival, which is not a fanfare. */
  sparks?: boolean;
  /** How big a surface it plays over: a card, or a dialog's wide preview. */
  scale?: keyof typeof SPRAY;
}

const TONE_TINT: Record<NonNullable<CelebrationProps['tone']>, string> = {
  trophy: 'var(--color-trophy-900)',
  accent: 'var(--color-accent-900)',
};

/**
 * Plays over the card that was just completed: gold pouring up the card from
 * the meter and draining away, with sparkles rising and drifting through it.
 *
 * Mount it with a fresh key per celebration — the spread is randomised once on
 * mount, so no two runs land the same way, and the CSS animations restart.
 */
export const Celebration: React.FC<CelebrationProps> = ({
  platform,
  tone = 'trophy',
  sparks = true,
  scale = 'card',
}) => {
  const particles = useMemo(() => {
    const spray = SPRAY[scale];
    const palette = [
      'var(--color-trophy-900)',
      'var(--color-trophy-700)',
      PLATFORMS[platform]?.color ?? 'var(--color-accent-900)',
      'var(--color-gray-1000)',
    ];

    return Array.from({ length: spray.count }, (_, i) => ({
      id: i,
      // Spread across the card's width, then drift sideways as they climb.
      dx: `${(5 + (i / spray.count) * 90 + (Math.random() - 0.5) * 6).toFixed(1)}%`,
      drift: `${((Math.random() - 0.5) * spray.drift).toFixed(0)}px`,
      rise: `${(-spray.rise[0] - Math.random() * (spray.rise[1] - spray.rise[0])).toFixed(0)}px`,
      rot: `${((Math.random() - 0.5) * 200).toFixed(0)}deg`,
      size: spray.size[0] + Math.random() * (spray.size[1] - spray.size[0]),
      radius: Math.random() > 0.5 ? '9999px' : '1px',
      // Staggered starts and uneven durations, so the spray scatters rather
      // than rising and fading as a single block.
      delay: `${Math.round(Math.random() * 520)}ms`,
      duration: `${Math.round(1100 + Math.random() * 600)}ms`,
      color: palette[i % palette.length],
    }));
  }, [platform, scale]);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-30 overflow-hidden rounded-lg"
      // One custom property, read by both gradients below through color-mix, so
      // switching tone moves a variable rather than duplicating the gradients.
      style={{ '--celebration-tint': TONE_TINT[tone] } as React.CSSProperties}
    >
      {/* The pour: colour filling the card from the bottom up, as though the
          meter that just reached full had overflowed, then draining away. */}
      <div
        className="celebration-pour absolute inset-0"
        style={{
          background:
            'linear-gradient(to top, color-mix(in srgb, var(--celebration-tint) 55%, transparent), color-mix(in srgb, var(--celebration-tint) 25%, transparent) 60%, color-mix(in srgb, var(--celebration-tint) 5%, transparent))',
        }}
      />

      {/* Its bright leading edge, a card-height box with the light along its
          top, so a translate of its own height carries the edge from the
          bottom of the card to the top. */}
      <div
        className="celebration-pour-edge absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, transparent, color-mix(in srgb, var(--celebration-tint) 45%, white) 3px, color-mix(in srgb, var(--celebration-tint) 30%, transparent) 7px, transparent 16px)',
        }}
      />

      {/* Anchored to the bottom edge, so the sparkles climb the whole card. */}
      {sparks && (
        <div className="absolute inset-x-0 bottom-0 h-0">
          {particles.map((s) => (
            <span
              key={s.id}
              className="celebration-particle absolute bottom-0 block"
              style={
                {
                  '--drift': s.drift,
                  '--rise': s.rise,
                  '--rot': s.rot,
                  '--dur': s.duration,
                  left: s.dx,
                  width: s.size,
                  height: s.size,
                  borderRadius: s.radius,
                  backgroundColor: s.color,
                  animationDelay: s.delay,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      )}
    </div>
  );
};
