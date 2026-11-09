import {createHash} from 'node:crypto';

export const PROFILE_PHOTO_MAX_BYTES=256*1024;
export const PROFILE_PHOTO_BODY_LIMIT=350*1024;
export const PROFILE_PHOTO_MAX_DIMENSION=512;
export type ValidatedProfilePhoto={mimeType:'image/jpeg';base64:string;digest:string;width:number;height:number};

/** Validate the bounded, canonical JPEG output of the profile cropper. No SVG,
 * external URLs or MIME-only checks. JPEG segments, dimensions, scan boundaries
 * and final EOI must be present. This does not perform an image transformation. */
export function validateProfilePhoto(value:unknown):ValidatedProfilePhoto {
  if(typeof value!=='string'||value.length>Math.ceil(PROFILE_PHOTO_MAX_BYTES/3)*4+23)throw new Error('Use a JPEG profile photo of up to 256 KiB.');
  const match=/^data:image\/jpeg;base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if(!match)throw new Error('Upload the JPEG produced by the profile photo editor.');
  const base64=match[1],bytes=Buffer.from(base64,'base64');
  if(!bytes.length||bytes.length>PROFILE_PHOTO_MAX_BYTES||bytes.toString('base64')!==base64)throw new Error('Invalid or oversized JPEG photo.');
  const invalid=()=>new Error('The profile photo is not a supported JPEG image.');
  if(bytes.length<4||bytes.readUInt16BE(0)!==0xffd8)throw invalid();
  let offset=2,width=0,height=0,components=0,frames=0,scans=0,quantization=false,huffman=false;
  while(offset<bytes.length){
    if(bytes[offset++]!==0xff)throw invalid();
    while(bytes[offset]===0xff)offset++;
    const marker=bytes[offset++];
    if(marker===0xd9){
      if(offset!==bytes.length||frames!==1||!scans||!quantization||!huffman)throw invalid();
      return {mimeType:'image/jpeg',base64,digest:createHash('sha256').update(bytes).digest('hex'),width,height};
    }
    if(offset+2>bytes.length||marker===0xd8||marker===0x00||marker===0x01||(marker>=0xd0&&marker<=0xd7))throw invalid();
    const length=bytes.readUInt16BE(offset),end=offset+length;
    if(length<2||end>bytes.length)throw invalid();
    if(marker===0xc0||marker===0xc2){
      if(++frames!==1||length<8||bytes[offset+2]!==8)throw invalid();
      height=bytes.readUInt16BE(offset+3);width=bytes.readUInt16BE(offset+5);components=bytes[offset+7];
      if(!width||!height||width>PROFILE_PHOTO_MAX_DIMENSION||height>PROFILE_PHOTO_MAX_DIMENSION||![1,3].includes(components)||length!==8+3*components)throw invalid();
    }else if(marker===0xdb){
      if(length===2)throw invalid();
      let p=offset+2;
      while(p<end){const table=bytes[p++];if((table>>4)>1||(table&15)>3)throw invalid();p+=64*((table>>4)+1);}
      if(p!==end)throw invalid();quantization=true;
    }else if(marker===0xc4){
      if(length===2)throw invalid();
      let p=offset+2;
      while(p<end){
        const table=bytes[p++];if((table>>4)>1||(table&15)>3||p+16>end)throw invalid();
        let count=0;for(let i=0;i<16;i++)count+=bytes[p++];
        if(count===0||count>256)throw invalid();p+=count;
      }
      if(p!==end)throw invalid();huffman=true;
    }else if(marker===0xda){
      const scanComponents=bytes[offset+2];
      if(frames!==1||!quantization||!huffman||scanComponents<1||scanComponents>components||length!==6+2*scanComponents)throw invalid();
      scans++;let p=end;
      while(p<bytes.length){
        if(bytes[p]!==0xff){p++;continue;}
        let next=p+1;while(bytes[next]===0xff)next++;
        if(bytes[next]===0x00||(bytes[next]>=0xd0&&bytes[next]<=0xd7)){p=next+1;continue;}
        break;
      }
      if(p===end||p>=bytes.length)throw invalid();
      offset=p;continue;
    }else if(marker===0xdd){if(length!==4)throw invalid();}
    else if(!(marker>=0xe0&&marker<=0xef)&&marker!==0xfe)throw invalid();
    offset=end;
  }
  throw invalid();
}
