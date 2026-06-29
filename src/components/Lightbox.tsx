'use client';

import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import styles from './Lightbox.module.css';

export interface LightboxSlide {
  src: string;
  alt: string;
}

interface LightboxProps {
  slides: LightboxSlide[];
  currentIndex: number;
  originRect: DOMRect;
  originEl?: HTMLElement;
  onClose: () => void;
}

const WHEEL_DISMISS_THRESHOLD = 150;
const TOUCH_DISMISS_THRESHOLD = 100;
const SNAP_BACK_DELAY = 300;

function dragProgress(absDrag: number, threshold: number) {
  const t = Math.min(absDrag / threshold, 1);
  return { scale: 1 - t * 0.12, bgOpacity: 0.92 * (1 - t * 0.5) };
}

export function Lightbox({ slides, currentIndex, originRect, originEl, onClose }: LightboxProps) {
  const [phase, setPhase] = useState<'enter' | 'open' | 'exit'>('enter');
  const [activeIndex, setActiveIndex] = useState(currentIndex);
  const imgRef = useRef<HTMLImageElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const dragY = useRef(0);
  const closingRef = useRef(false);
  const snapBackTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const activeSlide = slides[activeIndex];
  const hasPrev = activeIndex > 0;
  const hasNext = activeIndex < slides.length - 1;
  const showNav = slides.length > 1;

  const goTo = useCallback((index: number) => {
    if (closingRef.current) return;
    const clamped = Math.max(0, Math.min(index, slides.length - 1));
    if (clamped === activeIndex) return;
    setActiveIndex(clamped);
  }, [activeIndex, slides.length]);

  const close = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    dragY.current = 0;
    setPhase('exit');
  }, []);

  useEffect(() => {
    if (phase === 'enter') {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setPhase('open'));
      });
    }
  }, [phase]);

  const exitRectRef = useRef<DOMRect>(originRect);

  useLayoutEffect(() => {
    if (phase !== 'exit') return;
    if (originEl) {
      exitRectRef.current = originEl.getBoundingClientRect();
    }
    const img = imgRef.current;
    const overlay = overlayRef.current;
    if (img) {
      img.style.transition = '';
      img.style.transform = '';
    }
    if (overlay) {
      overlay.style.transition = '';
      overlay.style.background = '';
    }
  }, [phase, originEl]);

  useEffect(() => {
    const SCROLL_KEYS = new Set(['Space', 'PageUp', 'PageDown', 'Home', 'End', 'ArrowUp', 'ArrowDown']);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(activeIndex - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); goTo(activeIndex + 1); }
      if (SCROLL_KEYS.has(e.code)) e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close, goTo, activeIndex]);

  useEffect(() => {
    if (phase !== 'exit') return;
    const timer = setTimeout(() => onCloseRef.current(), 500);
    return () => clearTimeout(timer);
  }, [phase]);

  const applyDrag = useCallback((dy: number, threshold: number) => {
    const img = imgRef.current;
    const overlay = overlayRef.current;
    if (!img || !overlay) return;

    img.style.transition = 'none';
    overlay.style.transition = 'none';

    const { scale, bgOpacity } = dragProgress(Math.abs(dy), threshold);
    img.style.transform = `translateY(${dy}px) scale(${scale})`;
    overlay.style.background = `rgba(0, 0, 0, ${bgOpacity})`;
  }, []);

  const gestureDismiss = useCallback((direction: number) => {
    if (closingRef.current) return;
    closingRef.current = true;
    clearTimeout(snapBackTimer.current);

    const img = imgRef.current;
    const overlay = overlayRef.current;
    if (!img || !overlay) {
      onCloseRef.current();
      return;
    }

    img.style.transition = 'transform 250ms ease-out, opacity 250ms ease-out';
    overlay.style.transition = 'background 250ms ease-out';

    requestAnimationFrame(() => {
      img.style.transform = `translateY(${direction * window.innerHeight * 0.5}px) scale(0.75)`;
      img.style.opacity = '0';
      overlay.style.background = 'rgba(0, 0, 0, 0)';
    });

    setTimeout(() => onCloseRef.current(), 300);
  }, []);

  const snapBack = useCallback(() => {
    if (closingRef.current) return;
    const img = imgRef.current;
    const overlay = overlayRef.current;
    if (!img || !overlay) return;

    img.style.transition = 'transform 300ms cubic-bezier(0.25, 1, 0.5, 1)';
    overlay.style.transition = 'background 300ms cubic-bezier(0.25, 1, 0.5, 1)';
    img.style.transform = '';
    overlay.style.background = '';

    img.addEventListener('transitionend', () => {
      img.style.transition = '';
      overlay.style.transition = '';
    }, { once: true });
    dragY.current = 0;
  }, []);

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (phase !== 'open' || closingRef.current) return;

      clearTimeout(snapBackTimer.current);
      dragY.current += e.deltaY;

      applyDrag(dragY.current, WHEEL_DISMISS_THRESHOLD);

      if (Math.abs(dragY.current) > WHEEL_DISMISS_THRESHOLD) {
        gestureDismiss(dragY.current > 0 ? 1 : -1);
      } else {
        snapBackTimer.current = setTimeout(snapBack, SNAP_BACK_DELAY);
      }
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      window.removeEventListener('wheel', onWheel);
      clearTimeout(snapBackTimer.current);
    };
  }, [phase, applyDrag, gestureDismiss, snapBack]);

  useEffect(() => {
    if (phase !== 'open') return;

    let touchStartX = 0;
    let touchStartY = 0;
    let lastTouchX = 0;
    let axis: 'x' | 'y' | null = null;

    const onTouchStart = (e: TouchEvent) => {
      if (closingRef.current) return;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      lastTouchX = touchStartX;
      dragY.current = 0;
      axis = null;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (closingRef.current) return;
      e.preventDefault();
      const dx = e.touches[0].clientX - touchStartX;
      const dy = e.touches[0].clientY - touchStartY;
      lastTouchX = e.touches[0].clientX;

      if (!axis) {
        if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
          axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
        }
        return;
      }

      if (axis === 'y') {
        dragY.current = dy;
        applyDrag(dragY.current, TOUCH_DISMISS_THRESHOLD);
      }
    };

    const SWIPE_THRESHOLD = 50;

    const onTouchEnd = () => {
      if (closingRef.current) return;

      if (axis === 'x') {
        const swipeDx = lastTouchX - touchStartX;
        if (Math.abs(swipeDx) > SWIPE_THRESHOLD) {
          setActiveIndex((prev) => {
            const next = swipeDx < 0 ? prev + 1 : prev - 1;
            return Math.max(0, Math.min(next, slides.length - 1));
          });
        }
      }

      if (axis === 'y') {
        if (Math.abs(dragY.current) > TOUCH_DISMISS_THRESHOLD) {
          gestureDismiss(dragY.current > 0 ? 1 : -1);
        } else {
          snapBack();
        }
      }

      axis = null;
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [phase, applyDrag, gestureDismiss, snapBack]);

  const handleTransitionEnd = (e: React.TransitionEvent) => {
    if (phase === 'exit' && e.target === overlayRef.current) {
      onClose();
    }
  };

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const padding = 40;
  const maxW = vw - padding * 2;
  const maxH = vh - padding * 2;

  const imgAspect = originRect.width / originRect.height;
  let finalW: number;
  let finalH: number;
  if (maxW / maxH > imgAspect) {
    finalH = maxH;
    finalW = finalH * imgAspect;
  } else {
    finalW = maxW;
    finalH = finalW / imgAspect;
  }

  const openStyle = {
    left: (vw - finalW) / 2,
    top: (vh - finalH) / 2,
    width: finalW,
    height: finalH,
  };

  const exitRect = exitRectRef.current;
  const targetRect = phase === 'exit' ? exitRect : originRect;

  const imgStyle = phase === 'open'
    ? openStyle
    : { left: targetRect.left, top: targetRect.top, width: targetRect.width, height: targetRect.height };

  return createPortal(
    <div
      ref={overlayRef}
      className={`${styles.overlay} ${phase === 'open' ? styles.overlayVisible : ''}`}
      onClick={close}
      onTransitionEnd={handleTransitionEnd}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={activeSlide.src}
        alt={activeSlide.alt}
        className={`${styles.image} ${phase === 'exit' ? styles.imageExiting : ''}`}
        style={{
          left: imgStyle.left,
          top: imgStyle.top,
          width: imgStyle.width,
          height: imgStyle.height,
        }}
        onClick={(e) => {
          e.stopPropagation();
          close();
        }}
      />

      {showNav && phase === 'open' && (
        <>
          <button
            className={`${styles.navArrow} ${styles.navPrev} ${!hasPrev ? styles.navDisabled : ''}`}
            onClick={(e) => { e.stopPropagation(); goTo(activeIndex - 1); }}
            aria-label="Previous image"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M15 5L8 12L15 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            className={`${styles.navArrow} ${styles.navNext} ${!hasNext ? styles.navDisabled : ''}`}
            onClick={(e) => { e.stopPropagation(); goTo(activeIndex + 1); }}
            aria-label="Next image"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M9 5L16 12L9 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className={styles.counter}>
            {activeIndex + 1} / {slides.length}
          </div>
        </>
      )}
    </div>,
    document.body,
  );
}
