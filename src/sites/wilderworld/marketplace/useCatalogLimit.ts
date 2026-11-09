'use client';

import { useEffect, useLayoutEffect, useState } from 'react';

const storageKey = 'ww-catalog-pages-v1';
const pageSize = 24;

function readLimit(key: string) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey) || '{}')[key];
    return Number.isSafeInteger(saved) && saved >= pageSize ? saved : pageSize;
  } catch { return pageSize; }
}

/** Restore loaded rows before the router restores scroll on a history return. */
export function useCatalogLimit(key: string, total: number) {
  const [page, setPage] = useState({ key, limit: pageSize, restored: false });
  const limit = page.key === key ? page.limit : pageSize;
  useLayoutEffect(() => {
    setPage({ key, limit: Math.min(Math.max(pageSize, total), readLimit(key)), restored: true });
  }, [key, total]);
  useEffect(() => {
    if (page.key !== key || !page.restored) return;
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey) || '{}');
      delete saved[key];
      const recent = Object.entries(saved).slice(-29);
      sessionStorage.setItem(storageKey, JSON.stringify(Object.fromEntries([...recent, [key, page.limit]])));
    } catch { /* Browsing still works when storage is unavailable. */ }
  }, [key, page]);
  const setLimit = (next: number | ((current: number) => number)) => setPage(current => ({
    key, restored: true,
    limit: Math.min(Math.max(pageSize, total), typeof next === 'function' ? next(current.key === key ? current.limit : pageSize) : next),
  }));
  return [limit, setLimit] as const;
}
