import { describe, it, expect } from 'vitest';
import { transitionDestination } from './StorePageTransition';

const current = new URL('https://shop.example/store/browse');
function link(href: string, attributes: Record<string,string> = {}) {
  const anchor = document.createElement('a');
  anchor.href = new URL(href, current).href;
  Object.entries(attributes).forEach(([key,value]) => anchor.setAttribute(key,value));
  return anchor;
}

describe('store navigation enhancement', () => {
  it('preserves the selected product finish in the destination', () => {
    expect(transitionDestination(new MouseEvent('click'),link('/store/JCKT_001?color=CONCEPT-JCKT_001-02'),current)?.search).toBe('?color=CONCEPT-JCKT_001-02');
  });
  it('leaves new-tab, download and external links to the browser', () => {
    const linkModes: Record<string,string>[] = [{target:'_blank'},{download:'product.png'}];
    for (const attributes of linkModes) {
      expect(transitionDestination(new MouseEvent('click'),link('/store/JCKT_001',attributes),current)).toBeNull();
    }
    for (const options of [{ctrlKey:true},{metaKey:true},{shiftKey:true},{altKey:true},{button:1}]) {
      expect(transitionDestination(new MouseEvent('click',options),link('/store/JCKT_001'),current)).toBeNull();
    }
    expect(transitionDestination(new MouseEvent('click'),link('https://other.example/'),current)).toBeNull();
  });
  it('does not intercept filters, anchors, prevented actions or the logo glitch', () => {
    for (const href of ['/store/browse?department=rims','/store/browse#results']) {
      expect(transitionDestination(new MouseEvent('click'),link(href),current)).toBeNull();
    }
    expect(transitionDestination(new MouseEvent('click'),link('/',{'data-page-transition':'none'}),current)).toBeNull();
    const event = new MouseEvent('click',{cancelable:true}); event.preventDefault();
    expect(transitionDestination(event,link('/store/JCKT_001'),current)).toBeNull();
  });
});
