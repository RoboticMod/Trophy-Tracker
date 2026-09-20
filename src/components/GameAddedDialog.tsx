import React, { useEffect, useState } from 'react';
import { ArrowRight, Check, Clock } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { UserGame } from '../types';
import { PLATFORMS } from '../lib/constants';
import { completionPercent, isPerfect } from '../lib/completion';
import { formatHours } from '../lib/format';
import { PERMANENT_OVERLAY_CLASS, collectionName, permanentOf } from '../lib/collections';
import { useCelebration } from '../lib/useCelebration';
import { Celebration } from './Celebration';
import { CoverArt } from './CoverArt';
import { PlatformIcon } from './PlatformIcon';
import { PsnSyncStatus } from './PsnSyncStatus';
import { SteamSyncStatus } from './SteamSyncStatus';
import { TrophyBadge, awardNoun, awardProgressLabel } from './TrophyBadge';
import { Button, Dialog, MarqueeText, Meter, OverlayBadge } from './ui';
import { cn } from '../lib/cn';

/**
 * What the app says after a game is added.
 *
 * Adding used to answer itself by moving the page: another shelf opened, the
 * grid scrolled, and the game you had just typed in went past on its way to
 * wherever the sort put it. This says the same thing standing still — here is
 * what landed, here is whether the platform has picked it up yet — and leaves
 * going to look at it as a button rather than something that happens to you.
 *
 * It is also where a completion is celebrated when the game arrives already
 * finished, since the card that would otherwise do it is behind this dialog.
 */
export const GameAddedDialog: React.FC = () => {
  const { added, dismissAdded, goToGame, games, collections } = useGame();

  // By id rather than by value: the game keeps changing while this is open —
  // a sync fills in its achievement count moments after it is added — and the
  // dialog should show what it has become, not what was typed.
  const announced = added ? games.find((entry) => entry.id === added.gameId) : undefined;

  const burst = useCelebration(announced, Boolean(announced));

  // The game is held for one dismissal longer than the announcement is, so the
  // dialog has something to draw while it fades out rather than vanishing on
  // the frame the button is pressed.
  const [lastShown, setLastShown] = useState<UserGame | undefined>(undefined);
  useEffect(() => {
    if (announced) setLastShown(announced);
  }, [announced]);

  const game = announced ?? lastShown;
  if (!game) return null;

  const platform = PLATFORMS[game.platform] ?? PLATFORMS.steam;
  const perfect = isPerfect(game);
  const progress = completionPercent(game);
  const awardLabel = awardProgressLabel(game.platform, perfect);
  const shelf = permanentOf(game.collections);

  return (
    <Dialog
      isOpen={Boolean(announced)}
      onClose={dismissAdded}
      title="Game added"
      description={shelf ? `${platform.name} • ${collectionName(shelf, collections)}` : platform.name}
      icon={<Check size={18} />}
      footer={
        <>
          <Button buttonStyle="subtle" onClick={dismissAdded}>
            OK
          </Button>
          <Button variant="accent" onClick={() => goToGame(game.id)}>
            <ArrowRight size={15} />
            Go to game
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* The game itself, laid out as its own card is — so what the dialog
            shows and what you will find when you go there are the same thing.
            Its own box rather than the card component: a second element
            carrying this game's id would be found by the follow lookup and
            convince it the game was already on the page. */}
        <div className="relative overflow-hidden rounded-lg border border-gray-300/70 bg-gray-100/70">
          {/* The card's own 16:9, capped: at the dialog's full width that shape
              is 350px of artwork and pushes the sync panel off the bottom of a
              laptop screen. The cap only bites on a wide dialog; on a phone the
              ratio is still what decides. */}
          <div className="relative aspect-[16/9] max-h-52 w-full bg-gray-25">
            <div className="absolute inset-0 overflow-hidden">
              <CoverArt
                src={game.coverImage}
                title={game.title}
                className="h-full w-full object-cover object-center"
              />
              <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-gray-25/75 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-gray-25 via-gray-25/60 to-transparent" />
              {perfect && <div aria-hidden className="trophy-sweep" />}
            </div>

            <div className="absolute left-3 top-3 z-10 flex items-center gap-1.5">
              <OverlayBadge square tint={platform.tint} title={platform.name}>
                <PlatformIcon platform={game.platform} size={15} className="text-gray-1000" />
              </OverlayBadge>
              {shelf && (
                <OverlayBadge className={PERMANENT_OVERLAY_CLASS[shelf]}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {collectionName(shelf, collections)}
                </OverlayBadge>
              )}
            </div>

            {perfect && (
              <div className="absolute bottom-3 right-3 z-10">
                <OverlayBadge
                  circle
                  size={40}
                  title={awardLabel}
                  className="trophy-emblem badge-shine overflow-hidden ring-1 ring-trophy-700/60"
                >
                  <TrophyBadge platform={game.platform} size={24} />
                </OverlayBadge>
              </div>
            )}

            <div className={cn('absolute inset-x-3.5 bottom-2.5 z-10', perfect && 'pr-12')}>
              <h3 className="text-200 font-bold tracking-tight text-gray-1000">
                <MarqueeText lines={2}>{game.title}</MarqueeText>
              </h3>
              <div className="mt-1 flex items-center gap-2 text-75 text-gray-700">
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {formatHours(game.hoursPlayed)}h played
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2 p-4">
            <div
              className={cn(
                'eyebrow flex min-w-0 items-center gap-1.5',
                perfect ? 'text-trophy-900' : 'text-gray-600',
              )}
            >
              <TrophyBadge platform={game.platform} size={16} muted={!perfect} />
              <span className="truncate">{awardLabel}</span>
            </div>

            <div className="text-75 font-bold tabular-nums text-gray-900">
              {game.achievementsUnlocked} / {game.achievementsTotal}{' '}
              <span className="font-normal text-gray-600">({progress}%)</span>
            </div>

            <Meter
              value={progress}
              tone={progress === 100 ? 'trophy' : 'accent'}
              label={`${game.title} ${awardNoun(game.platform).toLowerCase()} progress`}
            />
          </div>

          {/* Every arrival gets a quiet blue wash over the preview: the dialog
              says a game landed, and this is that sentence in light. Blue
              rather than gold, and no sparks — adding a game is not an
              achievement, and gold would be claiming one.

              Keyed on the game id so it plays once per game rather than on
              every re-render while the sync fills the counts in. It needs no
              timer and no useCelebration, since the glow and shine keyframes
              are finite and `forwards` — which also means, crucially, no award
              sound. */}
          <Celebration key={`arrival-${game.id}`} platform={game.platform} tone="accent" sparks={false} />

          {/* The real thing, on top, when the game arrived already finished. */}
          {burst !== null && <Celebration key={burst} platform={game.platform} />}
        </div>

        {/* Whether the platform has it yet. A game added a second ago is
            usually mid-sync, and watching that finish here is the answer to
            "did it pick up my playtime?" without going looking for it. */}
        <div className="rounded-md border border-gray-200 bg-black/25 p-4">
          {game.platform === 'steam' ? (
            <SteamSyncStatus game={game} />
          ) : (
            <PsnSyncStatus game={game} />
          )}
        </div>
      </div>
    </Dialog>
  );
};
