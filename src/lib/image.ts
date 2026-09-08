const MAX_DIMENSION = 256;
const MAX_BYTES = 200 * 1024;

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
