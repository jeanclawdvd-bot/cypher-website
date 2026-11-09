import test from 'node:test';
import assert from 'node:assert/strict';
import { ZeroHash, ZeroAddress, AbiCoder, keccak256 } from 'ethers';
import { productionFixture, fixture, H, Kind, tx, reverts } from './helpers.mjs';

test('shared registry rejects cross-collection purchase replay and unauthorized direct consumption', async t => {
  const f = await fixture(t);
  const car = await f.approve(f.vehicles, 'car', Kind.Vehicle);
  const shirt = await f.approve(f.clothing, 'shirt', Kind.Clothing);
  const chair = await f.approve(f.furniture, 'chair', Kind.Furniture);
  await f.mint(f.vehicles, car.editionId, 'global-order');
  for (const [collection, item] of [[f.clothing, shirt], [f.furniture, chair]]) {
    await reverts(collection.settlePurchase(H('global-order'), item.editionId, f.alice.address));
    assert.equal((await collection.editions(item.editionId)).minted, 0n);
  }
  assert.equal(await f.registry.consumedBy(H('global-order')), await f.vehicles.getAddress());
  await reverts(f.registry.consume(H('arbitrary-consumption')));
  await reverts(f.registry.connect(f.alice).grantRole(await f.registry.COLLECTION_ROLE(), f.alice.address));
  await reverts(f.registry.grantRole(await f.registry.COLLECTION_ROLE(), f.admin.address));
});

test('production consumes whole-unit resources, components and independent edition right exactly once', async t => {
  const f = await productionFixture(t);
  await f.grantRight();
  const job = await f.authorize('job1');
  await tx(f.adapter.settle(job));
  assert.equal(await f.resource.balanceOf(f.alice.address), 93n);
  assert.equal(await f.components.balanceOf(f.alice.address, 42), 18n);
  assert.equal(await f.rightBalance(), 9n);
  assert.equal(await f.clothing.ownerOf(1), f.alice.address);
  assert.equal(await f.clothing.tokenEdition(1), f.item.editionId);
  assert.equal((await f.adapter.jobs(job)).state, 2n);
  assert.equal(await f.registry.consumedBy(job), f.collectionAddress);
  await reverts(f.adapter.settle(job));
  await reverts(f.clothing.settlePurchase(job, f.item.editionId, f.bob.address));
  assert.equal(await f.resource.balanceOf(f.alice.address), 93n);
});

test('recipe approval does not confer mint rights: rights must match owner, collection, edition and recipe', async t => {
  const f = await productionFixture(t);
  const job = await f.authorize('license-boundary');
  await reverts(f.adapter.settle(job));
  await f.grantRight(f.bob.address);
  await f.grantRight(f.alice.address, 1n, await f.furniture.getAddress());
  await f.grantRight(f.alice.address, 1n, f.collectionAddress, H('other-edition'));
  await f.grantRight(f.alice.address, 1n, f.collectionAddress, f.item.editionId, H('other-recipe'));
  await reverts(f.adapter.settle(job));
  assert.equal(await f.resource.balanceOf(f.alice.address), 100n);
  assert.equal((await f.adapter.jobs(job)).state, 1n);
  await f.grantRight(f.alice.address, 1n);
  await tx(f.adapter.settle(job));
  assert.equal(await f.rightBalance(), 0n);
});

test('missing component approval rolls back earlier resource burn and consumed right; retry is safe', async t => {
  const f = await productionFixture(t);
  await f.grantRight(f.alice.address, 1n);
  const job = await f.authorize('atomic-inputs');
  await tx(f.components.connect(f.alice).setApprovalForAll(f.adapterAddress, false));
  await reverts(f.adapter.settle(job));
  assert.equal(await f.resource.balanceOf(f.alice.address), 100n);
  assert.equal(await f.resource.allowance(f.alice.address, f.adapterAddress), 100n);
  assert.equal(await f.rightBalance(), 1n);
  assert.equal(await f.adapter.usedSettlements(job), false);
  assert.equal(await f.registry.consumedBy(job), ZeroAddress);
  assert.equal((await f.adapter.jobs(job)).state, 1n);
  await tx(f.components.connect(f.alice).setApprovalForAll(f.adapterAddress, true));
  await tx(f.adapter.settle(job));
  assert.equal(await f.resource.balanceOf(f.alice.address), 93n);
});

test('cap rejection rolls back production rights and all consumed inputs', async t => {
  const f = await productionFixture(t, { cap: 1n });
  await f.mint(f.clothing, f.item.editionId, 'sold-out');
  await f.grantRight(f.alice.address, 1n);
  const job = await f.authorize('cap-rollback');
  await reverts(f.adapter.settle(job));
  assert.equal(await f.resource.balanceOf(f.alice.address), 100n);
  assert.equal(await f.components.balanceOf(f.alice.address, 42), 20n);
  assert.equal(await f.rightBalance(), 1n);
  assert.equal(await f.registry.consumedBy(job), ZeroAddress);
  assert.equal((await f.adapter.jobs(job)).state, 1n);
});

test('cross-route and cross-collection replay rolls back inputs even when production authorization is otherwise valid', async t => {
  const f = await productionFixture(t);
  const chair = await f.approve(f.furniture, 'chair', Kind.Furniture);
  await f.grantRight(f.alice.address, 3n);
  const job = await f.authorize('already-bought-other-collection');
  await tx(f.furniture.settlePurchase(job, chair.editionId, f.alice.address));
  await reverts(f.adapter.settle(job));
  const same = await f.authorize('already-bought-same-collection');
  await tx(f.clothing.settlePurchase(same, f.item.editionId, f.alice.address));
  await reverts(f.adapter.settle(same));
  assert.equal(await f.resource.balanceOf(f.alice.address), 100n);
  assert.equal(await f.rightBalance(), 3n);
  const valid = await f.authorize('produced-first');
  await tx(f.adapter.settle(valid));
  await reverts(f.furniture.settlePurchase(valid, chair.editionId, f.alice.address));
});

test('only an authorized settler can complete owner-authorized jobs; cancellation, expiry and recipe revocation prevent settlement', async t => {
  const f = await productionFixture(t);
  await f.grantRight();
  await reverts(f.adapter.settle(H('no-owner-authorization')));
  const job = await f.authorize('cancel-job');
  await reverts(f.adapter.connect(f.bob).settle(job));
  await reverts(f.adapter.connect(f.bob).cancelJob(job));
  await tx(f.adapter.connect(f.alice).cancelJob(job));
  await reverts(f.adapter.settle(job));
  await reverts(f.adapter.connect(f.alice).authorizeJob(H('cancel-job'), f.recipeId, 9999999999n));
  const expiring = await f.authorize('expired-job');
  await f.connection.provider.request({ method: 'evm_increaseTime', params: [4000] });
  await f.connection.provider.request({ method: 'evm_mine', params: [] });
  await reverts(f.adapter.settle(expiring));
  const revoked = await f.authorize('revoked-recipe');
  await tx(f.blueprint.setApproved(f.recipeId, ZeroHash));
  await reverts(f.adapter.settle(revoked));
  await reverts(f.adapter.connect(f.alice).authorizeJob(H('revoked-new-job'), f.recipeId, 9999999999n));
  assert.equal(await f.resource.balanceOf(f.alice.address), 100n);
});

test('recipe/configuration rejects unapproved, zero, duplicated, fractional and arbitrary inputs, and cannot be mutated', async t => {
  const f = await productionFixture(t);
  const fractional = await f.deploy('LocalFractionalResource');
  await reverts(f.adapter.approveInput(await fractional.getAddress(), 1));
  await reverts(f.adapter.connect(f.bob).approveInput(f.alice.address, 1));
  await reverts(f.adapter.approveInput(f.alice.address, 1));
  await reverts(f.adapter.configureRecipe(f.recipeId, f.collectionAddress, f.item.editionId, f.inputs));
  await reverts(f.adapter.connect(f.alice).configureRecipe(H('unprivileged'), f.collectionAddress, f.item.editionId, f.inputs));
  await reverts(f.adapter.configureRecipe(H('not-approved'), f.collectionAddress, f.item.editionId, f.inputs));
  const invalidLists = [[], [{ ...f.inputs[0], amount: 0n }], [f.inputs[0], f.inputs[0]], [{ ...f.inputs[0], id: 1n }], [{ ...f.inputs[0], token: f.alice.address }]];
  for (let i = 0; i < invalidLists.length; i++) {
    const recipe = H(`invalid-${i}`), inputs = invalidLists[i];
    await tx(f.blueprint.setApproved(recipe, f.hashInputs(inputs)));
    await reverts(f.adapter.configureRecipe(recipe, f.collectionAddress, f.item.editionId, inputs));
    assert.equal((await f.adapter.recipeInputs(recipe)).length, 0);
  }
  const fakeAdapter = await f.deploy('LocalReceiver');
  await reverts(f.clothing.grantRole(await f.clothing.PRODUCTION_ROLE(), await fakeAdapter.getAddress()));
});

test('production receiver rejection atomically restores input balances, rights, replay registry and job, then retry succeeds', async t => {
  const f = await productionFixture(t);
  const receiver = await f.deploy('LocalReceiver');
  const address = await receiver.getAddress();
  await tx(f.resource.mint(address, 20n));
  await tx(f.components.mint(address, 42, 6n));
  await tx(receiver.callTarget(await f.resource.getAddress(), f.resource.interface.encodeFunctionData('approve', [f.adapterAddress, 20n])));
  await tx(receiver.callTarget(await f.components.getAddress(), f.components.interface.encodeFunctionData('setApprovalForAll', [f.adapterAddress, true])));
  await f.grantRight(address, 2n);
  const job = await f.adapter.jobIdFor(address, f.recipeId, H('receiver-job'));
  const nested = await f.adapter.jobIdFor(address, f.recipeId, H('nested-production'));
  for (const salt of [H('receiver-job'), H('nested-production')]) await tx(receiver.callTarget(f.adapterAddress, f.adapter.interface.encodeFunctionData('authorizeJob', [salt, f.recipeId, 9999999999n])));
  await tx(f.adapter.grantRole(await f.adapter.SETTLER_ROLE(), address));
  const attack = f.adapter.interface.encodeFunctionData('settle', [nested]);
  await tx(receiver.configure(f.adapterAddress, attack, true));
  await reverts(f.adapter.settle(job));
  assert.equal(await f.resource.balanceOf(address), 20n);
  assert.equal(await f.components.balanceOf(address, 42), 6n);
  assert.equal(await f.rightBalance(address), 2n);
  assert.equal(await f.registry.consumedBy(job), ZeroAddress);
  assert.equal((await f.adapter.jobs(job)).state, 1n);
  assert.equal(await f.clothing.nextTokenId(), 1n);
  await tx(receiver.configure(f.adapterAddress, attack, false));
  await tx(f.adapter.settle(job));
  assert.equal(await receiver.reentrySucceeded(), false);
  assert.equal((await f.adapter.jobs(nested)).state, 1n);
  assert.equal(await f.resource.balanceOf(address), 13n);
  assert.equal(await f.rightBalance(address), 1n);
  assert.equal(await f.clothing.balanceOf(address), 1n);
});

test('observed job salt cannot reserve another owner job; identity binds owner, recipe, adapter and chain', async t => {
  const f = await productionFixture(t);
  const salt = H('observed-owner-salt');
  const victimId = await f.adapter.jobIdFor(f.alice.address, f.recipeId, salt);
  const attackerId = await f.adapter.jobIdFor(f.bob.address, f.recipeId, salt);
  assert.notEqual(victimId, attackerId);
  await tx(f.adapter.connect(f.bob).authorizeJob(salt, f.recipeId, 9999999999n));
  await tx(f.adapter.connect(f.bob).cancelJob(attackerId));
  await tx(f.adapter.connect(f.alice).authorizeJob(salt, f.recipeId, 9999999999n));
  assert.equal((await f.adapter.jobs(victimId)).owner, f.alice.address);
  assert.equal((await f.adapter.jobs(attackerId)).state, 3n);
  const encodedId = (chainId, adapter, owner, recipe) => keccak256(AbiCoder.defaultAbiCoder().encode(
    ['bytes32', 'uint256', 'address', 'address', 'bytes32', 'bytes32'], [awaitedDomain, chainId, adapter, owner, recipe, salt]));
  const awaitedDomain = await f.adapter.JOB_DOMAIN();
  assert.equal(victimId, encodedId(31337n, f.adapterAddress, f.alice.address, f.recipeId));
  assert.notEqual(victimId, encodedId(1n, f.adapterAddress, f.alice.address, f.recipeId));
  assert.notEqual(victimId, encodedId(31337n, f.collectionAddress, f.alice.address, f.recipeId));
  assert.notEqual(victimId, await f.adapter.jobIdFor(f.alice.address, H('other-recipe'), salt));
  await f.grantRight(f.alice.address, 1n);
  await tx(f.adapter.settle(victimId));
  assert.equal(await f.clothing.ownerOf(1), f.alice.address);
});
