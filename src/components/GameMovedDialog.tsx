import React, { useEffect, useState } from 'react';
import { ArrowRight, MoveRight } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { UserGame } from '../types';
import { PLATFORMS } from '../lib/constants';
import { completionPercent, isPerfect } from '../lib/completion';
import {
  PERMANENT_OVERLAY_CLASS,
  collectionName,
  isPermanentCollection,
} from '../lib/collections';
import { Celebration } from './Celebration';
import { CoverArt } from './CoverArt';
import { PlatformIcon } from './PlatformIcon';
import { TrophyBadge, awardNoun, awardProgressLabel } from './TrophyBadge';
import { Button, Dialog, MarqueeText, Meter, OverlayBadge } from './ui';
import { cn } from '../lib/cn';

/**
 * What the app says when it re-files a game itself.
 *
 * A game can change shelf without you touching it: unlocking the last
 * achievement moves it to 100% Complete, and a trophy list growing under a
 * finished game moves it back to Playing. Both used to happen in silence, so a
 * game simply stopped being where you left it and you found out by going
 * looking. This is the same sentence adding a game gets — here is what moved,
 * here is where it went, and going there is a button rather than a surprise.
 */
export const GameMovedDialog: React.FC = () => {
  const { moved, added, dismissMoved, goToGame, games, collections } = useGame();

  // By id, so a sync that keeps writing while this is open shows what the game
  // has become rather than what it was at the moment it moved.
  //
  // Suppressed while the same game is being announced as *added*: a game that
  // arrives already finished is filed on the way in, and stacking two dialogs
  // about one game to say so is one dialog too many.
  const announced =
    moved && added?.gameId !== moved.gameId
      ? games.find((entry) => entry.id === moved.gameId)
      : undefined;

  // Held one dismissal longer than the announcement, so the dialog has
  // something to draw while it fades rather than vanishing on the frame the
  // button is pressed.
  const [lastShown, setLastShown] = useState<
    { game: UserGame; collectionId: string } | undefined
  >(undefined);
  useEffect(() => {
    if (announced && moved) setLastShown({ game: announced, collectionId: moved.collectionId });
  }, [announced, moved]);

  const shown = announced && moved ? { game: announced, collectionId: moved.collectionId } : lastShown;
  if (!shown) return null;

  const { game, collectionId } = shown;
  const platform = PLATFORMS[game.platform] ?? PLATFORMS.steam;
  const perfect = isPerfect(game);
  const progress = completionPercent(game);
  const awardLabel = awardProgressLabel(game.platform, perfect);
  const destination = collectionName(collectionId, collections);

  return (
    <Dialog
      isOpen={Boolean(announced)}
      onClose={dismissMoved}
      title="Game moved"
      description={`${platform.name} • now in ${destination}`}
      icon={<MoveRight size={18} />}
      footer={
        <>
          <Button buttonStyle="subtle" onClick={dismissMoved}>
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
        {/* Its own box rather than the card component: a second element
            carrying this game's id would be found by the follow lookup and
            convince it the game was already on the page. */}
        <div className="relative overflow-hidden rounded-lg border border-gray-300/70 bg-gray-100/70">
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
              {isPermanentCollection(collectionId) && (
                <OverlayBadge className={PERMANENT_OVERLAY_CLASS[collectionId]}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {destination}
                </OverlayBadge>
              )}
            </div>

            <div className={cn('absolute inset-x-3.5 bottom-2.5 z-10')}>
              <h3 className="text-200 font-bold tracking-tight text-gray-1000">
                <MarqueeText lines={2}>{game.title}</MarqueeText>
              </h3>
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

          {/* The same quiet wash an arrival gets, in the shelf's own spirit:
              gold when the move is a completion, blue when it is not. No
              sparks and no sound — the card plays the real celebration when
              you actually get to it. */}
          <Celebration
            key={`moved-${game.id}-${progress}`}
            platform={game.platform}
            tone={perfect ? 'trophy' : 'accent'}
            sparks={false}
          />
        </div>

        <p className="text-75 text-gray-700">
          This happened on its own — {perfect
            ? 'every award is now unlocked.'
            : 'its list grew, so there is more to do.'}
        </p>
      </div>
    </Dialog>
  );
};
