import { useCallback, useEffect, useRef } from 'react';
import { useMarketStore } from '../store/marketStore';
import { marketNavigationSearch } from '../lib/store-links';

type OpenModalOptions = { replace?: boolean };

export type MarketUrlControls = {
  navigateCollection: (slug: string) => void;
  openModal: (id: string, options?: OpenModalOptions) => void;
  closeModal: () => void;
};

/**
 * Bridges the `?c=<slug>&token=<id>` URL params with the store using the
 * History API, preserving back-button behavior (grid <-> modal). Also triggers
 * the deferred rehydration of persisted view preferences after mount.
 */
export function useMarketUrlSync(
  validSlugs: readonly string[],
  fallbackSlug: string
): MarketUrlControls {
  const setActiveSlug = useMarketStore((s) => s.setActiveSlug);
  const selectCollection = useMarketStore((s) => s.selectCollection);
  const setModalId = useMarketStore((s) => s.setModalId);
  // Guards against a single close triggering more than one history.back()
  // (history.back is async, so re-entrant calls would overshoot the grid).
  const closingRef = useRef(false);

  useEffect(() => {
    void useMarketStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    const apply = () => {
      const params = new URLSearchParams(window.location.search);
      const c = params.get('c');
      const token = params.get('token');
      if (c && validSlugs.includes(c)) {
        setActiveSlug(c);
      } else if (!useMarketStore.getState().activeSlug && fallbackSlug) {
        setActiveSlug(fallbackSlug);
      }
      setModalId(token);
      closingRef.current = false;
    };
    apply();
    window.addEventListener('popstate', apply);
    return () => window.removeEventListener('popstate', apply);
  }, [validSlugs, fallbackSlug, setActiveSlug, setModalId]);

  const navigateCollection = useCallback(
    (slug: string) => {
      const current = useMarketStore.getState().activeSlug;
      selectCollection(slug);
      if (slug === current) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      window.history.replaceState({}, '', marketNavigationSearch(window.location.search, slug));
      window.scrollTo({ top: 0, behavior: 'auto' });
    },
    [selectCollection]
  );

  const openModal = useCallback(
    (id: string, { replace = false }: OpenModalOptions = {}) => {
      setModalId(id);
      closingRef.current = false;
      const url = marketNavigationSearch(window.location.search, useMarketStore.getState().activeSlug, id);
      const state = { token: id };
      // Opening from the grid pushes a single history entry; navigating the
      // carousel replaces it so closing always returns straight to the grid.
      if (replace) window.history.replaceState(state, '', url);
      else window.history.pushState(state, '', url);
    },
    [setModalId]
  );

  const closeModal = useCallback(() => {
    if (closingRef.current) return;
    if (window.history.state?.token) {
      closingRef.current = true;
      window.history.back();
    } else {
      setModalId(null);
      window.history.replaceState({}, '', marketNavigationSearch(window.location.search, useMarketStore.getState().activeSlug));
    }
  }, [setModalId]);

  return { navigateCollection, openModal, closeModal };
}
