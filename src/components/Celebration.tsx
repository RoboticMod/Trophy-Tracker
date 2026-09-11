import React, { useMemo } from 'react';
import { Platform } from '../types';
import { PLATFORMS } from '../lib/constants';

const SPARK_COUNT = 18;

/** How long the celebration runs. GameContext clears it to match. */
export const CELEBRATION_MS = 2000;

interface CelebrationProps {
  platform: Platform;
}

/**
 * Plays over the card that was just completed: a band of light sweeping up the
 * artwork, with sparkles rising and drifting in its wake.
 *
 * Mount it with a fresh key per celebration — the spread is randomised once on
 * mount, so no two runs land the same way, and the CSS animations restart.
 */
export const Celebration: React.FC<CelebrationProps> = ({ platform }) => {
  const sparks = useMemo(() => {
    const palette = [
      'var(--color-trophy-900)',
      'var(--color-trophy-700)',
      PLATFORMS[platform]?.color ?? 'var(--color-accent-900)',
      'var(--color-gray-1000)',
    ];

    return Array.from({ length: SPARK_COUNT }, (_, i) => ({
      id: i,
      // Spread across the card's width, then drift sideways as they climb.
      dx: `${(5 + (i / SPARK_COUNT) * 90 + (Math.random() - 0.5) * 6).toFixed(1)}%`,
      drift: `${((Math.random() - 0.5) * 26).toFixed(0)}px`,
      rise: `${(-80 - Math.random() * 110).toFixed(0)}px`,
      rot: `${((Math.random() - 0.5) * 200).toFixed(0)}deg`,
      size: 3 + Math.random() * 4,
      radius: Math.random() > 0.5 ? '9999px' : '1px',
      // Staggered starts and uneven durations, so the spray scatters rather
      // than rising and fading as a single block.
      delay: `${Math.round(Math.random() * 520)}ms`,
      duration: `${Math.round(1100 + Math.random() * 600)}ms`,
      color: palette[i % palette.length],
    }));
  }, [platform]);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-30 overflow-hidden rounded-lg"
    >
      <div
        className="celebration-glow absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 100%, color-mix(in srgb, var(--color-trophy-900) 24%, transparent), transparent 70%)',
        }}
      />

      <div
        className="celebration-shine absolute inset-x-0 h-1/2"
        style={{
          top: '50%',
          background:
            'linear-gradient(to top, transparent, color-mix(in srgb, var(--color-trophy-900) 34%, transparent) 55%, transparent)',
        }}
      />

      {/* Anchored to the bottom edge, so the sparkles climb the whole card. */}
      <div className="absolute inset-x-0 bottom-0 h-0">
        {sparks.map((s) => (
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
    </div>
  );
};
