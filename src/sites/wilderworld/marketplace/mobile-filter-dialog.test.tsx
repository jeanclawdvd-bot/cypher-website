import {act,fireEvent,render,screen,within} from '@testing-library/react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {MarketplaceBrowse} from './Marketplace';

vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn()}),usePathname:()=>window.location.pathname}));

let mobile=true;
const listeners=new Set<()=>void>();
beforeEach(()=>{
  mobile=true;listeners.clear();localStorage.clear();window.history.replaceState(null,'','/store/collections/furniture');
  vi.stubGlobal('matchMedia',vi.fn((query:string)=>({get matches(){return query==='(max-width: 760px)'?mobile:false;},media:query,addEventListener:(_type:string,listener:()=>void)=>{if(query==='(max-width: 760px)')listeners.add(listener);},removeEventListener:(_type:string,listener:()=>void)=>listeners.delete(listener)})));
});
afterEach(()=>{vi.unstubAllGlobals();document.body.style.overflow='';document.documentElement.style.overflow='';});

function resize(matches:boolean){act(()=>{mobile=matches;for(const listener of listeners)listener();});}
function open(){
  // JSDOM does not evaluate CSS media queries; expose the mobile-only close control.
  screen.getByRole('button',{name:'Close filters',hidden:true}).style.display='grid';
  const trigger=screen.getByRole('button',{name:'Filters'});fireEvent.click(trigger);return {trigger,dialog:screen.getByRole('dialog',{name:'Product filters'})};
}

describe('responsive product filter dialog',()=>{
  it('isolates the background, locks scrolling and loops keyboard focus within the mobile panel',()=>{
    render(<MarketplaceBrowse initialDepartment="furniture"/>);
    expect(screen.queryByRole('complementary',{name:'Product filters'})).toBeNull();
    const {trigger,dialog}=open(),controls=within(dialog);
    expect(trigger).toHaveAttribute('aria-controls',dialog.id);expect(trigger).toHaveAttribute('aria-expanded','true');
    expect(dialog).toHaveAttribute('aria-modal','true');expect(document.body.style.overflow).toBe('hidden');expect(document.documentElement.style.overflow).toBe('hidden');
    expect(screen.getByRole('region',{name:'Product results'})).toHaveAttribute('inert');
    const first=controls.getByRole('button',{name:'Close filters'}),last=controls.getByRole('button',{name:'Reset filters'});
    expect(first).toHaveFocus();fireEvent.keyDown(first,{key:'Tab',shiftKey:true});expect(last).toHaveFocus();
    fireEvent.keyDown(last,{key:'Tab'});expect(first).toHaveFocus();
    screen.getByRole('searchbox',{name:'Search products'}).focus();expect(first).toHaveFocus();
  });
  it('dismisses with Escape or the real backdrop, restores focus and preserves prior page styles',()=>{
    document.body.style.overflow='clip';document.documentElement.style.overflow='auto';
    render(<MarketplaceBrowse initialDepartment="furniture"/>);
    const {trigger,dialog}=open();fireEvent.keyDown(dialog,{key:'Escape'});
    expect(screen.queryByRole('dialog')).toBeNull();expect(trigger).toHaveFocus();expect(trigger).toHaveAttribute('aria-expanded','false');
    expect(document.body.style.overflow).toBe('clip');expect(document.documentElement.style.overflow).toBe('auto');
    expect(screen.getByRole('region',{name:'Product results'})).not.toHaveAttribute('inert');
    open();fireEvent.click(screen.getByRole('button',{name:'Close filters backdrop'}));
    expect(screen.queryByRole('dialog')).toBeNull();expect(trigger).toHaveFocus();
  });
  it('keeps filter choices while closing on department navigation and on desktop resize',()=>{
    render(<MarketplaceBrowse initialDepartment="furniture"/>);
    let {dialog}=open();fireEvent.change(within(dialog).getByRole('combobox',{name:'Colors & materials'}),{target:{value:'moss'}});
    resize(false);
    expect(screen.queryByRole('dialog')).toBeNull();const sidebar=screen.getByRole('complementary',{name:'Product filters'});
    expect(sidebar).not.toHaveAttribute('aria-modal');expect(sidebar).toHaveFocus();expect(document.body.style.overflow).toBe('');
    expect(within(sidebar).getByRole('combobox',{name:'Colors & materials'})).toHaveValue('moss');
    resize(true);expect(screen.queryByRole('dialog')).toBeNull();expect(screen.queryByRole('complementary',{name:'Product filters'})).toBeNull();
    ({dialog}=open());const link=within(dialog).getByRole('link',{name:/^Furniture/});link.addEventListener('click',event=>event.preventDefault(),{once:true});fireEvent.click(link);
    expect(screen.queryByRole('dialog')).toBeNull();expect(screen.getByRole('button',{name:'Filters'})).toHaveFocus();
  });
  it('restores outside elements and scrolling on unmount without disturbing pre-existing inert state',()=>{
    const outside=document.createElement('div');outside.setAttribute('inert','existing');document.body.appendChild(outside);
    const view=render(<MarketplaceBrowse initialDepartment="furniture"/>);open();view.unmount();
    expect(document.body.style.overflow).toBe('');expect(document.documentElement.style.overflow).toBe('');expect(outside).toHaveAttribute('inert','existing');outside.remove();
  });
  it('shows and removes a fit-only filter independently of every other filter',()=>{
    mobile=false;render(<MarketplaceBrowse initialDepartment="clothing" initialGender="Women"/>);
    const chip=screen.getByRole('button',{name:'Remove fit filter'});expect(chip).toHaveTextContent('Women');expect(new URLSearchParams(location.search).get('gender')).toBe('Women');
    fireEvent.click(chip);expect(screen.queryByRole('button',{name:'Remove fit filter'})).toBeNull();expect(new URLSearchParams(location.search).has('gender')).toBe(false);
    expect(screen.getByRole('complementary',{name:'Product filters'})).not.toHaveAttribute('aria-modal');
  });
});
