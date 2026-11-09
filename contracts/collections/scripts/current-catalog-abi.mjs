import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Interface } from 'ethers';

// Encoding validation only. No provider, signer, deployment, transaction or output
// file is created here. These synthetic caps are never production approvals.
const VALIDATION_ONLY_CAP = 1n;
export const UINT64_MAX = (1n << 64n) - 1n;
export const COLLECTION_KIND = Object.freeze({
  vehicle: { collectionId: 'vehicles', contractFamily: 'WilderVehicles', value: 1 },
  rim_set: { collectionId: 'vehicles', contractFamily: 'WilderVehicles', value: 2 },
  clothing: { collectionId: 'clothing', contractFamily: 'WilderClothing', value: 3 },
  totem: { collectionId: 'clothing', contractFamily: 'WilderClothing', value: 4 },
  furniture: { collectionId: 'furniture', contractFamily: 'WilderFurniture', value: 5 },
});

export const collectionInterfaces = Object.fromEntries(
  ['WilderVehicles', 'WilderClothing', 'WilderFurniture'].map(name => [name,
    ['', 'Upgradeable'].map(suffix => new Interface(JSON.parse(fs.readFileSync(
      new URL(`../abi/${name}${suffix}.json`, import.meta.url), 'utf8')))),
  ]),
);

function roundtrip(iface, method, args) {
  const encoded = iface.encodeFunctionData(method, args);
  const decoded = iface.decodeFunctionData(method, encoded);
  assert.deepEqual(Array.from(decoded), args, `${method}: lossless ABI roundtrip`);
  assert.equal(iface.encodeFunctionData(method, decoded), encoded, `${method}: canonical re-encoding`);
  return encoded;
}

/** Check all current mappings against both constructor and UUPS interfaces. */
export function validateProductAbi({ collectionId, contractFamily, itemType, productKey, sourceIdHash }) {
  const spec = COLLECTION_KIND[itemType];
  assert.ok(spec, `Unknown item type: ${itemType}`);
  assert.equal(collectionId, spec.collectionId, `${itemType}: collection boundary`);
  assert.equal(contractFamily, spec.contractFamily, `${itemType}: contract family boundary`);
  const encoded = collectionInterfaces[contractFamily].map(iface => roundtrip(iface, 'approveProduct',
    [productKey, sourceIdHash, BigInt(spec.value), VALIDATION_ONLY_CAP]));
  assert.equal(encoded[0], encoded[1], 'Constructor/UUPS product ABI compatibility');
}

export function validateEditionAbi({ contractFamily, editionKey, productKey, colorwayKey, metadataURI }) {
  assert.ok(Object.hasOwn(collectionInterfaces, contractFamily), 'Unknown collection contract family');
  assert.ok(typeof metadataURI === 'string' && metadataURI.length, 'Metadata URI is required for ABI validation');
  const encoded = collectionInterfaces[contractFamily].map(iface => roundtrip(iface, 'approveEdition',
    [editionKey, productKey, colorwayKey, VALIDATION_ONLY_CAP, metadataURI]));
  assert.equal(encoded[0], encoded[1], 'Constructor/UUPS edition ABI compatibility');
}

export function validateUint64Abi(productKey, sourceIdHash, editionKey, colorwayKey) {
  for (const interfaces of Object.values(collectionInterfaces)) {
    for (const iface of interfaces) {
      roundtrip(iface, 'approveProduct', [productKey, sourceIdHash, 1n, UINT64_MAX]);
      roundtrip(iface, 'approveEdition', [editionKey, productKey, colorwayKey, UINT64_MAX,
        'local-abi-validation://unicode/Wiami-%E2%80%94-collection.json']);
      assert.throws(() => iface.encodeFunctionData('approveProduct', [productKey, sourceIdHash, 1n, UINT64_MAX + 1n]));
      assert.throws(() => iface.encodeFunctionData('approveEdition', [editionKey, productKey, colorwayKey, -1n, 'local-only://invalid']));
    }
  }
}
