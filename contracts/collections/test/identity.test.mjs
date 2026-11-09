import test from 'node:test';
import assert from 'node:assert/strict';
import { registryKey, sourceIdentityHash } from '../scripts/identity.mjs';

test('identifier domains cannot collide and canonical source sets preserve case-sensitive provenance', () => {
  const key = registryKey('product', 'clothing:BTWR_001');
  assert.match(key, /^0x[0-9a-f]{64}$/);
  assert.notEqual(key, registryKey('edition', 'clothing:BTWR_001'));
  assert.notEqual(key, registryKey('product', 'clothing:btwr_001'));
  assert.throws(() => registryKey('product', ' clothing:BTWR_001'));
  assert.throws(() => registryKey('unknown', 'clothing:BTWR_001'));
  const a = sourceIdentityHash(['SKU_B', 'SKU_A'], ['/Game/Path/B', '/Game/Path/A']);
  const b = sourceIdentityHash(['SKU_A', 'SKU_B'], ['/Game/Path/A', '/Game/Path/B']);
  assert.equal(a, b);
  assert.notEqual(a, sourceIdentityHash(['SKU_A', 'SKU_B'], ['/Game/Path/A', '/Game/path/B']));
  assert.throws(() => sourceIdentityHash(['SKU_A', 'SKU_A'], []));
  assert.throws(() => sourceIdentityHash([], []));
});
