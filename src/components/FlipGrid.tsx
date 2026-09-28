import React from 'react';
import { cn } from '../lib/cn';
import { EASE_OUT } from '../lib/motion';

interface FlipGridProps {
  /**
   * The games on show, in order. When this changes — a filter chip, a search,
   * a new sort — every card that stays glides from where it was to where it
   * now is, instead of vanishing and reappearing.
   */
  ids: readonly string[];
  /** Takes the height left on a page held to the window (see mainFill). */
  fill?: boolean;
  className?: string;
  children: React.ReactNode;
}

type Rects = Map<string, DOMRect>;

/** Long enough to follow a card across a row, short enough not to wait on. */
const MOVE_MS = 380;
const MOVE_EASING = `cubic-bezier(${EASE_OUT.join(', ')})`;

const cardsIn = (root: HTMLElement) =>
  Array.from(root.querySelectorAll<HTMLElement>('[data-game-id]'));

const onScreen = (rect: DOMRect) => rect.bottom > 0 && rect.top < window.innerHeight;

/**
 * Moves cards to their new places rather than cutting to them (FLIP: note where
 * each card was, let the new layout land, then play each one in from its old
 * spot).
 *
 * A class because `getSnapshotBeforeUpdate` is the one moment React offers
 * between deciding on the new list and putting it on the page — the old
 * positions are only readable then. Positions are read from the page rather
 * than tracked per card, so a card still moves when the grid regroups
 * underneath it: filtering to one platform drops the section headings and
 * remounts every card in a flat list, and each is matched to its old self by
 * its game id.
 *
 * Measured only when the list itself changes, never on an ordinary render — a
 * sync touches every card, and measuring them all each time was what the old
 * `layout` animation cost.
 */
export class FlipGrid extends React.Component<FlipGridProps> {
  private root = React.createRef<HTMLDivElement>();

  private sameList(prev: readonly string[]) {
    const next = this.props.ids;
    return prev.length === next.length && prev.every((id, i) => id === next[i]);
  }

  getSnapshotBeforeUpdate(prevProps: FlipGridProps): Rects | null {
    const root = this.root.current;
    if (!root || this.sameList(prevProps.ids)) return null;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null;

    const rects: Rects = new Map();
    cardsIn(root).forEach((el) => {
      const id = el.dataset.gameId;
      if (id && !rects.has(id)) rects.set(id, el.getBoundingClientRect());
    });
    return rects;
  }

  componentDidUpdate(_prev: FlipGridProps, _state: unknown, before: Rects | null) {
    const root = this.root.current;
    if (!root || !before) return;

    const staying = new Set(this.props.ids);
    const cards = cardsIn(root);

    // Cards on their way out keep fading where they were, but out of the flow:
    // left in it, they hold their slots open until the fade ends, the others
    // land beside the gaps, and then everything jumps once more to close them.
    // Placed against whatever box they are positioned in — the grid, or a
    // platform column that scrolls, whose scroll has to be counted back in.
    cards.forEach((el) => {
      const id = el.dataset.gameId;
      const was = id ? before.get(id) : undefined;
      if (!id || staying.has(id) || !was) return;
      const holder = (el.offsetParent as HTMLElement | null) ?? root;
      const box = holder.getBoundingClientRect();
      Object.assign(el.style, {
        position: 'absolute',
        left: `${was.left - box.left - holder.clientLeft + holder.scrollLeft}px`,
        top: `${was.top - box.top - holder.clientTop + holder.scrollTop}px`,
        width: `${was.width}px`,
        height: `${was.height}px`,
        margin: '0',
        pointerEvents: 'none',
      });
    });

    cards.forEach((el) => {
      const id = el.dataset.gameId;
      if (!id || !staying.has(id)) return;
      const was = before.get(id);
      if (!was) return; // New to the page: its own entrance plays.

      const now = el.getBoundingClientRect();
      const dx = was.left - now.left;
      const dy = was.top - now.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      if (!onScreen(was) && !onScreen(now)) return;

      // A card remounted by a regroup would also play its arrival fade; it has
      // not arrived, it has moved, so that goes.
      el.getAnimations().forEach((animation) => {
        if ((animation as CSSAnimation).animationName === 'card-enter') animation.cancel();
      });

      el.animate(
        [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }],
        { duration: MOVE_MS, easing: MOVE_EASING },
      );
    });
  }

  render() {
    return (
      <div
        ref={this.root}
        data-fill-grid={this.props.fill ? '' : undefined}
        className={cn('relative', this.props.className)}
      >
        {this.props.children}
      </div>
    );
  }
}
