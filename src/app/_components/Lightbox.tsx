'use client';

import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import styles from './Lightbox.module.css';

interface LightboxProps {
  src: string;
  alt: string;
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

export function Lightbox({ src, alt, originRect, originEl, onClose }: LightboxProps) {
  const [phase, setPhase] = useState<'enter' | 'open' | 'exit'>('enter');
  const imgRef = useRef<HTMLImageElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const dragY = useRef(0);
  const closingRef = useRef(false);
  const snapBackTimer = useRef<ReturnType<typeof setTimeout>>();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

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

  // Clear gesture inline styles so CSS transitions drive the exit animation
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
      if (SCROLL_KEYS.has(e.code)) e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

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

  // Wheel: block background scroll + dismiss gesture when open
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

  // Touch dismiss gesture
  useEffect(() => {
    if (phase !== 'open') return;

    let touchStartY = 0;

    const onTouchStart = (e: TouchEvent) => {
      if (closingRef.current) return;
      touchStartY = e.touches[0].clientY;
      dragY.current = 0;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (closingRef.current) return;
      e.preventDefault();
      dragY.current = e.touches[0].clientY - touchStartY;
      applyDrag(dragY.current, TOUCH_DISMISS_THRESHOLD);
    };

    const onTouchEnd = () => {
      if (closingRef.current) return;
      if (Math.abs(dragY.current) > TOUCH_DISMISS_THRESHOLD) {
        gestureDismiss(dragY.current > 0 ? 1 : -1);
      } else {
        snapBack();
      }
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
        src={src}
        alt={alt}
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
    </div>,
    document.body,
  );
}
