import { resolve } from 'node:path';

// Historical approval evidence is bundled with the repository. Tests must not
// depend on Frank's workspace layout or overwrite those immutable snapshots.
export function handoffFixture(relativePath: string): string {
  if (!relativePath.startsWith('outputs/') || relativePath.split('/').includes('..')) {
    throw new Error('Expected a bundled outputs/ fixture path');
  }
  return resolve(process.cwd(), 'handoff/fixtures', relativePath);
}
