import React, { useEffect, useState } from 'react';

/**
 * A component whose code is fetched on demand and can be warmed in advance.
 *
 * Not `React.lazy`: a lazy component suspends on its first render even when
 * its code has long since arrived, and React holds suspended content back for
 * 300ms — which made every first open of a window feel sticky. These render
 * straight away once loaded, and otherwise render nothing until they are.
 */
export function preloadable<P extends object>(
  load: () => Promise<React.ComponentType<P>>,
  /** Drawn in its place until the code arrives — nothing, by default. */
  fallback: React.ReactNode = null,
) {
  let loaded: React.ComponentType<P> | null = null;
  let pending: Promise<React.ComponentType<P>> | null = null;

  const preload = () => {
    pending ??= load().then((component) => (loaded = component));
    return pending;
  };

  const Preloaded: React.FC<P> = (props) => {
    const [, setReady] = useState(Boolean(loaded));
    useEffect(() => {
      if (loaded) return;
      let alive = true;
      void preload().then(() => alive && setReady(true));
      return () => {
        alive = false;
      };
    }, []);
    return loaded ? React.createElement(loaded, props) : fallback;
  };

  return { Component: Preloaded, preload };
}
