import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import ApartmentInventory, { type ApartmentDefinition, type ApartmentInventoryData } from './ApartmentInventory';
import CollectionBrowse from './CollectionBrowse';
import sourceInventory from './apartment-definition.json';
import ApartmentInventoryPage, { metadata } from '@/app/store/collections/furniture/apartment/page';

vi.mock('next/image', () => ({ default: ({ src, alt }: { src: string; alt: string }) => createElement('img', { src, alt }) }));

const definition = (id: string, values: Partial<ApartmentDefinition>): ApartmentDefinition => ({
  id, name: id, category: 'furniture', type: 'Chair', rooms: ['Bedroom'], instanceCount: 1,
  assemblyStatus: 'assembled', structural: false, sourceIds: [`SM_${id}`], sourceAssets: [`/Game/Apartment/${id}`],
  unresolved: [], ...values,
});
const data: ApartmentInventoryData = {
  scope: 'Saved six-room apartment', capturedAt: '2026-09-10',
  caveat: 'Saved scene evidence; current geometry has not been reverified.',
  scopeDetails: ['The source snapshot is historical, not a new live scene capture.'],
  definitions: [
    definition('sofa', { name: 'Curved sofa', type: 'Sofa', rooms: ['Bedroom'], instanceCount: 5, thumbnail: '/images/source-sofa.jpg' }),
    definition('chair', { name: 'Dining chair', rooms: ['Corner room'], instanceCount: 2 }),
    definition('stool-base', { name: 'Stool base', category: 'assembly part', type: 'Stool component', rooms: ['Study'], instanceCount: 4, assemblyStatus: 'piece', sourceIds: ['SM_Stool_Base_A'], unresolved: ['Confirm the matching seat mesh.'], notes: 'One base is not a complete stool.' }),
    definition('wall', { name: 'Wall panel', category: 'structure', type: 'Wall', structural: true, rooms: ['Base'], instanceCount: 12, assemblyStatus: 'piece' }),
    definition('box', { name: 'Unidentified cabinet', category: 'equipment', type: 'Cabinet', rooms: ['Study'], instanceCount: 3, assemblyStatus: 'unresolved', unresolved: ['Confirm use from the current scene.'] }),
  ],
  assemblies: [{ id: 'stool-group', name: 'Stool assembly', definition: 'Combine a verified seat and compatible base into one complete stool.', status: 'proposed', sourceAssets: ['/Game/Apartment/stool-base', '/Game/Apartment/stool-seat'], unresolved: ['Confirm compatible seat/base pairs.'] }],
  garage: { scope: 'Separate saved garage', caveat: 'This inventory is separate from the apartment.', definitions: [definition('workbench', { name: 'Garage workbench', type: 'Workbench', rooms: ['Garage'], instanceCount: 6 })] },
};

describe('apartment source inventory review', () => {
  it('distinguishes source definitions from placements, hides structure by default and makes it accessible', () => {
    render(<ApartmentInventory data={data} />);
    expect(screen.getByRole('heading', { name: 'Apartment inventory', level: 1 })).toBeInTheDocument();
    const full = within(screen.getByLabelText('Full source inventory'));
    expect(full.getByText('5')).toBeInTheDocument();
    expect(full.getByText('26')).toBeInTheDocument();
    expect(screen.getByText('Source mesh definitions')).toBeInTheDocument();
    expect(screen.getByText('Source placements')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('4 definitions · 14 source placements · Structure hidden');
    expect(screen.getAllByRole('article')).toHaveLength(4);
    expect(screen.queryByRole('article', { name: 'Wall panel' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Include structure' }));
    expect(screen.getByRole('status')).toHaveTextContent('5 definitions · 26 source placements');
    expect(screen.getByRole('article', { name: 'Wall panel' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Buy|Mint|Add to bag|Purchase/ })).not.toBeInTheDocument();
    expect(screen.getByText(/definitions are not purchase listings/)).toBeInTheDocument();
  });

  it('combines room, type and assembly filters with case-insensitive source ID search, then resets cleanly', () => {
    render(<ApartmentInventory data={data} />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Filter by room' }), { target: { value: 'Study' } });
    expect(screen.getByRole('status')).toHaveTextContent('2 definitions · 7 source placements');
    fireEvent.click(screen.getByRole('button', { name: 'Assembly pieces' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Filter by type' }), { target: { value: 'Stool component' } });
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search apartment inventory' }), { target: { value: '  sm_stool_base_a  ' } });
    expect(screen.getByRole('status')).toHaveTextContent('1 definition · 4 source placements');
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByRole('article', { name: 'Stool base' })).toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search apartment inventory' }), { target: { value: 'unknown-source' } });
    expect(screen.getByText('No definitions match these filters.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reset inventory view' }));
    expect(screen.getByRole('status')).toHaveTextContent('4 definitions · 14 source placements');
    expect(screen.getByRole('combobox', { name: 'Filter by room' })).toHaveValue('all');
    expect(screen.getByRole('searchbox', { name: 'Search apartment inventory' })).toHaveValue('');
  });

  it('shows real source previews where supplied and preserves assembly questions and provenance in details', () => {
    render(<ApartmentInventory data={data} />);
    expect(screen.getByRole('img', { name: 'Curved sofa source preview' })).toHaveAttribute('src', '/images/source-sofa.jpg');
    expect(screen.getAllByText('Source preview unavailable')).toHaveLength(3);
    const part = within(screen.getByRole('article', { name: 'Stool base' }));
    expect(part.getByText('Assembly piece')).toBeInTheDocument();
    expect(part.getByText('1 definition question to resolve')).toBeInTheDocument();
    fireEvent.click(part.getByText('Source details'));
    expect(part.getByText('SM_Stool_Base_A')).toBeInTheDocument();
    expect(part.getByText('/Game/Apartment/stool-base')).toBeInTheDocument();
    expect(part.getByText('One base is not a complete stool.')).toBeInTheDocument();
    expect(part.getByText('Confirm the matching seat mesh.')).toBeInTheDocument();
    fireEvent.click(screen.getByText('About this source inventory'));
    expect(screen.getByText('Source snapshot: 2026-09-10')).toBeInTheDocument();
    expect(screen.getByText(/historical, not a new live scene capture/)).toBeInTheDocument();
  });

  it('keeps the garage count and scope separate and clears stale apartment filters', () => {
    render(<ApartmentInventory data={data} />);
    fireEvent.click(screen.getByRole('button', { name: 'Complete objects' }));
    expect(screen.getByRole('status')).toHaveTextContent('2 definitions · 7 source placements');
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search apartment inventory' }), { target: { value: 'sofa' } });
    fireEvent.click(screen.getByRole('button', { name: 'Garage · separate inventory' }));
    expect(screen.getByRole('heading', { name: 'Separate saved garage' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('1 definition · 6 source placements');
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByRole('article', { name: 'Garage workbench' })).toBeInTheDocument();
    expect(screen.queryByRole('article', { name: 'Curved sofa' })).not.toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Search apartment inventory' })).toHaveValue('');
    fireEvent.click(screen.getByRole('button', { name: 'Apartment' }));
    expect(screen.getByRole('status')).toHaveTextContent('4 definitions · 14 source placements');
  });

  it('keeps counts for all matching definitions when the visual list is paginated', () => {
    const many = { ...data, garage: undefined, definitions: Array.from({ length: 31 }, (_, i) => definition(`chair-${i}`, { name: `Chair ${i}`, instanceCount: 2 })) };
    render(<ApartmentInventory data={many} />);
    expect(screen.getAllByRole('article')).toHaveLength(24);
    expect(screen.getByRole('status')).toHaveTextContent('31 definitions · 62 source placements');
    fireEvent.click(screen.getByRole('button', { name: 'Show more definitions' }));
    expect(screen.getAllByRole('article')).toHaveLength(31);
    expect(screen.queryByRole('button', { name: 'Show more definitions' })).not.toBeInTheDocument();
  });

  it('links the furniture collection to the source review without altering product routes', () => {
    render(<CollectionBrowse section="furniture" products={[]} />);
    expect(screen.getByRole('link', { name: 'Review the apartment inventory' })).toHaveAttribute('href', '/store/collections/furniture/apartment');
  });

  it('uses selected-room placement counts while full scope totals remain unchanged', () => {
    const shared = { ...data, definitions: [definition('shared-chair', { name: 'Shared chair', rooms: ['Bedroom', 'Study'], instanceCount: 6, roomCounts: { Bedroom: 2, Study: 4 } })] };
    render(<ApartmentInventory data={shared} />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Filter by room' }), { target: { value: 'Bedroom' } });
    expect(screen.getByRole('status')).toHaveTextContent('1 definition · 2 source placements');
    expect(within(screen.getByRole('article', { name: 'Shared chair' })).getByText('2 placements')).toBeInTheDocument();
    expect(within(screen.getByLabelText('Full source inventory')).getByText('6')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Filter by room' }), { target: { value: 'Study' } });
    expect(screen.getByRole('status')).toHaveTextContent('1 definition · 4 source placements');
  });

  it('keeps proposed whole-object assemblies reviewable without adding them to source totals', () => {
    render(<ApartmentInventory data={data} />);
    fireEvent.click(screen.getByText('Assemblies and related pieces'));
    expect(screen.getByText('1 group in review')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Stool assembly'));
    expect(screen.getByText('Combine a verified seat and compatible base into one complete stool.')).toBeInTheDocument();
    expect(screen.getByText('Confirm compatible seat/base pairs.')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('4 definitions · 14 source placements');
  });

  it('accounts for every source mesh and saved placement, with complete local preview coverage and separate garage totals', () => {
    const inventory = sourceInventory as unknown as ApartmentInventoryData;
    expect(inventory.definitions).toHaveLength(206);
    expect(inventory.definitions.reduce((count, item) => count + item.instanceCount, 0)).toBe(1291);
    expect(new Set(inventory.definitions.map(item => item.id)).size).toBe(206);
    expect(new Set(inventory.definitions.flatMap(item => item.sourceAssets)).size).toBe(206);
    expect(inventory.garage?.definitions).toHaveLength(76);
    expect(inventory.garage!.definitions.reduce((count, item) => count + item.instanceCount, 0)).toBe(186);
    expect(inventory.assemblies).toHaveLength(13);
    const all = [...inventory.definitions, ...inventory.garage!.definitions];
    expect(new Set(all.map(item => item.thumbnail)).size).toBe(229);
    for (const item of all) {
      expect(item.sourceIds.length, item.id).toBeGreaterThan(0);
      expect(Number.isInteger(item.instanceCount) && item.instanceCount > 0, item.id).toBe(true);
      expect(Object.values(item.roomCounts ?? {}).reduce((total, count) => total + count, 0), item.id).toBe(item.instanceCount);
      expect(['assembled', 'piece', 'unresolved']).toContain(item.assemblyStatus);
      expect(item.thumbnail, item.id).toMatch(/^\/images\/collections\/apartment-source\//);
      expect(existsSync(resolve('public', item.thumbnail!.slice(1))), item.thumbnail!).toBe(true);
    }
  });

  it('serves the historical source JSON through the review route and exposes all 206 definitions without purchase actions', () => {
    render(<ApartmentInventoryPage />);
    expect(metadata.title).toBe('Apartment inventory — Wilder World');
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(screen.getByRole('heading', { name: sourceInventory.scope })).toBeInTheDocument();
    expect(screen.getByText(sourceInventory.caveat)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Include structure' }));
    expect(screen.getByRole('status')).toHaveTextContent('206 definitions · 1,291 source placements');
    expect(screen.getAllByRole('article')).toHaveLength(24);
    expect(screen.queryByRole('button', { name: /Buy|Mint|Add to bag|Purchase/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Furniture collection' })).toHaveAttribute('href', '/store/collections/furniture');
  });
});
