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
    version: '0.21.2',
    date: '2026-10-28',
    title: 'Gun pictures after the name',
    changes: ['In the Call of Duty tracker, each gun’s picture now sits after its name, and the pictures line up in a column.'],
  },
  {
    version: '0.21.1',
    date: '2026-10-28',
    title: 'Tidier Call of Duty rows',
    changes: [
      'Gun pictures sit in front of the name, facing it, and every name lines up whether or not its gun has a picture.',
      'On a computer, games, modes and weapon classes that don’t fit on one line wrap onto the next, so none are out of reach.',
      'Camos are shown by name alone: Gold, Platinum, not 1. Gold, 2. Platinum.',
    ],
  },
  {
    version: '0.21.0',
    date: '2026-10-28',
    title: 'Gun icons, and camo goals that match the game',
    changes: [
      'Each gun in the Call of Duty tracker can show its picture beside its name. Add or change it in Weapons, camos & images, or bring them in from a file.',
      'A mastery camo can have a number needed, the way the game sets it: MWII’s Orion needs Polyatomic on 51 guns. Its tile then counts the camo before it toward that number, so 15 / 51 means 15 guns have Polyatomic.',
      'Importing a file for a game you already track now updates it instead of adding a copy: it fills in gun pictures and numbers needed, and leaves your ticks alone.',
    ],
  },
  {
    version: '0.20.0',
    date: '2026-10-22',
    title: 'Import camo games from a file',
    changes: [
      'Add a game on the Call of Duty page now has a third choice, From a file. Pick a JSON file and every game in it is added next to the ones you already track. Nothing you have is changed or replaced.',
      'A backup file works too: its Call of Duty games are added, and the rest of the backup is ignored.',
    ],
  },
  {
    version: '0.19.3',
    date: '2026-10-21',
    title: 'Cleaner tracker headings',
    changes: [
      'The Call of Duty table’s column headings on a computer show just the tier names; the small camo pictures above them are gone, since every cell below already shows its camo.',
    ],
  },
  {
    version: '0.19.2',
    date: '2026-10-21',
    title: 'A roomier camo tracker, and less text',
    changes: [
      'On a computer the camo tracker is bigger: larger cells, weapon names and military counts, and tier names that wrap instead of being cut off.',
      'Tiers are now Special or Mastery. Mastery colours follow their order: the first is Gold, the second Diamond, the rest Dark.',
      'Special and mastery camos are spaced apart in the grid, so you can tell them apart at a glance.',
      'The "Row" heading over All and Clear is gone.',
      'The gold edge of Home’s 100% row is no longer cut off at its corners.',
      'Removed hints that stated the obvious, in the tracker, Settings and game details.',
    ],
  },
  {
    version: '0.19.1',
    date: '2026-10-21',
    title: 'Roomier menus, and Undo for notifications',
    changes: [
      'Drop-down menus on a computer have taller rows with larger text, so they are easier to read and click.',
      'Clearing your notifications can be undone for a few seconds, from the bar that appears where the button was.',
    ],
  },
  {
    version: '0.19.0',
    date: '2026-10-16',
    title: 'Every trophy, rarest first',
    changes: [
      'Game details now list every achievement or trophy for a game linked to Steam or PlayStation, with its icon and description, between Your record and Notes.',
      'Switch between what is left and what you have earned. Each list starts with the rarest, and shows the first few until you tap Show all.',
      'Each one shows how many players have it: Ultra rare under 5%, Very rare under 15%, then Rare and Common. A gold line names the rarest one you own.',
      'If a platform does not say how rare something is, nothing is shown for it rather than a guess.',
      'Lists are kept in your account and fetched again only once your progress on that game changes.',
      'The temporary trophy-rarity check in Connected accounts is gone.',
      'This needs the updated game-data function and schema: deploy the function and run the schema SQL from Settings.',
    ],
  },
  {
    version: '0.18.1',
    date: '2026-10-16',
    title: 'Checking PlayStation trophy data',
    changes: [
      'A temporary "Check trophy rarity data" button under PlayStation in Settings › Connected accounts. It shows whether PlayStation reports how rare each trophy is. It goes away once trophy details are built.',
    ],
  },
  {
    version: '0.18.0',
    date: '2026-10-16',
    title: 'Safer backups',
    changes: [
      'Backups now include your Call of Duty tracker. The backup card lists what a backup holds, and that platform sign-ins are not in it.',
      'Restoring a backup asks first. It shows how many games, lists and Call of Duty games you have now against what the backup holds, and offers to export your current library before replacing it.',
      'Restoring now truly replaces your library. Games and lists that are not in the backup used to come back the next time the app loaded.',
      'A backup made before the camo tracker existed leaves your current tracker as it is.',
    ],
  },
  {
    version: '0.17.2',
    date: '2026-10-16',
    title: 'A tidier Bulk sheet',
    changes: [
      'On a phone, the Bulk sheet in the camo tracker puts one thing on each row: the camo picker and Apply side by side, All military done across the full width, then your last change and Undo.',
    ],
  },
  {
    version: '0.17.1',
    date: '2026-10-16',
    title: 'Faster camo ticking, and Undo',
    changes: [
      'In Edit mode, a camo column header marks that camo for every weapon in the class, or clears it once they all have it. On a phone, the camo names above the weapons do the same.',
      '"Mark every <class> through" a camo ticks it and every camo before it on every weapon in the class, and fills their military camos.',
      '"All military done" fills the military camos for every weapon in the class.',
      'Undo takes back your last 25 tracker changes, including a deleted game. It lasts until you reload the page. The last change is shown beside it.',
      'On a phone these tools open as a sheet, and Undo stays one tap away beside them.',
    ],
  },
  {
    version: '0.17.0',
    date: '2026-10-16',
    title: 'Call of Duty camo tracker',
    changes: [
      'A camo tracker for Call of Duty, under the Call of Duty tab. Track as many games as you like, each with its own modes, camo tiers, weapon classes and weapons. Everything is entered by hand, since no service shares camo progress.',
      'Add a game as a copy of one you already track, with every tick cleared, or start blank.',
      'The tracker opens read-only, so a stray tap changes nothing. Press Edit to tick camos, set military counts, or use All and Clear on a weapon. Ticking a camo also ticks every one before it; clearing one clears every one after it.',
      'Each mastery tier shows how many weapons have it, with a bar in its colour. A tier stays Locked until the one before it is done or you have started it.',
      '"Weapons, camos & images" lets you rename and reorder camo tiers, add pictures to them from a web link, and add, rename or remove weapons, classes and modes. Removing anything with progress asks first.',
      'Home shows your Call of Duty progress next to your other panels, and Lists opens with the tracker.',
      'The tracker saves to your account and works offline like the rest of your library. It needs the updated schema: copy it from Settings and run it in Supabase.',
    ],
  },
  {
    version: '0.16.1',
    date: '2026-10-16',
    title: '100% in Lists',
    changes: [
      'Lists opens with a gold 100% entry on every screen size: your finished games, how many on each platform, and the award mark on each cover. It opens the 100% page.',
      'The 100% entry counts every game with all its achievements or trophies earned, whichever list it is on.',
    ],
  },
  {
    version: '0.16.0',
    date: '2026-10-16',
    title: 'A new Home',
    changes: [
      'Home is now a summary of your library. Your full grid is one tap away under "Open library".',
      'Now playing shows up to three of your Playing games, in the order the Playing page uses. On a phone they sit in a row you can swipe.',
      'Library completion has your 100%, Beaten, Playing and Backlog counts underneath it. Each one opens its page; Beaten opens as a list.',
      'Closest to 100% lists the games with the fewest achievements or trophies left. The bar turns gold when two or fewer remain.',
      'Recent unlocks shows your latest progress from the bell, with a game that reached 100% in gold.',
      'Up next shows the first five games from your Backlog.',
      'Notification details stay on one line on narrow screens instead of wrapping.',
    ],
  },
  {
    version: '0.15.0',
    date: '2026-10-16',
    title: 'Library gets its own page',
    changes: [
      'Your full game grid, with its search, filters and sort, has moved from Home to a new Library page. Home links to it with "Open library".',
      'Library can also be a tab: switch it on in Settings › Customization › Navigation. It is off to begin with.',
      'The list and rating filters are now small dropdowns at the end of the filter row, and are always there. On a tablet or smaller laptop screen you could not start either one before.',
      'The Playing row above the grid is gone, since every one of those games was already in the grid below it.',
      'Unshelved in Statistics, "Skip to my library" in setup, and following a game with no shelf now all open Library.',
    ],
  },
  {
    version: '0.14.0',
    date: '2026-10-16',
    title: 'New navigation',
    changes: [
      'A Call of Duty tab, for the camo tracker that is on its way.',
      '100% is no longer a tab. It opens from Lists and from Home, where the 100%, Playing and Backlog figures now take you to their pages.',
      'The default tabs are Home, Playing, Lists, Call of Duty and Statistics. Search and Backlog are there to switch on. Choices you have already made are kept.',
      'Every tab except Home can be switched off, and all of them can be reordered, in Settings › Customization › Navigation. A line there shows which tabs fit on a phone\'s bottom bar and which go under More.',
      'A phone\'s bottom bar is now simply your first four tabs, then More.',
      'On a tablet or a smaller laptop screen, tabs show just their icon except the one you are on, so the top bar no longer overflows. The buttons in it are bigger on a tablet.',
    ],
  },
  {
    version: '0.13.2',
    date: '2026-10-16',
    title: 'A calmer gold',
    changes: [
      'The light that circled the 100% row in Lists and the 100% spotlight in notifications is gone. A finished game now has a still gold edge, a slightly stronger warm glow, and the foil shine that passes over it every few seconds.',
      'Every 100% game wears the same gold: its card, the 100% row in Lists, the 100% row on Home, and its notification.',
    ],
  },
  {
    version: '0.13.1',
    date: '2026-10-16',
    title: 'Easier to read',
    changes: [
      'Secondary text, labels and the phone bar labels are brighter, so they read clearly on the dark background.',
      'Blue buttons (Add game, Close, and every other main action) are a deeper blue, so their white text is easier to read. They darken slightly on hover instead of getting lighter.',
      'Delete buttons are a deeper red, and darken on hover.',
      'The Steam mark is a little brighter.',
      'Offline and setup warnings are orange instead of amber, so gold now means 100% and nothing else.',
      'The unread count on the bell is easier to read.',
    ],
  },
  {
    version: '0.13.0',
    date: '2026-10-10',
    title: 'A bell for your progress',
    changes: [
      'Progress made while you were away now goes to a bell in the top bar instead of a pop-up. It rings and shows a count while something is new, and turns gold when a game hit 100%.',
      'Opening the bell plays any 100% first, one game at a time with its celebration, then lists everything else by how much it moved. Notifications stay for 30 days, and progress during a session lands there too.',
      'Sorting sits in the same place on every page: an icon in the top bar on a phone, the right of the page header on a computer. Playing can now be sorted on a phone.',
      'Going back from inside a list returns to Lists where you left it, instead of jumping to Home. Going back anywhere returns to where you had scrolled.',
      'On a phone, only the platform you are in stays pinned at the top while scrolling.',
      'Home on a phone shows 100%, Playing and Backlog as three rows you can tap.',
      'List previews lead with your highest-rated games.',
      'New list opens as a sheet on a phone. The Start button on Backlog cards is slimmer.',
      'Much less explanatory text across the app: the intro banners and the "Permanent" label are gone, and descriptions are a few words at most.',
    ],
  },
  {
    version: '0.12.0',
    date: '2026-09-28',
    title: 'Pick a platform, get its progress',
    changes: [
      'Adding a game that is on both Steam and PlayStation no longer asks which version to use. The form opens on Steam, and picking PlayStation switches the name, cover and details to the PlayStation version.',
      'Choosing a platform in the add or edit form syncs with it straight away: trophies or achievements, playtime and dates fill in from that platform before you save, with a line saying what it found.',
      'On a computer or tablet, when Steam and PlayStation are shown side by side, the page no longer scrolls: the two columns fill the window and are the only things that scroll.',
      'The 100% page says how many games are finished once, in its header, instead of twice.',
    ],
  },
  {
    version: '0.11.0',
    date: '2026-09-28',
    title: 'Platforms side by side',
    changes: [
      'With both Steam and PlayStation games on a page, a tablet or computer shows them in two columns side by side, each scrolling on its own.',
      'On a phone, a platform heading you have scrolled past stays at the top of the screen, and the next one waits at the bottom. Tap either to jump to that platform.',
      'Backlog and every list can now be sorted, by title, recent play, rating or playtime (lists by completion too).',
      'A page with only one platform keeps the single grid.',
    ],
  },
  {
    version: '0.10.10',
    date: '2026-09-27',
    title: 'Cards that glide',
    changes: [
      'Picking a filter chip, searching or re-sorting slides every card to its new place instead of cutting to it.',
      'A card lifting on hover keeps its top edge instead of being cut off under the heading above it.',
      'Sort options are a word or two ("Rating", "Playtime", "Title A–Z"), so the sort button shows its choice in full.',
      'The "While you were away" dialog fades out when you press OK.',
    ],
  },
  {
    version: '0.10.9',
    date: '2026-09-26',
    title: 'One icon per shelf',
    changes: [
      'Every shelf has one icon everywhere: a play button for Playing, an hourglass for Backlog, a trophy for 100% and a plain folder for Lists.',
      'List cards on a wide screen show the same cover art as game cards, without a logo laid over it.',
    ],
  },
  {
    version: '0.10.8',
    date: '2026-09-26',
    title: 'New platform colours',
    changes: ['Steam is now a dark navy blue and PlayStation a bright blue.'],
  },
  {
    version: '0.10.7',
    date: '2026-09-26',
    title: 'Sparks you can see',
    changes: [
      'Adding a game that is already finished shows a fuller spray of sparks across the whole preview, instead of a few specks lost in the gold.',
    ],
  },
  {
    version: '0.10.6',
    date: '2026-09-26',
    title: 'Tidier cards',
    changes: [
      'A card’s strip is one line of figures — the count, playtime, then the percentage at the end — over a full-width meter.',
      'The rating and the award mark on a cover carry their own dark shadow instead of darkening the corners of the art, and the award mark no longer glows.',
      'The Game added dialog shows a finished game’s award mark top right, as its card does.',
    ],
  },
  {
    version: '0.10.5',
    date: '2026-09-26',
    title: 'A golden finish',
    changes: [
      'Completing a game now pours gold up its card from the meter, with the sparks still rising through it.',
    ],
  },
  {
    version: '0.10.4',
    date: '2026-09-26',
    title: 'Shorter cards',
    changes: [
      'On a wide screen, hours played sit beside the award count and the percentage beside the meter, so every card is a line shorter.',
    ],
  },
  {
    version: '0.10.3',
    date: '2026-09-26',
    title: 'Clearer cover art',
    changes: [
      'Cards shade only the top corners that carry a mark, instead of the whole top of the cover.',
      'Finished games keep a still gold edge; the light circling the rim is gone.',
      '“Last trophie” now reads “Last trophy”.',
      'The game window counts what is left as “12 achievements remaining” or “12 trophies remaining”.',
      'The Game moved dialog no longer adds a line explaining the move.',
    ],
  },
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
