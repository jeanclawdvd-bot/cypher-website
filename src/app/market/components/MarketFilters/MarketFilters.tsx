import { ChevronDown } from 'lucide-react';
import type { TraitCategory } from '@/app/api/market/traits/route';
import type { Availability, SelectedTraits } from '../../types';
import styles from '../../market.module.css';

type Props = {
  activeSlug: string;
  availability: Availability;
  showAvailability: boolean;
  traitCategories: readonly TraitCategory[];
  selectedTraits: SelectedTraits;
  openTraitGroups: Record<string, boolean>;
  selectedCount: number;
  onAvailabilityChange: (value: Availability) => void;
  onToggleTrait: (type: string, value: string) => void;
  onToggleGroup: (type: string) => void;
  onClear: () => void;
};

export function MarketFilters({
  activeSlug,
  availability,
  showAvailability,
  traitCategories,
  selectedTraits,
  openTraitGroups,
  selectedCount,
  onAvailabilityChange,
  onToggleTrait,
  onToggleGroup,
  onClear,
}: Props) {
  return (
    <>
      <div className={styles.filtersHead}>
        <p className={styles.railHeading}>Filters</p>
        {selectedCount > 0 && (
          <button className={styles.clearBtn} onClick={onClear}>
            Clear ({selectedCount})
          </button>
        )}
      </div>
      {showAvailability && (
        <div className={styles.statusFilter} role="group" aria-label="Availability">
          <button
            type="button"
            className={`${styles.statusBtn} ${
              availability === 'listed' ? styles.statusBtnActive : ''
            }`}
            onClick={() => onAvailabilityChange('listed')}
            aria-pressed={availability === 'listed'}
          >
            Listed
          </button>
          <button
            type="button"
            className={`${styles.statusBtn} ${
              availability === 'unlisted' ? styles.statusBtnActive : ''
            }`}
            onClick={() => onAvailabilityChange('unlisted')}
            aria-pressed={availability === 'unlisted'}
          >
            Unlisted
          </button>
        </div>
      )}
      <div key={activeSlug} className={styles.filterSwap}>
        {!activeSlug ? null : traitCategories.length === 0 ? (
          <p className={styles.filtersEmpty}>No trait filters available.</p>
        ) : (
          <div className={styles.traitGroups}>
            {traitCategories.map((cat) => {
              const open = openTraitGroups[cat.type] ?? false;
              return (
                <div key={cat.type} className={styles.traitGroup}>
                  <button
                    className={styles.traitGroupHead}
                    onClick={() => onToggleGroup(cat.type)}
                  >
                    <span>{cat.type}</span>
                    <ChevronDown
                      size={14}
                      className={open ? styles.chevOpen : styles.chev}
                    />
                  </button>
                  {open && (
                    <div className={styles.traitValues}>
                      {cat.values.map((v) => {
                        const checked = selectedTraits[cat.type]?.includes(v.value) ?? false;
                        return (
                          <label key={v.value} className={styles.traitValue}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => onToggleTrait(cat.type, v.value)}
                            />
                            <span className={styles.traitValueLabel}>{v.value}</span>
                            <span className={styles.traitValueCount}>{v.count}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
