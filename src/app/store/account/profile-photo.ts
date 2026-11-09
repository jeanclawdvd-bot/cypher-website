const MAX_INPUT_BYTES=5*1024*1024;
export const MAX_PROFILE_PHOTO_BYTES=256*1024;
const ACCEPTED_TYPES=new Set(['image/jpeg','image/png','image/webp']);
function blobDataUrl(blob:Blob):Promise<string>{return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(new Error('The photo could not be read. Choose it again.'));reader.onload=()=>typeof reader.result==='string'?resolve(reader.result):reject(new Error('The photo could not be read.'));reader.readAsDataURL(blob);});}
async function decodePhoto(file:File):Promise<{width:number;height:number;source:CanvasImageSource;close:()=>void}>{
  if(typeof createImageBitmap==='function'){
    const image=await createImageBitmap(file,{imageOrientation:'from-image'});return {width:image.width,height:image.height,source:image,close:()=>image.close()};
  }
  const objectUrl=URL.createObjectURL(file);
  try{const image=await new Promise<HTMLImageElement>((resolve,reject)=>{const element=new Image();element.onload=()=>resolve(element);element.onerror=()=>reject(new Error('This file is not a readable photo. Choose a JPEG, PNG or WebP image.'));element.src=objectUrl;});return {width:image.naturalWidth,height:image.naturalHeight,source:image,close:()=>URL.revokeObjectURL(objectUrl)};}
  catch(error){URL.revokeObjectURL(objectUrl);throw error;}
}
/** Re-encode user-selected raster content; never persist the original file or metadata. */
export async function prepareProfilePhoto(file:File):Promise<string>{
  if(!ACCEPTED_TYPES.has(file.type))throw new Error('Choose a JPEG, PNG or WebP photo. SVG and GIF files are not supported.');
  if(!file.size)throw new Error('This photo is empty. Choose another file.');
  if(file.size>MAX_INPUT_BYTES)throw new Error('Choose a photo smaller than 5 MB.');
  let decoded:Awaited<ReturnType<typeof decodePhoto>>;
  try{decoded=await decodePhoto(file);}catch{throw new Error('This photo could not be opened. Choose a JPEG, PNG or WebP image.');}
  try{
    if(decoded.width<1||decoded.height<1||decoded.width>12000||decoded.height>12000||decoded.width*decoded.height>40_000_000)throw new Error('This photo is too large to process. Choose a smaller image.');
    const crop=Math.min(decoded.width,decoded.height),size=Math.min(512,crop),canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;
    const context=canvas.getContext('2d');if(!context)throw new Error('Your browser could not prepare this photo. Try another browser.');
    context.fillStyle='#101113';context.fillRect(0,0,size,size);context.drawImage(decoded.source,(decoded.width-crop)/2,(decoded.height-crop)/2,crop,crop,0,0,size,size);
    const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('The photo could not be resized. Try another image.')),'image/jpeg',0.88));
    if(blob.type!=='image/jpeg'||blob.size>MAX_PROFILE_PHOTO_BYTES)throw new Error('This photo could not be made small enough. Try a simpler or smaller image.');
    return await blobDataUrl(blob);
  }finally{decoded.close();}
}
