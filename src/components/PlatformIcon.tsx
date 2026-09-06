import React from 'react';
import { Platform } from '../types';
import { SiSteam, SiPlaystation, SiEpicgames, SiAndroid, SiApple } from 'react-icons/si';
import { FaXbox, FaWindows } from 'react-icons/fa6';
import { BsNintendoSwitch } from 'react-icons/bs';
import { Gamepad2 } from 'lucide-react';

interface PlatformIconProps {
  platform: Platform | string;
  size?: number;
  className?: string;
  showTooltip?: boolean;
}

export const PlatformIcon: React.FC<PlatformIconProps> = ({
  platform,
  size = 18,
  className = '',
}) => {
  const norm = platform.toLowerCase();

  const renderIcon = () => {
    switch (norm) {
      case 'steam':
        return <SiSteam size={size} aria-label="Steam" />;

      case 'ps5':
      case 'playstation':
      case 'ps4':
      case 'ps3':
        return <SiPlaystation size={size} aria-label="PlayStation" />;

      case 'xbox':
      case 'xbox-series':
      case 'xbox-one':
      case 'xbox360':
        return <FaXbox size={size} aria-label="Xbox" />;

      case 'epic':
      case 'epic-games':
        return <SiEpicgames size={size} aria-label="Epic Games" />;

      case 'android':
      case 'google-play':
        return <SiAndroid size={size} aria-label="Android" />;

      case 'nintendo':
      case 'switch':
      case 'nintendo-switch':
        return <BsNintendoSwitch size={size} aria-label="Nintendo Switch" />;

      case 'ios':
      case 'apple':
      case 'mac':
        return <SiApple size={size} aria-label="Apple iOS / Mac" />;

      case 'pc':
      case 'windows':
        return <FaWindows size={size} aria-label="Windows PC" />;

      default:
        return <Gamepad2 size={size} aria-label="Game Platform" />;
    }
  };

  return (
    <span className={`inline-flex items-center justify-center flex-shrink-0 ${className}`}>
      {renderIcon()}
    </span>
  );
};

