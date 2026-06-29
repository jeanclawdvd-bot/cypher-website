'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { Lightbox } from './Lightbox';
import type { LightboxSlide } from './Lightbox';
import styles from './ImageCarousel.module.css';

export interface CarouselSlide {
  src?: string;
  alt?: string;
  title?: string;
  description?: string;
}

interface ImageCarouselProps {
  slides: CarouselSlide[];
  className?: string;
  sizes?: string;
  unoptimized?: boolean;
}

interface LightboxState {
  imageIndex: number;
  rect: DOMRect;
  originEl: HTMLElement;
}

export function ImageCarousel({ slides, className, sizes, unoptimized }: ImageCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);
  const dragRef = useRef({ isDown: false, startX: 0, scrollStart: 0, startIdx: 0, hasDragged: false });
  const wheelCooldownRef = useRef(false);
  const wheelTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const snapTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const getSlideIndex = useCallback(() => {
    const el = trackRef.current;
    if (!el) return 0;
    const slideEls = el.querySelectorAll<HTMLElement>(`.${styles.slide}`);
    let nearest = 0;
    let minDist = Infinity;
    slideEls.forEach((s, i) => {
      const dist = Math.abs(el.scrollLeft - s.offsetLeft);
      if (dist < minDist) { minDist = dist; nearest = i; }
    });
    return nearest;
  }, []);

  const scrollToSlide = useCallback((index: number, restoreSnap = false) => {
    const el = trackRef.current;
    if (!el) return;
    const slideEls = el.querySelectorAll<HTMLElement>(`.${styles.slide}`);
    const clamped = Math.max(0, Math.min(index, slideEls.length - 1));
    const target = slideEls[clamped];
    if (!target) return;

    el.scrollTo({ left: target.offsetLeft, behavior: 'smooth' });

    if (restoreSnap) {
      clearTimeout(snapTimerRef.current);
      const onEnd = () => {
        el.style.scrollSnapType = '';
        el.removeEventListener('scrollend', onEnd);
        clearTimeout(snapTimerRef.current);
      };
      el.addEventListener('scrollend', onEnd, { once: true });
      snapTimerRef.current = setTimeout(onEnd, 400);
    }
  }, []);

  const updateScrollState = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [updateScrollState]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const drag = dragRef.current;

    const onMouseDown = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('button')) return;
      drag.isDown = true;
      drag.startX = e.clientX;
      drag.scrollStart = el.scrollLeft;
      drag.startIdx = getSlideIndex();
      drag.hasDragged = false;
      el.style.scrollSnapType = 'none';
      el.style.userSelect = 'none';
      el.classList.add(styles.dragging);
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!drag.isDown) return;
      e.preventDefault();
      const dx = e.clientX - drag.startX;
      if (Math.abs(dx) > 3) drag.hasDragged = true;
      el.scrollLeft = drag.scrollStart - dx;
    };

    const onMouseUp = () => {
      if (!drag.isDown) return;
      drag.isDown = false;
      el.style.userSelect = '';
      el.classList.remove(styles.dragging);

      if (drag.hasDragged) {
        const dx = el.scrollLeft - drag.scrollStart;
        const slideEls = el.querySelectorAll<HTMLElement>(`.${styles.slide}`);
        const threshold = (slideEls[0]?.clientWidth ?? 320) * 0.15;
        let targetIdx: number;
        if (Math.abs(dx) > threshold) {
          targetIdx = dx > 0 ? drag.startIdx + 1 : drag.startIdx - 1;
        } else {
          targetIdx = drag.startIdx;
        }
        targetIdx = Math.max(0, Math.min(targetIdx, slideEls.length - 1));
        scrollToSlide(targetIdx, true);
      } else {
        el.style.scrollSnapType = '';
      }
    };

    const onClickCapture = (e: MouseEvent) => {
      if (drag.hasDragged) {
        e.stopPropagation();
        e.preventDefault();
        drag.hasDragged = false;
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      if (wheelCooldownRef.current) return;
      wheelCooldownRef.current = true;
      const currentIdx = getSlideIndex();
      scrollToSlide(e.deltaX > 0 ? currentIdx + 1 : currentIdx - 1);
      clearTimeout(wheelTimerRef.current);
      wheelTimerRef.current = setTimeout(() => {
        wheelCooldownRef.current = false;
      }, 500);
    };

    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    el.addEventListener('click', onClickCapture, { capture: true });
    el.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      el.removeEventListener('click', onClickCapture, { capture: true });
      el.removeEventListener('wheel', onWheel);
      el.classList.remove(styles.dragging);
      clearTimeout(wheelTimerRef.current);
      clearTimeout(snapTimerRef.current);
    };
  }, [getSlideIndex, scrollToSlide]);

  const scroll = useCallback((direction: 'left' | 'right') => {
    const currentIdx = getSlideIndex();
    scrollToSlide(direction === 'left' ? currentIdx - 1 : currentIdx + 1);
  }, [getSlideIndex, scrollToSlide]);

  const imageSlides: LightboxSlide[] = slides
    .filter((s): s is CarouselSlide & { src: string } => !!s.src)
    .map((s) => ({ src: s.src, alt: s.alt ?? '' }));

  const imageIndexMap = new Map<number, number>();
  let imgIdx = 0;
  for (let i = 0; i < slides.length; i++) {
    if (slides[i].src) {
      imageIndexMap.set(i, imgIdx);
      imgIdx++;
    }
  }

  return (
    <div className={`${styles.carousel} ${className ?? ''}`}>
      <div className={styles.track} ref={trackRef}>
        {slides.map((slide, i) => (
          <div key={i} className={styles.slide}>
            <div
              className={`${styles.imageWrap} ${slide.src ? styles.imageClickable : ''}`}
              onClick={(e) => {
                if (!slide.src) return;
                const el = e.currentTarget as HTMLElement;
                const rect = el.getBoundingClientRect();
                const lbIndex = imageIndexMap.get(i) ?? 0;
                setLightbox({ imageIndex: lbIndex, rect, originEl: el });
              }}
            >
              {slide.src ? (
                <Image
                  src={slide.src}
                  alt={slide.alt ?? ''}
                  fill
                  sizes={sizes ?? '(max-width: 640px) 80vw, 340px'}
                  quality={100}
                  unoptimized={unoptimized}
                  className={styles.image}
                />
              ) : (
                <div className={styles.placeholder} />
              )}
            </div>
            {(slide.title || slide.description) && (
              <div className={styles.caption}>
                <p className={styles.title}>
                  {slide.title && <strong>{slide.title}</strong>}{' '}
                  {slide.description && (
                    <span className={styles.description}>
                      {slide.description}
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className={styles.arrows}>
        <button
          className={`${styles.arrow} ${!canScrollLeft ? styles.arrowDisabled : ''}`}
          onClick={() => scroll('left')}
          aria-label="Scroll left"
          tabIndex={-1}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          className={`${styles.arrow} ${!canScrollRight ? styles.arrowDisabled : ''}`}
          onClick={() => scroll('right')}
          aria-label="Scroll right"
          tabIndex={-1}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {lightbox && (
        <Lightbox
          slides={imageSlides}
          currentIndex={lightbox.imageIndex}
          originRect={lightbox.rect}
          originEl={lightbox.originEl}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}
