import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Search, Sparkles, Plus, Clock, Trophy, Loader2 } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { Platform, GameStatus, RawgGameResult, PLATFORM_IDS } from '../types';
import { PLATFORMS, DEFAULT_COLLECTION_COLOR } from '../lib/constants';
import { statusLabel } from '../lib/status';
import { searchGames, detectPlatformFromRawg } from '../lib/rawg';
import { PlatformIcon } from './PlatformIcon';
import { awardNoun } from './TrophyBadge';
import { RatingControl } from './Rating';
import { Button, Dialog, Field, TextArea, TextInput } from './ui';
import { cn } from '../lib/cn';

const FALLBACK_COVER = 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600';
const STATUS_CHOICES: GameStatus[] = ['playing', 'backlog', 'completed', 'mastered'];

export const QuickAddModal: React.FC = () => {
  const { isQuickAddOpen, setIsQuickAddOpen, addGame, collections, profile } = useGame();

  const [tab, setTab] = useState<'search' | 'custom'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<RawgGameResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [title, setTitle] = useState('');
  const [platform, setPlatform] = useState<Platform>('steam');
  const [status, setStatus] = useState<GameStatus>('playing');
  const [coverImage, setCoverImage] = useState('');
  const [releaseDate, setReleaseDate] = useState<string | undefined>();
  const [genres, setGenres] = useState<string[]>([]);
  const [rawgId, setRawgId] = useState<number | undefined>();
  const [hoursPlayed, setHoursPlayed] = useState(0);
  const [achievementsUnlocked, setAchievementsUnlocked] = useState(0);
  const [achievementsTotal, setAchievementsTotal] = useState(0);
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!isQuickAddOpen) return;
    let cancelled = false;

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const res = await searchGames(searchQuery);
      if (cancelled) return;
      setSearchResults(res);
      setIsSearching(false);
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery, isQuickAddOpen]);

  const reset = () => {
    setTab('search');
    setSearchQuery('');
    setTitle('');
    setPlatform('steam');
    setStatus('playing');
    setCoverImage('');
    setReleaseDate(undefined);
    setGenres([]);
    setRawgId(undefined);
    setHoursPlayed(0);
    setAchievementsUnlocked(0);
    setAchievementsTotal(0);
    setSelectedCollections([]);
    setRating(0);
    setNotes('');
  };

  const close = () => {
    setIsQuickAddOpen(false);
    reset();
  };

  /** Pulls a catalog result into the form so details can be adjusted first. */
  const selectGameFromSearch = (game: RawgGameResult) => {
    setTitle(game.name);
    setCoverImage(game.background_image || '');
    setReleaseDate(game.released);
    setGenres(game.genres?.map((g) => g.name) ?? []);
    setRawgId(game.id);
    setPlatform(detectPlatformFromRawg(game));
    if (game.rating) setRating(Math.round(Math.min(5, Math.max(0, game.rating)) * 20));
    setTab('custom');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    addGame({
      rawgId,
      title: title.trim(),
      platform,
      status,
      coverImage: coverImage || FALLBACK_COVER,
      releaseDate,
      genres,
      hoursPlayed,
      achievementsUnlocked,
      achievementsTotal,
      rating: rating || undefined,
      collections: selectedCollections,
      notes: notes.trim() || undefined,
    });

    close();
  };

  return (
    <Dialog
      isOpen={isQuickAddOpen}
      onClose={close}
      title="Add a game"
      description="Search the catalog, or enter the details yourself"
      icon={<Sparkles size={18} />}
      footer={
        tab === 'custom' ? (
          <>
            <Button buttonStyle="subtle" onClick={close}>
              Cancel
            </Button>
            <Button
              variant="accent"
              onClick={handleSubmit}
              disabled={!title.trim()}
              type="submit"
              form="quick-add-form"
            >
              <Plus size={15} />
              Add to library
            </Button>
          </>
        ) : undefined
      }
    >
      <div className="mb-5 flex gap-1 rounded-sm bg-gray-75 p-1">
        <TabButton active={tab === 'search'} onClick={() => setTab('search')}>
          <Search size={15} />
          Search catalog
        </TabButton>
        <TabButton active={tab === 'custom'} onClick={() => setTab('custom')}>
          <Plus size={15} />
          Enter details
        </TabButton>
      </div>

      {tab === 'search' ? (
        <div className="space-y-4">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600"
              size={16}
            />
            <TextInput
              type="search"
              aria-label="Search the game catalog"
              placeholder="Elden Ring, Hollow Knight, Balatro…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {isSearching ? (
            <div className="flex flex-col items-center gap-2 py-12 text-gray-700">
              <Loader2 size={22} className="animate-spin" />
              <p className="text-75">Searching…</p>
            </div>
          ) : (
            <div className="grid max-h-[380px] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
              {searchResults.map((game) => (
                <motion.button
                  key={game.id}
                  type="button"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => selectGameFromSearch(game)}
                  className="group flex items-center gap-3 rounded-sm border border-gray-200 bg-gray-75 p-2.5 text-left transition-colors hover:border-gray-300 hover:bg-gray-200"
                >
                  <img
                    src={game.background_image || FALLBACK_COVER}
                    alt=""
                    loading="lazy"
                    className="h-14 w-14 shrink-0 rounded-sm object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="truncate text-100 font-semibold text-gray-900 group-hover:text-accent-900">
                      {game.name}
                    </h4>
                    <p className="mt-0.5 text-75 text-gray-700">
                      {game.released?.split('-')[0] || 'Unknown'} •{' '}
                      {game.genres?.[0]?.name || 'Game'}
                    </p>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <form id="quick-add-form" onSubmit={handleSubmit} className="space-y-5">
          <Field label="Title">
            {(props) => (
              <TextInput
                {...props}
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter the game title"
              />
            )}
          </Field>

          <fieldset>
            <legend className="mb-1.5 text-75 font-semibold text-gray-800">Platform</legend>
            <div className="grid grid-cols-2 gap-2">
              {PLATFORM_IDS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlatform(p)}
                  aria-pressed={platform === p}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-sm border p-3 text-100 font-semibold transition-colors',
                    platform === p
                      ? 'border-accent-700 bg-accent-100 text-accent-900'
                      : 'border-gray-300 bg-gray-75 text-gray-700 hover:border-gray-400 hover:text-gray-900',
                  )}
                >
                  <PlatformIcon platform={p} size={18} />
                  {PLATFORMS[p].name}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-1.5 text-75 font-semibold text-gray-800">Status</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {STATUS_CHOICES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  aria-pressed={status === s}
                  className={cn(
                    'rounded-sm border p-2.5 text-75 font-medium transition-colors',
                    status === s
                      ? 'border-accent-700 bg-accent-100 text-accent-900'
                      : 'border-gray-300 bg-gray-75 text-gray-700 hover:border-gray-400 hover:text-gray-900',
                  )}
                >
                  {statusLabel(s, profile)}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Hours played">
              {(props) => (
                <TextInput
                  {...props}
                  type="number"
                  min={0}
                  value={hoursPlayed}
                  onChange={(e) => setHoursPlayed(Math.max(0, Number(e.target.value)))}
                />
              )}
            </Field>

            <Field label={awardNoun(platform)} description="Unlocked out of total">
              {(props) => (
                <div className="flex items-center gap-2">
                  <TextInput
                    {...props}
                    type="number"
                    min={0}
                    aria-label={`${awardNoun(platform)} unlocked`}
                    value={achievementsUnlocked}
                    onChange={(e) => setAchievementsUnlocked(Math.max(0, Number(e.target.value)))}
                  />
                  <span className="text-gray-600">/</span>
                  <TextInput
                    type="number"
                    min={0}
                    aria-label={`${awardNoun(platform)} total`}
                    value={achievementsTotal}
                    onChange={(e) => setAchievementsTotal(Math.max(0, Number(e.target.value)))}
                  />
                </div>
              )}
            </Field>
          </div>

          <div className="space-y-1.5">
            <span className="flex items-center gap-1 text-75 font-semibold text-gray-800">
              <Trophy size={13} className="text-trophy-900" />
              Your rating
            </span>
            <RatingControl value={rating} onChange={setRating} />
          </div>

          {collections.length > 0 && (
            <fieldset>
              <legend className="mb-1.5 text-75 font-semibold text-gray-800">Collections</legend>
              <div className="flex flex-wrap gap-2">
                {collections.map((col) => {
                  const selected = selectedCollections.includes(col.id);
                  return (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() =>
                        setSelectedCollections((prev) =>
                          selected ? prev.filter((c) => c !== col.id) : [...prev, col.id],
                        )
                      }
                      aria-pressed={selected}
                      className={cn(
                        'inline-flex h-8 items-center gap-1.5 rounded-sm border px-3 text-75 font-medium transition-colors',
                        selected
                          ? 'border-accent-700 bg-accent-100 text-accent-900'
                          : 'border-gray-300 bg-gray-75 text-gray-700 hover:border-gray-400',
                      )}
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: col.color || DEFAULT_COLLECTION_COLOR }}
                      />
                      {col.name}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}

          <Field label="Cover image URL" description="Optional — leave blank to use a placeholder">
            {(props) => (
              <TextInput
                {...props}
                type="url"
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                placeholder="https://…"
              />
            )}
          </Field>

          <Field label="Notes" description="Optional">
            {(props) => (
              <TextArea
                {...props}
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Where you got to, what is left, anything worth remembering."
              />
            )}
          </Field>

          <p className="flex items-center gap-1.5 text-50 text-gray-600">
            <Clock size={12} />
            Added games sync to your account automatically.
          </p>
        </form>
      )}
    </Dialog>
  );
};

const TabButton: React.FC<{
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={cn(
      'flex flex-1 items-center justify-center gap-2 rounded-sm px-4 py-2 text-100 font-medium transition-colors',
      active ? 'bg-accent-700 text-gray-1000' : 'text-gray-700 hover:bg-gray-200 hover:text-gray-900',
    )}
  >
    {children}
  </button>
);
