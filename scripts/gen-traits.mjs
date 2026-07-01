// Temporary one-off generator: fetches aggregated trait categories for every
// Wilder collection from OpenSea and writes a static TS module the market can
// use without a runtime fetch. Delete after running.
import { writeFileSync, readFileSync } from 'node:fs';

const KEY = readFileSync('.env.local', 'utf8')
  .split(/\r?\n/)
  .find((l) => l.startsWith('OPENSEA_API_KEY='))
  ?.slice('OPENSEA_API_KEY='.length)
  .trim();

if (!KEY) {
  console.error('No OPENSEA_API_KEY found in .env.local');
  process.exit(1);
}

const SLUGS = [
  'wilder-land-the-island',
  'wilderworld',
  'wilderbeasts-wolf',
  'wilderbeasts-wape',
  'wilder-moto',
  'wilderpals-gen',
  'wilder-crafts-genesis',
  'wilder-cribs-genesis',
  'aws0',
  'aws1',
  'air-wild',
];

async function fetchTraits(slug) {
  const res = await fetch(`https://api.opensea.io/api/v2/traits/${encodeURIComponent(slug)}`, {
    headers: { 'X-API-KEY': KEY, accept: 'application/json' },
  });
  if (!res.ok) {
    console.error(`  ${slug}: HTTP ${res.status}`);
    return [];
  }
  const data = await res.json();
  if (!data?.counts) return [];
  return Object.entries(data.counts)
    .map(([type, values]) => ({
      type,
      values: Object.entries(values)
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count),
    }))
    .sort((a, b) => a.type.localeCompare(b.type));
}

const out = {};
for (const slug of SLUGS) {
  process.stderr.write(`Fetching ${slug}... `);
  const cats = await fetchTraits(slug);
  out[slug] = cats;
  console.error(`${cats.length} categories`);
  await new Promise((r) => setTimeout(r, 350));
}

writeFileSync('scripts/traits-data.json', JSON.stringify(out, null, 2));
console.error('Wrote scripts/traits-data.json');
