import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMarketTraitsQuery } from './useMarketTraitsQuery';

const categories = [
  { type: 'Rarity', values: [{ value: 'Common', count: 12 }] },
  { type: 'Type', values: [{ value: 'Blade', count: 4 }] },
];

function mockTraits() {
  const fetchMock = vi.fn(async () => {
    return {
      ok: true,
      json: async () => ({ categories }),
    } as Response;
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useMarketTraitsQuery', () => {
  it('fetches trait categories for a non-empty slug', async () => {
    const fetchMock = mockTraits();

    const { result } = renderHook(() => useMarketTraitsQuery('pack-weapons'), {
      wrapper: wrapper(),
    });

    await waitFor(() => expect(result.current.data).toEqual(categories));
    expect(fetchMock).toHaveBeenCalledWith('/api/market/traits?slug=pack-weapons');
  });

  it('is disabled without a slug', () => {
    const fetchMock = mockTraits();

    const { result } = renderHook(() => useMarketTraitsQuery(''), {
      wrapper: wrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('never fetches on the static (ETH) path where an empty slug is passed', async () => {
    const fetchMock = mockTraits();

    // MarketBrowser passes '' for non-indexer entries; assert no request fires.
    const isIndexerSource = false;
    const { result, rerender } = renderHook(
      () => useMarketTraitsQuery(isIndexerSource ? 'wilder' : ''),
      { wrapper: wrapper() }
    );

    rerender();
    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.data).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
