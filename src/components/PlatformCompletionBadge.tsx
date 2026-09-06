import React from 'react';
import { Platform } from '../types';

interface PlatformCompletionBadgeProps {
  platform: Platform | string;
  size?: number;
  className?: string;
  showLabel?: boolean;
}

/**
 * Exact Steam 100% Achievement Badge:
 * Uses the exact Steam achievement icon image provided.
 */
export const SteamAchievementBadge: React.FC<{ size?: number; className?: string }> = ({
  size = 24,
  className = '',
}) => {
  return (
    <div
      title="Steam 100% Achievements Completed (Perfect Game)"
      className={`relative inline-flex items-center justify-center flex-shrink-0 select-none ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src="/assets/steam-achievement.png"
        alt="Steam 100% Achievement"
        className="w-[120%] h-[120%] max-w-none max-h-none object-contain pointer-events-none drop-shadow-sm transform -translate-y-0.5"
        loading="eager"
        onError={(e) => {
          if ((e.currentTarget as HTMLImageElement).src.indexOf('assets') !== -1) {
            (e.currentTarget as HTMLImageElement).src = '/steam%20achievement.png';
          }
        }}
      />
    </div>
  );
};

/**
 * Exact PS5 Platinum Trophy Badge:
 * Uses the exact PlayStation 5 Platinum Trophy image provided.
 */
export const PS5PlatinumTrophyBadge: React.FC<{ size?: number; className?: string }> = ({
  size = 24,
  className = '',
}) => {
  return (
    <div
      title="PlayStation 5 Platinum Trophy Unlocked"
      className={`relative inline-flex items-center justify-center flex-shrink-0 select-none ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src="/assets/ps5-platinum-achievement.png"
        alt="PS5 Platinum Trophy"
        className="w-[130%] h-[130%] max-w-none max-h-none object-contain pointer-events-none drop-shadow-md transform -translate-y-0.5"
        loading="eager"
        onError={(e) => {
          if ((e.currentTarget as HTMLImageElement).src.indexOf('assets') !== -1) {
            (e.currentTarget as HTMLImageElement).src = '/ps5%20platinum%20achievement.png';
          }
        }}
      />
    </div>
  );
};

/**
 * Authentic Xbox 100% Gamerscore Diamond Badge:
 * Faceted crystalline diamond in Xbox emerald green with polished silver chassis
 * and embossed 1000G / 100% Gamerscore emblem.
 */
export const XboxDiamondBadge: React.FC<{ size?: number; className?: string }> = ({
  size = 24,
  className = '',
}) => {
  return (
    <div
      title="Xbox 100% Completed Gamerscore (1000G Unlocked)"
      className={`relative inline-flex items-center justify-center flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-md"
      >
        <defs>
          <radialGradient id="xboxEmeraldGlow" cx="50" cy="50" r="48" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#107C10" stopOpacity="0.45" />
            <stop offset="70%" stopColor="#052E16" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#052E16" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="xboxChassisSilver" x1="20" y1="12" x2="80" y2="88" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F8FAFC" />
            <stop offset="35%" stopColor="#94A3B8" />
            <stop offset="70%" stopColor="#CBD5E1" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>
          <linearGradient id="xboxGemTop" x1="30" y1="18" x2="70" y2="46" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#86EFAC" />
            <stop offset="40%" stopColor="#22C55E" />
            <stop offset="100%" stopColor="#15803D" />
          </linearGradient>
          <linearGradient id="xboxGemBottom" x1="50" y1="46" x2="50" y2="88" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#16A34A" />
            <stop offset="60%" stopColor="#15803D" />
            <stop offset="100%" stopColor="#052E16" />
          </linearGradient>
          <linearGradient id="xboxFacetLight" x1="20" y1="36" x2="50" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#BBF7D0" />
            <stop offset="100%" stopColor="#4ADE80" />
          </linearGradient>
          <linearGradient id="xboxFacetDark" x1="50" y1="48" x2="80" y2="36" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#15803D" />
            <stop offset="100%" stopColor="#064E3B" />
          </linearGradient>
          <linearGradient id="xboxGoldG" x1="42" y1="48" x2="58" y2="68" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="50%" stopColor="#EAB308" />
            <stop offset="100%" stopColor="#CA8A04" />
          </linearGradient>
        </defs>

        {/* Ambient Emerald Halo */}
        <circle cx="50" cy="50" r="46" fill="url(#xboxEmeraldGlow)" />

        {/* Outer Silver Bezel Diamond Chassis */}
        <polygon
          points="50,8 88,38 50,92 12,38"
          fill="url(#xboxChassisSilver)"
          stroke="#334155"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* Inner Dark Rim */}
        <polygon
          points="50,13 83,39 50,86 17,39"
          fill="#052E16"
          stroke="#107C10"
          strokeWidth="1"
        />

        {/* Diamond Crown Table (Top Center) */}
        <polygon
          points="50,16 68,34 50,46 32,34"
          fill="url(#xboxGemTop)"
          stroke="#4ADE80"
          strokeWidth="0.8"
        />

        {/* Upper Left Facet */}
        <polygon
          points="50,16 32,34 19,39"
          fill="url(#xboxFacetLight)"
          stroke="#22C55E"
          strokeWidth="0.8"
        />

        {/* Upper Right Facet */}
        <polygon
          points="50,16 68,34 81,39"
          fill="url(#xboxFacetDark)"
          stroke="#16A34A"
          strokeWidth="0.8"
        />

        {/* Center Lower Pavilion Left */}
        <polygon
          points="32,34 50,46 50,83 19,39"
          fill="url(#xboxFacetLight)"
          stroke="#22C55E"
          strokeWidth="0.8"
        />

        {/* Center Lower Pavilion Right */}
        <polygon
          points="68,34 50,46 50,83 81,39"
          fill="url(#xboxGemBottom)"
          stroke="#15803D"
          strokeWidth="0.8"
        />

        {/* Center Gamerscore 1000G Medallion */}
        <circle cx="50" cy="54" r="14" fill="#052E16" stroke="#4ADE80" strokeWidth="1.2" />
        <circle cx="50" cy="54" r="12" fill="url(#xboxGemTop)" fillOpacity="0.3" />

        {/* Stylized "G" Gamerscore Glyph */}
        <path
          d="M56 48 C54.5 46.5 52.5 45.8 50 45.8 C45.5 45.8 42 49.3 42 53.8 C42 58.3 45.5 61.8 50 61.8 C53.5 61.8 56 59.5 56.5 56.5 L50 56.5 L50 53.5 L59.5 53.5 C59.8 54.4 60 55.4 60 56.5 C60 61 56 64.8 50 64.8 C43.8 64.8 38.8 59.8 38.8 53.8 C38.8 47.8 43.8 42.8 50 42.8 C53.6 42.8 56.8 44.5 58.8 47 L56 48 Z"
          fill="url(#xboxGoldG)"
          stroke="#713F12"
          strokeWidth="0.5"
        />

        {/* Specular White Sparkle Glint */}
        <path d="M26 24 L29 32 L37 35 L29 38 L26 46 L23 38 L15 35 L23 32 Z" fill="#FFFFFF" fillOpacity="0.8" />
        <circle cx="26" cy="35" r="2" fill="#FFFFFF" />
      </svg>
    </div>
  );
};

/**
 * Authentic Nintendo 100% Clear Star Badge:
 * 3D-beveled golden Super Star with expressive oval eyes,
 * championship ruby ribbon tails, and radiant golden celestial sparkles.
 */

/**
 * Authentic Epic Games 100% Mastered Hexagon Shield:
 * Royal obsidian and amethyst faceted crest rimmed in gold,
 * with golden laurel branches and radiant 100% platinum star.
 */
export const EpicAchievementBadge: React.FC<{ size?: number; className?: string }> = ({
  size = 24,
  className = '',
}) => {
  return (
    <div
      title="Epic Games 100% Completed Achievements"
      className={`relative inline-flex items-center justify-center flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-md"
      >
        <defs>
          <linearGradient id="epicVioletShield" x1="50" y1="6" x2="50" y2="92" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#4C1D95" />
            <stop offset="50%" stopColor="#2E1065" />
            <stop offset="100%" stopColor="#0F0728" />
          </linearGradient>
          <linearGradient id="epicGoldRim" x1="10" y1="10" x2="90" y2="90" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="35%" stopColor="#EAB308" />
            <stop offset="70%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#92400E" />
          </linearGradient>
          <linearGradient id="epicPlatinumCore" x1="35" y1="35" x2="65" y2="65" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="50%" stopColor="#C4B5FD" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>
        </defs>

        {/* Outer Gold Hexagonal Armor Border */}
        <polygon
          points="50,6 88,26 88,74 50,94 12,74 12,26"
          fill="url(#epicGoldRim)"
          stroke="#78350F"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />

        {/* Inner Obsidian & Violet Faceted Field */}
        <polygon
          points="50,12 82,29 82,71 50,88 18,71 18,29"
          fill="url(#epicVioletShield)"
          stroke="#C084FC"
          strokeWidth="1"
        />

        {/* Facet Divider Lines */}
        <line x1="50" y1="12" x2="50" y2="88" stroke="#A855F7" strokeWidth="0.8" strokeOpacity="0.4" />
        <line x1="18" y1="29" x2="82" y2="71" stroke="#A855F7" strokeWidth="0.8" strokeOpacity="0.3" />
        <line x1="18" y1="71" x2="82" y2="29" stroke="#A855F7" strokeWidth="0.8" strokeOpacity="0.3" />

        {/* Golden Laurel Wreath Leaves */}
        <path
          d="M30 68 C24 58 24 44 32 34 C33 40 37 46 33 54 C34 60 38 65 30 68 Z"
          fill="url(#epicGoldRim)"
          stroke="#78350F"
          strokeWidth="0.5"
        />
        <path
          d="M70 68 C76 58 76 44 68 34 C67 40 63 46 67 54 C66 60 62 65 70 68 Z"
          fill="url(#epicGoldRim)"
          stroke="#78350F"
          strokeWidth="0.5"
        />

        {/* Radiant 8-Point Platinum Master Star */}
        <polygon
          points="50,24 54,38 68,36 58,46 66,58 52,54 50,68 48,54 34,58 42,46 32,36 46,38"
          fill="url(#epicPlatinumCore)"
          stroke="#E9D5FF"
          strokeWidth="1"
          strokeLinejoin="round"
        />

        {/* Gold Medallion Hub */}
        <circle cx="50" cy="46" r="8" fill="url(#epicGoldRim)" stroke="#78350F" strokeWidth="0.8" />
        <circle cx="50" cy="46" r="6" fill="#1E113A" />
        <polygon points="50,42 52,45 55,45 53,47 54,50 50,48 46,50 47,47 45,45 48,45" fill="#FDE047" />

        {/* 100% Inscribed Ribbon Banner */}
        <rect x="36" y="70" width="28" height="12" rx="4" fill="#1E113A" stroke="url(#epicGoldRim)" strokeWidth="1" />
        <text x="50" y="79" fill="#FDE047" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
          100%
        </text>
      </svg>
    </div>
  );
};

/**
 * Authentic Google Play Games Platinum / Emerald Achievement Trophy:
 * Geometric emerald glass cup with sculpted handles, golden controller emblem,
 * and gleaming gold star pedestal.
 */
export const GooglePlayBadge: React.FC<{ size?: number; className?: string }> = ({
  size = 24,
  className = '',
}) => {
  return (
    <div
      title="Google Play Games 100% Achievements Completed"
      className={`relative inline-flex items-center justify-center flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-md"
      >
        <defs>
          <linearGradient id="playTrophyBody" x1="20" y1="18" x2="80" y2="68" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#34D399" />
            <stop offset="40%" stopColor="#10B981" />
            <stop offset="80%" stopColor="#059669" />
            <stop offset="100%" stopColor="#064E3B" />
          </linearGradient>
          <linearGradient id="playBaseGold" x1="25" y1="74" x2="75" y2="94" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="40%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#B45309" />
          </linearGradient>
          <linearGradient id="playGlint" x1="30" y1="20" x2="60" y2="50" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Trophy Base */}
        <path
          d="M28 88 L72 88 L68 78 L32 78 Z"
          fill="url(#playBaseGold)"
          stroke="#78350F"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <rect x="42" y="66" width="16" height="12" rx="2" fill="url(#playTrophyBody)" stroke="#065F46" strokeWidth="1" />

        {/* Left Sculpted Handle */}
        <path
          d="M30 28 C18 28 14 44 26 52 C28 48 30 46 32 46 C24 42 24 34 32 34 Z"
          fill="url(#playTrophyBody)"
          stroke="#047857"
          strokeWidth="1"
        />

        {/* Right Sculpted Handle */}
        <path
          d="M70 28 C82 28 86 44 74 52 C72 48 70 46 68 46 C76 42 76 34 68 34 Z"
          fill="url(#playTrophyBody)"
          stroke="#047857"
          strokeWidth="1"
        />

        {/* Main Emerald Trophy Goblet */}
        <path
          d="M28 20 L72 20 L66 52 C64 62 58 68 50 68 C42 68 36 62 34 52 Z"
          fill="url(#playTrophyBody)"
          stroke="#065F46"
          strokeWidth="1.2"
        />

        {/* Glass Specular Reflection */}
        <path
          d="M32 22 L48 22 C42 42 38 52 35 48 Z"
          fill="url(#playGlint)"
        />

        {/* Trophy Rim */}
        <ellipse cx="50" cy="20" rx="22" ry="5" fill="#6EE7B7" stroke="#047857" strokeWidth="1" />
        <ellipse cx="50" cy="20" rx="18" ry="3.5" fill="#047857" />

        {/* Gold Game Controller Emblem */}
        <rect x="39" y="34" width="22" height="14" rx="4" fill="url(#playBaseGold)" stroke="#78350F" strokeWidth="0.8" />
        {/* D-Pad */}
        <path d="M43 38 h4 v2 h-4 z M44 37 v4 h2 v-4 z" fill="#18181B" />
        {/* Face buttons */}
        <circle cx="55" cy="39" r="1" fill="#18181B" />
        <circle cx="58" cy="42" r="1" fill="#18181B" />

        {/* Crown Gold Star */}
        <polygon
          points="50,6 52,11 57,11 53,14 55,19 50,16 45,19 47,14 43,11 48,11"
          fill="url(#playBaseGold)"
          stroke="#78350F"
          strokeWidth="0.6"
        />
      </svg>
    </div>
  );
};

export const PlatformCompletionBadge: React.FC<PlatformCompletionBadgeProps> = ({
  platform,
  size = 24,
  className = '',
  showLabel = false,
}) => {
  const norm = platform.toLowerCase();

  const renderIcon = () => {
    switch (norm) {
      case 'steam':
        return <SteamAchievementBadge size={size} className={className} />;

      case 'ps5':
      case 'playstation':
        return <PS5PlatinumTrophyBadge size={size} className={className} />;

      case 'xbox':
        return <XboxDiamondBadge size={size} className={className} />;

      case 'epic':
        return <EpicAchievementBadge size={size} className={className} />;

      case 'android':
        return <GooglePlayBadge size={size} className={className} />;

      default:
        return <EpicAchievementBadge size={size} className={className} />;
    }
  };

  const getBadgeLabel = () => {
    switch (norm) {
      case 'steam':
        return 'Steam Perfect Game';
      case 'ps5':
      case 'playstation':
        return 'Platinum Trophy';
      case 'xbox':
        return 'Xbox 100% Gamerscore';
      case 'epic':
        return 'Epic 100% Mastered';
      case 'android':
        return 'Play 100% Unlocked';
      default:
        return '100% Mastered';
    }
  };

  if (showLabel) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-800/90 border border-amber-500/40 text-amber-300 text-xs font-bold shadow-sm">
        {renderIcon()}
        <span>{getBadgeLabel()}</span>
      </div>
    );
  }

  return renderIcon();
};
