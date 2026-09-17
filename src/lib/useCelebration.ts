import { useEffect, useRef, useState } from 'react';
import { Platform } from '../types';
import { useGame } from '../context/GameContext';
import { CELEBRATION_DELAY_MS, CELEBRATION_MS } from '../components/Celebration';
import { playAwardSound } from './sound';

/**
 * Playing the completion burst for one game, wherever it is being shown.
 *
 * A celebration is a request rather than an event: `GameContext` records that a
 * game has a completion to celebrate, and whichever surface is actually in
 * front of someone plays it. That is the card once it has been scrolled to, or
 * the dialog that announces a game just added — and `ready` is how each of them
 * says it is the one looking after it.
 *
 * Returns the token of the burst to render, keyed so a repeat restarts it, and
 * null the rest of the time. The sound goes with it: the two are one event and
 * neither happens until there is someone there to notice.
 */
export function useCelebration(
  game: { id: string; platform: Platform } | undefined,
  ready: boolean,
): number | null {
  const { celebration, celebrationPlayed } = useGame();
  const [burst, setBurst] = useState<number | null>(null);
  const timer = useRef<number | null>(null);

  const pending = game && ready && celebration?.gameId === game.id ? celebration.token : null;
  const platform = game?.platform;

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  useEffect(() => {
    if (pending === null || !platform) return;

    // Held back so the meter underneath can finish sweeping up to full first,
    // which makes the burst read as the answer to it rather than as something
    // happening beside it.
    const start = window.setTimeout(() => {
      playAwardSound(platform);
      setBurst(pending);
      celebrationPlayed(pending);

      timer.current = window.setTimeout(() => setBurst(null), CELEBRATION_MS);
    }, CELEBRATION_DELAY_MS);

    return () => window.clearTimeout(start);
  }, [pending, platform, celebrationPlayed]);

  return burst;
}
