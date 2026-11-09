import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PackCategoryRow } from './OriginalsBrowse';

vi.mock('@/sites/wilderworld/marketplace/Marketplace', () => ({ MarketHeader: () => null }));

let reducedMotion = false;
const observers: Array<{ callback: () => void; observe: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }> = [];
beforeEach(() => {
  reducedMotion = false;
  observers.length = 0;
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: reducedMotion })));
  vi.stubGlobal('ResizeObserver', class {
    observe = vi.fn();
    disconnect = vi.fn();
    constructor(public callback: () => void) { observers.push(this); }
  });
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

function measure(row: HTMLElement, initialWidth = 300, initialContent = 1000) {
  const size = { width: initialWidth, content: initialContent };
  Object.defineProperties(row, {
    clientWidth: { get: () => size.width },
    scrollWidth: { get: () => size.content },
  });
  row.getBoundingClientRect = () => ({ left: 100, right: 100 + size.width, width: size.width } as DOMRect);
  const scroll = vi.fn((optionsOrX?: ScrollToOptions | number, _y?: number) => {
    const left = typeof optionsOrX === 'number' ? optionsOrX : optionsOrX?.left ?? row.scrollLeft;
    row.scrollLeft = Math.max(0, Math.min(left, size.content - size.width));
    fireEvent.scroll(row);
  });
  row.scrollTo = scroll;
  for (const [index, button] of [...row.querySelectorAll('button')].entries()) {
    button.getBoundingClientRect = () => ({ left: 104 + index * 400 - row.scrollLeft, right: 204 + index * 400 - row.scrollLeft, width: 100 } as DOMRect);
  }
  return { size, scroll };
}

function Choices({ selected = -1 }: { selected?: number }) {
  return <>{['All types', 'Scopes', 'Stocks'].map((label, index) => <button key={label} aria-pressed={selected === index}>{label}</button>)}</>;
}

describe('Packs category row scrolling', () => {
  it('pages horizontally in both directions, clamps at each edge and follows native touch/trackpad scrolling', () => {
    render(<PackCategoryRow label="Item subtype" revealKey="all"><Choices/></PackCategoryRow>);
    const row = screen.getByRole('group', { name: 'Item subtype' });
    const { scroll } = measure(row);
    const previous = screen.getByRole('button', { name: 'Scroll item subtype left' });
    const next = screen.getByRole('button', { name: 'Scroll item subtype right' });
    fireEvent.resize(window);
    expect(previous).toBeDisabled();
    expect(next).toBeEnabled();
    expect(next).toHaveAttribute('aria-controls', row.id);
    fireEvent.click(next);
    expect(scroll).toHaveBeenLastCalledWith({ left: 240, behavior: 'smooth' });
    expect(previous).toBeEnabled();
    fireEvent.click(next);
    fireEvent.click(next);
    expect(row.scrollLeft).toBe(700);
    expect(next).toBeDisabled();
    fireEvent.click(previous);
    expect(row.scrollLeft).toBe(460);
    row.scrollLeft = 0;
    fireEvent.scroll(row);
    expect(previous).toBeDisabled();
    expect(next).toBeEnabled();
  });

  it('disables both arrows when everything fits and recalculates after layout/font changes', () => {
    render(<PackCategoryRow label="System" revealKey="all"><Choices/></PackCategoryRow>);
    const row = screen.getByRole('group');
    const { size } = measure(row, 1200, 1000);
    act(() => observers[0].callback());
    expect(screen.getByRole('button', { name: 'Scroll system left' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Scroll system right' })).toBeDisabled();
    size.width = 300;
    act(() => observers[0].callback());
    expect(screen.getByRole('button', { name: 'Scroll system right' })).toBeEnabled();
    expect(observers[0].observe).toHaveBeenCalledWith(row);
    expect(observers[0].observe).toHaveBeenCalledWith(within(row).getByRole('button', { name: 'Stocks' }));
  });

  it('reveals changed selections and route state without scrolling the page or stealing focus', () => {
    const { rerender } = render(<PackCategoryRow label="Item subtype" revealKey="weapons"><Choices/></PackCategoryRow>);
    const row = screen.getByRole('group');
    const { scroll } = measure(row, 300, 1200);
    const selected = within(row).getByRole('button', { name: 'Stocks' });
    selected.scrollIntoView = vi.fn();
    const pageScroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    const first = within(row).getByRole('button', { name: 'All types' });
    first.focus();
    rerender(<PackCategoryRow label="Item subtype" revealKey="weapons:stocks"><Choices selected={2}/></PackCategoryRow>);
    expect(row.scrollLeft).toBe(608);
    expect(scroll).toHaveBeenLastCalledWith({ left: 608, behavior: 'instant' });
    expect(first).toHaveFocus();
    expect(selected.scrollIntoView).not.toHaveBeenCalled();
    expect(pageScroll).not.toHaveBeenCalled();
    rerender(<PackCategoryRow label="Item subtype" revealKey="wheels:all"><Choices selected={0}/></PackCategoryRow>);
    expect(row.scrollLeft).toBe(0);
    expect(within(row).getByRole('button', { name: 'All types' })).toHaveAttribute('aria-pressed', 'true');
    scroll.mockClear();
    fireEvent.resize(window);
    expect(scroll).not.toHaveBeenCalled();
  });

  it('supports keyboard activation and respects reduced motion', async () => {
    reducedMotion = true;
    const user = userEvent.setup();
    render(<PackCategoryRow label="Armor collection" revealKey="gear"><Choices/></PackCategoryRow>);
    const { scroll } = measure(screen.getByRole('group'));
    fireEvent.resize(window);
    const next = screen.getByRole('button', { name: 'Scroll armor collection right' });
    next.focus();
    await user.keyboard('{Enter}');
    expect(scroll).toHaveBeenCalledWith({ left: 240, behavior: 'instant' });
    expect(next).toHaveAttribute('type', 'button');
  });

  it('keeps the primary and subtype rows independent and disconnects observers on unmount', () => {
    const { unmount } = render(<>
      <PackCategoryRow label="System" revealKey="wheels"><Choices/></PackCategoryRow>
      <PackCategoryRow label="Item subtype" revealKey="engine" secondary><Choices/></PackCategoryRow>
    </>);
    const primary = screen.getByRole('group', { name: 'System' });
    const secondary = screen.getByRole('group', { name: 'Item subtype' });
    measure(primary); measure(secondary);
    fireEvent.resize(window);
    fireEvent.click(screen.getByRole('button', { name: 'Scroll item subtype right' }));
    expect(secondary.scrollLeft).toBe(240);
    expect(primary.scrollLeft).toBe(0);
    expect(screen.getByRole('button', { name: 'Scroll system left' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Scroll item subtype left' })).toBeEnabled();
    expect(primary.id).not.toBe(secondary.id);
    unmount();
    expect(observers.every(observer => observer.disconnect.mock.calls.length === 1)).toBe(true);
  });
});
