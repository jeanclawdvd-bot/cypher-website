import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MarketplaceBrowse, ProductCard } from './Marketplace';
import { featuredMaterial, filterProducts, findMarketProduct, marketProducts, productHref, type MarketProduct, type Variant } from './catalog';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => window.location.pathname }));
beforeEach(() => { localStorage.clear(); window.history.replaceState(null, '', '/store/collections/furniture'); });

function expectCardChoice(product: MarketProduct, variant: Variant) {
  const card = within(screen.getByRole('article', { name: product.name }));
  expect(card.getByRole('img', { name: product.name })).toHaveAttribute('src', variant.thumbnail ?? variant.image);
  for (const link of card.getAllByRole('link')) expect(link).toHaveAttribute('href', productHref(product, variant));
  expect(card.queryByRole('button', { name: `${product.name}: ${variant.name}` })).not.toBeInTheDocument();
  return card;
}

describe('color and material browsing', () => {
  it('opens cards on the filtered finish without card swatches and updates the image when changing or clearing the filter', () => {
    const sofa = findMarketProduct('furniture-sofa')!;
    const moss = sofa.variants.find(variant => variant.name === 'Moss')!;
    const cognac = sofa.variants.find(variant => variant.name === 'Cognac')!;
    render(<MarketplaceBrowse initialDepartment="furniture" initialFinish="Moss" />);
    const filter = screen.getByRole('combobox', { name: 'Colors & materials' });
    expect(filter).toHaveValue('moss');
    expect(within(filter).getByRole('option', { name: `Moss (${filterProducts(marketProducts, { department: 'furniture', finish: 'moss' }).length})` })).toBeInTheDocument();
    expect(within(filter).getAllByRole('option').length).toBeGreaterThan(4);
    expectCardChoice(sofa, moss);

    fireEvent.click(screen.getByRole('button', { name: 'List view' }));
    expectCardChoice(sofa, moss);

    fireEvent.change(filter, { target: { value: 'cognac' } });
    expectCardChoice(sofa, cognac);
    expect(new URLSearchParams(window.location.search).get('finish')).toBe('cognac');
    fireEvent.click(screen.getByRole('button', { name: 'Remove color or material filter' }));
    expect(filter).toHaveValue('all');
    expect(expectCardChoice(sofa, featuredMaterial(sofa)!).queryByText('9 material concepts')).toBeNull();
    expect(new URLSearchParams(window.location.search).has('finish')).toBe(false);
  });

  it('keeps a stale URL selection explicit with alternatives available and an effective reset', () => {
    render(<MarketplaceBrowse initialDepartment="furniture" initialFinish="retired linen" />);
    const filter = screen.getByRole('combobox', { name: 'Colors & materials' });
    expect(filter).toHaveValue('retired linen');
    expect(within(filter).getByRole('option', { name: 'retired linen (0 results)' })).toBeInTheDocument();
    expect(within(filter).getByRole('option', { name: 'All options' })).toBeInTheDocument();
    expect(within(filter).getAllByRole('option').length).toBeGreaterThan(4);
    expect(screen.getByRole('heading', { name: 'No matches just yet.' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }));
    expect(filter).toHaveValue('all');
    expect(screen.queryByRole('option', { name: 'retired linen (0 results)' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(filterProducts(marketProducts, { department: 'furniture' }).length);
  });

  it('updates available names and product counts with the category and search while retaining alternatives to the selected finish', () => {
    render(<MarketplaceBrowse initialDepartment="furniture" initialCategory="rugs" />);
    const rugs = filterProducts(marketProducts, { department: 'furniture', subcategory: 'rugs' });
    const filter = screen.getByRole('combobox', { name: 'Colors & materials' });
    const values = () => within(filter).getAllByRole('option').map(option => (option as HTMLOptionElement).value);
    const initialValues = values();
    const selected = rugs[0].variants[0];
    fireEvent.change(filter, { target: { value: selected.name.toLowerCase() } });
    expect(values()).toEqual(initialValues);
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search products' }), { target: { value: rugs[0].name } });
    const scoped = filterProducts(marketProducts, { department: 'furniture', subcategory: 'rugs', query: rugs[0].name });
    for (const option of within(filter).getAllByRole('option').slice(1)) {
      const finish = (option as HTMLOptionElement).value;
      const count = filterProducts(scoped, { finish }).length;
      expect(option.textContent).toMatch(new RegExp(`\\(${count}\\)$`));
    }
  });

  it('never substitutes another photo for a pending selected finish, and changes study badges only in presentation', () => {
    const original = findMarketProduct('furniture-sofa')!;
    for (const status of ['Finish study', 'Material study']) {
      const fixture = { ...original, status, variants: [{ ...original.variants[0], id: 'ready', name: 'Graphite', image: '/ready.webp' }, { ...original.variants[1], id: 'pending', name: 'Future linen', image: null, thumbnail: undefined, srcSet: undefined }] };
      const before = JSON.stringify(fixture);
      const view = render(<ProductCard product={fixture} preferredFinish="future linen" />);
      const card = within(screen.getByRole('article', { name: fixture.name }));
      expect(card.queryByRole('img')).not.toBeInTheDocument();
      expect(card.getByText('Future linen · Render pending')).toBeInTheDocument();
      expect(card.getByText('Material preview')).toBeInTheDocument();
      expect(card.queryByText(status)).not.toBeInTheDocument();
      for (const link of card.getAllByRole('link')) expect(link).toHaveAttribute('href', productHref(fixture, fixture.variants[1]));
      expect(JSON.stringify(fixture)).toBe(before);
      view.unmount();
    }
  });
});
