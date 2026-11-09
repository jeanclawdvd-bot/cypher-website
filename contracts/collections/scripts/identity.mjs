import { AbiCoder, keccak256 } from 'ethers';

const coder = AbiCoder.defaultAbiCoder();
function exactText(value) {
  if (typeof value !== 'string' || !value || value !== value.trim() || value !== value.normalize('NFC')) throw new Error('Identifier must be nonempty canonical NFC text without surrounding whitespace');
  return value;
}

/** Domain-separated registry string -> bytes32. Preserve case and spelling; never silently slug or lowercase source IDs. */
export function registryKey(namespace, identifier) {
  if (!['product', 'edition', 'colorway', 'purchase-settlement'].includes(namespace)) throw new Error('Unknown identifier domain');
  return keccak256(coder.encode(['string', 'string'], [`wilder:${namespace}:v1`, exactText(identifier)]));
}

/** Canonical source identity set, not a claim that the referenced geometry/content has been verified. */
export function sourceIdentityHash(sourceIds, sourceAssets) {
  const canonical = values => {
    const result = values.map(exactText).sort();
    if (new Set(result).size !== result.length) throw new Error('Duplicate source identity');
    return result;
  };
  const ids = canonical(sourceIds), assets = canonical(sourceAssets);
  if (!ids.length && !assets.length) throw new Error('At least one source identity is required');
  return keccak256(coder.encode(['string', 'string[]', 'string[]'], ['wilder:source-identity:v1', ids, assets]));
}
