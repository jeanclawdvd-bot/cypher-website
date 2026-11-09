import test from 'node:test';
import assert from 'node:assert/strict';
import { ZeroHash, ZeroAddress } from 'ethers';
import { fixture, H, Kind, tx, reverts, artifacts } from './helpers.mjs';

test('three ERC721 collections enforce kind boundaries, roles, nonzero config and no public mint/burn', async t => {
  const f = await fixture(t);
  for (const c of [f.vehicles, f.clothing, f.furniture]) assert.equal(await c.supportsInterface('0x80ac58cd'), true);
  await reverts(f.clothing.connect(f.alice).approveProduct(H('x'), H('sku'), Kind.Clothing, 1));
  await reverts(f.clothing.approveProduct(H('x'), H('sku'), Kind.Vehicle, 1));
  await reverts(f.vehicles.approveProduct(H('x'), H('sku'), Kind.Furniture, 1));
  await reverts(f.furniture.approveProduct(H('x'), H('sku'), Kind.Totem, 1));
  await reverts(f.clothing.approveProduct(ZeroHash, H('sku'), Kind.Clothing, 1));
  await reverts(f.clothing.approveProduct(H('x'), H('sku'), Kind.Clothing, 0));
  const item = await f.approve(f.clothing, 'local-shirt', Kind.Clothing);
  const totem = await f.approve(f.clothing, 'local-totem', Kind.Totem);
  await f.mint(f.clothing, totem.editionId, 'totem-order');
  await reverts(f.clothing.connect(f.alice).settlePurchase(H('bad'), item.editionId, f.alice.address));
  await reverts(f.clothing.connect(f.alice).settleProduction(H('bad'), item.editionId, f.alice.address));
  await reverts(f.clothing.grantRole(await f.clothing.PRODUCTION_ROLE(), f.admin.address));
  for (const name of ['WilderVehicles', 'WilderClothing', 'WilderFurniture']) {
    assert.equal(artifacts[name].abi.some(a => a.type === 'function' && ['mint', 'burn', 'setTokenURI'].includes(a.name)), false);
  }
});

test('configuration is immutable; lifetime product cap spans color editions, edition cap is independent', async t => {
  const f = await fixture(t);
  const { productId, editionId } = await f.approve(f.clothing, 'capped', Kind.Clothing, 3n, 1n);
  const blueEdition = H('blue-edition');
  await tx(f.clothing.approveEdition(blueEdition, productId, H('blue'), 3, 'local-fixture://blue.json'));
  await reverts(f.clothing.approveProduct(productId, H('other-source'), Kind.Clothing, 100));
  await reverts(f.clothing.approveEdition(editionId, productId, H('red'), 3, 'local-fixture://changed'));
  const token = await f.mint(f.clothing, editionId, 'cap1');
  assert.equal(await f.clothing.tokenEdition(token), editionId);
  assert.equal(await f.clothing.tokenProduct(token), productId);
  assert.equal(await f.clothing.tokenURI(token), 'local-fixture://capped/silver.json');
  await reverts(f.clothing.settlePurchase(H('edition-exhausted'), editionId, f.alice.address));
  await f.mint(f.clothing, blueEdition, 'cap2');
  await f.mint(f.clothing, blueEdition, 'cap3');
  await reverts(f.clothing.settlePurchase(H('product-exhausted'), blueEdition, f.alice.address));
  assert.equal((await f.clothing.products(productId)).minted, 3n);
  assert.equal(await f.clothing.usedSettlements(H('product-exhausted')), false);
});

test('settlement replay survives transfer and cannot change recipient or color', async t => {
  const f = await fixture(t);
  const first = await f.approve(f.clothing, 'first', Kind.Clothing);
  const second = await f.approve(f.clothing, 'second', Kind.Clothing);
  const token = await f.mint(f.clothing, first.editionId, 'same-order');
  await tx(f.clothing.connect(f.alice).transferFrom(f.alice.address, f.bob.address, token));
  await reverts(f.clothing.settlePurchase(H('same-order'), second.editionId, f.bob.address));
  assert.equal(await f.clothing.nextTokenId(), 2n);
});

test('safe receiver reentrancy cannot mint a second item; rejection rolls back identity, cap and replay', async t => {
  const f = await fixture(t);
  const item = await f.approve(f.clothing, 'callback', Kind.Clothing, 3n);
  const receiver = await f.deploy('LocalReceiver');
  const address = await receiver.getAddress();
  await tx(f.clothing.grantRole(await f.clothing.FULFILLER_ROLE(), address));
  const attack = f.clothing.interface.encodeFunctionData('settlePurchase', [H('nested'), item.editionId, address]);
  await tx(receiver.configure(await f.clothing.getAddress(), attack, false));
  await f.mint(f.clothing, item.editionId, 'outer', address);
  assert.equal(await receiver.reentrySucceeded(), false);
  assert.equal(await f.clothing.usedSettlements(H('nested')), false);
  assert.equal(await f.clothing.balanceOf(address), 1n);
  await tx(receiver.configure(await f.clothing.getAddress(), attack, true));
  await reverts(f.clothing.settlePurchase(H('rejected'), item.editionId, address));
  assert.equal(await f.clothing.usedSettlements(H('rejected')), false);
  assert.equal((await f.clothing.editions(item.editionId)).minted, 1n);
  assert.equal(await f.clothing.nextTokenId(), 2n);
  await tx(receiver.configure(await f.clothing.getAddress(), attack, false));
  await f.mint(f.clothing, item.editionId, 'rejected', address);
  assert.equal(await f.clothing.nextTokenId(), 3n);
});

test('rim install requires approved fitment and same actual owner; locks both tokens including operator transfer', async t => {
  const f = await fixture(t);
  const car = await f.approve(f.vehicles, 'car', Kind.Vehicle);
  const rim = await f.approve(f.vehicles, 'rims', Kind.RimSet);
  const carId = await f.mint(f.vehicles, car.editionId, 'car-order');
  const rimId = await f.mint(f.vehicles, rim.editionId, 'rim-order');
  await reverts(f.vehicles.connect(f.alice).installRims(carId, rimId));
  await tx(f.vehicles.approveFitment(car.productId, rim.productId));
  await tx(f.vehicles.connect(f.alice).setApprovalForAll(f.bob.address, true));
  await reverts(f.vehicles.connect(f.bob).installRims(carId, rimId));
  await reverts(f.vehicles.connect(f.alice).installRims(rimId, carId));
  await tx(f.vehicles.connect(f.alice).installRims(carId, rimId));
  assert.equal(await f.vehicles.installedRims(carId), rimId);
  assert.equal(await f.vehicles.installedOnVehicle(rimId), carId);
  for (const token of [carId, rimId]) {
    await reverts(f.vehicles.connect(f.alice).transferFrom(f.alice.address, f.bob.address, token));
    await reverts(f.vehicles.connect(f.bob)['safeTransferFrom(address,address,uint256)'](f.alice.address, f.bob.address, token));
  }
  await reverts(f.vehicles.connect(f.alice).installRims(carId, rimId));
  await reverts(f.vehicles.connect(f.bob).uninstallRims(carId));
  await tx(f.vehicles.revokeRole(await f.vehicles.CONFIG_ROLE(), f.admin.address));
  await tx(f.vehicles.connect(f.alice).uninstallRims(carId));
  assert.equal(await f.vehicles.installedOnVehicle(rimId), 0n);
  await tx(f.vehicles.connect(f.bob).transferFrom(f.alice.address, f.bob.address, rimId));
  await reverts(f.vehicles.connect(f.alice).installRims(carId, rimId));
  assert.equal(await f.vehicles.installedRims(carId), 0n);
});

test('furniture placement validates game attestation, nonce, owner, context and expiry; pickup is always owner safe', async t => {
  const f = await fixture(t);
  const item = await f.approve(f.furniture, 'chair', Kind.Furniture);
  const token = await f.mint(f.furniture, item.editionId, 'chair-order');
  await tx(f.furniture.grantRole(await f.furniture.GAME_ATTESTOR_ROLE(), f.attestor.address));
  const good = await f.permit(f.furniture, token);
  await reverts(f.furniture.connect(f.bob).place(good.value, good.attestor, good.signature));
  const wrongSigner = await f.permit(f.furniture, token, {}, f.stranger);
  await reverts(f.furniture.connect(f.alice).place(wrongSigner.value, wrongSigner.attestor, wrongSigner.signature));
  await reverts(f.furniture.connect(f.alice).place({ ...good.value, contextId: H('unapproved-room') }, good.attestor, good.signature));
  const expired = await f.permit(f.furniture, token, { deadline: 1n });
  await reverts(f.furniture.connect(f.alice).place(expired.value, expired.attestor, expired.signature));
  await tx(f.furniture.connect(f.alice).place(good.value, good.attestor, good.signature));
  assert.equal((await f.furniture.usage(token)).contextId, good.value.contextId);
  await reverts(f.furniture.connect(f.alice).transferFrom(f.alice.address, f.bob.address, token));
  await reverts(f.furniture.connect(f.bob).pickup(token));
  await tx(f.furniture.revokeRole(await f.furniture.GAME_ATTESTOR_ROLE(), f.attestor.address));
  await tx(f.furniture.connect(f.alice).pickup(token));
  await tx(f.furniture.grantRole(await f.furniture.GAME_ATTESTOR_ROLE(), f.attestor.address));
  await reverts(f.furniture.connect(f.alice).place(good.value, good.attestor, good.signature));
  await tx(f.furniture.connect(f.alice).transferFrom(f.alice.address, f.bob.address, token));
});

test('old permits remain invalid after transfer away/back, explicit nonce cancellation, or cross-collection use', async t => {
  const f = await fixture(t);
  const chair = await f.approve(f.furniture, 'chair', Kind.Furniture);
  const shirt = await f.approve(f.clothing, 'shirt', Kind.Clothing);
  const token = await f.mint(f.furniture, chair.editionId, 'chair-order');
  await f.mint(f.clothing, shirt.editionId, 'shirt-order');
  for (const c of [f.furniture, f.clothing]) await tx(c.grantRole(await c.GAME_ATTESTOR_ROLE(), f.attestor.address));
  const old = await f.permit(f.furniture, token);
  await reverts(f.clothing.connect(f.alice).equip(old.value, old.attestor, old.signature));
  await tx(f.furniture.connect(f.alice).transferFrom(f.alice.address, f.bob.address, token));
  await tx(f.furniture.connect(f.bob).transferFrom(f.bob.address, f.alice.address, token));
  await reverts(f.furniture.connect(f.alice).place(old.value, old.attestor, old.signature));
  const fresh = await f.permit(f.furniture, token);
  await tx(f.furniture.connect(f.alice).invalidateUsePermits(5));
  await reverts(f.furniture.connect(f.alice).place(fresh.value, fresh.attestor, fresh.signature));
  const current = await f.permit(f.furniture, token);
  await tx(f.furniture.connect(f.alice).place(current.value, current.attestor, current.signature));
});

test('Totem equipment shares Clothing collection and owner-only release semantics', async t => {
  const f = await fixture(t);
  const item = await f.approve(f.clothing, 'totem', Kind.Totem);
  const token = await f.mint(f.clothing, item.editionId, 'totem-order');
  await tx(f.clothing.grantRole(await f.clothing.GAME_ATTESTOR_ROLE(), f.attestor.address));
  const p = await f.permit(f.clothing, token);
  await tx(f.clothing.connect(f.alice).equip(p.value, p.attestor, p.signature));
  await reverts(f.clothing.connect(f.alice).transferFrom(f.alice.address, f.bob.address, token));
  await reverts(f.clothing.connect(f.bob).unequip(token));
  await tx(f.clothing.connect(f.alice).unequip(token));
  await tx(f.clothing.connect(f.alice).transferFrom(f.alice.address, f.bob.address, token));
});

test('ERC1271 game attestor accepts valid signatures but rejects wrong, malformed and revoked authorization without consuming nonces', async t => {
  const f = await fixture(t);
  const item = await f.approve(f.furniture, 'contract-attested-chair', Kind.Furniture);
  const token = await f.mint(f.furniture, item.editionId, 'contract-attested-order');
  const attestor = await f.deploy('LocalContractAttestor', [f.attestor.address]);
  const attestorAddress = await attestor.getAddress();
  const role = await f.furniture.GAME_ATTESTOR_ROLE();
  await tx(f.furniture.grantRole(role, attestorAddress));
  const good = await f.permit(f.furniture, token);
  const wrongSigner = await f.permit(f.furniture, token, {}, f.stranger);
  await reverts(f.furniture.connect(f.alice).place(good.value, attestorAddress, wrongSigner.signature));
  await reverts(f.furniture.connect(f.alice).place(good.value, attestorAddress, '0x12'));
  for (const mode of [1, 2, 3]) {
    await tx(attestor.setMode(mode));
    await reverts(f.furniture.connect(f.alice).place(good.value, attestorAddress, good.signature));
    assert.equal(await f.furniture.usageNonces(f.alice.address), 0n);
    assert.equal((await f.furniture.usage(token)).contextId, ZeroHash);
  }
  await tx(attestor.setMode(0));
  await tx(f.furniture.connect(f.alice).place(good.value, attestorAddress, good.signature));
  assert.equal(await f.furniture.usageNonces(f.alice.address), 1n);
  await tx(f.furniture.revokeRole(role, attestorAddress));
  // Revoking the signer never traps an already placed token.
  await tx(f.furniture.connect(f.alice).pickup(token));
  const next = await f.permit(f.furniture, token);
  await reverts(f.furniture.connect(f.alice).place(next.value, attestorAddress, next.signature));
  assert.equal(await f.furniture.usageNonces(f.alice.address), 1n);
  await tx(f.furniture.grantRole(role, attestorAddress));
  await tx(f.furniture.connect(f.alice).place(next.value, attestorAddress, next.signature));
  assert.equal(await f.furniture.usageNonces(f.alice.address), 2n);
});

test('a receiver may forward a new token during its callback: mint recipient is not current ownership proof', async t => {
  const f = await fixture(t);
  const item = await f.approve(f.clothing, 'forwarded-shirt', Kind.Clothing, 3n);
  const receiver = await f.deploy('LocalReceiver');
  const receiverAddress = await receiver.getAddress();
  const collectionAddress = await f.clothing.getAddress();
  const token = await f.clothing.nextTokenId();
  const forward = id => f.clothing.interface.encodeFunctionData('safeTransferFrom(address,address,uint256)', [receiverAddress, f.bob.address, id]);
  await tx(receiver.configure(collectionAddress, forward(token), false));
  const receipt = await tx(f.clothing.settlePurchase(H('forwarded-order'), item.editionId, receiverAddress));
  const logs = receipt.logs.filter(log => log.address.toLowerCase() === collectionAddress.toLowerCase())
    .map(log => f.clothing.interface.parseLog(log));
  const settlement = logs.find(log => log?.name === 'SettlementMinted');
  const transfers = logs.filter(log => log?.name === 'Transfer');
  assert.equal(await receiver.reentrySucceeded(), true); // Ordinary owner transfer is permitted; this is not another mint.
  assert.equal(settlement.args.recipient, receiverAddress);
  assert.equal(await f.clothing.ownerOf(token), f.bob.address);
  assert.notEqual(await f.clothing.ownerOf(token), settlement.args.recipient);
  assert.deepEqual(transfers.map(log => [log.args.from, log.args.to]), [[ZeroAddress, receiverAddress], [receiverAddress, f.bob.address]]);
  assert.equal(await f.clothing.balanceOf(receiverAddress), 0n);
  assert.equal(await f.clothing.tokenEdition(token), item.editionId);
  assert.equal((await f.clothing.editions(item.editionId)).minted, 1n);
  assert.equal(await f.registry.consumedBy(H('forwarded-order')), collectionAddress);
  await reverts(f.clothing.settlePurchase(H('forwarded-order'), item.editionId, receiverAddress));
  // Rejecting after forwarding must undo the nested transfer as well as the original mint.
  const rejectedToken = await f.clothing.nextTokenId();
  await tx(receiver.configure(collectionAddress, forward(rejectedToken), true));
  await reverts(f.clothing.settlePurchase(H('rejected-forward'), item.editionId, receiverAddress));
  await reverts(f.clothing.ownerOf(rejectedToken));
  assert.equal(await f.clothing.balanceOf(f.bob.address), 1n);
  assert.equal(await f.clothing.nextTokenId(), rejectedToken);
  assert.equal(await f.registry.consumedBy(H('rejected-forward')), ZeroAddress);
});
