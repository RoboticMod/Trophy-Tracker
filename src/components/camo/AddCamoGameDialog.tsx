import React, { useEffect, useRef, useState } from 'react';
import { Check, Copy, FilePlus } from 'lucide-react';
import { CamoGame, blankGame, copyOfGame } from '../../lib/camo';
import { cn } from '../../lib/cn';
import { Button, Dialog, TextInput } from '../ui';

const BLANK = 'blank';

/**
 * "Add a game": a copy of one already tracked — its modes, tiers, classes and
 * weapons kept, every tick cleared — or a blank one with a single mode, a Gold
 * tier and an empty class. Nothing else is offered: the tracker seeds nothing.
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

  useEffect(() => {
    if (!isOpen) return;
    setName('');
    setSource(currentId && games.some((g) => g.id === currentId) ? currentId : games[0]?.id ?? BLANK);
  }, [isOpen, currentId, games]);

  const nextSort = games.reduce((max, g) => Math.max(max, g.sort), -1) + 1;
  const trimmed = name.trim();

  const add = () => {
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
  ];

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Add a game"
      initialFocusRef={nameRef}
      footer={
        <div className="flex justify-end gap-2">
          <Button size="l" onClick={onClose}>
            Cancel
          </Button>
          <Button size="l" variant="accent" disabled={!trimmed} onClick={add}>
            Add game
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
        <TextInput
          ref={nameRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Game name"
          aria-label="Game name"
        />
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
      </form>
    </Dialog>
  );
};
