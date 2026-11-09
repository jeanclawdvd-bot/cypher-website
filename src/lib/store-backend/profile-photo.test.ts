import {describe,expect,it} from 'vitest';
import {validateProfilePhoto,PROFILE_PHOTO_MAX_BYTES} from './profile-photo';
import {PHOTO_DATA_URL,PHOTO_FIXTURE} from './profile-photo.fixture';
import {productionAccountStore,ProductionNotConfiguredError} from './production';

const dataUrl=(bytes:Buffer)=>'data:image/jpeg;base64,'+bytes.toString('base64');
describe('private local profile photo validation',()=>{
  it('recognizes real JPEG segments and dimensions rather than trusting a MIME prefix',()=>{
    expect(validateProfilePhoto(PHOTO_DATA_URL)).toMatchObject({mimeType:'image/jpeg',base64:PHOTO_FIXTURE,width:2,height:2});
    expect(validateProfilePhoto(PHOTO_DATA_URL).digest).toMatch(/^[a-f0-9]{64}$/);
  });
  it('rejects SVG, URLs, invalid magic, noncanonical base64 and truncated or appended content',()=>{
    const image=Buffer.from(PHOTO_FIXTURE,'base64');
    for(const input of ['https://attacker.invalid/avatar.jpg','data:image/svg+xml;base64,PHN2Zy8+',dataUrl(Buffer.from('<svg onload="alert(1)"/>')),dataUrl(Buffer.from([0xff,0xd8,0xff,0xd9])),PHOTO_DATA_URL.replace('base64,','base64,\n'),dataUrl(image.subarray(0,-2)),dataUrl(Buffer.concat([image,Buffer.from('<script/>')]))]){
      expect(()=>validateProfilePhoto(input)).toThrow();
    }
  });
  it('bounds decoded bytes and dimensions before returning any stored image',()=>{
    expect(()=>validateProfilePhoto(dataUrl(Buffer.alloc(PROFILE_PHOTO_MAX_BYTES+1)))).toThrow();
    const image=Buffer.from(PHOTO_FIXTURE,'base64'),frame=image.indexOf(Buffer.from([0xff,0xc0]));
    expect(frame).toBeGreaterThan(0);
    image.writeUInt16BE(513,frame+5);
    expect(()=>validateProfilePhoto(dataUrl(image))).toThrow();
  });
});
describe('ZERO profile adapter boundary',()=>{
  it('identifies the intended provider without enabling unconfigured reads, writes or sync',async()=>{
    const identity={subject:'local-user-is-not-zero',provider:'local',authenticatedAt:new Date().toISOString()};
    expect(productionAccountStore).toMatchObject({status:'unconfigured',profileProvider:'zero'});
    await expect(productionAccountStore.getProfile(identity)).rejects.toBeInstanceOf(ProductionNotConfiguredError);
    await expect(productionAccountStore.updateProfile(identity,{displayName:'New name'},{expectedRevision:'1',idempotencyKey:'test-write'})).rejects.toBeInstanceOf(ProductionNotConfiguredError);
    await expect(productionAccountStore.getProfileSync(identity)).rejects.toBeInstanceOf(ProductionNotConfiguredError);
  });
});
