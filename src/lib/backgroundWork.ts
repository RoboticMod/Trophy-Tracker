/**
 * Pacing for the artwork backfills — covers, logos and posters — which walk
 * the library one game at a time and write each answer back.
 *
 * Every write re-renders the app, so a backfill that starts while the first
 * page is still painting, or carries on in a tab nobody is looking at, is
 * spending the phone's time on something no one will see. These two waits keep
 * it to idle moments in a visible tab.
 */

/** Resolves at the browser's next idle moment (or after a short delay). */
export const whenIdle = (): Promise<void> =>
  new Promise((resolve) => {
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      window.requestIdleCallback(() => resolve(), { timeout: 3000 });
    } else {
      setTimeout(resolve, 1500);
    }
  });

/** Resolves at once in a visible tab, or when a hidden one comes back. */
export const whenVisible = (): Promise<void> =>
  new Promise((resolve) => {
    if (typeof document === 'undefined' || document.visibilityState === 'visible') {
      resolve();
      return;
    }
    const onChange = () => {
      if (document.visibilityState !== 'visible') return;
      document.removeEventListener('visibilitychange', onChange);
      resolve();
    };
    document.addEventListener('visibilitychange', onChange);
  });

/** Before each step of a backfill: wait for a visible tab and an idle moment. */
export const beforeBackgroundStep = async (): Promise<void> => {
  await whenVisible();
  await whenIdle();
};
