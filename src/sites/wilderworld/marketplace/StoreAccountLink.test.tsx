import {act,cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import StoreAccountLink from './StoreAccountLink';
import {STORE_ACCOUNT_EVENT,storeAccountApi,type LocalSession} from './account-client';
const signedIn:LocalSession={mode:'local',user:{id:'private-id',email:'private@example.test',displayName:'Private name',bio:'',createdAt:''},csrfToken:'private-csrf'};
const signedOut:LocalSession={mode:'local',user:null};
function deferred<T>(){let resolve!:(value:T)=>void;const promise=new Promise<T>(finish=>{resolve=finish;});return {promise,resolve};}
beforeEach(()=>{window.dispatchEvent(new Event(STORE_ACCOUNT_EVENT));});
afterEach(()=>{cleanup();window.dispatchEvent(new Event(STORE_ACCOUNT_EVENT));vi.restoreAllMocks();});
describe('header account presence',()=>{
  it('starts neutral rather than showing Sign in before the first session response',async()=>{
    const request=deferred<LocalSession>();vi.spyOn(storeAccountApi,'session').mockReturnValue(request.promise);
    const {container}=render(<StoreAccountLink/>);expect(screen.getByRole('link',{name:'Account'})).toHaveAttribute('href','/store/account');expect(screen.queryByText('Sign in')).toBeNull();
    await act(async()=>request.resolve(signedIn));expect(screen.getByRole('link',{name:'Your account'})).toBeTruthy();expect(container.textContent).not.toMatch(/private|csrf/i);
  });
  it('keeps Your account across a route remount while the new session check is pending',async()=>{
    const next=deferred<LocalSession>();vi.spyOn(storeAccountApi,'session').mockResolvedValueOnce(signedIn).mockReturnValue(next.promise);
    const first=render(<StoreAccountLink/>);await screen.findByText('Your account');first.unmount();render(<StoreAccountLink/>);
    expect(screen.getByRole('link',{name:'Your account'})).toBeTruthy();expect(screen.queryByText('Sign in')).toBeNull();await act(async()=>next.resolve(signedIn));expect(screen.queryByText('Sign in')).toBeNull();
  });
  it('invalidates on auth change and ignores an older signed-in request after logout',async()=>{
    const stale=deferred<LocalSession>(),logout=deferred<LocalSession>();
    vi.spyOn(storeAccountApi,'session').mockResolvedValueOnce(signedIn).mockReturnValueOnce(stale.promise).mockReturnValueOnce(logout.promise);
    render(<StoreAccountLink/>);await screen.findByText('Your account');fireEvent(window,new Event('focus'));expect(screen.getByText('Your account')).toBeTruthy();
    fireEvent(window,new Event(STORE_ACCOUNT_EVENT));expect(screen.getByRole('link',{name:'Account'})).toBeTruthy();
    await act(async()=>logout.resolve(signedOut));expect(screen.getByText('Sign in')).toBeTruthy();await act(async()=>stale.resolve(signedIn));expect(screen.getByText('Sign in')).toBeTruthy();expect(screen.queryByText('Your account')).toBeNull();
  });
  it('invalidates a cached label even when auth changes between route mounts',async()=>{
    const next=deferred<LocalSession>();vi.spyOn(storeAccountApi,'session').mockResolvedValueOnce(signedIn).mockReturnValue(next.promise);
    const first=render(<StoreAccountLink/>);await screen.findByText('Your account');first.unmount();window.dispatchEvent(new Event(STORE_ACCOUNT_EVENT));render(<StoreAccountLink/>);
    expect(screen.getByRole('link',{name:'Account'})).toBeTruthy();expect(screen.queryByText('Your account')).toBeNull();await act(async()=>next.resolve(signedOut));expect(screen.getByText('Sign in')).toBeTruthy();
  });
  it('uses a neutral account link when the public/local service is unavailable',async()=>{
    vi.spyOn(storeAccountApi,'session').mockRejectedValue(new Error('Not configured'));render(<StoreAccountLink/>);await act(async()=>{});
    expect(screen.getByRole('link',{name:'Account'})).toBeTruthy();expect(screen.queryByText('Sign in')).toBeNull();
  });
});
