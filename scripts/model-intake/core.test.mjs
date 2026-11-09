import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdir, mkdtemp, open, readFile, readdir, realpath, rm, symlink, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {CHECKOUT, WORKSPACE, MAX_MODEL_BYTES, inspectModel, intakeModel, listIntakeProducts} from './core.mjs';

const products = await listIntakeProducts();
const outputParent = path.join(WORKSPACE, 'outputs');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const run = promisify(execFile);

function glb(edit = () => {}) {
  const document = {
    asset: {version: '2.0'},
    buffers: [{byteLength: 36}],
    bufferViews: [{buffer: 0, byteOffset: 0, byteLength: 36}],
    accessors: [{bufferView: 0, componentType: 5126, count: 3, type: 'VEC3'}],
    meshes: [{primitives: [{attributes: {POSITION: 0}}]}],
    nodes: [{mesh: 0}], scenes: [{nodes: [0]}], scene: 0,
  };
  edit(document);
  const json = Buffer.from(JSON.stringify(document));
  const padded = Buffer.alloc(Math.ceil(json.length / 4) * 4, 0x20);
  json.copy(padded);
  const bytes = Buffer.alloc(12 + 8 + padded.length + 8 + 36);
  bytes.writeUInt32LE(0x46546c67, 0);
  bytes.writeUInt32LE(2, 4);
  bytes.writeUInt32LE(bytes.length, 8);
  bytes.writeUInt32LE(padded.length, 12);
  bytes.writeUInt32LE(0x4e4f534a, 16);
  padded.copy(bytes, 20);
  bytes.writeUInt32LE(36, 20 + padded.length);
  bytes.writeUInt32LE(0x004e4942, 24 + padded.length);
  // A tiny triangle fixture, never represented as a real catalog design.
  bytes.writeFloatLE(1, bytes.length - 24);
  bytes.writeFloatLE(1, bytes.length - 8);
  return bytes;
}

function binaryFbx() {
  const bytes = Buffer.alloc(64);
  Buffer.from('Kaydara FBX Binary  \x00\x1a\x00', 'binary').copy(bytes);
  bytes.writeUInt32LE(7400, 23);
  return bytes;
}

function provenance(product = products[0]) {
  return {
    productId: product.productId,
    sourceProductId: product.sourceProductId,
    submittedBy: 'Local intake test',
    createdBy: 'Synthetic fixture author',
    sourceReference: 'Synthetic test fixture; no real model submitted.',
    rightsStatement: 'Test data only; no rights or production approval asserted.',
    notes: '',
  };
}

async function fixture(t, bytes = glb(), extension = '.glb') {
  const root = await mkdtemp(path.join(outputParent, '.ww-intake-tests-'));
  t.after(async () => {
    const target = await realpath(root);
    const relative = path.relative(await realpath(outputParent), target);
    assert.ok(relative.startsWith('.ww-intake-tests-') && !relative.includes(path.sep));
    await rm(target, {recursive: true});
  });
  const source = path.join(root, 'source');
  await mkdir(source);
  const modelPath = path.join(source, `fixture${extension}`);
  const provenancePath = path.join(source, 'provenance.json');
  await writeFile(modelPath, bytes);
  await writeFile(provenancePath, JSON.stringify(provenance()));
  return {root, source, bytes, options: {productId: products[0].productId, modelPath, provenancePath, outputRoot: path.join(root, 'intake')}};
}

test('known-product list retains all ten exact physical-source identities', () => {
  assert.equal(products.length, 10);
  assert.equal(new Set(products.map(p => p.productId)).size, 10);
  assert.ok(products.every(p => /^gid:\/\/shopify\/Product\/\d+$/.test(p.sourceProductId)));
  assert.ok(products.every(p => p.productId.startsWith('totem-fw-')));
});

test('valid self-contained GLB remains unreviewed after preflight', () => {
  const result = inspectModel(glb(), '.glb');
  assert.equal(result.meshCount, 1);
  assert.equal(result.fullStructureValidated, false);
  assert.equal(result.nativeImporterValidationRequired, true);
});

for (const [name, mutate, code] of [
  ['bad magic', bytes => bytes.writeUInt32LE(0, 0), 'GLB_HEADER'],
  ['wrong version', bytes => bytes.writeUInt32LE(1, 4), 'GLB_VERSION'],
  ['false file length', bytes => bytes.writeUInt32LE(20, 8), 'GLB_LENGTH'],
  ['unaligned chunk', bytes => bytes.writeUInt32LE(3, 12), 'GLB_CHUNK'],
  ['oversized chunk', bytes => bytes.writeUInt32LE(0xfffffffc, 12), 'GLB_CHUNK'],
  ['wrong first chunk', bytes => bytes.writeUInt32LE(0x004e4942, 16), 'GLB_CHUNK'],
  ['invalid JSON', bytes => { bytes[20] = 0x21; }, 'GLB_JSON'],
  ['invalid UTF-8', bytes => { bytes[20] = 0xff; }, 'GLB_JSON'],
]) {
  test(`rejects GLB ${name}`, () => {
    const bytes = glb(); mutate(bytes);
    assert.throws(() => inspectModel(bytes, '.glb'), {code});
  });
}

for (const [name, edit, code] of [
  ['external buffer', doc => { doc.buffers[0].uri = 'https://invalid.example/model.bin'; }, 'GLB_EXTERNAL_RESOURCE'],
  ['relative texture', doc => { doc.images = [{uri: '../texture.png'}]; }, 'GLB_EXTERNAL_RESOURCE'],
  ['embedded URI', doc => { doc.images = [{uri: 'data:image/png;base64,AA=='}]; }, 'GLB_EXTERNAL_RESOURCE'],
  ['required compression', doc => { doc.extensionsRequired = ['KHR_draco_mesh_compression']; }, 'GLB_EXTENSION'],
  ['optional extension URI', doc => { doc.extensions = {VENDOR_model: {uri: 'file:///private/model.bin'}}; }, 'GLB_EXTENSION'],
  ['nested extension URI', doc => { doc.meshes[0].extensions = {VENDOR_mesh: {uri: 'data:text/plain;base64,AA=='}}; }, 'GLB_EXTENSION'],
  ['unreviewed extension declaration', doc => { doc.extensionsUsed = ['KHR_materials_unlit']; }, 'GLB_EXTENSION'],
  ['out-of-bounds buffer', doc => { doc.bufferViews[0].byteLength = 40; }, 'GLB_BUFFER_VIEW'],
  ['out-of-bounds accessor', doc => { doc.accessors[0].count = 999; }, 'GLB_ACCESSOR'],
  ['missing position', doc => { doc.meshes[0].primitives[0].attributes.POSITION = 1; }, 'GLB_MESH'],
  ['missing mesh', doc => { doc.meshes = []; }, 'GLB_MESH'],
  ['invalid resource object', doc => { doc.buffers = [null]; }, 'GLB_RESOURCE'],
  ['invalid accessor object', doc => { doc.accessors = [null]; }, 'GLB_ACCESSOR'],
  ['invalid mesh object', doc => { doc.meshes = [null]; }, 'GLB_MESH'],
  ['invalid primitive object', doc => { doc.meshes[0].primitives = [null]; }, 'GLB_MESH'],
  ['invalid array structure', doc => { doc.bufferViews = {}; }, 'GLB_STRUCTURE'],
  ['missing node mesh', doc => { doc.nodes[0].mesh = 99; }, 'GLB_REFERENCE'],
  ['missing scene node', doc => { doc.scenes[0].nodes = [99]; }, 'GLB_REFERENCE'],
  ['missing image texture', doc => { doc.textures = [{source: 99}]; }, 'GLB_REFERENCE'],
  ['excessive JSON depth', doc => { let cursor = doc; for (let i = 0; i < 40; i++) { cursor.extras = {}; cursor = cursor.extras; } }, 'GLB_JSON_COMPLEXITY'],
  ['excessive JSON value count', doc => { doc.extras = new Array(50_001).fill(0); }, 'GLB_JSON_COMPLEXITY'],
  ['excessive JSON size', doc => { doc.extras = 'x'.repeat(4 * 1024 * 1024); }, 'GLB_JSON_SIZE'],
]) {
  test(`rejects GLB ${name}`, () => assert.throws(() => inspectModel(glb(edit), '.glb'), {code}));
}

test('binary FBX header is quarantine-only, not native model validation', () => {
  const result = inspectModel(binaryFbx(), '.fbx');
  assert.equal(result.validationScope, 'signature_and_version_only');
  assert.equal(result.fullStructureValidated, false);
  assert.equal(result.externalResourcesInspected, false);
  assert.equal(result.nativeImporterValidationRequired, true);
  assert.throws(() => inspectModel(Buffer.from('; FBX 7.4.0 project file'), '.fbx'), {code: 'FBX_HEADER'});
  const wrongVersion = binaryFbx(); wrongVersion.writeUInt32LE(6100, 23);
  assert.throws(() => inspectModel(wrongVersion, '.fbx'), {code: 'FBX_VERSION'});
});

test('unsupported formats and truncated containers are rejected', () => {
  assert.throws(() => inspectModel(glb(), '.gltf'), {code: 'UNSUPPORTED_FORMAT'});
  assert.throws(() => inspectModel(Buffer.alloc(0), '.glb'), {code: 'FILE_SIZE'});
  assert.throws(() => inspectModel(Buffer.from('glTF'), '.glb'), {code: 'GLB_HEADER'});
});

test('copies exact model with immutable pending receipt; same hash is idempotent', async t => {
  const f = await fixture(t);
  const registryPath = path.join(CHECKOUT, 'src/sites/wilderworld/marketplace/frank-wilder-totems.json');
  const registryBefore = await readFile(registryPath);
  const result = await intakeModel(f.options);
  assert.equal(result.status, 'received_unreviewed');
  assert.equal(result.sha256, hash(f.bytes));
  assert.deepEqual(await readFile(result.modelPath), f.bytes);
  assert.equal(result.receipt.sourceIdentity.shopifyProductId, products[0].sourceProductId);
  assert.equal(result.receipt.authority.mintAuthorized, false);
  assert.equal(result.receipt.authority.gameEntitlementEnabled, false);
  assert.equal(result.receipt.authority.unrealImportPerformed, false);
  assert.equal(result.receipt.authority.approvedSupplyCap, null);
  assert.ok(Object.entries(result.receipt.review).every(([key, value]) => value === (key === 'testedGameBuild' ? null : 'pending')));
  const receiptBefore = await readFile(result.manifestPath);
  // A filename change does not create a second receipt for identical source bytes.
  const renamed = path.join(f.source, 'renamed.glb'); await writeFile(renamed, f.bytes);
  const retry = await intakeModel({...f.options, modelPath: renamed});
  assert.equal(retry.status, 'already_received');
  assert.deepEqual(await readFile(retry.manifestPath), receiptBefore);
  assert.deepEqual(await readdir(path.dirname(result.manifestPath)), ['model.glb', 'submission.json']);
  assert.deepEqual(await readFile(registryPath), registryBefore);
});

test('FBX receipt cannot advance approval or game delivery', async t => {
  const f = await fixture(t, binaryFbx(), '.fbx');
  const result = await intakeModel(f.options);
  assert.equal(result.receipt.status, 'received_unreviewed');
  assert.equal(result.receipt.preflight.fullStructureValidated, false);
  assert.equal(result.receipt.review.nativeImporterValidation, 'pending');
  assert.equal(result.receipt.authority.purchaseEnabled, false);
});

test('rejects unknown or traversal product identifiers without creating output', async t => {
  const f = await fixture(t);
  for (const productId of ['totem-fw-missing', '../totem-fw-hermes-ii', 'totem-fw-hermes-ii/../../escape']) {
    await assert.rejects(intakeModel({...f.options, productId}), {code: 'UNKNOWN_PRODUCT'});
  }
  assert.deepEqual(await readdir(f.root), ['source']);
});

test('rejects a different physical product or authority injected into provenance', async t => {
  const f = await fixture(t);
  await writeFile(f.options.provenancePath, JSON.stringify({...provenance(), sourceProductId: products[1].sourceProductId}));
  await assert.rejects(intakeModel(f.options), {code: 'PRODUCT_MISMATCH'});
  await writeFile(f.options.provenancePath, JSON.stringify({...provenance(), mintAuthorized: true}));
  await assert.rejects(intakeModel(f.options), {code: 'PROVENANCE_FIELDS'});
  await writeFile(f.options.provenancePath, 'not json');
  await assert.rejects(intakeModel(f.options), {code: 'PROVENANCE_JSON'});
});

test('rejects the same model bound to a second product', async t => {
  const f = await fixture(t);
  await intakeModel(f.options);
  await writeFile(f.options.provenancePath, JSON.stringify(provenance(products[1])));
  await assert.rejects(intakeModel({...f.options, productId: products[1].productId}), {code: 'HASH_PRODUCT_MISMATCH'});
});

test('a new model hash becomes a separate unreviewed revision', async t => {
  const f = await fixture(t);
  const first = await intakeModel(f.options);
  const next = glb(doc => { doc.asset.generator = 'Revision two test fixture'; });
  await writeFile(f.options.modelPath, next);
  const second = await intakeModel(f.options);
  assert.notEqual(first.sha256, second.sha256);
  assert.deepEqual(await readFile(first.modelPath), f.bytes);
  assert.deepEqual(await readFile(second.modelPath), next);
  assert.equal(second.receipt.review.sourceBinding, 'pending');
});

test('same hash with changed provenance is rejected without overwriting evidence', async t => {
  const f = await fixture(t);
  const result = await intakeModel(f.options);
  const before = await readFile(result.manifestPath);
  await writeFile(f.options.provenancePath, JSON.stringify({...provenance(), createdBy: 'Changed author'}));
  await assert.rejects(intakeModel(f.options), {code: 'RECEIPT_CONFLICT'});
  assert.deepEqual(await readFile(result.manifestPath), before);
});

test('rejects altered stored model and never repairs it by overwriting', async t => {
  const f = await fixture(t);
  const result = await intakeModel(f.options);
  const altered = Buffer.from(f.bytes); altered[altered.length - 1] ^= 1;
  await writeFile(result.modelPath, altered);
  await assert.rejects(intakeModel(f.options), {code: 'RECEIPT_CONFLICT'});
  assert.deepEqual(await readFile(result.modelPath), altered);
});

test('rejects receipt permission tampering on an idempotent retry', async t => {
  const f = await fixture(t);
  const result = await intakeModel(f.options);
  result.receipt.authority.mintAuthorized = true;
  await writeFile(result.manifestPath, JSON.stringify(result.receipt));
  await assert.rejects(intakeModel(f.options), {code: 'RECEIPT_CONFLICT'});
});

test('rejects existing malformed receipt without overwrite', async t => {
  const f = await fixture(t);
  const result = await intakeModel(f.options);
  await writeFile(result.manifestPath, '{broken');
  await assert.rejects(intakeModel(f.options), {code: 'RECEIPT_CONFLICT'});
  assert.equal(await readFile(result.manifestPath, 'utf8'), '{broken');
});

test('refuses output outside the workspace output boundary', async t => {
  const f = await fixture(t);
  for (const outputRoot of [CHECKOUT, outputParent, path.join(WORKSPACE, 'elsewhere')]) {
    await assert.rejects(intakeModel({...f.options, outputRoot}), {code: 'OUTPUT_BOUNDARY'});
  }
});

test('rejects relative paths, traversal and network shares', async t => {
  const f = await fixture(t);
  for (const modelPath of ['fixture.glb', `${f.source}${path.sep}..${path.sep}source${path.sep}fixture.glb`, '\\\\server\\share\\fixture.glb']) {
    await assert.rejects(intakeModel({...f.options, modelPath}), {code: 'INVALID_PATH'});
  }
  if (process.platform === 'win32') {
    await assert.rejects(intakeModel({...f.options, modelPath: `${f.options.modelPath}:alternate.glb`}), {code: 'INVALID_PATH'});
  }
});

test('rejects oversize models before allocating their content', async t => {
  const f = await fixture(t);
  const file = await open(f.options.modelPath, 'w');
  try { await file.truncate(MAX_MODEL_BYTES + 1); } finally { await file.close(); }
  await assert.rejects(intakeModel(f.options), {code: 'FILE_SIZE'});
});

test('rejects a source directory junction or symlink', async t => {
  const f = await fixture(t);
  const link = path.join(f.root, 'source-link');
  await symlink(f.source, link, process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(intakeModel({...f.options, modelPath: path.join(link, 'fixture.glb')}), {code: 'SYMLINK_REJECTED'});
});

test('rejects output redirection through a directory junction or symlink', async t => {
  const f = await fixture(t);
  const target = path.join(f.root, 'redirected'); await mkdir(target);
  await symlink(target, f.options.outputRoot, process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(intakeModel(f.options), {code: 'SYMLINK_REJECTED'});
  assert.deepEqual(await readdir(target), []);
});

test('rejects a file symlink when the host permits creating one', async t => {
  const f = await fixture(t);
  const link = path.join(f.source, 'linked.glb');
  try { await symlink(f.options.modelPath, link, 'file'); }
  catch (error) { if (error.code === 'EPERM' || error.code === 'EACCES') { t.skip('Host does not allow file-symlink creation; directory junction rejection is tested separately.'); return; } throw error; }
  await assert.rejects(intakeModel({...f.options, modelPath: link}), {code: 'SYMLINK_REJECTED'});
});

test('does not consume its own output as a new original submission', async t => {
  const f = await fixture(t);
  const result = await intakeModel(f.options);
  await assert.rejects(intakeModel({...f.options, modelPath: result.modelPath}), {code: 'INPUT_IS_OUTPUT'});
});

test('respects an existing lock and never overwrites it', async t => {
  const f = await fixture(t);
  await mkdir(f.options.outputRoot);
  const lock = path.join(f.options.outputRoot, '.intake.lock');
  await writeFile(lock, 'operator-owned lock');
  await assert.rejects(intakeModel(f.options), {code: 'INTAKE_BUSY'});
  assert.equal(await readFile(lock, 'utf8'), 'operator-owned lock');
});

test('CLI lists identities, explains offline boundaries and rejects unknown flags', async () => {
  const cli = path.join(CHECKOUT, 'scripts/intake-frank-wilder-model.mjs');
  const listed = await run(process.execPath, [cli, '--list']);
  assert.deepEqual(JSON.parse(listed.stdout), products);
  const help = await run(process.execPath, [cli, '--help']);
  assert.match(help.stdout, /no network or Unreal import/);
  await assert.rejects(run(process.execPath, [cli, '--upload']), error => error.code === 1 && /Unknown, duplicate or incomplete argument/.test(error.stderr));
});
