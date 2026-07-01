'use client';

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import styles from './AnimatedHeight.module.css';

type Props = {
  children: ReactNode;
  className?: string;
  /** Class applied to the measured inner wrapper (e.g. for flex layout). */
  innerClassName?: string;
  /**
   * When this value changes, the current content fades out, the container
   * height tweens between the old and new content, and the new content fades
   * in - in that order. Leave undefined to only animate height on resize (no
   * content crossfade).
   */
  motionKey?: string | number;
};

type Rendered = { key: Props['motionKey']; node: ReactNode };

// Kept in sync with the transition durations in AnimatedHeight.module.css.
const FADE_MS = 150;
const HEIGHT_MS = 280;

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Wraps content and animates the container's height. On an idle resize (an
 * accordion opening, values loading in) it tweens height to the new measured
 * size. When `motionKey` changes it runs a three-beat crossfade: the old
 * content fades out, the height tweens old -> new, then the new content fades
 * in. Height is always driven in pixels during a transition (never `auto`) so
 * the browser reliably interpolates instead of jumping.
 *
 * Reduced motion collapses everything to an instant, un-animated swap/resize
 * (both transitions are also disabled in the CSS module).
 */
export function AnimatedHeight({ children, className, innerClassName, motionKey }: Props) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState<Rendered>({ key: motionKey, node: children });
  // 'idle'    = at rest, height follows content
  // 'out'     = old content fading away (height pinned)
  // 'resizing'= content swapped, height tweening old -> new (new content hidden)
  // 'in'      = new content fading up
  const [phase, setPhase] = useState<'idle' | 'out' | 'resizing' | 'in'>('idle');

  // While crossfading we take manual control of height, so the ResizeObserver
  // must not fight the sequence. Mirror it into a ref so the long-lived
  // observer callback can read the current value without re-subscribing.
  const crossfading = phase !== 'idle';
  const crossfadingRef = useRef(crossfading);
  useEffect(() => {
    crossfadingRef.current = crossfading;
  }, [crossfading]);

  const setHeight = (h: number | 'auto') => {
    const el = outerRef.current;
    if (el) el.style.height = h === 'auto' ? 'auto' : `${h}px`;
  };

  // Keep height synced to the shown content on idle resizes (accordions, async
  // loads). Writing measured pixels means the CSS height transition fires; the
  // inner node is stable (never remounted), so a single observer suffices.
  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const measure = () => {
      if (!crossfadingRef.current) setHeight(el.scrollHeight);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // While nothing is switching, let normal content updates pass straight
  // through (checkbox toggles, stats loading in) without a crossfade.
  useEffect(() => {
    if (phase === 'idle' && motionKey === rendered.key) {
      setRendered({ key: motionKey, node: children });
    }
  }, [children, motionKey, phase, rendered.key]);

  // Beat 1: motionKey changed -> pin height and fade the old content out.
  useEffect(() => {
    if (motionKey === rendered.key) return;

    if (prefersReducedMotion()) {
      setRendered({ key: motionKey, node: children });
      setPhase('idle');
      return;
    }

    if (outerRef.current && innerRef.current) {
      setHeight(innerRef.current.scrollHeight);
    }
    setPhase('out');
    const t = setTimeout(() => {
      // Swap content while it's invisible; height still pinned to the old value.
      setRendered({ key: motionKey, node: children });
      setPhase('resizing');
    }, FADE_MS);
    return () => clearTimeout(t);
  }, [motionKey, children, rendered.key]);

  // Beat 2: content swapped -> tween height old -> new (double rAF guarantees a
  // painted frame at the old height first so the transition actually runs).
  // Beat 3: after the height settles, fade the new content in.
  useLayoutEffect(() => {
    if (phase === 'resizing') {
      const inner = innerRef.current;
      if (!inner) return;
      const target = inner.scrollHeight;
      let raf2 = 0;
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setHeight(target));
      });
      const t = setTimeout(() => setPhase('in'), HEIGHT_MS);
      return () => {
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
        clearTimeout(t);
      };
    }
    if (phase === 'in') {
      const t = setTimeout(() => {
        // Release height back to intrinsic once the crossfade is done.
        if (innerRef.current) setHeight(innerRef.current.scrollHeight);
        setPhase('idle');
      }, FADE_MS);
      return () => clearTimeout(t);
    }
  }, [phase, rendered]);

  const phaseClass =
    motionKey === undefined
      ? ''
      : phase === 'out'
        ? styles.out
        : phase === 'resizing'
          ? styles.hidden
          : '';

  const innerClass =
    `${innerClassName ?? ''} ${styles.inner} ${phaseClass}`.trim() || undefined;

  return (
    <div ref={outerRef} className={`${styles.outer} ${className ?? ''}`}>
      <div ref={innerRef} className={innerClass}>
        {rendered.node}
      </div>
    </div>
  );
}
