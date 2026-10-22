import React, { useEffect, useRef, useState } from 'react';
import { Check, Copy, FilePlus, FileUp } from 'lucide-react';
import { CamoGame, blankGame, copyOfGame, readCamoImport } from '../../lib/camo';
import { cn } from '../../lib/cn';
import { Button, Dialog, TextInput } from '../ui';

const BLANK = 'blank';
const FILE = 'file';

/**
 * "Add a game": a copy of one already tracked — its modes, tiers, classes and
 * weapons kept, every tick cleared — a blank one with a single mode, a Gold
 * tier and an empty class, or every game in a JSON file (a backup's tracker
 * included), added beside the ones already here.
 */
export const AddCamoGameDialog: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  games: CamoGame[];
  /** The game on screen, offered first as the copy. */
  currentId?: string;
  onAdd: (game: CamoGame) => void;
}> = ({ isOpen, onClose, games, currentId, onAdd }) => {
  const [name, setName] = useState('');
  const [source, setSource] = useState<string>(BLANK);
  const nameRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileGames, setFileGames] = useState<CamoGame[] | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setName('');
    setFileGames(null);
    setFileError(null);
    setSource(currentId && games.some((g) => g.id === currentId) ? currentId : games[0]?.id ?? BLANK);
  }, [isOpen, currentId, games]);

  const nextSort = games.reduce((max, g) => Math.max(max, g.sort), -1) + 1;
  const trimmed = name.trim();

  const fromFile = source === FILE;

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const found = readCamoImport(JSON.parse(String(reader.result)), nextSort);
        setFileGames(found);
        setFileError(found.length ? null : 'No games in that file');
      } catch {
        setFileGames(null);
        setFileError('Not a JSON file');
      }
    };
    reader.readAsText(file);
  };

  const add = () => {
    if (fromFile) {
      if (!fileGames?.length) return;
      fileGames.forEach(onAdd);
      onClose();
      return;
    }
    if (!trimmed) return;
    const from = games.find((g) => g.id === source);
    onAdd(from ? copyOfGame(from, trimmed, nextSort) : blankGame(trimmed, nextSort));
    onClose();
  };

  const options = [
    ...games.map((g) => ({
      id: g.id,
      label: `Copy of ${g.name}`,
      hint: 'Ticks cleared',
      icon: <Copy size={16} />,
    })),
    { id: BLANK, label: 'Blank', hint: '', icon: <FilePlus size={16} /> },
    { id: FILE, label: 'From a file', hint: '', icon: <FileUp size={16} /> },
  ];

  const canAdd = fromFile ? Boolean(fileGames?.length) : Boolean(trimmed);
  const addLabel = fromFile && fileGames?.length
    ? `Add ${fileGames.length} ${fileGames.length === 1 ? 'game' : 'games'}`
    : 'Add game';

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Add a game"
      initialFocusRef={fromFile ? undefined : nameRef}
      footer={
        <div className="flex justify-end gap-2">
          <Button size="l" onClick={onClose}>
            Cancel
          </Button>
          <Button size="l" variant="accent" disabled={!canAdd} onClick={add}>
            {addLabel}
          </Button>
        </div>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        {fromFile ? null : (
          <TextInput
            ref={nameRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Game name"
            aria-label="Game name"
          />
        )}
        <div role="radiogroup" aria-label="Start from" className="space-y-2">
          {options.map((option) => {
            const selected = source === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setSource(option.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-md border p-3 text-left transition-colors',
                  selected
                    ? 'border-accent-700/60 bg-accent-700/12'
                    : 'border-gray-300 bg-black/25 hover:border-gray-400',
                )}
              >
                <span className={cn('shrink-0', selected ? 'text-accent-900' : 'text-gray-600')}>{option.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-90 font-bold text-gray-1000">{option.label}</span>
                  {option.hint ? <span className="block text-75 text-gray-600">{option.hint}</span> : null}
                </span>
                {selected ? <Check size={16} className="shrink-0 text-accent-900" /> : null}
              </button>
            );
          })}
        </div>
        {fromFile ? (
          <div className="space-y-2">
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) readFile(file);
                e.target.value = '';
              }}
            />
            <Button size="l" buttonStyle="outline" onClick={() => fileRef.current?.click()}>
              <FileUp size={15} />
              Choose file
            </Button>
            {fileError ? <p className="text-75 font-semibold text-notice-900">{fileError}</p> : null}
            {fileGames?.length ? (
              <ul className="space-y-1 text-90 text-gray-900">
                {fileGames.map((g) => (
                  <li key={g.id} className="flex items-baseline justify-between gap-3">
                    <span className="truncate font-bold">{g.name}</span>
                    <span className="shrink-0 text-75 tabular-nums text-gray-600">
                      {g.data.modes.reduce((n, m) => n + m.classes.reduce((k, c) => k + c.weapons.length, 0), 0)} weapons
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </form>
    </Dialog>
  );
};
