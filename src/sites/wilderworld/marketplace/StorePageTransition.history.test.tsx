import {act, fireEvent, render, waitFor} from '@testing-library/react';
import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import StorePageTransition from './StorePageTransition';

const route = vi.hoisted(() => ({path: '/store/browse', push: vi.fn()}));
vi.mock('next/navigation', () => ({usePathname: () => route.path, useRouter: () => ({push: route.push})}));

beforeEach(() => {
  route.path = '/store/browse';
  route.push.mockReset();
  window.history.replaceState({key: 'browse'}, '', '/store/browse');
  vi.stubGlobal('matchMedia', vi.fn(() => ({matches: false})));
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  HTMLElement.prototype.scrollIntoView = vi.fn();
  vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true);
  vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(500);
  vi.spyOn(HTMLImageElement.prototype, 'getBoundingClientRect').mockReturnValue({top:100,bottom:400,left:0,right:300,width:300,height:300,x:0,y:100,toJSON:()=>({})});
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); delete (document as Partial<Document>).startViewTransition; delete (HTMLElement.prototype as Partial<HTMLElement>).scrollIntoView; });

it('reverses a product into its source card on Back without creating another history entry', async () => {
  const captures: string[] = [];
  const destinations: string[] = [];
  const transition = vi.fn((update: () => Promise<void>) => {
    captures.push(document.querySelector<HTMLImageElement>('[data-product-hero] img')?.style.viewTransitionName || 'card');
    const ready = Promise.resolve().then(update).then(()=>{destinations.push(document.querySelector<HTMLImageElement>('img')?.style.viewTransitionName || 'none');});
    return {ready, finished: ready, updateCallbackDone: ready, skipTransition: vi.fn()};
  });
  document.startViewTransition = transition as unknown as typeof document.startViewTransition;
  const view = (product: boolean) => <><StorePageTransition/>{product ? <div data-product-hero><img src="/hat.webp" alt="Hat detail"/></div> : <article><a href="/store/hat"><img src="/hat.webp" alt="Hat"/></a></article>}</>;
  const ui = render(view(false));
  expect(window.history.scrollRestoration).toBe('manual');
  fireEvent.click(ui.getByAltText('Hat'));
  await waitFor(() => expect(route.push).toHaveBeenCalledWith('/store/hat'));
  await act(async () => {route.path = '/store/hat'; ui.rerender(view(true));});
  await waitFor(() => expect(ui.getByAltText('Hat detail').style.viewTransitionName).toBe(''));
  await waitFor(() => expect(destinations).toEqual(['ww-product']));

  const pushState = vi.spyOn(window.history, 'pushState');
  const routerPopstate = vi.fn(() => {route.path = '/store/browse'; ui.rerender(view(false));});
  window.addEventListener('popstate', routerPopstate);
  await act(async () => {window.dispatchEvent(new PopStateEvent('popstate', {state: {key: 'browse'}}));});
  await waitFor(() => expect(routerPopstate).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(destinations).toEqual(['ww-product','ww-product']));
  expect(transition).toHaveBeenCalledTimes(2);
  expect(captures[1]).toBe('ww-product');
  expect(pushState).not.toHaveBeenCalled();
  expect(route.push).toHaveBeenCalledTimes(1);
  expect(window.scrollTo).toHaveBeenCalledWith({left: 0, top: 0, behavior: 'instant'});
  window.removeEventListener('popstate', routerPopstate);
});

it('settles delayed grid layout and image decoding before capturing the return, without centering the card', async () => {
  const frames: Array<{path:string; y:number; target:string}> = [];
  let y = 1200;
  vi.spyOn(window, 'scrollY', 'get').mockImplementation(()=>y);
  vi.mocked(window.scrollTo).mockImplementation((options:any)=>{y=options.top;});
  let decode: (()=>void) | undefined;
  let decoding = false;
  Object.defineProperty(HTMLImageElement.prototype,'decode',{configurable:true,value:vi.fn(()=>decoding ? new Promise<void>(resolve=>{decode=resolve;}) : Promise.resolve())});
  document.startViewTransition = ((update:()=>Promise<void>)=>{
    const ready=Promise.resolve().then(update).then(()=>frames.push({path:route.path,y,target:document.querySelector<HTMLImageElement>('img')?.style.viewTransitionName||''}));
    return {ready,finished:ready,updateCallbackDone:ready,skipTransition:vi.fn()};
  }) as unknown as typeof document.startViewTransition;
  const view=(product:boolean,card=true)=><><StorePageTransition/>{product?<div data-product-hero><img src="/hat.webp" alt="Detail"/></div>:card?<a href="/store/hat"><img src="/hat.webp" alt="Hat"/></a>:null}</>;
  const ui=render(view(false));
  fireEvent.click(ui.getByAltText('Hat'));
  await waitFor(()=>expect(route.push).toHaveBeenCalled());
  await act(async()=>{route.path='/store/hat';ui.rerender(view(true));});
  await waitFor(()=>expect(frames).toHaveLength(1));
  decoding=true;y=0;
  const routerPopstate=()=>{route.path='/store/browse';ui.rerender(view(false,false));};
  window.addEventListener('popstate',routerPopstate);
  await act(async()=>{window.dispatchEvent(new PopStateEvent('popstate'));});
  expect(frames).toHaveLength(1);
  await act(async()=>{ui.rerender(view(false));});
  await waitFor(()=>expect(decode).toBeDefined());
  expect(frames).toHaveLength(1);
  await act(async()=>{y=800;decode!();}); // Late router restoration must precede capture.
  await waitFor(()=>expect(frames).toHaveLength(2));
  expect(frames[1]).toEqual({path:'/store/browse',y:1200,target:'ww-product'});
  expect(HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
  window.removeEventListener('popstate',routerPopstate);
  delete (HTMLImageElement.prototype as Partial<HTMLImageElement>).decode;
});
