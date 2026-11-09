import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import solc from 'solc';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : target.endsWith('.sol') ? [target] : [];
  });
}
export function compile({ write = true } = {}) {
  const files = [...walk(path.join(root, 'src')), ...walk(path.join(root, 'test/mocks'))];
  const sources = Object.fromEntries(files.map(file => [path.relative(root, file).replaceAll('\\', '/'), { content: fs.readFileSync(file, 'utf8') }]));
  const input = { language: 'Solidity', sources, settings: {
    optimizer: { enabled: true, runs: 200 }, evmVersion: 'cancun',
    outputSelection: { '*': { '*': ['abi', 'storageLayout', 'evm.bytecode.object', 'evm.deployedBytecode.object'] } },
  } };
  const result = JSON.parse(solc.compile(JSON.stringify(input), { import: requested => {
    const file = path.resolve(root, requested.startsWith('@') ? 'node_modules' : '.', requested);
    if (!file.startsWith(root + path.sep)) return { error: 'Import outside isolated package' };
    try { return { contents: fs.readFileSync(file, 'utf8') }; } catch { return { error: `Missing import ${requested}` }; }
  } }));
  const errors = (result.errors ?? []).filter(error => error.severity === 'error');
  if (errors.length) throw new Error(errors.map(error => error.formattedMessage).join('\n'));
  const artifacts = {};
  for (const [sourceName, contracts] of Object.entries(result.contracts)) {
    for (const [name, output] of Object.entries(contracts)) {
      if (!output.evm.bytecode.object) continue;
      artifacts[name] = { contractName: name, sourceName, compilerVersion: solc.version(), abi: output.abi,
        storageLayout: output.storageLayout,
        bytecode: '0x' + output.evm.bytecode.object, deployedBytecode: '0x' + output.evm.deployedBytecode.object };
      if (output.evm.deployedBytecode.object.length / 2 > 24576) throw new Error(`${name} exceeds EIP-170 runtime bytecode limit`);
    }
  }
  if (write) {
    fs.mkdirSync(path.join(root, 'artifacts'), { recursive: true });
    for (const [name, artifact] of Object.entries(artifacts)) fs.writeFileSync(path.join(root, 'artifacts', `${name}.json`), JSON.stringify(artifact, null, 2) + '\n');
    fs.mkdirSync(path.join(root, 'abi'), { recursive: true });
    for (const name of ['WilderVehicles', 'WilderClothing', 'WilderFurniture', 'SettlementRegistry', 'ProductionSettlement'].flatMap(name => [name, name+'Upgradeable'])) {
      fs.writeFileSync(path.join(root, 'abi', `${name}.json`), JSON.stringify(artifacts[name].abi, null, 2) + '\n');
    }
  }
  return artifacts;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const artifacts = compile();
  console.log(`Compiled ${Object.keys(artifacts).length} deployable contracts with ${solc.version()}; all within EIP-170 size limit.`);
}
