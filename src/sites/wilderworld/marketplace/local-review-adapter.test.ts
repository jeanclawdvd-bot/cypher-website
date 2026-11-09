import { afterEach, describe, expect, it, vi } from 'vitest';
import { localReviewAdapter } from './local-review-adapter';

afterEach(() => vi.unstubAllGlobals());
describe('local review authority', () => {
  it('does not label simulated purchases or ownership as verified', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      mode: 'local', status: 'live', provider: 'local-store', asOf: new Date().toISOString(), message: '',
      reviews: [{ id: 'test', verifiedPurchase: { assertedBy: 'server' }, verifiedOwnership: { assertedBy: 'server' } }],
    }))));
    const result = await localReviewAdapter.read({ productId: 'coat', variantIds: ['black'] });
    expect(result.provider).toBe('Local preview');
    expect(result.message).toContain('Local test reviews only');
    expect(result.reviews[0].verifiedPurchase).toBeUndefined();
    expect(result.reviews[0].verifiedOwnership).toBeUndefined();
  });
  it('remains unconfigured when the local backend is disabled', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 503 })));
    const result = await localReviewAdapter.read({ productId: 'coat', variantIds: ['black'] });
    expect(result.status).toBe('unconfigured');
    expect(result.reviews).toEqual([]);
  });
});
