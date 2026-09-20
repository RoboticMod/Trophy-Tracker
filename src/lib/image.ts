const MAX_DIMENSION = 256;
const MAX_BYTES = 200 * 1024;

/* -------------------------------------------------------------------------- */
/* Catalog artwork                                                             */
/* -------------------------------------------------------------------------- */

const RAWG_MEDIA = 'https://media.rawg.io/media/';

/**
 * The widest this app ever draws a cover — a library card on a 2× display —
 * rounded to a size RAWG's media server already has cut.
 */
const COVER_WIDTH = 640;

/**
 * RAWG artwork at a size worth downloading.
 *
 * `background_image` is the full key art, and RAWG means it: 2560×1440, a third
 * of a megabyte, for a tile that is eighty-eight pixels wide in the add dialog.
 * Sixteen of those decoded at once is what made searching a word with a lot of
 * blockbusters behind it — "spider man" — stutter until the decoding finished,
 * which scrolling only appeared to cure by taking long enough.
 *
 * Their media server resizes on request, so the same picture arrives at 640×360
 * and a sixteenth of the pixels. Anything that is not RAWG's, or that has
 * already been through this, is handed back untouched.
 */
export function coverUrl(url?: string): string | undefined {
  if (!url || !url.startsWith(RAWG_MEDIA)) return url;
  const path = url.slice(RAWG_MEDIA.length);
  if (path.startsWith('resize/') || path.startsWith('crop/')) return url;
  return `${RAWG_MEDIA}resize/${COVER_WIDTH}/-/${path}`;
}

/**
 * Downscales an image file to a square-ish data URL.
 *
 * Avatars are stored in the profile row and in the local cache, so an unresized
 * phone photo would blow past the localStorage quota and bloat every profile
 * write. Anything still too large after downscaling is rejected.
 */
export async function fileToAvatarDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Choose an image file (PNG, JPG, WebP or GIF).');
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('That file is not a readable image.'));
    img.src = dataUrl;
  });

  const scale = Math.min(1, MAX_DIMENSION / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;

  ctx.drawImage(image, 0, 0, width, height);
  const resized = canvas.toDataURL('image/webp', 0.85);

  if (resized.length > MAX_BYTES) {
    throw new Error('That image is too large even after resizing. Try a smaller one.');
  }
  return resized;
}

/**
 * Downscales a dropped image to a data URL that can live in a row.
 *
 * Bigger than an avatar, because this is art someone is going to look at, and
 * smaller than the file they dropped, because every game in the library is
 * held in one localStorage snapshot and a handful of full-size covers would
 * exhaust the quota for the lot.
 *
 * WebP keeps transparency, which is what makes it usable for a logo as well.
 */
export async function fileToArtworkDataUrl(
  file: File,
  { maxDimension = 600, maxBytes = 260 * 1024 }: { maxDimension?: number; maxBytes?: number } = {},
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Choose an image file (PNG, JPG, WebP or GIF).');
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('That file is not a readable image.'));
    img.src = dataUrl;
  });

  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;

  ctx.drawImage(image, 0, 0, width, height);

  // Quality is stepped down rather than refused outright: a photo-heavy cover
  // can be well over the budget at 0.85 and perfectly good at 0.6.
  for (const quality of [0.85, 0.7, 0.6]) {
    const encoded = canvas.toDataURL('image/webp', quality);
    if (encoded.length <= maxBytes) return encoded;
  }

  throw new Error('That image is too large even after resizing. Try a smaller one.');
}

/* -------------------------------------------------------------------------- */
/* Portrait artwork                                                            */
/* -------------------------------------------------------------------------- */

/**
 * The tall box art a phone shows instead of a landscape banner.
 *
 * RAWG's `background_image` is key art at 16:9 — a screenshot, usually with no
 * title on it. Cropped to 2:3 for a portrait tile it becomes an arbitrary
 * rectangle of scenery, and a grid of those is unreadable: nothing tells you
 * which game is which.
 *
 * Steam publishes the real thing at a fixed path — the 600×900 library
 * capsule, which is the art the Steam client's own grid uses and which carries
 * the game's logo by design. It needs no key and no request to find, only the
 * app id the game already stores.
 *
 * There is no equivalent for PlayStation: PSN gives a squarish trophy-set icon
 * and nothing taller. Those games fall back to their landscape cover, which the
 * tile crops — so the caller must keep a fallback behind this.
 */
const STEAM_APPS = 'https://cdn.cloudflare.steamstatic.com/steam/apps';

export function portraitCoverUrl(game: {
  platform: string;
  steamAppId?: number;
}): string | undefined {
  if (game.platform !== 'steam' || !game.steamAppId) return undefined;
  return `${STEAM_APPS}/${game.steamAppId}/library_600x900.jpg`;
}

/**
 * The game's name as artwork, which Steam publishes on its own.
 *
 * Transparent, and sized for laying over a picture — which is the whole point
 * of keeping it apart from the cover: a logo drawn separately can be placed,
 * and a cover chosen without one is a picture rather than a poster.
 */
export function steamLogoUrl(game: {
  platform: string;
  steamAppId?: number;
}): string | undefined {
  if (game.platform !== 'steam' || !game.steamAppId) return undefined;
  return `${STEAM_APPS}/${game.steamAppId}/logo.png`;
}

/**
 * Every candidate for a portrait tile, best first.
 *
 * A cover you chose yourself always wins. Failing that it is Steam's library
 * capsule, which is real box art; failing that the landscape cover, cropped,
 * which is the poor case the whole portrait grid exists to avoid.
 */
export const posterSources = (game: {
  platform: string;
  steamAppId?: number;
  coverPortrait?: string;
  coverImage?: string;
}): (string | undefined)[] => [game.coverPortrait, portraitCoverUrl(game), game.coverImage];

/**
 * The logo to draw over a cover, or nothing.
 *
 * Only ever one you set yourself. Steam's library capsule already has the name
 * across it, so overlaying the separate logo file on top of that would print
 * it twice — and the app cannot tell, from a URL, whether a picture has
 * lettering in it. Choosing a cover is what says "this one is clean".
 */
export const logoOverlay = (game: { coverPortrait?: string; logoImage?: string }): string | undefined =>
  game.coverPortrait && game.logoImage ? game.logoImage : undefined;
