import { beforeEach, describe, expect, it, vi, type MockedFunction } from 'vitest';
import type { IndexerAttributeCounts } from '@/lib/indexer';

vi.mock('@/lib/indexer', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/indexer')>();
  return { ...actual, indexerFetch: vi.fn() };
});
vi.mock('@/lib/opensea', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/opensea')>();
  return { ...actual, openseaFetch: vi.fn().mockResolvedValue(null) };
});

import { indexerFetch } from '@/lib/indexer';
import { GET } from './route';

// `indexerFetch` is generic, so type the mock against a concrete signature.
const mockedFetch = indexerFetch as MockedFunction<
  (path: string) => Promise<unknown>
>;

const request = new Request('http://localhost/api/market/traits?slug=packs');

beforeEach(() => {
  mockedFetch.mockReset();
});

describe('GET /api/market/traits (indexer branch)', () => {
  it('maps the aggregated counts response to categories in a single call', async () => {
    const counts: IndexerAttributeCounts = {
      attributes: [
        {
          traitType: 'Tier',
          values: [
            { value: 'Gold', count: 300 },
            { value: 'Silver', count: 150 },
          ],
        },
        { traitType: 'Zone', values: [{ value: 'North', count: 1 }] },
      ],
    };
    mockedFetch.mockResolvedValueOnce(counts);

    const body = await (await GET(request)).json();

    // One call to the server-side aggregation endpoint, scoped to the contract.
    expect(mockedFetch).toHaveBeenCalledTimes(1);
    expect(mockedFetch.mock.calls[0][0]).toContain(
      '/v1/inventory/attributes/counts'
    );
    expect(mockedFetch.mock.calls[0][0]).toContain('collections=');

    expect(body.categories).toEqual([
      {
        type: 'Tier',
        values: [
          { value: 'Gold', count: 300 },
          { value: 'Silver', count: 150 },
        ],
      },
      { type: 'Zone', values: [{ value: 'North', count: 1 }] },
    ]);
  });

  it('degrades to empty categories when the fetch fails', async () => {
    mockedFetch.mockResolvedValueOnce(null);
    const body = await (await GET(request)).json();
    expect(body).toEqual({ categories: [] });
  });
});
