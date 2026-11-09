import { useRef } from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { useDragScroll } from './useDragScroll';

beforeEach(() => {
  vi.stubGlobal('PointerEvent', class extends MouseEvent {
    pointerId: number;
    pointerType: string;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 1;
      this.pointerType = init.pointerType ?? 'mouse';
    }
  });
});
afterEach(() => { vi.unstubAllGlobals(); });

function Rail({ onOpen }: { onOpen: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useDragScroll(ref);
  return <div ref={ref} role="region" style={{ scrollSnapType: 'x mandatory' }}>
    <a href="/store/collections/clothing" onClick={event => { event.preventDefault(); onOpen(); }}>Clothing</a>
  </div>;
}
function setup() {
  const onOpen = vi.fn();
  const result = render(<Rail onOpen={onOpen} />);
  const rail = screen.getByRole('region');
  Object.defineProperties(rail, { clientWidth: { value: 400 }, scrollWidth: { value: 1400 } });
  rail.setPointerCapture = vi.fn();
  rail.hasPointerCapture = () => true;
  rail.releasePointerCapture = vi.fn();
  return { ...result, rail, link: screen.getByRole('link'), onOpen };
}

it('drags from a card, follows outside the rail, and does not open the dragged card', () => {
  const { rail, link, onOpen } = setup();
  fireEvent.pointerDown(link, { button: 0, pointerId: 7, clientX: 320, clientY: 100 });
  fireEvent.pointerMove(window, { pointerId: 7, clientX: 100, clientY: 104 });
  expect(rail.scrollLeft).toBe(220);
  expect(rail.setPointerCapture).toHaveBeenCalledWith(7);
  expect(rail.style.scrollSnapType).toBe('none');
  fireEvent.pointerMove(window, { pointerId: 7, clientX: -2000 });
  expect(rail.scrollLeft).toBe(1000);
  fireEvent.pointerUp(window, { pointerId: 7 });
  expect(rail.style.scrollSnapType).toBe('x mandatory');
  expect(rail.releasePointerCapture).toHaveBeenCalledWith(7);
  fireEvent.click(link, { detail: 1 });
  expect(onOpen).not.toHaveBeenCalled();
  fireEvent.pointerDown(link, { button: 0, clientX: 50 });
  fireEvent.pointerUp(window);
  fireEvent.click(link, { detail: 1 });
  expect(onOpen).toHaveBeenCalledOnce();
});

it('allows ordinary taps, tiny pointer movement and keyboard activation', () => {
  const { rail, link, onOpen } = setup();
  fireEvent.pointerDown(link, { button: 0, clientX: 100 });
  fireEvent.pointerMove(window, { clientX: 103 });
  fireEvent.pointerUp(window);
  fireEvent.click(link, { detail: 1 });
  fireEvent.click(link, { detail: 0 });
  expect(onOpen).toHaveBeenCalledTimes(2);
  expect(rail.setPointerCapture).not.toHaveBeenCalled();
});

it('leaves touch scrolling and modified mouse clicks to the browser', () => {
  const { rail, link } = setup();
  for (const options of [{ pointerType: 'touch' }, { ctrlKey: true }, { button: 2 }]) {
    fireEvent.pointerDown(link, { button: 0, clientX: 300, ...options });
    fireEvent.pointerMove(window, { clientX: 100 });
    fireEvent.pointerUp(window);
  }
  expect(rail.scrollLeft).toBe(0);
  expect(rail.setPointerCapture).not.toHaveBeenCalled();
});

it('ignores unrelated pointers and ends a canceled drag', () => {
  const { rail, link, unmount } = setup();
  fireEvent.pointerDown(link, { button: 0, pointerId: 4, clientX: 300 });
  fireEvent.pointerMove(window, { pointerId: 9, clientX: 100 });
  expect(rail.scrollLeft).toBe(0);
  fireEvent.pointerMove(window, { pointerId: 4, clientX: 100 });
  fireEvent.pointerCancel(window, { pointerId: 4 });
  fireEvent.pointerMove(window, { pointerId: 4, clientX: 0 });
  expect(rail.scrollLeft).toBe(200);
  expect(rail.dataset.dragging).toBeUndefined();
  expect(rail.style.scrollSnapType).toBe('x mandatory');
  unmount();
  fireEvent.pointerMove(window, { pointerId: 4, clientX: -100 });
  expect(rail.scrollLeft).toBe(200);
});
