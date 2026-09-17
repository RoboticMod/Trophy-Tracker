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
