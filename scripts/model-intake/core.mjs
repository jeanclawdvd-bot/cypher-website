import {constants} from 'node:fs';
import {lstat, mkdir, open, readFile, realpath, rename, rmdir, unlink} from 'node:fs/promises';
import {createHash, randomUUID} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual} from 'node:util';

export const CHECKOUT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export const WORKSPACE=path.resolve(CHECKOUT,'../../..');
export const DEFAULT_OUTPUT=path.join(WORKSPACE,'outputs/ww-model-intake');
export const MAX_MODEL_BYTES=100*1024*1024;
export const MAX_PROVENANCE_BYTES=32*1024;
const MAX_GLB_JSON_BYTES=4*1024*1024;
const MAX_JSON_DEPTH=32;
const MAX_JSON_VALUES=50_000;
const REGISTRY=path.join(CHECKOUT,'src/sites/wilderworld/marketplace/frank-wilder-totems.json');
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const fail=(code,message)=>{throw Object.assign(new Error(message),{code});};
const samePath=(a,b)=>process.platform==='win32'?a.toLowerCase()===b.toLowerCase():a===b;
const within=(root,child)=>{const relative=path.relative(root,child);return relative!==''&&!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative);};

function absoluteLocalPath(value,label){
  if(typeof value!=='string'||value.includes('\0')||!path.isAbsolute(value)||/^[/\\]{2}/.test(value)||value.split(/[/\\]/).includes('..'))fail('INVALID_PATH',`${label} must be an absolute local path without traversal or a network share.`);
  if(process.platform==='win32'&&value.slice(path.parse(value).root.length).includes(':'))fail('INVALID_PATH',`${label} must not address an alternate data stream.`);
  return path.resolve(value);
}
async function noLinks(target,{missing=false}={}){
  const parsed=path.parse(target);let cursor=parsed.root;
  for(const segment of target.slice(parsed.root.length).split(path.sep).filter(Boolean)){
    cursor=path.join(cursor,segment);
    let info;try{info=await lstat(cursor);}catch(error){if(missing&&error.code==='ENOENT')return;throw error;}
    if(info.isSymbolicLink())fail('SYMLINK_REJECTED',`Symbolic links or junctions are not accepted: ${cursor}`);
  }
  if(!samePath(await realpath(target),target))fail('PATH_REDIRECTION',`Resolved path differs from the supplied path: ${target}`);
}
async function boundedRead(filename,limit,label){
  const target=absoluteLocalPath(filename,label);await noLinks(target);
  const before=await lstat(target);
  if(!before.isFile()||before.size===0||before.size>limit)fail('FILE_SIZE',`${label} must be a nonempty regular file no larger than ${limit} bytes.`);
  const file=await open(target,constants.O_RDONLY|(constants.O_NOFOLLOW??0));
  try{
    const opened=await file.stat();
    if(opened.dev!==before.dev||opened.ino!==before.ino||!opened.isFile()||opened.size!==before.size||opened.size>limit||opened.mtimeMs!==before.mtimeMs||opened.ctimeMs!==before.ctimeMs)fail('SOURCE_CHANGED',`${label} changed while opening.`);
    // Read a fixed-size allocation, not an unbounded readFile on a growing file.
    const bytes=Buffer.alloc(opened.size);let offset=0;
    while(offset<bytes.length){const {bytesRead}=await file.read(bytes,offset,bytes.length-offset,offset);if(!bytesRead)fail('SOURCE_CHANGED',`${label} was truncated while reading.`);offset+=bytesRead;}
    const after=await file.stat();await noLinks(target);const pathAfter=await lstat(target);
    if(after.size!==opened.size||after.mtimeMs!==opened.mtimeMs||after.ctimeMs!==opened.ctimeMs||pathAfter.dev!==opened.dev||pathAfter.ino!==opened.ino||pathAfter.size!==opened.size||pathAfter.mtimeMs!==opened.mtimeMs||pathAfter.ctimeMs!==opened.ctimeMs)fail('SOURCE_CHANGED',`${label} changed while reading.`);
    return {bytes,path:target};
  }finally{await file.close();}
}
const integer=(value,min=0)=>Number.isSafeInteger(value)&&value>=min;
const array=value=>Array.isArray(value)?value:[];
const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);

function boundedDocument(document){
  const pending=[{value:document,depth:0}];let seen=0;
  while(pending.length){
    const {value,depth}=pending.pop();
    if(++seen>MAX_JSON_VALUES||depth>MAX_JSON_DEPTH)fail('GLB_JSON_COMPLEXITY','GLB JSON exceeds the offline depth or value-count bound.');
    if(value!==null&&typeof value==='object'){
      for(const [key,child] of Object.entries(value)){
        // This intake intentionally accepts core glTF only. Extension parsers may
        // load resources that the core URI checks cannot account for.
        if(key==='extensions'&&(!record(child)||Object.keys(child).length))fail('GLB_EXTENSION','glTF extension blocks require a separate reviewed importer.');
        pending.push({value:child,depth:depth+1});
      }
    }
  }
}

/** Offline container preflight only. Does not execute parsers, scripts or URI loads. */
export function inspectModel(bytes,extension){
  if(!Buffer.isBuffer(bytes)||bytes.length===0||bytes.length>MAX_MODEL_BYTES)fail('FILE_SIZE','Model exceeds the supported size bound.');
  if(extension==='.fbx'){
    const magic=Buffer.from('Kaydara FBX Binary  \x00\x1a\x00','binary');
    if(bytes.length<40||!bytes.subarray(0,23).equals(magic))fail('FBX_HEADER','Only binary FBX with a complete header is accepted.');
    const version=bytes.readUInt32LE(23);
    if(version<7000||version>7700)fail('FBX_VERSION','Binary FBX version is outside the supported 7.x header range.');
    return {format:'binary_fbx',version,validationScope:'signature_and_version_only',fullStructureValidated:false,externalResourcesInspected:false,nativeImporterValidationRequired:true};
  }
  if(extension!=='.glb')fail('UNSUPPORTED_FORMAT','Only .glb and binary .fbx files are accepted. Export .gltf with external dependencies as a self-contained .glb first.');
  if(bytes.length<20||bytes.readUInt32LE(0)!==0x46546c67)fail('GLB_HEADER','Invalid or truncated GLB header.');
  if(bytes.readUInt32LE(4)!==2)fail('GLB_VERSION','Only GLB version 2 is supported.');
  if(bytes.readUInt32LE(8)!==bytes.length)fail('GLB_LENGTH','GLB declared length does not match the file.');
  let cursor=12;const chunks=[];
  while(cursor<bytes.length){
    if(cursor+8>bytes.length)fail('GLB_CHUNK','Truncated GLB chunk header.');
    const length=bytes.readUInt32LE(cursor),type=bytes.readUInt32LE(cursor+4);cursor+=8;
    if(length%4!==0||cursor+length>bytes.length)fail('GLB_CHUNK','Invalid GLB chunk alignment or length.');
    chunks.push({type,bytes:bytes.subarray(cursor,cursor+length)});cursor+=length;
  }
  if(chunks.length<1||chunks.length>2||chunks[0].type!==0x4e4f534a||(chunks[1]&&chunks[1].type!==0x004e4942))fail('GLB_CHUNK','GLB must contain one JSON chunk followed by at most one BIN chunk.');
  if(chunks[0].bytes.length>MAX_GLB_JSON_BYTES)fail('GLB_JSON_SIZE','GLB JSON exceeds the preflight size bound.');
  let document;try{document=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(chunks[0].bytes));}catch{fail('GLB_JSON','GLB JSON is not valid UTF-8 JSON.');}
  boundedDocument(document);
  if(!record(document)||document.asset?.version!=='2.0')fail('GLB_ASSET','GLB must declare a glTF 2.0 asset.');
  for(const key of ['buffers','bufferViews','accessors','meshes','images','nodes','scenes','textures','samplers','materials','skins','animations','extensionsRequired','extensionsUsed'])if(document[key]!==undefined&&!Array.isArray(document[key]))fail('GLB_STRUCTURE',`${key} must be an array.`);
  if(array(document.extensionsRequired).length||array(document.extensionsUsed).length)fail('GLB_EXTENSION','glTF extensions need a separate reviewed importer; export an uncompressed core glTF 2.0 model.');
  for(const resource of [...array(document.buffers),...array(document.images)]){
    if(!record(resource))fail('GLB_RESOURCE','Each resource must be a JSON object.');
    if(resource.uri!==undefined)fail('GLB_EXTERNAL_RESOURCE','GLB resource URIs are not accepted; embed geometry and images in the BIN chunk.');
  }
  const buffers=array(document.buffers),views=array(document.bufferViews),accessors=array(document.accessors),meshes=array(document.meshes);
  const bin=chunks[1]?.bytes;
  if(buffers.length!==1||!integer(buffers[0].byteLength,1)||!bin||buffers[0].byteLength>bin.length||bin.length-buffers[0].byteLength>3)fail('GLB_BUFFER','Expected one embedded geometry buffer with a matching BIN length.');
  for(const view of views){
    if(!record(view)||view.buffer!==0||!integer(view.byteOffset??0)||!integer(view.byteLength,1)||(view.byteOffset??0)+view.byteLength>buffers[0].byteLength)fail('GLB_BUFFER_VIEW','A GLB buffer view is out of bounds.');
  }
  for(const image of array(document.images))if(!integer(image.bufferView)||!views[image.bufferView]||!['image/png','image/jpeg'].includes(image.mimeType))fail('GLB_IMAGE','Embedded images must reference a valid buffer view and PNG/JPEG media type.');
  const widths={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4};
  const components={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT2:4,MAT3:9,MAT4:16};
  for(const accessor of accessors){
    if(!record(accessor))fail('GLB_ACCESSOR','Each accessor must be a JSON object.');
    const view=views[accessor.bufferView],elementSize=widths[accessor.componentType]*components[accessor.type];
    if(accessor.sparse!==undefined)fail('GLB_ACCESSOR','Sparse accessors require a separate importer validation.');
    if(!integer(accessor.bufferView)||!view||!integer(accessor.count,1)||!integer(accessor.byteOffset??0)||!Number.isFinite(elementSize))fail('GLB_ACCESSOR','Unsupported or invalid geometry accessor.');
    const stride=view.byteStride??elementSize;
    if(!integer(stride,elementSize)||(accessor.byteOffset??0)+(accessor.count-1)*stride+elementSize>view.byteLength)fail('GLB_ACCESSOR','A GLB geometry accessor is out of bounds.');
  }
  if(!meshes.length||meshes.some(mesh=>!record(mesh)||!array(mesh.primitives).length))fail('GLB_MESH','Expected at least one mesh with geometry primitives.');
  for(const mesh of meshes)for(const primitive of mesh.primitives){
    if(!record(primitive))fail('GLB_MESH','Each mesh primitive must be a JSON object.');
    const position=primitive.attributes?.POSITION;
    if(!integer(position)||accessors[position]?.type!=='VEC3'||accessors[position]?.componentType!==5126)fail('GLB_MESH','Each primitive needs a valid float VEC3 POSITION accessor.');
    for(const index of Object.values(primitive.attributes??{}))if(!integer(index)||!accessors[index])fail('GLB_MESH','Primitive attribute accessor is missing.');
    if(primitive.indices!==undefined&&(!integer(primitive.indices)||accessors[primitive.indices]?.type!=='SCALAR'||![5121,5123,5125].includes(accessors[primitive.indices]?.componentType)))fail('GLB_MESH','Primitive index accessor is invalid.');
    if(primitive.material!==undefined&&(!integer(primitive.material)||!array(document.materials)[primitive.material]))fail('GLB_REFERENCE','Primitive material reference is missing.');
  }
  const nodes=array(document.nodes),scenes=array(document.scenes),textures=array(document.textures);
  const reference=(index,items,label)=>{if(!integer(index)||!items[index])fail('GLB_REFERENCE',`${label} reference is missing.`);};
  for(const node of nodes){
    if(!record(node))fail('GLB_STRUCTURE','Each node must be a JSON object.');
    if(node.mesh!==undefined)reference(node.mesh,meshes,'Node mesh');
    if(node.children!==undefined&&!Array.isArray(node.children))fail('GLB_STRUCTURE','Node children must be an array.');
    for(const child of array(node.children))reference(child,nodes,'Child node');
  }
  for(const scene of scenes){
    if(!record(scene)||(scene.nodes!==undefined&&!Array.isArray(scene.nodes)))fail('GLB_STRUCTURE','Each scene must be an object with an optional nodes array.');
    for(const node of array(scene.nodes))reference(node,nodes,'Scene node');
  }
  if(document.scene!==undefined)reference(document.scene,scenes,'Default scene');
  for(const texture of textures){
    if(!record(texture))fail('GLB_STRUCTURE','Each texture must be a JSON object.');
    reference(texture.source,array(document.images),'Texture image');
    if(texture.sampler!==undefined)reference(texture.sampler,array(document.samplers),'Texture sampler');
  }
  return {format:'glb',version:2,validationScope:'container_json_embedded_resources_and_geometry_bounds',fullStructureValidated:false,externalResourceUris:0,meshCount:meshes.length,primitiveCount:meshes.reduce((n,m)=>n+m.primitives.length,0),nativeImporterValidationRequired:true};
}

function provenanceFor(raw,product){
  const allowed=['productId','sourceProductId','submittedBy','createdBy','sourceReference','rightsStatement','notes'];
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).some(key=>!allowed.includes(key)))fail('PROVENANCE_FIELDS','Provenance contains unsupported fields.');
  if(raw.productId!==product.id||raw.sourceProductId!==product.source.shopifyProductId)fail('PRODUCT_MISMATCH','Provenance must match the exact storefront and physical-source product IDs.');
  const result={};
  for(const key of allowed){
    const value=raw[key]??(key==='notes'?'':undefined);
    if(typeof value!=='string'||(key!=='notes'&&!value.trim())||value.length>(key==='notes'?4000:2000)||/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value))fail('PROVENANCE_FIELDS',`Invalid provenance field: ${key}`);
    result[key]=value.trim();
  }
  return result;
}
async function ensureDirectory(directory){
  await noLinks(directory,{missing:true});await mkdir(directory,{recursive:true});await noLinks(directory);
}
async function exists(target){try{await lstat(target);return true;}catch(error){if(error.code==='ENOENT')return false;throw error;}}
async function writeExclusive(filename,bytes){const file=await open(filename,'wx',0o600);try{await file.writeFile(bytes);await file.sync();}finally{await file.close();}}

export async function listIntakeProducts(){
  const registry=JSON.parse(await readFile(REGISTRY,'utf8'));
  return registry.products.map(product=>({productId:product.id,name:product.name,sourceProductId:product.source.shopifyProductId,sourceUrl:product.source.sourceUrl}));
}

export async function intakeModel({productId,modelPath,provenancePath,outputRoot=DEFAULT_OUTPUT}){
  const registry=JSON.parse(await readFile(REGISTRY,'utf8'));
  const product=registry.products.find(product=>product.id===productId);
  if(typeof productId!=='string'||!/^totem-fw-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(productId)||!product)fail('UNKNOWN_PRODUCT','Select an exact Frank Wilder storefront product ID from --list.');
  const destination=absoluteLocalPath(outputRoot,'Output root');
  const outputParent=path.join(WORKSPACE,'outputs');
  if(!within(outputParent,destination))fail('OUTPUT_BOUNDARY','Intake output must be an isolated directory inside this workspace outputs folder.');
  await noLinks(outputParent);await noLinks(destination,{missing:true});
  const source=await boundedRead(modelPath,MAX_MODEL_BYTES,'Model');
  if(within(destination,source.path)||samePath(destination,source.path))fail('INPUT_IS_OUTPUT','Submit an original model outside the intake output directory.');
  const extension=path.extname(source.path).toLowerCase();
  const preflight=inspectModel(source.bytes,extension);
  const provenanceSource=await boundedRead(provenancePath,MAX_PROVENANCE_BYTES,'Provenance');
  let raw;try{raw=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(provenanceSource.bytes).replace(/^\uFEFF/,''));}catch{fail('PROVENANCE_JSON','Provenance must be valid UTF-8 JSON.');}
  const provenance=provenanceFor(raw,product),sha256=digest(source.bytes);
  const immutable={schemaVersion:1,submissionId:`${product.id}:${sha256}`,productId:product.id,status:'received_unreviewed',collectionId:'clothing',proposedContractTarget:'WilderClothing',sourceIdentity:{sourceIds:product.sourceIds,shopifyProductId:product.source.shopifyProductId,shopifyVariantIds:product.source.shopifyVariantIds,sourceUrl:product.source.sourceUrl,referenceSha256:product.source.referenceSha256},provenance,preflight,review:{sourceBinding:'pending',rightsVerification:'pending',nativeImporterValidation:'pending',avatarFit:'pending',equipmentSlot:'pending',chainAssembly:'pending',materialBindings:'pending',testedGameBuild:null},authority:{approvedEditionId:null,approvedSupplyCap:null,onchainTokenId:null,mintAuthorized:false,purchaseEnabled:false,gameEntitlementEnabled:false,unrealImportPerformed:false},historicalRegistryChanged:false};
  await ensureDirectory(destination);
  const lockPath=path.join(destination,'.intake.lock');
  let lock;try{lock=await open(lockPath,'wx',0o600);}catch(error){if(error.code==='EEXIST')fail('INTAKE_BUSY','Another intake is running or a prior lock needs operator review. Do not delete a live lock.');throw error;}
  let stage;
  try{
    await lock.writeFile(JSON.stringify({pid:process.pid,createdAt:new Date().toISOString()})+'\n');
    for(const candidate of registry.products){
      const candidateRoot=path.join(destination,candidate.id);await noLinks(candidateRoot,{missing:true});
      if(candidate.id!==product.id&&await exists(path.join(candidateRoot,sha256)))fail('HASH_PRODUCT_MISMATCH','This model hash is already recorded against a different product. Review the identity rather than duplicating the binding.');
    }
    const productRoot=path.join(destination,product.id);await ensureDirectory(productRoot);
    const target=path.join(productRoot,sha256);await noLinks(target,{missing:true});
    if(await exists(target)){
      const manifestFile=await boundedRead(path.join(target,'submission.json'),128*1024,'Existing receipt');
      let receipt;try{receipt=JSON.parse(manifestFile.bytes.toString('utf8'));}catch{fail('RECEIPT_CONFLICT','Existing receipt is malformed; nothing was overwritten.');}
      if(!record(receipt)||Object.entries(immutable).some(([key,value])=>!isDeepStrictEqual(receipt[key],value))||receipt.file?.sha256!==sha256||receipt.file?.storedName!==`model${extension}`||receipt.file?.bytes!==source.bytes.length||typeof receipt.receivedAt!=='string'||!Number.isFinite(Date.parse(receipt.receivedAt)))fail('RECEIPT_CONFLICT','Existing receipt differs from this submission or its pending permissions; nothing was overwritten.');
      const stored=await boundedRead(path.join(target,`model${extension}`),MAX_MODEL_BYTES,'Existing model');
      if(digest(stored.bytes)!==sha256)fail('RECEIPT_CONFLICT','Existing model hash no longer matches the receipt.');
      return {status:'already_received',productId,sha256,manifestPath:path.join(target,'submission.json'),modelPath:path.join(target,`model${extension}`),receipt};
    }
    stage=path.join(productRoot,`.pending-${randomUUID()}`);await mkdir(stage);await noLinks(stage);
    const receipt={...immutable,receivedAt:new Date().toISOString(),file:{originalPath:source.path,originalName:path.basename(source.path),storedName:`model${extension}`,bytes:source.bytes.length,sha256}};
    await writeExclusive(path.join(stage,`model${extension}`),source.bytes);
    await writeExclusive(path.join(stage,'submission.json'),JSON.stringify(receipt,null,2)+'\n');
    await noLinks(productRoot);if(await exists(target))fail('RECEIPT_CONFLICT','A receipt appeared during intake; nothing was overwritten.');
    await rename(stage,target);stage=undefined;
    return {status:'received_unreviewed',productId,sha256,manifestPath:path.join(target,'submission.json'),modelPath:path.join(target,`model${extension}`),receipt};
  }finally{
    // Only our random staging directory and its two known files are cleaned.
    try{
      if(stage){await noLinks(stage);for(const name of [`model${extension}`,'submission.json'])await unlink(path.join(stage,name)).catch(error=>{if(error.code!=='ENOENT')throw error;});await rmdir(stage);}
    }finally{try{await lock.close();}finally{await unlink(lockPath);}}
  }
}
