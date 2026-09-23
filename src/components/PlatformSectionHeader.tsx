import React from 'react';
import { Platform } from '../types';
import { PLATFORMS } from '../lib/constants';
import { PlatformIcon } from './PlatformIcon';
import { SectionRule } from './ui';
import { useIsPhone } from '../lib/useMediaQuery';

interface PlatformSectionHeaderProps {
  platform: Platform;
  /** At the far end of the rule. */
  count: number;
}

/**
 * The rule that separates one platform's band of a page from the next: the
 * platform's mark lit in its own colour, its name, a hairline running out to
 * the edge, and the count at the end of it.
 *
 * The rule runs to the edge rather than boxing the section — with translucent
 * cards, a line is what divides the page. The count sits at the far end, where
 * every other section heading keeps its figure, so they read down one edge
 * rather than as a lone pill beside each name. Shared by every grid, so no two
 * pages can drift into two different dividers.
 */
export const PlatformSectionHeader: React.FC<PlatformSectionHeaderProps> = ({
  platform,
  count,
}) => {
  const phone = useIsPhone();
  return (
    <SectionRule
      icon={
        <span
          style={{ color: PLATFORMS[platform].color }}
          className="flex items-center drop-shadow-[0_0_5px_currentColor]"
        >
          <PlatformIcon platform={platform} size={phone ? 17 : 18} />
        </span>
      }
      title={PLATFORMS[platform].name}
      count={count}
    />
  );
};
