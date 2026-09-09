import React, { useMemo } from 'react';
import { Platform } from '../types';
import { PLATFORMS } from '../lib/constants';

const PARTICLE_COUNT = 16;

/** How long the burst runs. GameContext clears the celebration to match. */
export const CELEBRATION_MS = 1100;

interface CelebrationProps {
  platform: Platform;
}

/**
 * Plays over the card that was just completed: a warm wash, a shockwave ring,
 * and a spray of particles thrown out from the centre.
 *
 * Mount it with a fresh key per celebration — the spread is randomised once on
 * mount, so no two bursts land the same way, and the CSS animations restart.
 */
export const Celebration: React.FC<CelebrationProps> = ({ platform }) => {
  const particles = useMemo(() => {
    const palette = [
      'var(--color-trophy-900)',
      'var(--color-trophy-700)',
      PLATFORMS[platform]?.color ?? 'var(--color-accent-900)',
      'var(--color-gray-1000)',
    ];

    return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
      // Even wedges with a little jitter, so the spray reads as a burst rather
      // than a clock face.
      const angle = (i / PARTICLE_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const distance = 54 + Math.random() * 46;
      const size = 4 + Math.random() * 5;

      return {
        id: i,
        dx: `${(Math.cos(angle) * distance).toFixed(1)}px`,
        dy: `${(Math.sin(angle) * distance).toFixed(1)}px`,
        rot: `${((Math.random() - 0.5) * 320).toFixed(0)}deg`,
        size,
        radius: Math.random() > 0.45 ? '9999px' : '2px',
        delay: `${Math.round(Math.random() * 70)}ms`,
        color: palette[i % palette.length],
      };
    });
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
            'radial-gradient(circle at 50% 45%, color-mix(in srgb, var(--color-trophy-900) 26%, transparent), transparent 68%)',
        }}
      />

      <div
        className="celebration-ring absolute left-1/2 top-[45%] h-24 w-24 rounded-full border-2"
        style={{ borderColor: 'color-mix(in srgb, var(--color-trophy-900) 70%, transparent)' }}
      />

      <div className="absolute left-1/2 top-[45%] h-0 w-0">
        {particles.map((p) => (
          <span
            key={p.id}
            className="celebration-particle absolute block"
            style={
              {
                '--dx': p.dx,
                '--dy': p.dy,
                '--rot': p.rot,
                width: p.size,
                height: p.size,
                borderRadius: p.radius,
                backgroundColor: p.color,
                animationDelay: p.delay,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
};
