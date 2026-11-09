'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import './StorePageTransition.css';

/** Keep normal link semantics; only enhance unmodified, same-origin page changes. */
export function transitionDestination(event: MouseEvent, anchor: HTMLAnchorElement, current: URL): URL | null {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
    || anchor.hasAttribute('download') || (anchor.target && anchor.target !== '_self')
    || anchor.closest('[data-page-transition="none"]')) return null;
  const url = new URL(anchor.href, current);
  return url.origin === current.origin && url.pathname !== current.pathname ? url : null;
}

type Pending = {path: string; complete: () => void; skip: () => void};
type ReturnTarget = {url: string; productPath: string; cardHref: string; x: number; y: number; width: number; cardTop: number};

function visibleImage(image: HTMLImageElement | null) {
  if (!image?.complete || !image.naturalWidth) return null;
  const rect = image.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight ? image : null;
}

const nextTask = () => new Promise<void>(done => setTimeout(done, 16));

export default function StorePageTransition() {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;
  const pathname = usePathname();
  const previous = useRef(pathname);
  const pending = useRef<Pending | null>(null);
  const returnTargets = useRef<ReturnTarget[]>([]);

  useLayoutEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;
    if (pending.current?.path === pathname) {
      pending.current.complete();
    } else if (!pending.current && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // Programmatic navigation / browsers without View Transitions still get a short reveal.
      document.getElementById('page-main')?.animate?.([{opacity: .3}, {opacity: 1}], {duration: 200, easing: 'ease-out'});
    }
  }, [pathname]);

  useEffect(() => {
    let replaying = false;
    // The router already restores saved positions. Native auto restoration can
    // otherwise move the outgoing product before its snapshot has been captured.
    const scrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    const enabled = () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches && Boolean(document.startViewTransition);
    const returnTarget = (destination: URL) => returnTargets.current.findLast(target => target.url === destination.pathname + destination.search && target.productPath === previous.current);

    function start(destination: URL, source: HTMLImageElement | null, navigate: () => void, returning?: ReturnTarget) {
      pending.current?.skip();
      const shared = visibleImage(source);
      const sourceName = shared?.style.viewTransitionName ?? '';
      if (shared) shared.style.viewTransitionName = 'ww-product';
      let hero: HTMLImageElement | null = null;
      let heroName = '';
      let resolve = () => {};
      let timer: ReturnType<typeof setTimeout>;
      const routeReady = new Promise<void>(done => { resolve = done; });
      let cancelled = false;
      const transition = document.startViewTransition(async () => {
        navigate();
        await routeReady;
        if (cancelled) return;

        // Wait for restored pagination / route effects, then reveal the grid at
        // its final position. A microtask was too early for the router's scroll.
        // Use task boundaries: waiting for a paint during snapshot capture can
        // deadlock in browsers that suppress rendering inside the callback.
        const findImage = () => returning
          ? [...document.querySelectorAll<HTMLAnchorElement>('a[href]')].find(link => link.href === returning.cardHref && link.querySelector('img'))?.querySelector('img') ?? null
          : document.querySelector<HTMLImageElement>('[data-product-hero] img');
        for (let attempt = 0; attempt < 20 && !cancelled; attempt++) {
          hero = findImage();
          if (hero || !shared) break;
          await nextTask();
        }
        if (cancelled) return;
        if (hero) {
          hero.loading = 'eager';
          if (typeof hero.decode === 'function') {
            await Promise.race([hero.decode().catch(() => {}), new Promise(done => setTimeout(done, 180))]);
          }
        }
        await nextTask();
        await nextTask();
        if (cancelled) return;
        if (returning) {
          const resized = returning.width !== window.innerWidth;
          const top = resized && hero
            ? window.scrollY + hero.getBoundingClientRect().top - Math.min(returning.cardTop, window.innerHeight / 3)
            : returning.y;
          window.scrollTo({left: returning.x, top: Math.max(0, top), behavior: 'instant'});
        }
        if (shared && visibleImage(hero)) {
          heroName = hero!.style.viewTransitionName;
          hero!.style.viewTransitionName = 'ww-product';
        } else if (shared) {
          // No offscreen fly-in or disappearing image if the grid changed.
          transition.skipTransition();
        }
      });
      void transition.ready.catch(() => {});
      const state: Pending = {
        path: destination.pathname,
        complete: () => {
          if (pending.current !== state) return;
          resolve();
        },
        skip: () => { cancelled = true; resolve(); transition.skipTransition(); },
      };
      pending.current = state;
      // A failed route must never leave a frozen snapshot over the store.
      timer = setTimeout(state.skip, 4000);
      void transition.finished.catch(() => {}).finally(() => {
        clearTimeout(timer);
        if (shared) shared.style.viewTransitionName = sourceName;
        if (hero) hero.style.viewTransitionName = heroName;
        if (pending.current === state) pending.current = null;
      });
    }

    function navigate(event: MouseEvent) {
      const anchor = event.target instanceof Element ? event.target.closest('a') : null;
      if (!(anchor instanceof HTMLAnchorElement)) return;
      const current = new URL(window.location.href);
      const destination = transitionDestination(event, anchor, current);
      if (!destination || !enabled()) return;
      const returning = returnTarget(destination);
      const source = returning ? document.querySelector<HTMLImageElement>('[data-product-hero] img') : anchor.querySelector('img') ?? anchor.closest('article')?.querySelector('img') ?? null;
      if (!returning && source) {
        returnTargets.current.push({url: current.pathname + current.search, productPath: destination.pathname, cardHref: anchor.href, x: window.scrollX, y: window.scrollY, width: window.innerWidth, cardTop: source.getBoundingClientRect().top});
        if (returnTargets.current.length > 30) returnTargets.current.shift();
      }
      event.preventDefault();
      start(destination, source, () => routerRef.current.push(destination.pathname + destination.search + destination.hash), returning);
    }

    function traverse(event: PopStateEvent) {
      if (replaying || !enabled()) return;
      const destination = new URL(window.location.href);
      const returning = returnTarget(destination);
      if (!returning) return;
      // Capture the outgoing product before the router restores its history snapshot.
      // Replay the same event inside the transition; do not push or replace history.
      event.stopImmediatePropagation();
      start(destination, document.querySelector<HTMLImageElement>('[data-product-hero] img'), () => {
        replaying = true;
        try { window.dispatchEvent(new PopStateEvent('popstate', {state: event.state})); }
        finally { replaying = false; }
      }, returning);
    }
    document.addEventListener('click', navigate, true);
    window.addEventListener('popstate', traverse, true);
    return () => { document.removeEventListener('click', navigate, true); window.removeEventListener('popstate', traverse, true); pending.current?.skip(); window.history.scrollRestoration = scrollRestoration; };
  }, []);
  return null;
}
