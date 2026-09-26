/**
 * What changed, release by release — shown in Settings, newest first.
 *
 * The version is [major].[minor].[patch], still in 0.x:
 *
 * - **major** — only when a new major feature is added;
 * - **minor** — when an existing feature is changed entirely;
 * - **patch** — small changes to existing features, and UI/UX.
 *
 * Every shipped change adds an entry here, and `package.json` carries the same
 * number. The history before the first entry was written was reconstructed from
 * the commit log, a release to a day's worth of related work.
 */
export interface ChangelogEntry {
  version: string;
  /** yyyy-mm-dd */
  date: string;
  title: string;
  changes: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '0.10.2',
    date: '2026-09-26',
    title: 'Finding unshelved games',
    changes: [
      'Every row of Distribution in Statistics opens the games it counts.',
      'Unshelved — games on none of Backlog, Playing, Beaten or 100% — opens as a filter on Home.',
      'Home has an Unshelved chip whenever there are any.',
      'The Playing row on Home steps aside while a list is being filtered to.',
    ],
  },
  {
    version: '0.10.1',
    date: '2026-09-26',
    title: 'Faster, especially on a phone',
    changes: [
      'Editing or syncing a game no longer re-renders every card: a change to one game touches only its own card.',
      'Cards off screen are skipped by the browser until you scroll to them.',
      'A game’s windows load only when first opened, and are fetched in the background beforehand.',
      'Pages load on demand, so the app starts with far less code, and every page is fetched in the background once it has.',
      'The phone header, bottom bar and sheets no longer blur what scrolls behind them.',
      'The gold rim on finished games turns without repainting the card.',
      'Artwork lookups wait for idle moments and pause in a background tab.',
      'Re-sorting a grid now snaps into place instead of gliding.',
    ],
  },
  {
    version: '0.10.0',
    date: '2026-09-24',
    title: 'Beaten, a changelog, and a round of fixes',
    changes: [
      'New Beaten shelf, kept in Lists, for games you have finished without every award. It counts toward the Home progress gauge.',
      'A changelog and version number in Settings.',
      'Lists previews on a phone use portrait cover art with the title painted in, falling back to the landscape art.',
      'PlayStation 5 is now just PlayStation (PS) everywhere.',
      'The start page setting is gone: the app always opens on Home.',
      'The Settings link on an unlinked game goes straight to Connected accounts.',
      'The original logo is back, and the 100% tab wears both award marks again.',
      'Statistics counts games at 100% under Completion, rather than awards.',
      'Hours step by −1 and +1 in the edit dialog.',
      'The rating slider has its scale as ticks underneath, and no dark ring on its handle.',
      'Desktop: the account button opens a menu with Settings and Log out.',
      'Desktop: game details have a Delete game button; the Ctrl+E shortcut is gone.',
      'Desktop: every section shows ordinary cards, however few games are in it.',
      'The 100% mark sits bare in the top corner of a finished card, over a stronger top gradient.',
      'Phone: sheets can be pulled down to close, and Home has no back button.',
      'Phone: every tab opens at the top, and a dialog icon sits beside its title.',
      'The edit dialog keeps Delete, Cancel and Save on one row while confirming.',
    ],
  },
  {
    version: '0.9.0',
    date: '2026-09-23',
    title: 'The phone redesign',
    changes: [
      'One card at every width: uncropped art, the score and title on it, counts and progress underneath.',
      'A 56px header with the page name and count, and a 60px bottom bar.',
      'Every dialog is a bottom sheet on a phone; sort and rating open as sheets.',
      'Lists shows each list with three previews; Statistics uses four panels.',
      '“Collections” is now “Lists”.',
    ],
  },
  {
    version: '0.8.0',
    date: '2026-09-23',
    title: 'Desktop and tablet layout',
    changes: [
      'A 64px top bar, and every page in one centred 1440px column.',
      'Five cards across at 1440, four on a tablet.',
      'Game details open as a two-column dialog on a wide screen.',
      'Statistics and Settings split into two columns from 1280.',
    ],
  },
  {
    version: '0.7.3',
    date: '2026-09-21',
    title: 'Logos',
    changes: [
      'List previews wear each game’s own logo, found automatically.',
      'A fallback logo is upgraded when a better one turns up.',
    ],
  },
  {
    version: '0.7.2',
    date: '2026-09-21',
    title: 'Figures beside the title, and a phone card of its own',
    changes: [
      'Page figures count games and sit beside the title.',
      'A phone card that is just the artwork, and a details window of your own.',
      'One edit control per game, and shelves that wear their colour.',
      'The sort list stays on screen.',
    ],
  },
  {
    version: '0.7.1',
    date: '2026-09-20',
    title: 'Shelves on a phone, and add-on trophies',
    changes: [
      'A PlayStation game can count add-on trophies too.',
      'The app says so when it moves a game itself.',
      'On a phone the shelves fold into Collections, and cards show box art.',
      'Slider alignment, stale trophy counts and delayed moves fixed.',
    ],
  },
  {
    version: '0.7.0',
    date: '2026-09-20',
    title: 'Collections are where a game lives',
    changes: [
      'Status is replaced by three permanent shelves — Backlog, Playing, 100% — and your own collections.',
      'Every ordinary collection can be deleted, behind a confirm.',
      'A setup page for a new account instead of an error.',
      'Settings in groups, a draggable nav order, and account deletion.',
      'Page descriptions become notes you can dismiss.',
    ],
  },
  {
    version: '0.6.2',
    date: '2026-09-18',
    title: 'Knowing what happened',
    changes: [
      'A new game is announced once it is added.',
      'What synced while you were away is summed up when you return.',
      'The card you were sent to is ringed.',
    ],
  },
  {
    version: '0.6.1',
    date: '2026-09-17',
    title: 'Sync fixes',
    changes: [
      'PlayStation games match their trophy lists and show whether they synced.',
      'Base-game trophies only by default; covers from RAWG.',
      'Cleaner playtime totals, and duplicate search results kept out.',
    ],
  },
  {
    version: '0.6.0',
    date: '2026-09-16',
    title: 'Linked accounts',
    changes: [
      'Link Steam and PlayStation, and linked games keep themselves current.',
      'Open a game to see live store data, players and reviews.',
      'Search Steam and RAWG together.',
    ],
  },
  {
    version: '0.5.0',
    date: '2026-09-13',
    title: 'A new look',
    changes: ['The interface rebuilt around a lit navy glass design.'],
  },
  {
    version: '0.4.1',
    date: '2026-09-12',
    title: 'Grouped by platform',
    changes: [
      'Every game list is grouped by platform.',
      'The score moves to the card’s corner.',
      'A re-filed game is followed to where it went.',
    ],
  },
  {
    version: '0.4.0',
    date: '2026-09-11',
    title: 'Ratings out of ten',
    changes: [
      'Scores out of 10, or rated by answering a few questions.',
      'Start any backlog game from its card.',
      'View choices and the add draft are remembered.',
    ],
  },
  {
    version: '0.3.1',
    date: '2026-09-10',
    title: 'Cards and the game form',
    changes: [
      'One shared form for adding and editing a game.',
      'Each game’s status beside its platform icon.',
      'Card, rating and celebration polish.',
    ],
  },
  {
    version: '0.3.0',
    date: '2026-09-09',
    title: 'RAWG catalog',
    changes: ['The catalog comes from RAWG, with no stock-photo placeholders.'],
  },
  {
    version: '0.2.0',
    date: '2026-09-09',
    title: 'Achievement ratings',
    changes: [
      'Rate a game’s achievements separately from the game.',
      'A celebration bursts on the card when a game reaches 100%.',
    ],
  },
  {
    version: '0.1.1',
    date: '2026-09-09',
    title: 'Sign-in fixes',
    changes: [
      'Remember me on sign-in.',
      'Focus stays in dialog fields.',
      'The schema script repairs an older database when re-run.',
    ],
  },
  {
    version: '0.1.0',
    date: '2026-09-06',
    title: 'First version',
    changes: [
      'Track Steam and PlayStation games: hours, achievements and trophies.',
      'Sign in, with the library kept in the cloud.',
    ],
  },
];

/** The version the app is at: the newest entry's. */
export const APP_VERSION = CHANGELOG[0].version;
