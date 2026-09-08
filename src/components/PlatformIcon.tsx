import React from 'react';
import { SiSteam, SiPlaystation } from 'react-icons/si';
import { Platform } from '../types';
import { normalizePlatform } from '../lib/constants';

interface PlatformIconProps {
  platform: Platform | string;
  size?: number;
  className?: string;
}

/** Brand mark for the two supported platforms. */
export const PlatformIcon: React.FC<PlatformIconProps> = ({
  platform,
  size = 16,
  className = '',
}) => {
  const id = normalizePlatform(platform) ?? 'steam';

  return (
    <span className={`inline-flex shrink-0 items-center justify-center ${className}`}>
      {id === 'ps5' ? (
        <SiPlaystation size={size} aria-label="PlayStation 5" />
      ) : (
        <SiSteam size={size} aria-label="Steam" />
      )}
    </span>
  );
};
