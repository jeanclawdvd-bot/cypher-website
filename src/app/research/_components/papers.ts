export interface Paper {
  slug: string;
  title: string;
  year: string;
  blurb: string;
  available: boolean;
}

// Ordered newest-first, matching the Research column in the site footer.
export const papers: Paper[] = [
  {
    slug: 'the-grid',
    title: 'The Grid',
    year: '2026',
    blurb: 'A distributed compute fabric for running autonomous agents at scale.',
    available: false,
  },
  {
    slug: 'aura-harness',
    title: 'AURA Harness',
    year: '2025',
    blurb: 'A benchmark and evaluation harness for autonomous engineering agents.',
    available: false,
  },
  {
    slug: 'zns',
    title: 'ZNS',
    year: '2022',
    blurb: 'The Zero Name Service — a trust and naming layer for autonomous systems.',
    available: false,
  },
  {
    slug: 'zero-os',
    title: 'ZERO OS',
    year: '2020',
    blurb: 'A peer-to-peer social operating system and a decentralized alternative to centralized platforms.',
    available: true,
  },
];

export function getPaper(slug: string): Paper | undefined {
  return papers.find((p) => p.slug === slug);
}
