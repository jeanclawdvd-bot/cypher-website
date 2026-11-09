import test from 'node:test';
import assert from 'node:assert/strict';
import {ZeroHash} from 'ethers';
import {fixture, productionFixture, H, Kind, tx, reverts, artifacts} from './helpers.mjs';

test('proxy initialization is atomic, implementation initialization is locked, and operation admins cannot become upgraders', async t=>{
  const f=await fixture(t,{upgradeable:true});
  for(const contract of [f.registry,f.vehicles,f.clothing,f.furniture]){
    const implementation=f.implementations.get(await contract.getAddress());
    const args=contract===f.registry?[f.admin.address,await f.governor.getAddress()]:[f.admin.address,await f.registry.getAddress(),await f.governor.getAddress()];
    await reverts(implementation.initialize(...args)); await reverts(contract.initialize(...args));
    assert.equal(await contract.hasRole(await contract.UPGRADE_ROLE(),await f.governor.getAddress()),true);
    await reverts(contract.grantRole(await contract.UPGRADE_ROLE(), f.admin.address));
    await reverts(contract.connect(f.stranger).grantRole(await contract.UPGRADE_ROLE(),f.stranger.address));
    await reverts(contract.upgradeToAndCall(await implementation.getAddress(),'0x'));
    await reverts(implementation.upgradeToAndCall(await implementation.getAddress(),'0x'));
  }
  const fresh=await f.rawDeploy('WilderVehiclesUpgradeable');
  await reverts(f.rawDeploy('ERC1967Proxy',[await fresh.getAddress(), fresh.interface.encodeFunctionData('initialize',[f.admin.address,await f.registry.getAddress(),f.admin.address])]));
});

test('timelock delay and contract-family validation prevent early or accidental wrong-family upgrades',async t=>{
  const f=await fixture(t,{upgradeable:true});
  const wrong=await f.rawDeploy('LocalClothingV2');
  const target=await f.vehicles.getAddress(), data=f.vehicles.interface.encodeFunctionData('upgradeToAndCall',[await wrong.getAddress(),'0x']), salt=H('wrong-family');
  await tx(f.governor.schedule(target,0n,data,ZeroHash,salt,3600n));
  await reverts(f.governor.execute(target,0n,data,ZeroHash,salt));
  await f.provider.send('evm_increaseTime',[3601]);await f.provider.send('evm_mine',[]);
  await reverts(f.governor.execute(target,0n,data,ZeroHash,salt));
  assert.equal(await f.vehicles.name(),'Wilder: Vehicles');
  const delegation=f.vehicles.interface.encodeFunctionData('grantRole',[await f.vehicles.UPGRADE_ROLE(),f.stranger.address]), rotation=H('no-eoa-upgrader');
  await tx(f.governor.schedule(target,0n,delegation,ZeroHash,rotation,3600n));
  await f.provider.send('evm_increaseTime',[3601]);await f.provider.send('evm_mine',[]);
  await reverts(f.governor.execute(target,0n,delegation,ZeroHash,rotation));
  assert.equal(await f.vehicles.hasRole(await f.vehicles.UPGRADE_ROLE(),f.stranger.address),false);
});

test('vehicle upgrade preserves owners, approvals, IDs, installed rims, fitment, immutable edition terms and lifetime caps',async t=>{
  const f=await fixture(t,{upgradeable:true});
  const car=await f.approve(f.vehicles,'upgrade-car',Kind.Vehicle,2n), rim=await f.approve(f.vehicles,'upgrade-rim',Kind.RimSet,1n);
  await tx(f.vehicles.approveFitment(car.productId,rim.productId));
  const carToken=await f.mint(f.vehicles,car.editionId,'upgrade-car-settlement'), rimToken=await f.mint(f.vehicles,rim.editionId,'upgrade-rim-settlement');
  await tx(f.vehicles.connect(f.alice).approve(f.bob.address,carToken));
  await tx(f.vehicles.connect(f.alice).installRims(carToken,rimToken));
  const v2=await f.upgrade(f.vehicles,'LocalVehiclesV2');
  assert.equal(await v2.version(),2n);assert.equal(await v2.nextTokenId(),3n);
  assert.equal(await v2.ownerOf(carToken),f.alice.address);assert.equal(await v2.getApproved(carToken),f.bob.address);
  assert.equal(await v2.tokenEdition(carToken),car.editionId);assert.equal((await v2.products(car.productId)).minted,1n);
  assert.equal((await v2.editions(car.editionId)).metadataURI,'local-fixture://upgrade-car/silver.json');
  assert.equal(await v2.installedRims(carToken),rimToken);assert.equal(await v2.installedOnVehicle(rimToken),carToken);
  assert.equal(await v2.approvedFitment(car.productId,rim.productId),true);
  await reverts(v2.connect(f.alice).transferFrom(f.alice.address,f.bob.address,carToken));
  await reverts(f.mint(v2,rim.editionId,'rim-cap-upgrade'));
  await reverts(v2.approveProduct(car.productId,H('replacement'),Kind.Vehicle,100n));
  await reverts(v2.approveEdition(car.editionId,car.productId,H('other-color'),2n,'changed'));
  await tx(v2.connect(f.alice).uninstallRims(carToken));await tx(v2.connect(f.bob).transferFrom(f.alice.address,f.bob.address,carToken));
  await f.mint(v2,car.editionId,'upgrade-car-two');await reverts(f.mint(v2,car.editionId,'upgrade-car-three'));
  const registry2=await f.upgrade(f.registry,'LocalRegistryV2');
  assert.equal(await registry2.consumedBy(H('upgrade-car-settlement')),await v2.getAddress());
  await reverts(f.mint(v2,car.editionId,'upgrade-car-settlement'));
});

test('clothing and furniture upgrades preserve usage locks, attestors, permit nonces and ownership versions',async t=>{
  const f=await fixture(t,{upgradeable:true});
  for(const [collection,kind,version,start,end] of [[f.clothing,Kind.Totem,'LocalClothingV2','equip','unequip'],[f.furniture,Kind.Furniture,'LocalFurnitureV2','place','pickup']]){
    const product=await f.approve(collection,version,kind),token=await f.mint(collection,product.editionId,version+'-mint');
    await tx(collection.grantRole(await collection.GAME_ATTESTOR_ROLE(),f.attestor.address));
    const permit=await f.permit(collection,token);
    await tx(collection.connect(f.alice)[start](permit.value,permit.attestor,permit.signature));
    const upgraded=await f.upgrade(collection,version);
    assert.equal((await upgraded.usage(token)).contextId,permit.value.contextId);
    assert.equal(await upgraded.usageNonces(f.alice.address),permit.value.nonce+1n);
    assert.equal(await upgraded.ownershipVersion(token),permit.value.ownershipVersion);
    await reverts(upgraded.connect(f.alice).transferFrom(f.alice.address,f.bob.address,token));
    await tx(upgraded.connect(f.alice)[end](token));
    await reverts(upgraded.connect(f.alice)[start](permit.value,permit.attestor,permit.signature));
    await tx(upgraded.connect(f.alice).transferFrom(f.alice.address,f.bob.address,token));
  }
});

test('production upgrade preserves consent, recipe bindings, input allowlist, edition rights, completion and cross-route replay',async t=>{
  const f=await productionFixture(t,{upgradeable:true});
  await f.grantRight();const block=await f.provider.getBlock('latest');
  const job=await f.authorize('before-upgrade',f.alice,BigInt(block.timestamp+86400));
  const p2=await f.upgrade(f.adapter,'LocalProductionV2');
  assert.equal(await p2.blueprintApproval(),await f.blueprint.getAddress());assert.equal(await p2.editionRights(),await f.rights.getAddress());
  assert.equal((await p2.jobs(job)).owner,f.alice.address);assert.equal((await p2.recipes(f.recipeId)).recipeHash,f.recipeHash);
  assert.equal(await p2.approvedInputs(await f.resource.getAddress()),1n);
  await tx(p2.settle(job));assert.equal((await p2.jobs(job)).state,2n);assert.equal(await p2.usedSettlements(job),true);
  assert.equal(await f.resource.balanceOf(f.alice.address),93n);assert.equal(await f.rightBalance(),9n);
  await reverts(p2.settle(job));await reverts(f.clothing.settlePurchase(job,f.item.editionId,f.alice.address));
  const impl=f.implementations.get(await f.adapter.getAddress());
  await reverts(impl.initialize(f.admin.address,await f.blueprint.getAddress(),await f.rights.getAddress(),await f.governor.getAddress()));
});

test('reviewed V2 fixtures keep every custom storage slot and type in the same inheritance order',()=>{
  const pairs=[['WilderVehiclesUpgradeable','LocalVehiclesV2'],['WilderClothingUpgradeable','LocalClothingV2'],['WilderFurnitureUpgradeable','LocalFurnitureV2'],['SettlementRegistryUpgradeable','LocalRegistryV2'],['ProductionSettlementUpgradeable','LocalProductionV2']];
  function canonical(layout,type){const entry=layout.types[type];return {encoding:entry.encoding,label:entry.label,numberOfBytes:entry.numberOfBytes,...(entry.key?{key:canonical(layout,entry.key)}:{}),...(entry.value?{value:canonical(layout,entry.value)}:{}),...(entry.base?{base:canonical(layout,entry.base)}:{}),...(entry.members?{members:entry.members.map(m=>({label:m.label,slot:m.slot,offset:m.offset,type:canonical(layout,m.type)}))}:{})};}
  for(const [before,after] of pairs){
    const a=artifacts[before].storageLayout,b=artifacts[after].storageLayout;
    const normalize=layout=>layout.storage.map(s=>({label:s.label,slot:s.slot,offset:s.offset,type:canonical(layout,s.type)}));
    assert.deepEqual(normalize(b),normalize(a),before+' storage moved');
  }
});
