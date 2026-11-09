import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SearchDepartmentSelect from './SearchDepartmentSelect';
import { MarketHeader } from './Marketplace';

const navigation = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => navigation, usePathname: () => '/store' }));
beforeEach(() => navigation.push.mockClear());

const options = [
  { value: 'all', label: 'All products' },
  { value: 'vehicles', label: 'Vehicles' },
  { value: 'rims', label: 'Rims' },
  { value: 'existing', label: 'Originals' },
];

function SelectHarness() {
  const [value, setValue] = useState('all');
  return <form aria-label="Search"><SearchDepartmentSelect value={value} options={options} onChange={setValue}/><input aria-label="Search products"/></form>;
}

describe('shopping search department dropdown', () => {
  it('selects a department without submitting and preserves it in form data', async () => {
    const user = userEvent.setup();
    render(<SelectHarness/>);
    const trigger = screen.getByRole('combobox', { name: 'Search department' });
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('option', { name: 'All products' })).toHaveAttribute('aria-selected', 'true');
    await user.click(screen.getByRole('option', { name: 'Rims' }));
    expect(trigger).toHaveTextContent('Rims');
    expect(trigger).toHaveFocus();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(new FormData(screen.getByRole('form', { name: 'Search' }) as HTMLFormElement).get('department')).toBe('rims');
  });

  it('supports arrow keys, Home/End, typeahead and selection without changing the value on Escape', async () => {
    const user = userEvent.setup();
    render(<SelectHarness/>);
    const trigger = screen.getByRole('combobox', { name: 'Search department' });
    trigger.focus();
    await user.keyboard('{ArrowDown}{End}');
    expect(trigger).toHaveAttribute('aria-activedescendant', screen.getByRole('option', { name: 'Originals' }).id);
    await user.keyboard('{Home}{ArrowDown}{Enter}');
    expect(trigger).toHaveTextContent('Vehicles');
    await user.keyboard('r');
    expect(trigger).toHaveAttribute('aria-activedescendant', screen.getByRole('option', { name: 'Rims' }).id);
    await user.keyboard('{Escape}');
    expect(trigger).toHaveTextContent('Vehicles');
    expect(trigger).toHaveFocus();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    await user.keyboard('r{Enter}');
    expect(trigger).toHaveTextContent('Rims');
  });

  it('dismisses on outside pointer input and Tab without trapping keyboard focus', async () => {
    const user = userEvent.setup();
    render(<SelectHarness/>);
    const trigger = screen.getByRole('combobox', { name: 'Search department' });
    await user.click(trigger);
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    await user.click(trigger);
    await user.tab();
    expect(screen.getByRole('textbox', { name: 'Search products' })).toHaveFocus();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('retains the search text, changes the correct form destination and follows navigation state', async () => {
    const user = userEvent.setup();
    const onQueryChange = vi.fn();
    const { rerender } = render(<MarketHeader query="chrome" department="rims" onQueryChange={onQueryChange}/>);
    await user.click(screen.getByRole('combobox', { name: 'Search department' }));
    await user.click(screen.getByRole('option', { name: 'Originals' }));
    expect(screen.getByRole('search')).toHaveAttribute('action', '/store/market');
    expect(screen.getByRole('searchbox', { name: 'Search products' })).toHaveValue('chrome');
    expect(onQueryChange).not.toHaveBeenCalled();
    rerender(<MarketHeader query="sofa" department="furniture" onQueryChange={onQueryChange}/>);
    expect(screen.getByRole('combobox', { name: 'Search department' })).toHaveTextContent('Furniture');
    expect(screen.getByRole('search')).toHaveAttribute('action', '/store/browse');
    const data = new FormData(screen.getByRole('search') as HTMLFormElement);
    expect(data.get('department')).toBe('furniture');
    expect(data.get('q')).toBe('sofa');
    fireEvent.submit(screen.getByRole('search'));
    expect(onQueryChange).toHaveBeenCalledWith('sofa');
    expect(navigation.push).not.toHaveBeenCalled();
  });

  it('uses client navigation for a changed search scope without reloading or clearing the current search', async () => {
    const user = userEvent.setup();
    const onQueryChange = vi.fn();
    render(<MarketHeader query="silver & chrome" department="clothing" onQueryChange={onQueryChange}/>);
    await user.click(screen.getByRole('combobox', { name: 'Search department' }));
    await user.click(screen.getByRole('option', { name: 'Rims' }));
    expect(navigation.push).not.toHaveBeenCalled();
    const submit = new Event('submit', { bubbles: true, cancelable: true });
    fireEvent(screen.getByRole('search'), submit);
    expect(submit.defaultPrevented).toBe(true);
    expect(navigation.push).toHaveBeenCalledWith('/store/browse?department=rims&q=silver+%26+chrome');
    expect(onQueryChange).not.toHaveBeenCalled();
    expect(screen.getByRole('searchbox')).toHaveValue('silver & chrome');
  });

  it('uses client navigation from home and retains the original collection when searching its product page', () => {
    const { rerender } = render(<MarketHeader query="hat"/>);
    fireEvent.submit(screen.getByRole('search'));
    expect(navigation.push).toHaveBeenLastCalledWith('/store/browse?q=hat');
    rerender(<MarketHeader department="existing" collectionSlug="wilderworld" query="12"/>);
    fireEvent.submit(screen.getByRole('search'));
    expect(navigation.push).toHaveBeenLastCalledWith('/store/market?c=wilderworld&q=12');
  });

  it('keeps a single shopping rail and uses a category placeholder for unfiltered search', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<MarketHeader/>);
    expect(screen.getByRole('combobox')).toHaveTextContent('Categories');
    const primary = within(screen.getByRole('navigation', { name: 'Shopping navigation' }));
    expect(primary.getAllByRole('link')).toHaveLength(14);
    expect(primary.queryByRole('link', { name: /original/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Genesis collection navigation' })).not.toBeInTheDocument();
    const packs = primary.getAllByRole('link').slice(-4);
    expect(packs.map(link => link.textContent)).toEqual(['Packs', 'Weapons', 'Mods', 'Gear']);
    expect(packs.map(link => new URL(link.getAttribute('href')!, 'http://localhost').searchParams.get('c'))).toEqual(['packs', 'pack-weapons', 'pack-wheels', 'pack-avatars']);
    await user.click(screen.getByRole('combobox'));
    expect(screen.getByRole('option', { name: 'Originals' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'All products' })).not.toBeInTheDocument();
    expect(screen.queryByText('New collections')).not.toBeInTheDocument();
    expect(screen.queryByText('Existing collections')).not.toBeInTheDocument();
    rerender(<MarketHeader department="existing" collectionSlug="pack-weapons"/>);
    expect(primary.getByRole('link', { name: 'Weapons' })).toHaveAttribute('aria-current', 'page');
    rerender(<MarketHeader department="existing" collectionSlug="wilderworld"/>);
    expect(primary.getByRole('link', { name: 'Weapons' })).not.toHaveAttribute('aria-current');
  });

  it('keeps keyboard scrolling inside the options panel instead of moving the document', () => {
    render(<SelectHarness/>);
    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);
    const list = screen.getByRole('listbox');
    const last = screen.getByRole('option', { name: 'Originals' });
    Object.defineProperty(list, 'clientHeight', { value: 80 });
    Object.defineProperty(last, 'offsetHeight', { value: 42 });
    list.getBoundingClientRect = () => ({ top: 100 } as DOMRect);
    last.getBoundingClientRect = () => ({ top: 300 } as DOMRect);
    const scrollIntoView = vi.fn();
    last.scrollIntoView = scrollIntoView;
    fireEvent.keyDown(trigger, { key: 'End' });
    expect(list.scrollTop).toBe(162);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('reveals an offscreen active main-nav collection using only the rail scroll position', () => {
    const { rerender } = render(<MarketHeader/>);
    const rail = screen.getByRole('region', { name: 'Shopping categories' });
    const weapons = within(rail).getByRole('link', { name: 'Weapons' });
    Object.defineProperty(rail, 'clientWidth', { value: 1000 });
    Object.defineProperty(rail, 'scrollWidth', { value: 1600 });
    rail.getBoundingClientRect = () => ({ left: 20, right: 1020, width: 1000 } as DOMRect);
    weapons.getBoundingClientRect = () => ({ left: 1320, right: 1400, width: 80 } as DOMRect);
    const scrollIntoView = vi.fn();
    weapons.scrollIntoView = scrollIntoView;
    const pageScroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    rerender(<MarketHeader department="existing" collectionSlug="pack-weapons"/>);
    expect(rail.scrollLeft).toBe(600);
    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(pageScroll).not.toHaveBeenCalled();
    pageScroll.mockRestore();
  });

  it('shows navigation arrows when space is constrained and updates their disabled edges after scrolling', () => {
    render(<MarketHeader department="none"/>);
    const rail = screen.getByRole('region', { name: 'Shopping categories' });
    let width = 1700;
    Object.defineProperty(rail, 'clientWidth', { get: () => width });
    Object.defineProperty(rail, 'scrollWidth', { value: 1600 });
    const scrollBy = vi.fn((options: ScrollToOptions) => {
      rail.scrollLeft = Math.max(0, Math.min(rail.scrollLeft + (options.left ?? 0), 1600 - width));
      fireEvent.scroll(rail);
    });
    Object.defineProperty(rail, 'scrollBy', { value: scrollBy });
    fireEvent.resize(window);
    expect(screen.queryByRole('button', { name: 'Scroll categories right' })).not.toBeInTheDocument();
    width = 600;
    fireEvent.resize(window);
    expect(screen.getByRole('button', { name: 'Scroll categories left' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Scroll categories right' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Scroll categories right' }));
    expect(scrollBy).toHaveBeenLastCalledWith({ left: 450, behavior: 'smooth' });
    expect(rail.scrollLeft).toBe(450);
    expect(screen.getByRole('button', { name: 'Scroll categories left' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Scroll categories right' }));
    fireEvent.click(screen.getByRole('button', { name: 'Scroll categories right' }));
    expect(rail.scrollLeft).toBe(1000);
    expect(screen.getByRole('button', { name: 'Scroll categories right' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Scroll categories left' }));
    expect(scrollBy).toHaveBeenLastCalledWith({ left: -450, behavior: 'smooth' });
    width = 1700;
    rail.scrollLeft = 0;
    fireEvent.resize(window);
    expect(screen.queryByRole('button', { name: 'Scroll categories left' })).not.toBeInTheDocument();
  });
});
