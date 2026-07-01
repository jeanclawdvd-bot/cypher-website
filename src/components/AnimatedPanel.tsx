'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type DependencyList,
  type ReactNode,
} from 'react';
import { animateElementHeight, cancelHeightAnimation, setHeightInstant } from '@/lib/animateElementHeight';
import styles from './AnimatedPanel.module.css';

type Props = {
  children: ReactNode;
  className?: string;
  /** Class on the measured inner wrapper (layout/spacing). */
  bodyClassName?: string;
  /** Re-run height sync when these change (collection switch, accordion, async load). */
  measureDeps?: DependencyList;
};

/**
 * Animates the outer panel's pixel height to match its content. The outer node
 * is the visible bordered container; an inner wrapper carries natural layout and
 * is observed for size changes (async loads, accordions, collection swaps).
 */
export function AnimatedPanel({
  children,
  className,
  bodyClassName,
  measureDeps = [],
}: Props) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<ReturnType<typeof animateElementHeight>>(null);

  const syncHeight = useCallback(
    (instant = false) => {
      const outer = outerRef.current;
      const inner = innerRef.current;
      if (!outer || !inner) return;

      // Measure the outer's natural border-box height (border + padding +
      // content), not the inner content alone. The visible bordered panel is
      // the outer node, so animating to inner.scrollHeight would drop the
      // panel's own border + padding and clip the tail of the content.
      const previousHeight = outer.style.height;
      const previousTransition = outer.style.transition;
      outer.style.transition = 'none';
      outer.style.height = 'auto';
      const target = outer.getBoundingClientRect().height;
      outer.style.height = previousHeight;
      outer.style.transition = previousTransition;

      cancelHeightAnimation(outer, animationRef.current);
      animationRef.current = null;

      if (instant) {
        setHeightInstant(outer, target);
        return;
      }

      animationRef.current = animateElementHeight(outer, target, {
        from: outer.getBoundingClientRect().height,
      });
    },
    []
  );

  useLayoutEffect(() => {
    syncHeight(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A single ResizeObserver on the inner wrapper is the one place that drives
  // the tween: it fires for async loads, accordion toggles, and the collection
  // skeleton swap. measureDeps only re-assert after layout via one rAF so a
  // dependency change never stacks competing animation loops against the RO.
  useLayoutEffect(() => {
    const id = requestAnimationFrame(() => syncHeight(false));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...measureDeps, syncHeight]);

  useEffect(() => {
    const inner = innerRef.current;
    const outer = outerRef.current;
    if (!inner || !outer) return;

    const ro = new ResizeObserver(() => syncHeight(false));
    ro.observe(inner);
    return () => {
      ro.disconnect();
      cancelHeightAnimation(outer, animationRef.current);
      animationRef.current = null;
    };
  }, [syncHeight]);

  const outerClass = `${styles.outer} ${className ?? ''}`.trim();
  const bodyClass = `${styles.body} ${bodyClassName ?? ''}`.trim() || undefined;

  return (
    <div ref={outerRef} className={outerClass}>
      <div ref={innerRef} className={bodyClass}>
        {children}
      </div>
    </div>
  );
}
