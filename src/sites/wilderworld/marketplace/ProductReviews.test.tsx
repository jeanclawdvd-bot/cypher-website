import {afterEach,describe,expect,it,vi} from 'vitest';
import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import ProductReviews from './ProductReviews';
import type {ProductReviewAdapter} from './product-reviews';
import {localReviewAdapter} from './local-review-adapter';
import {storeAccountApi} from './account-client';
afterEach(()=>vi.restoreAllMocks());
const adapter:ProductReviewAdapter={id:'test-published-service',async read(){return {status:'live',provider:'test-published-service',asOf:'2026-01-05T12:00:00Z',message:'Published test records',reviews:[{id:'r1',productId:'coat',variantId:'black',authorDisplayName:'Test collector',rating:4,title:'Black finish review',body:'Published test fixture.',createdAt:'2026-01-01T12:00:00Z',moderation:'published',helpfulCount:0},{id:'r2',productId:'coat',variantId:'chalk',authorDisplayName:'Another test collector',rating:2,title:'Chalk finish review',body:'Another published test fixture.',createdAt:'2026-01-02T12:00:00Z',moderation:'published',helpfulCount:0}]};}};
const props={productId:'coat',variantId:'black',variantName:'Black',variantOptions:[{id:'black',name:'Black'},{id:'chalk',name:'Chalk'}]};
describe('review panel honesty and filtering',()=>{
  it('keeps requested sample ratings separate from published community records',async()=>{
    render(<ProductReviews {...props} adapter={adapter} preview/>);
    await screen.findByRole('button',{name:'Community reviews (2)'});
    expect(screen.getByText('Sample data')).toBeInTheDocument();
    expect(screen.getAllByText('Sample review')).toHaveLength(6);
    expect(screen.queryByText('Black finish review')).not.toBeInTheDocument();
    expect(screen.queryByText('Verified purchase')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button',{name:'Helpful'}).every(button=>(button as HTMLButtonElement).disabled)).toBe(true);
    fireEvent.click(screen.getByRole('button',{name:'Community reviews (2)'}));
    expect(screen.getByText('2 reviews')).toBeInTheDocument();
    expect(screen.getByText('Black finish review')).toBeInTheDocument();
    expect(screen.queryByText('Sample review')).not.toBeInTheDocument();
  });
  it('records a local helpful vote with session confirmation and displays the server count',async()=>{
    vi.spyOn(localReviewAdapter,'read').mockImplementation(adapter.read);
    vi.spyOn(storeAccountApi,'session').mockResolvedValue({mode:'local',csrfToken:'csrf-review',user:{id:'voter',email:'test@example.test',displayName:'Voter',bio:'',createdAt:'2026-01-01T00:00:00Z'}});
    const vote=vi.spyOn(storeAccountApi,'helpful').mockResolvedValue({mode:'local',reviewId:'r2',helpfulCount:1,viewerHelpful:true});
    render(<ProductReviews {...props}/>);await screen.findByText('2 reviews');
    const helpful=screen.getAllByRole('button',{name:'Helpful'})[0];await waitFor(()=>expect(helpful).not.toBeDisabled());fireEvent.click(helpful);
    await screen.findByRole('button',{name:'Helpful (1)',pressed:true});expect(vote).toHaveBeenCalledWith('r2',true,'csrf-review');
    expect(screen.queryByText('Verified purchase')).not.toBeInTheDocument();
  });
  it('shows unavailable rating rather than invented zero stars before a service exists',async()=>{
    render(<ProductReviews {...props}/>);
    await screen.findByText('Reviews coming soon');
    expect(screen.getByRole('img',{name:'Rating unavailable'})).toBeInTheDocument();
    expect(screen.queryByText('0 reviews')).not.toBeInTheDocument();
  });
  it('filters published reviews and saves a local draft without publishing or changing the aggregate',async()=>{
    render(<ProductReviews {...props} adapter={adapter}/>);
    await screen.findByText('2 reviews');
    fireEvent.change(screen.getByRole('combobox',{name:'Filter reviews by variant'}),{target:{value:'chalk'}});
    expect(screen.getByText('Chalk finish review')).toBeInTheDocument();expect(screen.queryByText('Black finish review')).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox',{name:'Filter reviews by rating'}),{target:{value:'5'}});
    expect(screen.getByText('No reviews match these filters.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link',{name:'Write a review'}));
    fireEvent.click(screen.getByRole('button',{name:'Rate 5 stars'}));
    fireEvent.change(screen.getByRole('textbox',{name:'Review title'}),{target:{value:'My unpublished draft'}});
    fireEvent.change(screen.getByRole('textbox',{name:'Your review'}),{target:{value:'This stays in this browser.'}});
    fireEvent.click(screen.getByRole('button',{name:'Save draft'}));
    await waitFor(()=>expect(screen.getByText(/Draft saved in this browser/)).toBeInTheDocument());
    expect(screen.getByText('2 reviews')).toBeInTheDocument();
    expect(screen.queryByText('Verified purchase')).not.toBeInTheDocument();
    expect(screen.queryByText('Verified owner')).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('ww-review-draft:coat:black')!)).toMatchObject({published:false,status:'local_draft',rating:5});
  });
});
