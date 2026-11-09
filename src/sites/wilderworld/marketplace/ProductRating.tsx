import { Star, ChevronDown } from 'lucide-react';
import { previewReviews, productReviewsAnchor } from './preview-reviews';
import { reviewSummary } from './product-reviews';
import styles from './ProductReviews.module.css';

export function RatingStars({ rating, unavailable = false }: { rating: number | null; unavailable?: boolean }) {
  return <span className={styles.stars} role="img" aria-label={unavailable ? 'Rating unavailable' : rating === null ? 'Not yet rated' : `${rating.toFixed(1)} out of 5 stars`}>
    {[0, 1, 2, 3, 4].map(index => <span key={index} className={styles.star}>
      <Star aria-hidden size={18} strokeWidth={1.6} />
      <span style={{ width: `${Math.max(0, Math.min(1, (rating ?? 0) - index)) * 100}%` }}><Star aria-hidden size={18} fill="currentColor" strokeWidth={1.6} /></span>
    </span>)}
  </span>;
}

export default function ProductRating({ productId, variantIds = [] }: { productId: string; variantIds?: readonly string[] }) {
  const { average, count } = reviewSummary(previewReviews({ productId, variantIds }));
  return <div className={styles.inlineRating}>
    <a href={`#${productReviewsAnchor(productId)}`} aria-label={`Read ${count} sample reviews`}>
      <span>{average!.toFixed(1)}</span><RatingStars rating={average} /><ChevronDown size={13} aria-hidden />
      <span className={styles.reviewCount}>{count} ratings</span>
    </a><span className={styles.sampleLabel}>Sample ratings</span>
  </div>;
}
