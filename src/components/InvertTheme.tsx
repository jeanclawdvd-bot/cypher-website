'use client';

import { useEffect } from 'react';

/**
 * Marks the document while mounted so the homepage renders the *inverse* of the
 * active theme: a light background + light cube while the site is in dark mode,
 * and the reverse when the user switches to light mode. The class is removed on
 * unmount so other routes keep the normal theme.
 */
export function InvertTheme() {
  useEffect(() => {
    const el = document.documentElement;
    el.classList.add('home-invert');
    return () => el.classList.remove('home-invert');
  }, []);

  return null;
}
