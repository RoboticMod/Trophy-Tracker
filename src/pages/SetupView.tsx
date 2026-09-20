import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  Cloud,
  CloudOff,
  Gamepad2,
  Plug,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { useGame } from '../context/GameContext';
import { GameCatalogCard } from '../components/GameCatalogCard';
import { ConnectedAccounts } from '../components/ConnectedAccounts';
import { Button, Card, SectionHeader } from '../components/ui';
import { cn } from '../lib/cn';

/**
 * Where a brand-new account lands.
 *
 * A first sign-in used to be met with "Could not load your library from the
 * cloud" — an error message for the entirely ordinary state of having nothing
 * saved yet. (It was often a real failure too, but of seeding rather than of
 * loading: collection ids were globally unique, so every account after the
 * first genuinely could not write its starter rows.)
 *
 * This is the honest version of that moment: four things worth doing, in the
 * order they matter, reusing the Settings cards rather than restating them.
 */

/** One numbered step, so the page reads as a sequence rather than a pile. */
const Step: React.FC<{
  index: number;
  title: string;
  description: string;
  optional?: boolean;
  done?: boolean;
  children?: React.ReactNode;
}> = ({ index, title, description, optional, done, children }) => (
  <section className="space-y-3">
    <div className="flex items-start gap-3">
      <span
        className={cn(
          'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-75 font-bold tabular-nums',
          done
            ? 'border-positive-700/60 bg-positive-700/16 text-positive-900'
            : 'border-gray-300 bg-black/25 text-gray-700',
        )}
      >
        {done ? <Check size={14} /> : index}
      </span>
      <div className="min-w-0 space-y-0.5">
        <h2 className="flex flex-wrap items-center gap-2 text-200 font-bold tracking-tight text-gray-1000">
          {title}
          {optional && (
            <span className="eyebrow rounded-full border border-gray-300 px-2 py-0.5 text-gray-600">
              Optional
            </span>
          )}
        </h2>
        <p className="text-75 text-gray-600">{description}</p>
      </div>
    </div>

    {children}
  </section>
);

export const SetupView: React.FC = () => {
  const navigate = useNavigate();
  const {
    games,
    isOnline,
    error,
    loading,
    refresh,
    platformAccounts,
    setIsQuickAddOpen,
  } = useGame();

  const linked = Boolean(platformAccounts?.steamId || platformAccounts?.psnAccountId);

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-10">
      <div className="flex items-center gap-3 border-b border-gray-200 pb-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent-700/16 text-accent-900">
          <Gamepad2 size={20} />
        </div>
        <div className="min-w-0">
          <h1 className="text-600 font-bold tracking-tight text-gray-1000">Set up your library</h1>
          <p className="text-75 text-gray-700">
            Four things, and only the first two matter. You can change any of them later in
            Settings.
          </p>
        </div>
      </div>

      {/* 1. Cloud storage. The real error text, not a euphemism — if something
             is actually wrong, this is the page where saying so is useful. */}
      <Step
        index={1}
        title="Cloud storage"
        description="Your library lives in Supabase, scoped to your account"
        done={isOnline && !error}
      >
        <Card className="space-y-4">
          <SectionHeader
            icon={isOnline ? <Cloud size={18} /> : <CloudOff size={18} />}
            title={isOnline ? 'Connected' : 'Offline'}
            description={
              isOnline
                ? 'Changes save as you make them.'
                : 'Changes queue locally and are sent when the connection returns.'
            }
            iconClassName={
              isOnline
                ? 'bg-positive-700/16 text-positive-900'
                : 'bg-notice-700/16 text-notice-900'
            }
          />

          {error && (
            <p className="rounded-md border border-negative-700/45 bg-negative-700/10 p-3 text-75 text-negative-900">
              {error}
            </p>
          )}

          <Button variant="secondary" onClick={refresh} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Retry</span>
          </Button>
        </Card>
      </Step>

      {/* 2. Where search looks. The same card Settings shows, not a copy. */}
      <Step
        index={2}
        title="Game catalog"
        description="Where searching for a game to add looks it up"
      >
        <GameCatalogCard />
      </Step>

      <Step
        index={3}
        title="Connect Steam or PlayStation"
        description="Linked games keep their own playtime and unlocks up to date"
        optional
        done={linked}
      >
        <ConnectedAccounts />
      </Step>

      <Step
        index={4}
        title="Add your first game"
        description="Search the catalog, or type one in by hand"
        done={games.length > 0}
      >
        <div className="flex flex-wrap gap-2">
          <Button variant="accent" size="l" onClick={() => setIsQuickAddOpen(true)}>
            <Plus size={16} />
            <span>Add game</span>
          </Button>
          <Button variant="secondary" buttonStyle="outline" size="l" onClick={() => navigate('/')}>
            <ArrowRight size={16} />
            <span>Skip to my library</span>
          </Button>
        </div>
      </Step>

      <p className="flex items-center gap-1.5 border-t border-gray-200 pt-5 text-75 text-gray-600">
        <Plug size={13} />
        Everything here lives in Settings too, whenever you want to change it.
      </p>
    </div>
  );
};
