export type Availability = 'all' | 'listed' | 'unlisted';
export type GridSize = 'lg' | 'md' | 'sm';
export type ViewMode = 'grid' | 'list';

/** Selected trait values keyed by trait type. Arrays (not Sets) so the store
 *  stays serializable for persistence. */
export type SelectedTraits = Record<string, readonly string[]>;
