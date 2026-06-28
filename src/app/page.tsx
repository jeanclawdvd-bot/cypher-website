import { Facts } from './_components/Facts';
import { ProductGrid } from './_components/ProductGrid';
import styles from './page.module.css';

export default function Home() {
  return (
    <div className={styles.page}>
      <section className={styles.gridSection}>
        <ProductGrid />
      </section>
      <Facts />
    </div>
  );
}
