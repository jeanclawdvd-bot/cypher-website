import { SectionHeader } from '@/components/SectionHeader';
import CityShowcase from '@/sites/wilderworld/CityShowcase';
import styles from './page.module.css';

export default function CityPage() {
  return (
    <div className={styles.page}>
      <SectionHeader
        as="h1"
        eyebrow="City"
        title="Welcome to Wiami"
        subtitle="Wiami is a massive virtual metropolis with residential areas, commercial hubs, industrial zones and legendary landmarks. Watch the city shift from day to night."
      />
      <CityShowcase />
    </div>
  );
}
