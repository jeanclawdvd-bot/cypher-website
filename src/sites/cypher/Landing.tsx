import { Facts } from '@/components/Facts';
import { ProductGrid } from '@/components/ProductGrid';
import styles from './Landing.module.css';

export default function CypherLanding() {
  return (
    <div className={styles.page}>
      <section className={styles.gridSection}>
        <ProductGrid />
      </section>
      <Facts />
    </div>
  );
}
