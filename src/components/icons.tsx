import React from 'react';

/**
 * The icon set.
 *
 * Drawn here rather than pulled from a library so every glyph carries the same
 * 24-unit grid, 1.9 stroke and round caps the design specifies. A general icon
 * package mixes weights and corner treatments between glyphs, which shows badly
 * at the 15-19px sizes this interface uses them at.
 */
interface IconProps {
  size?: number;
  className?: string;
  /** Overrides the stroke colour; defaults to inheriting the text colour. */
  color?: string;
  style?: React.CSSProperties;
}

type Glyph = React.FC<IconProps>;

const stroked =
  (children: React.ReactNode, strokeWidth = 1.9): Glyph =>
  ({ size = 17, className, color, style }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color ?? 'currentColor'}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );

const filled =
  (children: React.ReactNode): Glyph =>
  ({ size = 17, className, color, style }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color ?? 'currentColor'}
      stroke="none"
      className={className}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );

/* -- Destinations ---------------------------------------------------------- */

export const GridIcon = stroked(
  <>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </>,
);

export const PlayIcon = filled(<polygon points="6 3 20 12 6 21" />);

export const TrophyIcon = stroked(
  <>
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
  </>,
);

export const HourglassIcon = stroked(
  <>
    <path d="M5 22h14" />
    <path d="M5 2h14" />
    <path d="M17 22v-4.17a2 2 0 0 0-.59-1.41L12 12l-4.41 4.42A2 2 0 0 0 7 17.83V22" />
    <path d="M7 2v4.17a2 2 0 0 0 .59 1.41L12 12l4.41-4.42A2 2 0 0 0 17 6.17V2" />
  </>,
);

export const FolderIcon = stroked(
  <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />,
);

export const SearchIcon = stroked(
  <>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </>,
  2,
);

export const StatsIcon = stroked(
  <>
    <line x1="12" y1="20" x2="12" y2="10" />
    <line x1="18" y1="20" x2="18" y2="4" />
    <line x1="6" y1="20" x2="6" y2="16" />
  </>,
);

export const SettingsIcon = stroked(
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </>,
);

/* -- Chrome ---------------------------------------------------------------- */

export const PlusIcon = stroked(
  <>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </>,
  2.2,
);

export const ChevronDownIcon = stroked(<polyline points="6 9 12 15 18 9" />, 2);
export const ChevronUpIcon = stroked(<polyline points="18 15 12 9 6 15" />, 2);
export const ChevronRightIcon = stroked(<polyline points="9 18 15 12 9 6" />, 2);

export const CloseIcon = stroked(
  <>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </>,
  2,
);

export const MoreHorizontalIcon = stroked(
  <>
    <circle cx="5" cy="12" r="1" />
    <circle cx="12" cy="12" r="1" />
    <circle cx="19" cy="12" r="1" />
  </>,
  2,
);

export const MoreVerticalIcon = stroked(
  <>
    <circle cx="12" cy="5" r="1" />
    <circle cx="12" cy="12" r="1" />
    <circle cx="12" cy="19" r="1" />
  </>,
  2,
);

export const CheckIcon = stroked(<polyline points="20 6 9 17 4 12" />, 2.2);

export const ClockIcon = stroked(
  <>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </>,
  2,
);

export const StarIcon = filled(
  <polygon points="12 2 15.1 8.3 22 9.3 17 14.1 18.2 21 12 17.8 5.8 21 7 14.1 2 9.3 8.9 8.3 12 2" />,
);

/** The equalizer glyph on the Advanced customization header. */
export const SlidersIcon = stroked(
  <>
    <line x1="4" y1="21" x2="4" y2="14" />
    <line x1="4" y1="10" x2="4" y2="3" />
    <line x1="12" y1="21" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12" y2="3" />
    <line x1="20" y1="21" x2="20" y2="16" />
    <line x1="20" y1="12" x2="20" y2="3" />
    <line x1="1" y1="14" x2="7" y2="14" />
    <line x1="9" y1="8" x2="15" y2="8" />
    <line x1="17" y1="16" x2="23" y2="16" />
  </>,
);

/** Ranked bars, used by the platform leaderboard headings. */
export const RankingIcon = stroked(
  <>
    <path d="M4 20h16" />
    <rect x="4" y="10" width="4" height="10" />
    <rect x="10" y="4" width="4" height="16" />
    <rect x="16" y="14" width="4" height="6" />
  </>,
  2,
);

export const LogOutIcon = stroked(
  <>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </>,
  2,
);

export const UploadIcon = stroked(
  <>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </>,
  2,
);

export const DownloadIcon = stroked(
  <>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </>,
  2,
);

export const TrashIcon = stroked(
  <>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </>,
  2,
);

export const MailIcon = stroked(
  <>
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-10 5L2 7" />
  </>,
  2,
);

export const LockIcon = stroked(
  <>
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </>,
  2,
);

/** Broken link, for the "no RAWG key" state. */
export const UnlinkIcon = stroked(
  <>
    <circle cx="7.5" cy="15.5" r="5.5" />
    <path d="m21 2-9.6 9.6" />
    <path d="m15.5 7.5 3 3L22 7l-3-3" />
  </>,
);

export const RefreshIcon = stroked(
  <>
    <path d="M21 12a9 9 0 1 1-2.64-6.36" />
    <polyline points="21 3 21 9 15 9" />
  </>,
  2,
);

export const CloudOffIcon = stroked(
  <>
    <path d="M22.61 16.95A5 5 0 0 0 18 10h-1.26a8 8 0 0 0-7.05-6" />
    <path d="M5 5a8 8 0 0 0 4 15h9a5 5 0 0 0 1.7-.3" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </>,
  2,
);

/** Card layout toggles: four wide tiles, or three tall posters. */
export const WideCardsIcon = stroked(
  <>
    <rect x="3" y="6" width="8" height="5" rx="1" />
    <rect x="13" y="6" width="8" height="5" rx="1" />
    <rect x="3" y="13" width="8" height="5" rx="1" />
    <rect x="13" y="13" width="8" height="5" rx="1" />
  </>,
);

export const PosterCardsIcon = stroked(
  <>
    <rect x="3" y="4" width="6" height="16" rx="1" />
    <rect x="11" y="4" width="6" height="16" rx="1" />
    <rect x="19" y="4" width="2" height="16" rx="1" />
  </>,
);

export const CodeIcon = stroked(
  <>
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </>,
  2,
);

export const CopyIcon = stroked(
  <>
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </>,
  2,
);

/** Icon for a destination, by route path. */
export const NAV_ICONS: Record<string, Glyph> = {
  '/': GridIcon,
  '/playing': PlayIcon,
  '/achievements': TrophyIcon,
  '/backlog': HourglassIcon,
  '/collections': FolderIcon,
  '/search': SearchIcon,
  '/stats': StatsIcon,
  '/settings': SettingsIcon,
};
