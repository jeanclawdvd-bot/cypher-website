import { describe, expect, it, vi } from 'vitest';
import { handleStoreApi } from './http';

describe('local request rejection stream handling',()=>{
  it.each([
    {origin:'https://untrusted.example',contentType:'application/json',status:403},
    {origin:'http://127.0.0.1:8791',contentType:'text/plain',status:415},
  ])('consumes a bounded body before rejecting headers ($status)',async ({origin,contentType,status})=>{
    const prepare=vi.fn(()=>{throw new Error('Rejected requests must not query the database.');});
    const request=new Request('http://127.0.0.1:8791/api/store/v1/profile',{
      method:'PATCH',headers:{Origin:origin,'Content-Type':contentType},body:JSON.stringify({displayName:'Rejected update'}),
    });
    const response=await handleStoreApi(request,{STORE_MODE:'local',STORE_DB:{prepare} as unknown as D1Database});
    expect(response?.status).toBe(status);
    expect(request.bodyUsed).toBe(true);
    expect(request.body?.locked).toBe(false);
    expect(prepare).not.toHaveBeenCalled();
  });
  it('still bounds an invalid-origin body before buffering or touching account data',async()=>{
    const prepare=vi.fn();
    const request=new Request('http://127.0.0.1:8791/api/store/v1/profile',{
      method:'PATCH',headers:{Origin:'https://untrusted.example','Content-Type':'application/json'},body:'x'.repeat(16385),
    });
    const response=await handleStoreApi(request,{STORE_MODE:'local',STORE_DB:{prepare} as unknown as D1Database});
    expect(response?.status).toBe(413); expect(request.bodyUsed).toBe(true); expect(prepare).not.toHaveBeenCalled();
  });
  it('cancels an oversized declared body without querying account data',async()=>{
    const prepare=vi.fn();
    const request=new Request('http://127.0.0.1:8791/api/store/v1/profile',{
      method:'PATCH',headers:{Origin:'http://127.0.0.1:8791','Content-Type':'application/json','Content-Length':'16385'},body:'{}',
    });
    const response=await handleStoreApi(request,{STORE_MODE:'local',STORE_DB:{prepare} as unknown as D1Database});
    expect(response?.status).toBe(413); expect(request.bodyUsed).toBe(true);
    expect(request.body?.locked).toBe(false); expect(prepare).not.toHaveBeenCalled();
  });
});
