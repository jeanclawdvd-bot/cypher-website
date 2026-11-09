import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Separate generated local configuration. Never edit the hosting configuration
// or attach a remote database; all CLI invocations must use --local.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceDirectory = resolve(root, 'dist/server');
const source = JSON.parse(await readFile(resolve(sourceDirectory, 'wrangler.json'), 'utf8'));
const outputDirectory = resolve(root, '.tmp/local-store');
await mkdir(outputDirectory, { recursive: true });
const local = {
  name: 'wilder-supply-local',
  compatibility_date: source.compatibility_date,
  compatibility_flags: source.compatibility_flags,
  no_bundle: true,
  rules: source.rules,
  dev: { ip: '127.0.0.1', local_protocol: 'http' },
  main: resolve(sourceDirectory, source.main),
  assets: { ...source.assets, directory: resolve(sourceDirectory, source.assets.directory) },
  vars: { STORE_MODE: 'local' },
  services: [],
  d1_databases: [{
    binding: 'STORE_DB',
    database_name: 'wilder-supply-local',
    database_id: '5b6498d0-15b6-4e58-9137-879187910001',
    migrations_dir: resolve(root, 'migrations/store'),
    remote: false,
  }],
  observability: { enabled: false },
};
await writeFile(resolve(outputDirectory, 'wrangler.json'), JSON.stringify(local, null, 2) + '\n');
console.log('Local-only store configuration prepared at .tmp/local-store/wrangler.json. No remote services configured.');
