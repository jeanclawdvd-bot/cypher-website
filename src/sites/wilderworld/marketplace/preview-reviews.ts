import type { ProductReview, ReviewTarget } from './product-reviews';

/** Presentation-only fixtures. Never written to the review API or used as proof. */
export function previewReviews(target: ReviewTarget): ProductReview[] {
  const seed = [...target.productId].reduce((hash, letter) => (hash * 31 + letter.charCodeAt(0)) >>> 0, 7);
  const names = ['Alex R.', 'Maya K.', 'Jordan C.', 'Sam T.', 'Kai M.', 'Nia D.', 'Leo S.', 'Zoe A.'];
  const copy = [
    ['The details make it', 'The silhouette and small details are what caught my eye. The darker finish is my pick.'],
    ['A strong addition to the collection', 'I like how it feels at home in Wiami without being overdesigned.'],
    ['Worth comparing the finishes', 'The close-up images helped me choose. The muted option works best with the rest of my collection.'],
    ['Clean design', 'The proportions look considered and the material contrast gives it character.'],
    ['More angles would help', 'The design is strong. I would like another side view before deciding on a finish.'],
    ['My favorite of the new drop', 'Simple from a distance, with plenty to notice up close.'],
    ['Good color selection', 'The brighter finish is fun, but I keep coming back to the neutral one.'],
    ['Almost there', 'I like the direction. A few of the finishes are a little bolder than I would choose.'],
  ];
  return Array.from({ length: 18 + seed % 18 }, (_, index) => {
    const sample = (index + seed) % copy.length;
    const rating = index % 13 === 0 ? 3 : (index + seed) % 4 === 0 ? 4 : 5;
    return {
      id: `sample:${target.productId}:${index}`, productId: target.productId,
      variantId: target.variantIds.length ? target.variantIds[(index + seed) % target.variantIds.length] : null,
      authorDisplayName: names[sample], rating, title: copy[sample][0], body: copy[sample][1],
      createdAt: new Date(Date.UTC(2026, 9, 30 - index)).toISOString(),
      moderation: 'published', helpfulCount: 0,
    };
  });
}

export function productReviewsAnchor(productId: string) {
  return `product-reviews-${encodeURIComponent(productId)}`;
}
