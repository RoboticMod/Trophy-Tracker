import React, { useEffect, useMemo, useState } from 'react';
import { EyeOff, Loader2 } from 'lucide-react';
import { UserGame } from '../types';
import { useGame } from '../context/GameContext';
import { useAuth } from '../context/AuthContext';
import * as db from '../lib/db';
import {
  AwardItem,
  AwardsError,
  GameAwards,
  RARITY_LABEL,
  RARITY_TEXT,
  byRarity,
  canFetchAwards,
  fetchAwards,
  formatRate,
  isCurrent,
  rarestEarned,
  rarityTier,
} from '../lib/awards';
import { usePsnTrophyScope } from '../lib/psnTrophyScope';
import { formatDate } from '../lib/format';
import { cn } from '../lib/cn';
import { Button, SectionRule } from './ui';
import { awardNoun } from './TrophyBadge';

/** Rows shown before "Show all". */
const FIRST_FEW = 5;

/**
 * Lists already read this session, per account and game. Opening the same
 * game twice should not ask the cloud, let alone Steam or PSN, a second time.
 */
const memory = new Map<string, GameAwards>();

type State =
  | { kind: 'loading' }
  | { kind: 'ready'; items: AwardItem[] }
  | { kind: 'failed'; error: AwardsError };

/**
 * A game's list: from memory, then the cloud cache, then live — and live only
 * when the game's counts have moved since the cached copy was taken. A failed
 * live read falls back to an older copy rather than showing nothing.
 */
function useGameAwards(game: UserGame, active: boolean): State | null {
  const { platformAccounts } = useGame();
  const { user } = useAuth();
  const [scope] = usePsnTrophyScope();
  const [state, setState] = useState<State | null>(null);

  const linked = canFetchAwards(game, platformAccounts);
  const userId = user?.id;

  useEffect(() => {
    if (!active || !linked || !userId) return;
    const key = `${userId}:${game.id}:${scope}`;
    let cancelled = false;

    const remembered = memory.get(key);
    if (isCurrent(remembered ?? null, game)) {
      setState({ kind: 'ready', items: remembered!.items });
      return;
    }

    setState(remembered ? { kind: 'ready', items: remembered.items } : { kind: 'loading' });

    void (async () => {
      const cached = await db.getGameAwards(game.id, userId).catch(() => null);
      if (cancelled) return;
      if (isCurrent(cached, game)) {
        memory.set(key, cached);
        setState({ kind: 'ready', items: cached.items });
        return;
      }

      const live = await fetchAwards(game, platformAccounts, scope === 'all');
      if (cancelled) return;
      if ('items' in live) {
        const fresh: GameAwards = {
          items: live.items,
          unlocked: game.achievementsUnlocked,
          total: game.achievementsTotal,
          fetchedAt: new Date().toISOString(),
        };
        memory.set(key, fresh);
        setState({ kind: 'ready', items: live.items });
        void db.saveGameAwards(game.id, fresh, userId).catch(() => undefined);
      } else {
        const older = remembered ?? cached;
        setState(older ? { kind: 'ready', items: older.items } : { kind: 'failed', error: live.error });
      }
    })();

    return () => {
      cancelled = true;
    };
    // Keyed on what decides the answer, not on the game object's identity,
    // which changes on every write to it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, linked, userId, game.id, game.achievementsUnlocked, game.achievementsTotal, scope]);

  return linked ? state : null;
}

const FAILED_TEXT: Record<AwardsError, string> = {
  'not-linked': 'Link your account in Settings to see this list.',
  'private-profile': 'Your Steam profile’s game details are private, so this list can’t be read.',
  'not-deployed': 'Deploy the updated game-data function to see this list.',
  'request-failed': 'Couldn’t load this list. It tries again next time you open the game.',
};

/** One award: icon, name, description — and, when the platform said, how rare. */
const AwardRow: React.FC<{ item: AwardItem }> = ({ item }) => {
  const tier = item.rate !== undefined ? rarityTier(item.rate) : null;
  const secret = item.hidden && !item.earned && !item.description;
  return (
    <li className="flex items-center gap-3 py-2.5">
      {item.icon ? (
        <img
          src={item.icon}
          alt=""
          loading="lazy"
          className={cn('h-10 w-10 shrink-0 rounded-sm object-cover', !item.earned && 'opacity-60 grayscale')}
        />
      ) : (
        <span aria-hidden className="h-10 w-10 shrink-0 rounded-sm bg-gray-200" />
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-90 font-bold text-gray-1000">{item.name}</span>
        {secret ? (
          <span className="flex items-center gap-1 text-75 text-gray-600">
            <EyeOff size={12} />
            Hidden until earned
          </span>
        ) : item.description ? (
          <span className="line-clamp-2 text-75 text-gray-700">{item.description}</span>
        ) : null}
        {item.earned && item.earnedAt ? (
          <span className="block text-50 text-gray-600">Earned {formatDate(item.earnedAt)}</span>
        ) : null}
      </span>
      {/* Nothing at all when the platform gave no rate — not a dash, not
          "unknown": a guess would be worse than the space. */}
      {tier && item.rate !== undefined ? (
        <span className="shrink-0 text-right">
          <span className="block text-90 font-bold tabular-nums text-gray-1000">{formatRate(item.rate)}</span>
          <span className={cn('block text-50 font-bold', RARITY_TEXT[tier])}>{RARITY_LABEL[tier]}</span>
        </span>
      ) : null}
    </li>
  );
};

/**
 * Game details' Trophies section (Achievements on Steam): what is left or
 * earned, rarest first, with the rarest one you own called out in gold.
 * Absent for a game not linked to Steam or PlayStation — there is no list to
 * show, and a section saying so would be one more line of nothing.
 */
export const TrophiesSection: React.FC<{ game: UserGame; active: boolean }> = ({ game, active }) => {
  const state = useGameAwards(game, active);
  const [tab, setTab] = useState<'left' | 'earned'>('left');
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    setShowAll(false);
  }, [tab, game.id]);

  const items = state?.kind === 'ready' ? state.items : [];
  const left = useMemo(() => items.filter((i) => !i.earned).sort(byRarity), [items]);
  const earned = useMemo(() => items.filter((i) => i.earned).sort(byRarity), [items]);
  const rarest = useMemo(() => rarestEarned(items), [items]);

  if (!state) return null;

  const list = tab === 'left' ? left : earned;
  const shown = showAll ? list : list.slice(0, FIRST_FEW);
  const noun = awardNoun(game.platform);

  return (
    <section className="flex flex-col gap-3.5">
      <SectionRule title={noun} />

      {state.kind === 'loading' ? (
        <p className="flex items-center gap-2 text-75 text-gray-600">
          <Loader2 size={14} className="animate-spin" />
          Loading…
        </p>
      ) : state.kind === 'failed' ? (
        <p className="text-75 text-gray-600">{FAILED_TEXT[state.error]}</p>
      ) : (
        <>
          <div role="tablist" aria-label={noun} className="flex w-fit rounded-full border border-gray-300 bg-black/25 p-0.5">
            {(
              [
                ['left', `Left · ${left.length}`],
                ['earned', `Earned · ${earned.length}`],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={cn(
                  'h-8 rounded-full px-3.5 text-75 font-bold tabular-nums transition-colors',
                  tab === id ? 'bg-accent-700/16 text-accent-900' : 'text-gray-700 hover:text-gray-1000',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {rarest && rarest.rate !== undefined ? (
            <p className="rounded-md border border-trophy-700/45 bg-trophy-100/40 px-3 py-2 text-75 text-trophy-900">
              Rarest you own: <span className="font-bold">{rarest.name}</span> · {formatRate(rarest.rate)} of
              players
            </p>
          ) : null}

          {list.length === 0 ? (
            <p className="text-75 text-gray-600">{tab === 'left' ? 'Nothing left' : 'Nothing earned yet'}</p>
          ) : (
            <ul className="divide-y divide-gray-200">
              {shown.map((item) => (
                <AwardRow key={item.id} item={item} />
              ))}
            </ul>
          )}

          {list.length > FIRST_FEW ? (
            <Button size="s" buttonStyle="subtle" className="self-start" onClick={() => setShowAll((all) => !all)}>
              {showAll ? 'Show fewer' : `Show all ${list.length}`}
            </Button>
          ) : null}
        </>
      )}
    </section>
  );
};
