import fs from 'node:fs';
import path from 'node:path';
import { fixture, H, Kind, tx } from '../test/helpers.mjs';
import { root } from './compile.mjs';

// In-process EDR only: no RPC URL, wallet key or live address is accepted by this script.
const f = await fixture();
try {
  if ((await f.provider.getNetwork()).chainId !== 31337n) throw new Error('Local chain 31337 required');
  const specs = [
    [f.vehicles, 'LOCAL_VEHICLE', Kind.Vehicle], [f.vehicles, 'LOCAL_RIM_SET', Kind.RimSet],
    [f.clothing, 'LOCAL_CLOTHING', Kind.Clothing], [f.clothing, 'LOCAL_TOTEM', Kind.Totem],
    [f.furniture, 'LOCAL_CHAIR', Kind.Furniture],
  ];
  const items = [];
  for (const [collection, key, kind] of specs) {
    const item = await f.approve(collection, key, kind, 2n);
    const tokenId = await f.mint(collection, item.editionId, `LOCAL_ORDER:${key}`);
    items.push({ key, kind, ...item, collection: await collection.getAddress(), tokenId: tokenId.toString(), cap: '2' });
  }
  await tx(f.vehicles.approveFitment(items[0].productId, items[1].productId));
  await tx(f.vehicles.connect(f.alice).installRims(BigInt(items[0].tokenId), BigInt(items[1].tokenId)));
  const output = { status: 'EPHEMERAL LOCAL FIXTURE ONLY; chain discarded after this run', chainId: 31337,
    warning: 'These addresses, two-unit caps and LOCAL identifiers are not live deployment or approved product data.',
    settlementRegistry: await f.registry.getAddress(), collections: {
      WilderVehicles: await f.vehicles.getAddress(), WilderClothing: await f.clothing.getAddress(), WilderFurniture: await f.furniture.getAddress(),
    }, items, legacyTrinity: { status: 'external-existing-owned-placeholder', contract: null, mintRoute: null },
    sampleSettlementId: H('LOCAL_ORDER:LOCAL_CLOTHING') };
  fs.writeFileSync(path.join(root, 'local-fixture.json'), JSON.stringify(output, null, 2) + '\n');
  console.log('Local fixture passed: 3 collections, 5 explicitly fictional products, rim installation and global settlement receipts. Local chain is discarded; no network deployment occurred.');
} finally {
  f.provider.destroy();
  await f.connection.close();
}
