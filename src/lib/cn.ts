/**
 * Joins class names, dropping falsy entries. Deliberately tiny — the Spectrum
 * token layer means components compose a handful of utilities, not dozens.
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
