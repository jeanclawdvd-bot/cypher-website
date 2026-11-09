import {afterEach,describe,expect,it,vi} from 'vitest';
import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import ReviewModeration from './ReviewModeration';
import {storeAccountApi} from '@/sites/wilderworld/marketplace/account-client';
import reviewIdentities from '@/lib/store-backend/original-review-identities.json';
vi.mock('@/sites/wilderworld/marketplace/catalog',()=>({findMarketProduct:()=>({name:'Test hat',variants:[{id:'silver',name:'Silver'}]}),productHref:()=>'/store/hat?color=silver'}));
afterEach(()=>vi.restoreAllMocks());
describe('local moderation account interface',()=>{
 it('links grouped review subjects by name and preserves the original moderation identity',async()=>{
  const [productId,variants]=Object.entries(reviewIdentities.families)[0],variantId=variants[0];
  const subject=(reviewIdentities.presentation as Record<string,{name:string;href:string;editionLabels:string[]}>)[productId];
  const review={id:'group-review',productId,variantId,title:'Edition thoughts',body:'Review body',rating:4,createdAt:'2026-11-08T03:00:00Z',authorDisplayName:'Local reviewer',moderation:'pending' as const,moderationRevision:0};
  vi.spyOn(storeAccountApi,'moderationQueue').mockResolvedValue({mode:'local',reviews:[review]});
  const moderate=vi.spyOn(storeAccountApi,'moderate').mockResolvedValue({mode:'local',review:{...review,moderation:'published'},replayed:false});
  const {container}=render(<ReviewModeration csrfToken="test-csrf"/>);
  expect(await screen.findByRole('link',{name:subject.name})).toHaveAttribute('href',`${subject.href}?variant=${variantId}`);
  expect(container).toHaveTextContent(subject.editionLabels[0]);
  expect(container).not.toHaveTextContent(productId);expect(container).not.toHaveTextContent(productId.split(':')[2]);
  fireEvent.change(screen.getByLabelText('Decision reason'),{target:{value:'Reviewed edition feedback'}});fireEvent.click(screen.getByRole('button',{name:'Publish review'}));
  await waitFor(()=>expect(moderate).toHaveBeenCalledWith('group-review',expect.objectContaining({decision:'published',expectedRevision:0}),'test-csrf'));
 });
 it('requires a reason and sends the current revision with CSRF and an idempotency key',async()=>{
  const review={id:'review-1',productId:'hat',variantId:'silver',title:'Great detail',body:'Review body',rating:5,createdAt:'2026-11-07T10:00:00Z',authorDisplayName:'Local reviewer',moderation:'pending' as const,moderationRevision:0};
  vi.spyOn(storeAccountApi,'moderationQueue').mockResolvedValueOnce({mode:'local',reviews:[review]}).mockResolvedValue({mode:'local',reviews:[]});
  const moderate=vi.spyOn(storeAccountApi,'moderate').mockResolvedValue({mode:'local',review:{...review,moderation:'published'},replayed:false});
  render(<ReviewModeration csrfToken="test-csrf"/>);
  const publish=await screen.findByRole('button',{name:'Publish review'});expect(publish).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Decision reason'),{target:{value:'Reviewed local submission'}});fireEvent.click(publish);
  await waitFor(()=>expect(moderate).toHaveBeenCalled());expect(moderate.mock.calls[0]).toEqual(['review-1',{decision:'published',reason:'Reviewed local submission',expectedRevision:0,idempotencyKey:expect.any(String)},'test-csrf']);
  await screen.findByText('No reviews in this queue.');
 });
 it('surfaces denied access without exposing reviews',async()=>{
  vi.spyOn(storeAccountApi,'moderationQueue').mockRejectedValue(new Error('Local moderator access required.'));
  render(<ReviewModeration/>);expect(await screen.findByRole('alert')).toHaveTextContent('Local moderator access required.');expect(screen.queryByRole('button',{name:'Publish review'})).toBeNull();
 });
});
