import React from 'react';
import {
  CircleSlash,
  Clock,
  Flag,
  Folder,
  Gamepad2,
  Heart,
  Hourglass,
  ListPlus,
  LucideIcon,
  Play,
  Trophy,
} from 'lucide-react';
import {
  BACKLOG_COLLECTION_ID,
  BEATEN_COLLECTION_ID,
  COMPLETE_COLLECTION_ID,
  PLAYING_COLLECTION_ID,
  PermanentCollectionId,
} from '../lib/collections';

/**
 * The one icon each shelf wears, everywhere it appears — the navigation, the
 * Lists page, Settings and the section headings on Home.
 *
 * Fixed here rather than read from the collection row: the icon on a row is
 * data, saved when the shelf was first created, and older rows still carry the
 * gamepad and the clock that Playing and Backlog used to have. A shelf is not
 * something you restyle, so its row's icon is ignored and this is drawn instead.
 * An hourglass rather than a clock for the backlog, because the clock already
 * means hours played on every card.
 */
export const SHELF_ICONS: Record<PermanentCollectionId, LucideIcon> = {
  [BACKLOG_COLLECTION_ID]: Hourglass,
  [PLAYING_COLLECTION_ID]: Play,
  [BEATEN_COLLECTION_ID]: Flag,
  [COMPLETE_COLLECTION_ID]: Trophy,
};

/** The Lists page, and a list of your own that has no icon of its own. */
export const LISTS_ICON: LucideIcon = Folder;

/**
 * A collection's icon, by the name stored on the row.
 *
 * An explicit map rather than a lookup into the whole of lucide: the icon name
 * is data, and data reaching into a module's exports by string is how an entire
 * icon set ends up in the bundle to draw eight of them. Anything unrecognised —
 * a name from an older build, or a hand-edited row — falls back to a folder.
 */
const ICONS: Record<string, React.ElementType> = {
  CircleSlash,
  Clock,
  Flag,
  Folder,
  Gamepad2,
  Heart,
  Hourglass,
  ListPlus,
  Play,
  Trophy,
  // A collection saved before the star was retired. Aliased rather than
  // dropped, so an existing row draws the icon that replaced it instead of
  // falling back to a generic folder — and the star itself is never rendered.
  Sparkles: ListPlus,
};

export const CollectionIcon: React.FC<{
  name?: string;
  /** The shelf this is, whose fixed icon wins over whatever the row stores. */
  shelf?: PermanentCollectionId | null;
  size?: number;
}> = ({ name, shelf, size = 16 }) => {
  const Icon = (shelf && SHELF_ICONS[shelf]) || (name && ICONS[name]) || LISTS_ICON;
  return <Icon size={size} />;
};
