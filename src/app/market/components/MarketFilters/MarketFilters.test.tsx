import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { TraitCategory } from '@/app/api/market/traits/route';
import { MarketFilters } from './MarketFilters';

const traitCategories: TraitCategory[] = [
  { type: 'Color', values: [{ value: 'Red', count: 3 }, { value: 'Blue', count: 5 }] },
];

function setup(overrides: Partial<Parameters<typeof MarketFilters>[0]> = {}) {
  const props = {
    activeSlug: 'wilder',
    availability: 'listed' as const,
    showAvailability: true,
    traitCategories,
    selectedTraits: {},
    openTraitGroups: { Color: true },
    selectedCount: 0,
    onAvailabilityChange: vi.fn(),
    onToggleTrait: vi.fn(),
    onToggleGroup: vi.fn(),
    onClear: vi.fn(),
    ...overrides,
  };
  render(<MarketFilters {...props} />);
  return props;
}

describe('MarketFilters', () => {
  it('toggles a trait value when its checkbox is clicked', async () => {
    const props = setup();
    await userEvent.click(screen.getByRole('checkbox', { name: /Red/i }));
    expect(props.onToggleTrait).toHaveBeenCalledWith('Color', 'Red');
  });

  it('switches availability', async () => {
    const props = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Unlisted' }));
    expect(props.onAvailabilityChange).toHaveBeenCalledWith('unlisted');
  });

  it('hides the availability toggle when showAvailability is false', () => {
    setup({ showAvailability: false });
    expect(screen.queryByRole('button', { name: 'Listed' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Unlisted' })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Availability' })).not.toBeInTheDocument();
  });

  it('shows a clear button only when traits are selected', () => {
    const { rerender } = render(
      <MarketFilters
        activeSlug="wilder"
        availability="listed"
        showAvailability
        traitCategories={traitCategories}
        selectedTraits={{}}
        openTraitGroups={{}}
        selectedCount={0}
        onAvailabilityChange={vi.fn()}
        onToggleTrait={vi.fn()}
        onToggleGroup={vi.fn()}
        onClear={vi.fn()}
      />
    );
    expect(screen.queryByText(/Clear/)).not.toBeInTheDocument();
    rerender(
      <MarketFilters
        activeSlug="wilder"
        availability="listed"
        showAvailability
        traitCategories={traitCategories}
        selectedTraits={{ Color: ['Red'] }}
        openTraitGroups={{}}
        selectedCount={1}
        onAvailabilityChange={vi.fn()}
        onToggleTrait={vi.fn()}
        onToggleGroup={vi.fn()}
        onClear={vi.fn()}
      />
    );
    expect(screen.getByText('Clear (1)')).toBeInTheDocument();
  });
});
