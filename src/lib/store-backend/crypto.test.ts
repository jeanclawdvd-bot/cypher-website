import { describe, expect, it } from 'vitest';
import { constantTimeEqual, csrfForSession, hashPassword, opaqueToken, readSessionCookie, sessionCookie, tokenHash, verifyPassword } from './crypto';
import { productionAccountStore, productionFulfillment, productionIdentity, ProductionNotConfiguredError } from './production';

describe('local store credential boundaries',()=>{
  it('uses independent salts and rejects wrong credentials without storing the password',async()=>{
    const password='a-local-test-passphrase';
    const first=await hashPassword(password),second=await hashPassword(password);
    expect(first.salt).not.toBe(second.salt); expect(first.hash).not.toBe(second.hash);
    expect(first.hash).not.toContain(password);
    expect(await verifyPassword(password,first.salt,first.hash)).toBe(true);
    expect(await verifyPassword('incorrect-local-password',first.salt,first.hash)).toBe(false);
    expect(await verifyPassword(password,'bad-salt',first.hash)).toBe(false);
  });
  it('hashes opaque sessions and derives independent CSRF values',()=>{
    const a=opaqueToken(),b=opaqueToken();
    expect(a).not.toBe(b); expect(tokenHash(a)).not.toBe(a); expect(csrfForSession(a)).not.toBe(tokenHash(a));
    expect(constantTimeEqual(csrfForSession(a),csrfForSession(a))).toBe(true);
    expect(constantTimeEqual(csrfForSession(a),csrfForSession(b))).toBe(false);
    expect(constantTimeEqual(csrfForSession(a),'')).toBe(false);
    expect(sessionCookie(a,new URL('http://127.0.0.1'))).toContain('HttpOnly; SameSite=Strict');
    expect(sessionCookie(a,new URL('https://localhost'))).toContain('; Secure');
    expect(sessionCookie('',new URL('http://localhost'),true)).toContain('Max-Age=0');
    expect(readSessionCookie(new Request('http://localhost',{headers:{cookie:`ww_local_session=${a}`}}))).toBe(a);
    expect(readSessionCookie(new Request('http://localhost',{headers:{cookie:`ww_local_session=${a}; ww_local_session=${b}`}}))).toBeNull();
  });
  it('has no functional production identity, account or settlement fallback',async()=>{
    expect(productionIdentity.status).toBe('unconfigured');
    await expect(productionIdentity.authenticate(new Request('https://example.com'))).rejects.toBeInstanceOf(ProductionNotConfiguredError);
    await expect(productionAccountStore.getInventory({subject:'test',provider:'test',authenticatedAt:''})).rejects.toBeInstanceOf(ProductionNotConfiguredError);
    await expect(productionFulfillment.confirmPayment('test','untrusted-client-reference')).rejects.toBeInstanceOf(ProductionNotConfiguredError);
  });
});
