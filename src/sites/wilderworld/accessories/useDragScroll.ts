'use client';

import { useEffect, type RefObject } from 'react';

/** Mouse/pen dragging complements the rail's native touch and keyboard scroll. */
export function useDragScroll(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const rail = ref.current;
    if (!rail) return;
    let gesture: { id: number; x: number; y: number; left: number; dragged: boolean } | null = null;
    let suppressClick = false;
    let previousSnap = '';

    const finish = (event?: PointerEvent) => {
      if (!gesture || (event && event.pointerId !== gesture.id)) return;
      const { id, dragged } = gesture;
      gesture = null;
      suppressClick = dragged;
      if (dragged) {
        delete rail.dataset.dragging;
        rail.style.scrollSnapType = previousSnap;
      }
      if (rail.hasPointerCapture?.(id)) rail.releasePointerCapture(id);
    };
    const start = (event: PointerEvent) => {
      if (gesture || event.button !== 0 || event.isPrimary === false || event.pointerType === 'touch' || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
      suppressClick = false;
      gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, left: rail.scrollLeft, dragged: false };
    };
    const move = (event: PointerEvent) => {
      if (!gesture || event.pointerId !== gesture.id) return;
      const dx = event.clientX - gesture.x;
      if (!gesture.dragged) {
        if (Math.abs(dx) < 6 || Math.abs(dx) < Math.abs(event.clientY - gesture.y)) return;
        gesture.dragged = true;
        previousSnap = rail.style.scrollSnapType;
        rail.style.scrollSnapType = 'none';
        rail.dataset.dragging = 'true';
        rail.setPointerCapture?.(gesture.id);
      }
      event.preventDefault();
      rail.scrollLeft = Math.max(0, Math.min(gesture.left - dx, rail.scrollWidth - rail.clientWidth));
    };
    const click = (event: MouseEvent) => {
      if (!suppressClick || event.detail === 0) return;
      event.preventDefault();
      event.stopPropagation();
      suppressClick = false;
    };
    const preventNativeDrag = (event: DragEvent) => event.preventDefault();
    const blur = () => finish();
    const lostCapture = (event: PointerEvent) => { if (event.target === rail) finish(event); };

    rail.addEventListener('pointerdown', start);
    rail.addEventListener('click', click, true);
    rail.addEventListener('dragstart', preventNativeDrag);
    rail.addEventListener('lostpointercapture', lostCapture);
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', finish);
    window.addEventListener('blur', blur);
    return () => {
      finish();
      rail.removeEventListener('pointerdown', start);
      rail.removeEventListener('click', click, true);
      rail.removeEventListener('dragstart', preventNativeDrag);
      rail.removeEventListener('lostpointercapture', lostCapture);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
      window.removeEventListener('blur', blur);
    };
  }, [ref]);
}
