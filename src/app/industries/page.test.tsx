import { within } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import IndustriesPage from './page';
import { getEntryBySlug } from '@/lib/wilderCollections';

describe('industry marketplace links', () => {
  it('keeps every industry link scoped to its configured original collection', () => {
    const container = document.createElement('div');
    container.innerHTML = renderToStaticMarkup(<IndustriesPage />);
    for (const section of container.querySelectorAll('section[id^="industry-"]')) {
      const link = within(section as HTMLElement).getByRole('link', { name: 'View on Market' });
      const href = new URL(link.getAttribute('href')!, 'https://example.test');
      expect(getEntryBySlug(href.searchParams.get('c')!)).toBeDefined();
    }
    expect(within(container.querySelector('#industry-avatars') as HTMLElement).getByRole('link')).toHaveAttribute('href', '/market?c=pack-avatars');
    expect(within(container.querySelector('#industry-weapons') as HTMLElement).getByRole('link')).toHaveAttribute('href', '/market?c=pack-weapons');
  });
});
