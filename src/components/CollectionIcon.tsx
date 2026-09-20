import React from 'react';
import {
  CircleSlash,
  Clock,
  Flag,
  Folder,
  Gamepad2,
  Heart,
  ListPlus,
  Trophy,
} from 'lucide-react';

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
  ListPlus,
  Trophy,
  // A collection saved before the star was retired. Aliased rather than
  // dropped, so an existing row draws the icon that replaced it instead of
  // falling back to a generic folder — and the star itself is never rendered.
  Sparkles: ListPlus,
};

export const CollectionIcon: React.FC<{ name?: string; size?: number }> = ({
  name,
  size = 16,
}) => {
  const Icon = (name && ICONS[name]) || Folder;
  return <Icon size={size} />;
};
