import {afterEach,describe,expect,it,vi} from 'vitest';
import {prepareProfilePhoto,MAX_PROFILE_PHOTO_BYTES} from './profile-photo';
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
describe('browser profile photo normalization',()=>{
  it('rejects unsupported, empty and oversize files before decoding',async()=>{
    const decode=vi.fn();vi.stubGlobal('createImageBitmap',decode);
    await expect(prepareProfilePhoto(new File(['<svg/>'],'image.svg',{type:'image/svg+xml'}))).rejects.toThrow(/JPEG, PNG or WebP/);
    await expect(prepareProfilePhoto(new File([],'empty.png',{type:'image/png'}))).rejects.toThrow(/empty/);
    await expect(prepareProfilePhoto(new File([new Uint8Array(5*1024*1024+1)],'large.jpg',{type:'image/jpeg'}))).rejects.toThrow(/5 MB/);expect(decode).not.toHaveBeenCalled();
  });
  it('crops centrally, removes original metadata by JPEG re-encoding and releases decoded pixels',async()=>{
    const bitmap={width:1200,height:800,close:vi.fn()},drawImage=vi.fn();vi.stubGlobal('createImageBitmap',vi.fn().mockResolvedValue(bitmap));
    vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({fillStyle:'',fillRect:vi.fn(),drawImage} as unknown as ReturnType<HTMLCanvasElement['getContext']>);
    const encode=vi.spyOn(HTMLCanvasElement.prototype,'toBlob').mockImplementation(function(callback){callback(new Blob(['normalized-jpeg'],{type:'image/jpeg'}));});
    const result=await prepareProfilePhoto(new File(['original metadata'],'portrait.png',{type:'image/png'}));
    expect(drawImage).toHaveBeenCalledWith(bitmap,200,0,800,800,0,0,512,512);expect(encode).toHaveBeenCalledWith(expect.any(Function),'image/jpeg',0.88);expect(result).toMatch(/^data:image\/jpeg;base64,/);expect(bitmap.close).toHaveBeenCalledOnce();
  });
  it('rejects excessive dimensions and releases the decoded image',async()=>{
    const bitmap={width:12001,height:800,close:vi.fn()};vi.stubGlobal('createImageBitmap',vi.fn().mockResolvedValue(bitmap));
    await expect(prepareProfilePhoto(new File(['x'],'large.jpg',{type:'image/jpeg'}))).rejects.toThrow(/too large/);expect(bitmap.close).toHaveBeenCalledOnce();
  });
  it('does not send an oversized normalized image',async()=>{
    const bitmap={width:512,height:512,close:vi.fn()};vi.stubGlobal('createImageBitmap',vi.fn().mockResolvedValue(bitmap));
    vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({fillStyle:'',fillRect:vi.fn(),drawImage:vi.fn()} as unknown as ReturnType<HTMLCanvasElement['getContext']>);
    vi.spyOn(HTMLCanvasElement.prototype,'toBlob').mockImplementation(callback=>callback(new Blob([new Uint8Array(MAX_PROFILE_PHOTO_BYTES+1)],{type:'image/jpeg'})));
    await expect(prepareProfilePhoto(new File(['x'],'photo.jpg',{type:'image/jpeg'}))).rejects.toThrow(/small enough/);expect(bitmap.close).toHaveBeenCalledOnce();
  });
});
