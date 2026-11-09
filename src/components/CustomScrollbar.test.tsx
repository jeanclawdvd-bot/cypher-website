import { createRef } from 'react';
import { render, fireEvent } from '@testing-library/react';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { CustomScrollbar } from './CustomScrollbar';

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('PointerEvent', class extends MouseEvent {
    pointerId: number;
    constructor(type: string, init: PointerEventInit = {}) { super(type, init); this.pointerId = init.pointerId ?? 1; }
  });
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(600);
  vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockReturnValue(2000);
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('drags the page immediately and clamps at its end', () => {
  const { container } = render(<CustomScrollbar />);
  const thumb = container.querySelector('[data-scrollbar-thumb]') as HTMLElement;
  thumb.setPointerCapture = vi.fn();
  thumb.hasPointerCapture = () => true;
  thumb.releasePointerCapture = vi.fn();
  fireEvent.pointerDown(thumb, { button: 0, pointerId: 7, clientY: 40 });
  expect(thumb.setPointerCapture).toHaveBeenCalledWith(7);
  fireEvent.pointerMove(window, { pointerId: 7, clientY: 166 });
  expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 420, behavior: 'instant' });
  fireEvent.pointerMove(window, { pointerId: 7, clientY: 5000 });
  expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 1400, behavior: 'instant' });
  fireEvent.pointerUp(window, { pointerId: 7 });
  expect(thumb.releasePointerCapture).toHaveBeenCalledWith(7);
  expect(document.body.style.userSelect).not.toBe('none');
});

it('stops dragging on cancellation and ignores other pointers', () => {
  const { container } = render(<CustomScrollbar />);
  const thumb = container.querySelector('[data-scrollbar-thumb]')!;
  fireEvent.pointerDown(thumb, { button: 0, pointerId: 4, clientY: 20 });
  fireEvent.pointerMove(window, { pointerId: 9, clientY: 200 });
  expect(window.scrollTo).not.toHaveBeenCalled();
  fireEvent.pointerCancel(window, { pointerId: 4 });
  fireEvent.pointerMove(window, { pointerId: 4, clientY: 200 });
  expect(window.scrollTo).not.toHaveBeenCalled();
  expect(document.body.style.userSelect).not.toBe('none');
});

it('moves its own panel instead of the page in container mode', () => {
  const target = document.createElement('div');
  Object.defineProperty(target, 'scrollHeight', { value: 1800 });
  target.scrollTo = vi.fn();
  const ref = createRef<HTMLElement>(); ref.current = target;
  const { container } = render(<CustomScrollbar targetRef={ref} />);
  const thumb = container.querySelector('[data-scrollbar-thumb]')!;
  fireEvent.pointerDown(thumb, { button: 0, pointerId: 1, clientY: 20 });
  fireEvent.pointerMove(window, { pointerId: 1, clientY: 120 });
  expect(target.scrollTo).toHaveBeenLastCalledWith({ top: 300, behavior: 'instant' });
  expect(window.scrollTo).not.toHaveBeenCalled();
  fireEvent.pointerUp(window, { pointerId: 1 });
});
