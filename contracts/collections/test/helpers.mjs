import assert from 'node:assert/strict';
import { network } from 'hardhat';
import { BrowserProvider, ContractFactory, Contract, id, AbiCoder, keccak256, ZeroHash } from 'ethers';
import { compile } from '../scripts/compile.mjs';

export const artifacts = compile();
export const H = value => id(`LOCAL_ONLY:${value}`);
export const Kind = { Vehicle: 1, RimSet: 2, Clothing: 3, Totem: 4, Furniture: 5 };
export const tx = async promise => (await promise).wait();
export const reverts = promise => assert.rejects(async () => { const result = await promise; if (result?.wait) await result.wait(); });
export async function fixture(t, options = {}) {
  const connection = await network.create('local');
  const provider = new BrowserProvider(connection.provider, undefined, { cacheTimeout: -1 });
  provider.pollingInterval = 10;
  t?.after(async () => { provider.destroy(); await connection.close(); });
  const signers = await Promise.all([0, 1, 2, 3, 4].map(i => provider.getSigner(i)));
  const [admin, alice, bob, attestor, stranger] = signers;
  async function rawDeploy(name, args = [], signer = admin) {
    const artifact = artifacts[name];
    const contract = await new ContractFactory(artifact.abi, artifact.bytecode, signer).deploy(...args);
    await contract.waitForDeployment();
    return contract;
  }
  const useProxies = options.upgradeable ?? process.env.WW_UPGRADEABLE_FIXTURE === '1';
  const governor = useProxies ? await rawDeploy('TimelockController', [3600n, [admin.address], [admin.address], admin.address]) : null;
  const implementations = new Map();
  async function deploy(name, args = [], signer = admin) {
    if (!useProxies || !['WilderVehicles','WilderClothing','WilderFurniture','SettlementRegistry','ProductionSettlement'].includes(name)) return rawDeploy(name, args, signer);
    const implementation = await rawDeploy(name+'Upgradeable', [], signer);
    const init = implementation.interface.encodeFunctionData('initialize', [...args, await governor.getAddress()]);
    const proxy = await rawDeploy('ERC1967Proxy', [await implementation.getAddress(), init], signer);
    const result = new Contract(await proxy.getAddress(), artifacts[name+'Upgradeable'].abi, signer);
    implementations.set(await result.getAddress(), implementation);
    return result;
  }
  async function upgrade(contract, implementationName, salt = H(implementationName)) {
    if (!governor) throw new Error('Upgradeable fixture required');
    const implementation = await rawDeploy(implementationName);
    const target = await contract.getAddress();
    const data = contract.interface.encodeFunctionData('upgradeToAndCall', [await implementation.getAddress(), '0x']);
    await tx(governor.schedule(target, 0n, data, ZeroHash, salt, 3600n));
    await provider.send('evm_increaseTime', [3601]); await provider.send('evm_mine', []);
    await tx(governor.execute(target, 0n, data, ZeroHash, salt));
    return new Contract(target, artifacts[implementationName].abi, admin);
  }
  const registry = await deploy('SettlementRegistry', [admin.address]);
  const registryAddress = await registry.getAddress();
  const vehicles = await deploy('WilderVehicles', [admin.address, registryAddress]);
  const clothing = await deploy('WilderClothing', [admin.address, registryAddress]);
  const furniture = await deploy('WilderFurniture', [admin.address, registryAddress]);
  for (const c of [vehicles, clothing, furniture]) await tx(registry.grantRole(await registry.COLLECTION_ROLE(), await c.getAddress()));
  for (const c of [vehicles, clothing, furniture]) await tx(c.grantRole(await c.FULFILLER_ROLE(), admin.address));
  async function approve(collection, key, kind, cap = 10n, editionCap = cap, color = 'silver') {
    const productId = H(`product:${key}`), editionId = H(`edition:${key}:${color}`);
    await tx(collection.approveProduct(productId, H(`source:${key}`), kind, cap));
    await tx(collection.approveEdition(editionId, productId, H(`color:${color}`), editionCap, `local-fixture://${key}/${color}.json`));
    return { productId, editionId };
  }
  async function mint(collection, editionId, key, recipient = alice.address) {
    const tokenId = await collection.nextTokenId();
    await tx(collection.settlePurchase(H(key), editionId, recipient));
    return tokenId;
  }
  async function permit(collection, tokenId, overrides = {}, signer = attestor) {
    const block = await provider.getBlock('latest');
    const owner = overrides.owner ?? alice.address;
    const value = { owner, tokenId, contextId: H('eligible-space'), eligibilityHash: H('approved-game-access'),
      nonce: await collection.usageNonces(owner), ownershipVersion: await collection.ownershipVersion(tokenId), deadline: BigInt(block.timestamp + 3600), ...overrides };
    const domain = { name: await collection.name(), version: '1', chainId: 31337, verifyingContract: await collection.getAddress() };
    const types = { Use: [
      { name: 'owner', type: 'address' }, { name: 'tokenId', type: 'uint256' }, { name: 'contextId', type: 'bytes32' },
      { name: 'eligibilityHash', type: 'bytes32' }, { name: 'nonce', type: 'uint256' },
      { name: 'ownershipVersion', type: 'uint256' }, { name: 'deadline', type: 'uint64' },
    ] };
    return { value, signature: await signer.signTypedData(domain, types, value), attestor: signer.address };
  }
  return { connection, provider, signers, admin, alice, bob, attestor, stranger, deploy, rawDeploy, governor, implementations, upgrade, registry, vehicles, clothing, furniture, approve, mint, permit };
}

export async function productionFixture(t, options = {}) {
  const f = await fixture(t, options);
  const item = await f.approve(f.clothing, 'production-shirt', Kind.Clothing, options.cap ?? 10n);
  const blueprint = await f.deploy('LocalBlueprintApproval');
  const rights = await f.deploy('LocalEditionRights');
  const resource = await f.deploy('LocalResource');
  const components = await f.deploy('LocalComponents');
  const adapter = await f.deploy('ProductionSettlement', [f.admin.address, await blueprint.getAddress(), await rights.getAddress()]);
  const adapterAddress = await adapter.getAddress(), collectionAddress = await f.clothing.getAddress();
  await tx(rights.setConsumer(adapterAddress));
  await tx(adapter.grantRole(await adapter.SETTLER_ROLE(), f.admin.address));
  await tx(f.clothing.grantRole(await f.clothing.PRODUCTION_ROLE(), adapterAddress));
  await tx(adapter.approveInput(await resource.getAddress(), 1));
  await tx(adapter.approveInput(await components.getAddress(), 2));
  const inputs = [
    { token: await resource.getAddress(), id: 0n, amount: 7n, kind: 1 },
    { token: await components.getAddress(), id: 42n, amount: 2n, kind: 2 },
  ];
  const recipeId = H('recipe:shirt:v1');
  const hashInputs = (inputList, collection = collectionAddress, edition = item.editionId) => keccak256(AbiCoder.defaultAbiCoder().encode(
    ['address', 'bytes32', 'tuple(address token,uint256 id,uint256 amount,uint8 kind)[]'], [collection, edition, inputList]));
  const recipeHash = hashInputs(inputs);
  await tx(blueprint.setApproved(recipeId, recipeHash));
  await tx(adapter.configureRecipe(recipeId, collectionAddress, item.editionId, inputs));
  await tx(resource.mint(f.alice.address, 100n));
  await tx(components.mint(f.alice.address, 42n, 20n));
  await tx(resource.connect(f.alice).approve(adapterAddress, 100n));
  await tx(components.connect(f.alice).setApprovalForAll(adapterAddress, true));
  async function grantRight(owner = f.alice.address, count = 10n, collection = collectionAddress, edition = item.editionId, hash = recipeHash) {
    await tx(rights.grant(owner, collection, edition, hash, count));
  }
  async function authorize(key, signer = f.alice, deadline) {
    const block = await f.provider.getBlock('latest');
    const jobSalt = H(key);
    const jobId = await adapter.jobIdFor(signer.address, recipeId, jobSalt);
    await tx(adapter.connect(signer).authorizeJob(jobSalt, recipeId, deadline ?? BigInt(block.timestamp + 3600)));
    return jobId;
  }
  async function rightBalance(owner = f.alice.address) {
    return rights.rights(await rights.key(owner, collectionAddress, item.editionId, recipeHash));
  }
  return { ...f, item, blueprint, rights, resource, components, adapter, adapterAddress, collectionAddress, inputs, recipeId, recipeHash, hashInputs, grantRight, authorize, rightBalance };
}
