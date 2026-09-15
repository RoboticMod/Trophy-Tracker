import React from 'react';
import { Platform } from '../types';
import { PLATFORMS } from '../lib/constants';
import { PlatformIcon } from './PlatformIcon';

interface PlatformSectionHeaderProps {
  platform: Platform;
  /** Shown in the pill beside the name. */
  count: number;
}

/**
 * The rule that separates one platform's band of a page from the next: the
 * platform's mark lit in its own colour, its name, a count, and a hairline
 * running out to the edge.
 *
 * The rule runs to the edge rather than boxing the section — with translucent
 * cards, a line is what divides the page. Shared by the library grid and the
 * statistics showcase so the two can never drift into two different dividers.
 */
export const PlatformSectionHeader: React.FC<PlatformSectionHeaderProps> = ({
  platform,
  count,
}) => (
  <div className="flex items-center gap-2.5">
    <span
      style={{ color: PLATFORMS[platform].color }}
      className="flex items-center drop-shadow-[0_0_5px_currentColor]"
    >
      <PlatformIcon platform={platform} size={17} />
    </span>
    <h3 className="eyebrow shrink-0 text-gray-900">{PLATFORMS[platform].name}</h3>
    <span className="shrink-0 rounded-full border border-gray-300 bg-gray-200 px-2 py-0.5 text-50 font-bold tabular-nums text-gray-700">
      {count}
    </span>
    <span aria-hidden className="h-px min-w-4 flex-1 bg-gray-200" />
  </div>
);
