import fs from 'node:fs';
import path from 'node:path';
import {productionFixture, Kind, tx, artifacts} from '../test/helpers.mjs';
import {root} from './compile.mjs';

// In-process EDR only: no RPC endpoint, wallet key or production destination accepted.
const f=await productionFixture(undefined,{upgradeable:true});
try{
  if((await f.provider.getNetwork()).chainId!==31337n)throw new Error('Local chain 31337 required');
  const specs=[[f.vehicles,'LOCAL_VEHICLE',Kind.Vehicle],[f.vehicles,'LOCAL_RIM_SET',Kind.RimSet],[f.clothing,'LOCAL_TOTEM',Kind.Totem],[f.furniture,'LOCAL_CHAIR',Kind.Furniture]];
  const items=[];
  for(const [collection,key,kind] of specs){const p=await f.approve(collection,key,kind,2n);const token=await f.mint(collection,p.editionId,'LOCAL_UPGRADEABLE_ORDER:'+key);items.push({key,kind,...p,tokenId:String(token),cap:'2',collection:await collection.getAddress()});}
  await tx(f.vehicles.approveFitment(items[0].productId,items[1].productId));
  await tx(f.vehicles.connect(f.alice).installRims(items[0].tokenId,items[1].tokenId));
  await f.grantRight();const job=await f.authorize('LOCAL_PRODUCTION');await tx(f.adapter.settle(job));
  await f.upgrade(f.vehicles,'LocalVehiclesV2');
  const output=path.resolve(root,'../../outputs/ww-collections-upgradeable-20261107');fs.mkdirSync(output,{recursive:true});
  const deployments={};
  for(const [name,contract] of [['Vehicles',f.vehicles],['Clothing',f.clothing],['Furniture',f.furniture],['SettlementRegistry',f.registry],['ProductionSettlement',f.adapter]])deployments[name]={proxy:await contract.getAddress(),initialImplementation:await f.implementations.get(await contract.getAddress()).getAddress()};
  fs.writeFileSync(path.join(output,'Local-Deployment.json'),JSON.stringify({status:'EPHEMERAL LOCAL FIXTURE ONLY; chain discarded at exit',chainId:31337,warning:'Addresses, example quantities and LOCAL identifiers are test fixtures, not approved launch values.',governance:{localTestTimelock:await f.governor.getAddress(),localTestDelaySeconds:3600,productionAuthority:null,productionDelay:null},deployments,items,productionJob:job,upgradeVerified:'Vehicles V2; installed rim state preserved'},null,2)+'\n');
  fs.writeFileSync(path.join(output,'Storage-Layouts.json'),JSON.stringify(Object.fromEntries(['WilderVehiclesUpgradeable','WilderClothingUpgradeable','WilderFurnitureUpgradeable','SettlementRegistryUpgradeable','ProductionSettlementUpgradeable'].map(name=>[name,{compiler:artifacts[name].compilerVersion,layout:artifacts[name].storageLayout}])),null,2)+'\n');
  console.log('Upgradeable local fixture passed: five initialized proxies, separate timelock authority, rim installation, validated production and V2 state preservation. No external deployment.');
}finally{f.provider.destroy();await f.connection.close();}
