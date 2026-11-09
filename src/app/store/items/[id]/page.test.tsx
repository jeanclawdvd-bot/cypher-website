import { describe, expect, it, vi } from 'vitest';
import CollectionItemPage from './page';

vi.mock('next/navigation', () => ({
  redirect: (href: string) => { throw new Error(`redirect:${href}`); },
  notFound: () => { throw new Error('not-found'); },
}));
vi.mock('@/sites/wilderworld/collections/CollectionProduct', () => ({ default: () => null }));

describe('preserved collection item bookmarks', () => {
  it.each(['furniture-sofa', 'vehicle-ghostline', 'rim-preview-wertone-v1', 'totem-fw-hermes-ii'])('opens the current exact product for %s', async id => {
    await expect(CollectionItemPage({ params: Promise.resolve({ id }) })).rejects.toThrow(`redirect:/store/products/${id}`);
  });

  it.each(['totem-fw-queen-isis', 'totem-chain-jwlr-002', 'not-a-product'])('does not restore excluded or unknown item %s', async id => {
    await expect(CollectionItemPage({ params: Promise.resolve({ id }) })).rejects.toThrow('not-found');
  });
});
