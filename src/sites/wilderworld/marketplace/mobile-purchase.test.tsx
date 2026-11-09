import { fireEvent,render,screen,within } from '@testing-library/react';
import { afterEach,it,expect,vi } from 'vitest';
import ProductDetail from '../accessories/ProductDetail';
import { individualStoreProducts } from '../accessories/fashion';
import { findMarketProduct } from './catalog';

afterEach(()=>{vi.unstubAllGlobals();localStorage.clear();});
it('mobile purchase uses the current color and writes that exact fit/color to the preview bag',()=>{
  vi.stubGlobal('matchMedia',()=>({matches:true,addEventListener:vi.fn(),removeEventListener:vi.fn()}));
  const product=individualStoreProducts.find(p=>p.id==='BTWR_001_F')!;
  const variant=findMarketProduct(product.id)!.variants[8];
  render(<ProductDetail product={product}/>);
  fireEvent.click(within(screen.getByRole('region',{name:'Color'})).getByRole('button',{name:variant.name}));
  const bar=within(screen.getByRole('complementary',{name:'Mobile purchase'}));
  expect(bar.getByText(variant.name)).toBeInTheDocument();
  fireEvent.click(bar.getByRole('button',{name:'Add to bag'}));
  expect(screen.queryByRole('complementary',{name:'Mobile purchase'})).not.toBeInTheDocument();
  expect(screen.getByRole('dialog')).toHaveTextContent(variant.name);
});
