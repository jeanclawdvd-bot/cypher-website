import { createElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, renderHook, screen, within } from '@testing-library/react';
import ProductDetail from './ProductDetail';
import DemoBag from './DemoBag';
import { findIndividualProduct } from './fashion';
import { formatUsd } from './pricing';
import { DEMO_BAG_KEY, parseDemoBag, resolveBagProduct, useDemoBag } from './useDemoBag';

vi.mock('next/image', () => ({ default: ({ src, alt }: { src: string; alt: string }) => createElement('img', { src, alt }) }));

beforeEach(() => { localStorage.clear(); window.history.replaceState(null, '', '/store/JCKT_001'); });

describe('individual accessory shopping preview', () => {
  it('honors a deep-linked color, preserves SKU and swaps photographs without style selectors', () => {
    const product = findIndividualProduct('JCKT_001')!;
    const selected = product.colorways[1];
    window.history.replaceState(null, '', `/store/${product.id}?color=${selected.id}`);
    render(<ProductDetail product={product} />);
    expect(screen.getByRole('heading', { level: 1, name: product.name })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: product.name })).toHaveAttribute('src', selected.image);
    expect(screen.getByText(product.sourceSku)).toBeInTheDocument();
    expect(product.priceCents).toBeGreaterThan(0);
    expect(screen.getByText(product.price)).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /style/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: product.colorways[2].name }));
    expect(screen.getByRole('img', { name: product.name })).toHaveAttribute('src', product.colorways[2].image);
    expect(new URLSearchParams(window.location.search).get('color')).toBe(product.colorways[2].id);
  });

  it('completes a functional local demo selection without payment or an actual order', () => {
    const product = findIndividualProduct('JCKT_001')!;
    render(<ProductDetail product={product} />);
    fireEvent.click(screen.getByRole('button', { name: /Add to bag/ }));
    const bag = within(screen.getByRole('dialog', { name: 'Your bag' }));
    expect(bag.getByText(product.sourceSku)).toBeInTheDocument();
    expect(bag.getByText(`${product.price} each`)).toBeInTheDocument();
    expect(bag.getByLabelText(`${product.name} line total`)).toHaveTextContent(formatUsd(product.priceCents));
    expect(bag.getByLabelText('Subtotal in USD')).toHaveTextContent(formatUsd(product.priceCents));
    fireEvent.click(bag.getByRole('button', { name: `Increase ${product.name}` }));
    expect(parseDemoBag(localStorage.getItem(DEMO_BAG_KEY)!)[0].quantity).toBe(2);
    expect(bag.getByLabelText(`${product.name} line total`)).toHaveTextContent(formatUsd(product.priceCents * 2));
    expect(bag.getByLabelText('Subtotal in USD')).toHaveTextContent(formatUsd(product.priceCents * 2));
    fireEvent.click(bag.getByRole('button', { name: `Decrease ${product.name}` }));
    expect(bag.getByLabelText('Subtotal in USD')).toHaveTextContent(formatUsd(product.priceCents));
    fireEvent.click(bag.getByRole('button', { name: /Review selection/ }));
    const review = within(screen.getByRole('dialog', { name: 'Review your selection' }));
    expect(review.getByLabelText(`${product.name} line total`)).toHaveTextContent(formatUsd(product.priceCents));
    expect(review.getByLabelText('Subtotal in USD')).toHaveTextContent(formatUsd(product.priceCents));
    expect(screen.queryByLabelText(/Card number/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Complete demo/ }));
    expect(screen.getByText(/No order was placed and no payment was taken/)).toBeInTheDocument();
    expect(parseDemoBag(localStorage.getItem(DEMO_BAG_KEY)!)).toEqual([]);
  });

  it('persists independent colors and styles, synchronizes subscribers, and retains vehicle offers', () => {
    const product = findIndividualProduct('JCKT_001')!;
    const first = renderHook(useDemoBag), second = renderHook(useDemoBag);
    act(() => {
      first.result.current.addItem({ productId: product.id, colorwayId: product.colorways[0].id });
      first.result.current.addItem({ productId: product.id, colorwayId: product.colorways[1].id });
      first.result.current.addItem({ productId: 'ghostline' });
    });
    expect(second.result.current.count).toBe(3);
    expect(second.result.current.items).toHaveLength(3);
    expect(second.result.current.subtotalCents).toBe(product.priceCents * 2 + 1900);
    first.unmount();
    const restored = renderHook(useDemoBag);
    expect(restored.result.current.items).toEqual(second.result.current.items);
    expect(restored.result.current.subtotalCents).toBe(product.priceCents * 2 + 1900);
    expect(resolveBagProduct({ productId: 'ghostline' })).toMatchObject({ price: '$19', priceCents: 1900, href: '/vehicles/ghostline', vehicle: true });
    expect(resolveBagProduct({ productId: 'vera-solis' })).toMatchObject({ price: '$59', priceCents: 5900, vehicle: true });
    act(() => restored.result.current.changeQuantity(restored.result.current.items[0].key, -1));
    expect(second.result.current.count).toBe(2);
    expect(second.result.current.subtotalCents).toBe(product.priceCents + 1900);
    act(() => restored.result.current.removeItem(restored.result.current.items.find(item => item.productId === 'ghostline')!.key));
    expect(second.result.current.count).toBe(1);
    expect(second.result.current.subtotalCents).toBe(product.priceCents);
    act(() => restored.result.current.clearBag());
    expect(second.result.current.count).toBe(0);
    expect(second.result.current.subtotalCents).toBe(0);
  });

  it('restores selections at current catalog prices and ignores prices saved in browser storage', () => {
    const product = findIndividualProduct('JCKT_001')!;
    localStorage.setItem(DEMO_BAG_KEY, JSON.stringify([
      { productId: product.id, colorwayId: product.colorways[0].id, quantity: 2, priceCents: 1, price: '$0.01' },
      { productId: product.id, colorwayId: product.colorways[1].id, quantity: 1, priceCents: 999999 },
      { productId: 'ghostline', quantity: 1, priceCents: 0 },
    ]));
    render(<DemoBag open onClose={() => {}} />);
    const bag = within(screen.getByRole('dialog', { name: 'Your bag' }));
    expect(bag.getAllByRole('article')).toHaveLength(3);
    const firstColor = within(bag.getByRole('article', { name: `${product.name} — ${product.colorways[0].name}` }));
    expect(firstColor.getByText(`${product.price} each`)).toBeInTheDocument();
    expect(firstColor.getByLabelText(`${product.name} line total`)).toHaveTextContent(formatUsd(product.priceCents * 2));
    expect(bag.getByLabelText('Subtotal in USD')).toHaveTextContent(formatUsd(product.priceCents * 3 + 1900));
    fireEvent.click(firstColor.getByRole('button', { name: 'Remove' }));
    expect(bag.getAllByRole('article')).toHaveLength(2);
    expect(bag.getByLabelText('Subtotal in USD')).toHaveTextContent(formatUsd(product.priceCents + 1900));
    expect(parseDemoBag(localStorage.getItem(DEMO_BAG_KEY)!).every(item => !('priceCents' in item) && !('price' in item))).toBe(true);
  });

  it('recovers from malformed storage and rejects removed products or wrong product colors', () => {
    expect(parseDemoBag('{broken')).toEqual([]);
    expect(parseDemoBag(JSON.stringify([{ productId: 'XTRA_005', quantity: 1 }, { productId: 'JCKT_001', colorwayId: 'CONCEPT-EYWR_001-01', quantity: 2 }, { productId: 'ghostline', quantity: -1 }]))).toEqual([]);
  });
  it('resolves completed material selections to their reviewed photograph without relabeling the original',()=>{
    const product=findIndividualProduct('BTWR_001_A')!;
    const completed={productId:product.id,colorwayId:'MAT-BTWR_001_A-oxide',quantity:1};
    const approved={productId:product.id,colorwayId:product.colorways[0].id,quantity:1};
    expect(resolveBagProduct(completed)?.image).toContain('/images/marketplace/fashion-materials/BTWR_001_A-oxide-');
    expect(resolveBagProduct(completed)?.image).not.toBe(product.colorways[0].image);
    expect(parseDemoBag(JSON.stringify([completed,approved]))).toMatchObject([completed,approved]);
    expect(resolveBagProduct(approved)?.image).toBe(product.colorways[0].image);
  });
});
