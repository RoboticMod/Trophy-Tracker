import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/cn';
import { EASE_OUT } from '../../lib/motion';
import { useIsPhone } from '../../lib/useMediaQuery';
import { Dialog } from './Dialog';

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  /** Rendered before the label, e.g. a platform mark. */
  icon?: React.ReactNode;
  /** A raw colour this option carries — a collection's own accent. */
  color?: string;
}

interface SelectProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: readonly SelectOption<T>[];
  id?: string;
  /** Shown when the value matches no option. */
  placeholder?: string;
  className?: string;
  /**
   * A mark inside the trigger, before the label — what the control does (sort,
   * filter) rather than anything about the chosen option.
   */
  leading?: React.ReactNode;
  'aria-label'?: string;
  /** Passed through by Field, which owns the help text it points at. */
  'aria-describedby'?: string;
}

/** Height of the popover before it starts scrolling, in px. */
const MAX_LIST_HEIGHT = 288;
/** Gap between the trigger and the list. */
const OFFSET = 6;
/** How close to the viewport's edge the list is allowed to sit. */
const MARGIN = 8;
/** Rough row height, used only to decide whether the list should flip upward. */
const ROW_HEIGHT = 34;

/**
 * The app's dropdown.
 *
 * A native select was doing this job, and the list it opened was the browser's
 * own — flat, grey, and the one surface in the app the token layer never
 * reached, which is exactly why it read as washed out beside the lit filter
 * chips it sits among. This is the same control built out of the design system:
 * a chip-height trigger that lights when open, and a solid panel for the list.
 *
 * Focus stays on the trigger throughout and the list is driven through
 * aria-activedescendant, so there is no focus to hand back when it closes and
 * none to lose to a portal that has already unmounted.
 */
export function Select<T extends string>({
  value,
  onChange,
  options,
  id,
  placeholder = 'Select…',
  className,
  leading,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
}: SelectProps<T>) {
  const generatedId = useId();
  const listId = `${id ?? generatedId}-listbox`;

  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typeAhead = useRef({ buffer: '', at: 0 });

  const [open, setOpen] = useState(false);
  // A phone picks from a bottom sheet of full-width rows rather than a list
  // hanging off the trigger: a popover under a thumb is a target the size of
  // one line of 12px type, and it opened wherever the trigger happened to be.
  const phone = useIsPhone();
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(
    null,
  );

  const selectedIndex = options.findIndex((option) => option.value === value);
  const [activeIndex, setActiveIndex] = useState(Math.max(0, selectedIndex));
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  /**
   * Anchors the list to the trigger, flipping above when the room is below and
   * pulling it back in when it would run off the side.
   *
   * The list is only `minWidth: trigger`, so a long option makes it wider than
   * the control it hangs from. Left-anchored and left alone, a trigger near the
   * right edge — which is where a sort control usually sits — opened a list
   * that ran off the screen and was cut in half.
   *
   * The width is read from the list itself once it exists, because it is the
   * content that decides it. On the first pass it does not exist yet, which is
   * what `holdList` below is for; the trigger's own width stands in until then,
   * and a list no wider than its trigger never needed clamping anyway.
   */
  const place = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const below = window.innerHeight - rect.bottom - OFFSET;
    const height = Math.min(MAX_LIST_HEIGHT, options.length * ROW_HEIGHT + 8);
    const flip = below < height && rect.top > below;

    const width = listRef.current?.offsetWidth ?? rect.width;
    const rightMost = window.innerWidth - width - MARGIN;

    setPosition({
      top: flip ? Math.max(8, rect.top - OFFSET - height) : rect.bottom + OFFSET,
      // Never past the right edge, and never pushed off the left one either —
      // a list wider than the whole viewport would otherwise land at a negative
      // offset, trading one clipped edge for the other.
      left: Math.max(MARGIN, Math.min(rect.left, rightMost)),
      width: rect.width,
    });
  }, [options.length]);

  /**
   * Holds the list, and measures it the moment it exists.
   *
   * The second pass has to hang off the node itself. Scheduling it — even to
   * the next animation frame — runs it before React has committed the list, so
   * there is still nothing to measure and the clamp reads the trigger's width
   * instead of the list's. A ref callback fires in the commit, with the element
   * in the document and before anything is painted.
   *
   * Stable by `useCallback`, or an inline arrow would be a new ref on every
   * render: React would detach and reattach it each time, and each reattach
   * would place again, which is a loop rather than a measurement.
   */
  const holdList = useCallback(
    (node: HTMLUListElement | null) => {
      listRef.current = node;
      if (node) place();
    },
    [place],
  );

  useEffect(() => {
    if (!open) return;
    place();

    // Capture phase: the page scrolls inside <main>, not on the window, so a
    // bubbling listener would never hear it and the list would hang in space.
    const reposition = () => place();
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open, place]);

  // Closes on a press anywhere else, including inside a dialog it opened over.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || listRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  // Keeps the highlighted row in view when the list is long enough to scroll.
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIndex]);

  const openList = (index = Math.max(0, selectedIndex)) => {
    setActiveIndex(index);
    setOpen(true);
  };

  const commit = (index: number) => {
    const option = options[index];
    if (option) onChange(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const last = options.length - 1;

    if (!open) {
      if (
        event.key === 'ArrowDown' ||
        event.key === 'ArrowUp' ||
        event.key === 'Enter' ||
        event.key === ' '
      ) {
        event.preventDefault();
        openList();
      }
      return;
    }

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        setOpen(false);
        break;
      case 'Tab':
        setOpen(false);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        commit(activeIndex);
        break;
      case 'ArrowDown':
        event.preventDefault();
        setActiveIndex((i) => Math.min(last, i + 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
        break;
      case 'Home':
        event.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        event.preventDefault();
        setActiveIndex(last);
        break;
      default: {
        if (event.key.length !== 1 || event.metaKey || event.ctrlKey || event.altKey) return;
        // A pause of a second starts a fresh search rather than extending the
        // last one, which is what every native list does.
        const now = Date.now();
        const buffer = now - typeAhead.current.at > 1000 ? '' : typeAhead.current.buffer;
        typeAhead.current = { buffer: buffer + event.key.toLowerCase(), at: now };

        const match = options.findIndex((option) =>
          option.label.toLowerCase().startsWith(typeAhead.current.buffer),
        );
        if (match >= 0) setActiveIndex(match);
      }
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? `${listId}-${activeIndex}` : undefined}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        // The chip height and weight of the row it sits in, rather than the
        // taller, dimmer well a text field uses.
        className={cn(
          // A field's well and corner: 44px on a phone, where it is a thumb
          // target, and 40 on a desktop, level with the search field.
          'inline-flex h-11 items-center gap-2 rounded-md border px-3 md:h-10 md:gap-2.5',
          'text-90 font-bold whitespace-nowrap transition-all',
          open
            ? 'glow-ring border-accent-700/60 bg-accent-700/12 text-gray-1000'
            : 'border-gray-300 bg-white/3 text-gray-800 hover:border-gray-400 hover:text-gray-1000 bg-black/25',
          className,
        )}
      >
        {selected?.color ? (
          <span
            aria-hidden
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: selected.color, boxShadow: `0 0 6px -1px ${selected.color}` }}
          />
        ) : null}
        {leading ? <span className="flex shrink-0 items-center">{leading}</span> : null}
        {selected?.icon}
        <span className="min-w-0 flex-1 truncate text-left">{selected?.label ?? placeholder}</span>
        <ChevronDown
          size={15}
          className={cn('shrink-0 text-gray-600 transition-transform', open && 'rotate-180')}
        />
      </button>

      {phone ? (
        <Dialog
          isOpen={open}
          onClose={() => setOpen(false)}
          title={ariaLabel ?? placeholder}
        >
          <ul ref={holdList} id={listId} role="listbox" aria-label={ariaLabel} className="-my-1 space-y-0.5">
            {options.map((option, index) => {
              const isSelected = option.value === value;
              return (
                <li key={option.value} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    onClick={() => commit(index)}
                    className={cn(
                      'flex h-11 w-full items-center gap-2.5 rounded-md px-3 text-left text-100 font-bold transition-colors',
                      isSelected
                        ? 'bg-accent-700/12 text-accent-900'
                        : 'text-gray-800 hover:bg-white/5',
                    )}
                  >
                    {option.color ? (
                      <span
                        aria-hidden
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: option.color }}
                      />
                    ) : null}
                    {option.icon}
                    <span className="min-w-0 flex-1 truncate">{option.label}</span>
                    {isSelected ? <Check size={16} className="shrink-0" /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </Dialog>
      ) : null}

      {phone ? null : createPortal(
        <AnimatePresence>
          {open && position ? (
            <motion.ul
              ref={holdList}
              id={listId}
              role="listbox"
              aria-label={ariaLabel}
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.18, ease: EASE_OUT }}
              style={{
                top: position.top,
                left: position.left,
                minWidth: position.width,
                // The clamp above can only pull a list back to the edge; one
                // wider than the screen would still overhang. This is what
                // stops that, and it is why the rows truncate rather than the
                // panel being cut.
                maxWidth: `calc(100vw - ${MARGIN * 2}px)`,
                maxHeight: MAX_LIST_HEIGHT,
              }}
              // Opaque rather than glass: a list can open over cover art, and a
              // translucent one would leave the artwork legible through the very
              // options it is asking you to read. Same call the dialog makes.
              className={cn(
                'fixed z-50 overflow-y-auto rounded-md p-1',
                'border border-gray-300/70 bg-gray-100',
                'shadow-[inset_0_1px_0_rgb(255_255_255/0.07),var(--shadow-xl)]',
              )}
            >
              {options.map((option, index) => {
                const isSelected = option.value === value;
                const isActive = index === activeIndex;
                return (
                  <li
                    key={option.value}
                    id={`${listId}-${index}`}
                    data-index={index}
                    role="option"
                    aria-selected={isSelected}
                    onPointerEnter={() => setActiveIndex(index)}
                    onClick={() => commit(index)}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 rounded-sm px-2.5 py-1.5',
                      'text-75 font-semibold whitespace-nowrap transition-colors',
                      isSelected ? 'text-accent-900' : 'text-gray-800',
                      isActive ? 'bg-white/8' : isSelected ? 'bg-accent-700/12' : '',
                    )}
                  >
                    {option.color ? (
                      <span
                        aria-hidden
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{
                          backgroundColor: option.color,
                          boxShadow: `0 0 6px -1px ${option.color}`,
                        }}
                      />
                    ) : null}
                    {option.icon}
                    <span className="min-w-0 flex-1 truncate">{option.label}</span>
                    <Check
                      size={13}
                      className={cn('shrink-0 text-accent-900', isSelected ? '' : 'opacity-0')}
                    />
                  </li>
                );
              })}
            </motion.ul>
          ) : null}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
