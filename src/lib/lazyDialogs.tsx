import { preloadable } from './preloadable';

/**
 * The windows a game opens — your record, the store page, the edit form — and
 * the add dialog, as chunks of their own.
 *
 * None of them is on screen when a page first paints, and together they are
 * the largest part of the app's own code, so they no longer ride along in the
 * bundle every page waits for. `prefetchDialogs` fetches them once the app is
 * idle, so the first tap on a card does not wait on the network either.
 */
const edit = preloadable(() => import('../components/EditGameModal').then((m) => m.EditGameModal));
const info = preloadable(() => import('../components/GameInfoModal').then((m) => m.GameInfoModal));
const personal = preloadable(() =>
  import('../components/GamePersonalModal').then((m) => m.GamePersonalModal),
);
const quickAdd = preloadable(() => import('../components/QuickAddModal').then((m) => m.QuickAddModal));

export const EditGameModal = edit.Component;
export const GameInfoModal = info.Component;
export const GamePersonalModal = personal.Component;
export const QuickAddModal = quickAdd.Component;

let prefetched = false;

/** Warms the four chunks after the first idle moment. Safe to call repeatedly. */
export function prefetchDialogs() {
  if (prefetched || typeof window === 'undefined') return;
  prefetched = true;

  const warm = () => {
    void personal.preload();
    void edit.preload();
    void info.preload();
    void quickAdd.preload();
  };

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(warm, { timeout: 4000 });
  } else {
    setTimeout(warm, 2000);
  }
}
