'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './CustomScrollbar.module.css';

const MIN_THUMB = 32;
const IDLE_HIDE_MS = 1000;

interface CustomScrollbarProps {
  // Scroll container to control. When omitted, the scrollbar controls the whole
  // page (window) and is fixed to the right edge of the viewport.
  targetRef?: React.RefObject<HTMLElement | null>;
  // When true, the scrollbar is only shown while the pointer is over the target
  // container (instead of auto-showing on scroll and fading out when idle).
  showOnHoverOnly?: boolean;
}

interface Metrics {
  scrollHeight: number;
  clientHeight: number;
  scrollTop: number;
}

export function CustomScrollbar({
  targetRef,
  showOnHoverOnly = false,
}: CustomScrollbarProps = {}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [thumbHeight, setThumbHeight] = useState(0);
  const [thumbTop, setThumbTop] = useState(0);
  // Container mode only: keep the absolutely-positioned track aligned with the
  // currently visible portion of the scroll container.
  const [trackTop, setTrackTop] = useState(0);
  const [trackHeight, setTrackHeight] = useState(0);
  const [scrollable, setScrollable] = useState(false);
  const [active, setActive] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);

  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Captured at drag start: pointer Y and the scrollTop it maps to.
  const dragOrigin = useRef({ pointerY: 0, scrollTop: 0 });

  const isContainer = !!targetRef;

  const getMetrics = useCallback((): Metrics | null => {
    if (isContainer) {
      const el = targetRef?.current;
      if (!el) return null;
      return {
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
        scrollTop: el.scrollTop,
      };
    }
    const doc = document.documentElement;
    return {
      scrollHeight: doc.scrollHeight,
      clientHeight: doc.clientHeight,
      scrollTop: doc.scrollTop,
    };
  }, [isContainer, targetRef]);

  const setScroll = useCallback(
    (top: number) => {
      if (isContainer) {
        const el = targetRef?.current;
        if (el) el.scrollTop = top;
      } else {
        window.scrollTo({ top });
      }
    },
    [isContainer, targetRef]
  );

  const showThenIdle = useCallback(() => {
    setActive(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setActive(false), IDLE_HIDE_MS);
  }, []);

  const measure = useCallback(() => {
    const m = getMetrics();
    if (!m) return;
    const { scrollHeight, clientHeight, scrollTop } = m;
    // In container mode the visible track equals the container's client height.
    // In viewport mode it's the full-height fixed track element.
    const measuredTrack = isContainer
      ? clientHeight
      : trackRef.current?.clientHeight ?? clientHeight;
    const canScroll = scrollHeight - clientHeight > 1;

    setScrollable(canScroll);
    if (!canScroll) return;

    const ratio = clientHeight / scrollHeight;
    const nextThumb = Math.max(ratio * measuredTrack, MIN_THUMB);
    const maxScroll = scrollHeight - clientHeight;
    const maxThumbTop = measuredTrack - nextThumb;
    const nextTop = maxScroll > 0 ? (scrollTop / maxScroll) * maxThumbTop : 0;

    setThumbHeight(nextThumb);
    setThumbTop(nextTop);
    if (isContainer) {
      setTrackHeight(clientHeight);
      // The track is an absolute child of the (scrolling) container; offset it
      // by scrollTop so it stays pinned over the visible area.
      setTrackTop(scrollTop);
    }
  }, [getMetrics, isContainer]);

  useEffect(() => {
    measure();

    const onScroll = () => {
      measure();
      if (!showOnHoverOnly) showThenIdle();
    };
    const onResize = () => measure();

    const el = isContainer ? targetRef?.current ?? null : null;
    if (el) {
      el.addEventListener('scroll', onScroll, { passive: true });
    } else {
      window.addEventListener('scroll', onScroll, { passive: true });
    }
    window.addEventListener('resize', onResize);

    // Catch content-height changes (route/section transitions, font loads).
    const ro = new ResizeObserver(() => measure());
    const observed = el ?? document.body;
    ro.observe(observed);
    if (el?.firstElementChild) ro.observe(el.firstElementChild);

    return () => {
      if (el) el.removeEventListener('scroll', onScroll);
      else window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      ro.disconnect();
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [measure, showThenIdle, isContainer, targetRef, showOnHoverOnly]);

  // Track hover over the container so the bar can show on mouse-over only.
  useEffect(() => {
    if (!showOnHoverOnly) return;
    const el = targetRef?.current;
    if (!el) return;
    const enter = () => setHovered(true);
    const leave = () => setHovered(false);
    el.addEventListener('pointerenter', enter);
    el.addEventListener('pointerleave', leave);
    return () => {
      el.removeEventListener('pointerenter', enter);
      el.removeEventListener('pointerleave', leave);
    };
  }, [showOnHoverOnly, targetRef, scrollable]);

  // Drag the thumb -> map pointer delta to scroll position.
  useEffect(() => {
    if (!dragging) return;

    const onMove = (e: PointerEvent) => {
      const m = getMetrics();
      if (!m) return;
      const measuredTrack = isContainer
        ? m.clientHeight
        : trackRef.current?.clientHeight ?? m.clientHeight;
      const maxScroll = m.scrollHeight - m.clientHeight;
      const maxThumbTop = measuredTrack - thumbHeight;
      if (maxThumbTop <= 0) return;

      const deltaY = e.clientY - dragOrigin.current.pointerY;
      const scrollPerPx = maxScroll / maxThumbTop;
      setScroll(dragOrigin.current.scrollTop + deltaY * scrollPerPx);
    };

    const onUp = () => setDragging(false);

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [dragging, thumbHeight, getMetrics, setScroll, isContainer]);

  const onThumbPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragOrigin.current = {
      pointerY: e.clientY,
      scrollTop: getMetrics()?.scrollTop ?? 0,
    };
    setDragging(true);
    setActive(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
  };

  // Click on the track (outside the thumb) -> page jump toward the click.
  const onTrackPointerDown = (e: React.PointerEvent) => {
    if (e.target !== trackRef.current) return;
    const m = getMetrics();
    if (!m) return;
    const rect = trackRef.current.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const page = m.clientHeight * 0.9;
    const direction = clickY < thumbTop ? -1 : 1;
    setScroll(m.scrollTop + direction * page);
  };

  if (!scrollable) return null;

  const visible = showOnHoverOnly ? hovered || dragging : active || dragging;

  return (
    <div
      ref={trackRef}
      className={`${styles.track} ${isContainer ? styles.trackContainer : ''} ${
        visible ? styles.visible : ''
      }`}
      style={
        isContainer
          ? { top: `${trackTop}px`, height: `${trackHeight}px` }
          : undefined
      }
      onPointerDown={onTrackPointerDown}
      onPointerEnter={() => setActive(true)}
      onPointerLeave={() => !dragging && showThenIdle()}
      aria-hidden="true"
    >
      <div
        className={`${styles.thumb} ${dragging ? styles.thumbDragging : ''}`}
        style={{ height: `${thumbHeight}px`, transform: `translateY(${thumbTop}px)` }}
        onPointerDown={onThumbPointerDown}
      />
    </div>
  );
}
