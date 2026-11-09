import { emptyReviews, type ProductReviewAdapter, type ReviewSnapshot } from './product-reviews';

/** The local database never proves a production purchase or token ownership. */
export const localReviewAdapter: ProductReviewAdapter = {
  id: 'local-store-reviews',
  async read(target, signal) {
    try {
      const response = await fetch(`/api/store/v1/reviews?${new URLSearchParams({ productId: target.productId })}`, {
        credentials: 'same-origin', cache: 'no-store', signal,
      });
      if (!response.ok) return emptyReviews();
      const data = await response.json() as ReviewSnapshot & { mode?: string };
      if (data.mode !== 'local' || data.status !== 'live' || !Array.isArray(data.reviews)) return emptyReviews();
      return {
        ...data,
        provider: 'Local preview',
        message: 'Local test reviews only. Production reviews are not connected.',
        reviews: data.reviews.map(review => ({ ...review, verifiedPurchase: undefined, verifiedOwnership: undefined })),
      };
    } catch {
      return emptyReviews();
    }
  },
};
