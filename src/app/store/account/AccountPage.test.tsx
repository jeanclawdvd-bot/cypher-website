import {act,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
vi.mock('@/sites/wilderworld/marketplace/Marketplace',()=>({MarketHeader:()=>null}));
vi.mock('@/sites/wilderworld/marketplace/catalog',()=>({findMarketProduct:(id:string)=>({id,name:id==='rim-1'?'Causeway':'Wilder Hat',image:'/hat.webp',department:id==='rim-1'?'vehicles':'clothing',subcategory:id==='rim-1'?'rims':'headwear',variants:[{id:'silver',name:'Silver',image:'/silver.webp'},{id:'pending',name:'Pending finish',image:null}]}),productHref:(_product:unknown,variant?:{id:string})=>`/store/hat-1${variant?'?color='+variant.id:''}`,storefrontDepartment:(product:{department:string;subcategory:string})=>product.subcategory==='rims'?'rims':product.department,departmentName:(id:string)=>id==='rims'?'Rims':'Clothing'}));
import {LOCAL_DEMO_RATE,localDemoPaymentAmount} from '@/lib/store-backend/currency';
import reviewIdentities from '@/lib/store-backend/original-review-identities.json';
import AccountPage,{AccountAuthForm,InventoryItemCard} from './AccountPage';
import LocalListingPanel from '@/sites/wilderworld/marketplace/LocalListingPanel';
import StoreAccountLink from '@/sites/wilderworld/marketplace/StoreAccountLink';
import {storeAccountApi,StoreApiError,type LocalAccount,type LocalInventoryItem,type LocalSession,type LocalListing} from '@/sites/wilderworld/marketplace/account-client';
afterEach(()=>vi.restoreAllMocks());
const user={id:'buyer',email:'test@example.test',displayName:'Test account',bio:'',createdAt:'2026-11-07T10:00:00Z'};
const session:LocalSession={mode:'local',user,csrfToken:'test-csrf'};
const listing:LocalListing={id:'listing-1',itemId:'item-1',productId:'hat-1',variantId:'silver',amountAtomic:'250000000000000000000',priceCents:null,currency:'WILD',status:'active',createdAt:'2026-11-07T10:00:00Z',sellerId:'seller',sellerName:'Test seller',simulated:true,feePolicyVersion:'2026-11-08-seller-1pct',sellerFeeBps:100,sellerFeeCents:null,sellerProceedsCents:null,sellerFeeAtomic:'2500000000000000000',sellerProceedsAtomic:'247500000000000000000'};

beforeEach(()=>{window.history.replaceState(null,'','/store/account');vi.spyOn(storeAccountApi,'quote').mockImplementation(async(id,body)=>({mode:'local',quote:{id:'quote-'+body.paymentCurrency,listingId:id,buyerId:user.id,listingCurrency:body.expectedCurrency,listingAmountAtomic:body.expectedAmountAtomic,paymentCurrency:body.paymentCurrency,paymentAmountAtomic:localDemoPaymentAmount(body.expectedAmountAtomic,body.expectedCurrency,body.paymentCurrency),rateId:LOCAL_DEMO_RATE.id,usdCentsPerWild:'10',createdAt:new Date().toISOString(),expiresAt:new Date(Date.now()+300_000).toISOString(),simulated:true}}));});

describe('local account forms and listings',()=>{
  it('opens the validated Wallets section from an account deep link',async()=>{
    vi.spyOn(storeAccountApi,'session').mockResolvedValue(session);
    vi.spyOn(storeAccountApi,'account').mockResolvedValue({mode:'local',user,inventory:[],listings:[],purchases:[],sales:[],reviews:[]});
    vi.spyOn(storeAccountApi,'wallets').mockResolvedValue({mode:'local',wallets:[],assetSyncStatus:'unconfigured',gameDeliveryStatus:'unconfigured'});
    render(<AccountPage initialTab="wallets"/>);await screen.findByRole('heading',{name:'Wallets'});
    expect(screen.getByRole('button',{name:'Wallets'})).toHaveAttribute('aria-current','page');
    expect(screen.getAllByText('Not connected')).toHaveLength(2);expect(screen.queryByRole('heading',{name:'Your inventory'})).toBeNull();
  });

  it.each([[404,'not_found'],[503,'unavailable'],[200,'wrong_mode']] as const)('hides credentials when account service is unavailable (%s) and can retry into the local preview',async(status,code)=>{
    const read=vi.spyOn(storeAccountApi,'session').mockRejectedValue(new StoreApiError('Not found.',status,code));
    const register=vi.spyOn(storeAccountApi,'register'),login=vi.spyOn(storeAccountApi,'login'),account=vi.spyOn(storeAccountApi,'account');
    render(<AccountPage/>);await screen.findByRole('heading',{name:'Sign-in is coming soon.'});
    expect(screen.getByText('Your profile, collection and listings will be available here.')).toBeTruthy();
    expect(screen.queryByLabelText('Email')).toBeNull();expect(screen.queryByLabelText(/^Password/)).toBeNull();expect(screen.queryByRole('button',{name:'Create account'})).toBeNull();
    expect(screen.queryByText('Not found.')).toBeNull();expect(screen.getByRole('link',{name:'Browse the collection'})).toHaveAttribute('href','/store/browse');
    expect(register).not.toHaveBeenCalled();expect(login).not.toHaveBeenCalled();expect(account).not.toHaveBeenCalled();
    read.mockResolvedValue({mode:'local',user:null});fireEvent.click(screen.getByRole('button',{name:'Check account availability'}));
    await screen.findByLabelText('Email');expect(screen.getByLabelText(/^Password/)).toBeTruthy();expect(screen.getByRole('button',{name:'Create account'})).toBeTruthy();
    expect(screen.queryByRole('heading',{name:'Sign-in is coming soon.'})).toBeNull();
  });

  it('shows grouped reviews with friendly product and edition links instead of chain identities',async()=>{
    const [productId,variants]=Object.entries(reviewIdentities.families)[0],variantId=variants[0];
    const subject=(reviewIdentities.presentation as Record<string,{name:string;href:string;editionLabels:string[]}>)[productId];
    vi.spyOn(storeAccountApi,'session').mockResolvedValue(session);
    vi.spyOn(storeAccountApi,'account').mockResolvedValue({mode:'local',user,inventory:[],listings:[],purchases:[],sales:[],reviews:[{id:'group-review',productId,variantId,rating:4,title:'My finish',body:'A local review for this exact original edition.',moderation:'pending',createdAt:'2026-11-08T03:00:00Z'}]});
    const {container}=render(<AccountPage/>);await screen.findByRole('heading',{name:'Test account'});
    fireEvent.click(screen.getByRole('button',{name:/^Reviews/}));
    expect(screen.getByRole('link',{name:subject.name})).toHaveAttribute('href',`${subject.href}?variant=${variantId}`);
    expect(screen.getByRole('region',{name:'reviews'})).toHaveTextContent(subject.editionLabels[0]);
    expect(container).not.toHaveTextContent(productId);expect(container).not.toHaveTextContent(productId.split(':')[2]);
    expect(screen.getByText(/Local submission/)).toHaveTextContent('pending');
  });

  it('shows the seller deduction before listing and submits only the unchanged asking price',async()=>{
    const onList=vi.fn().mockResolvedValue(undefined);
    render(<InventoryItemCard item={{id:'item-1',productId:'hat-1',variantId:'silver',name:'Hat',variantName:'Silver',usage:'unlocked',listingId:null,acquiredAt:'2026-11-07T10:00:00Z'}} busy={false} onList={onList}/>);
    fireEvent.click(screen.getByRole('button',{name:'List test item'}));
    fireEvent.change(screen.getByLabelText(/Test asking price/),{target:{value:'100.00'}});
    expect(screen.getByLabelText('Simulated seller proceeds')).toHaveTextContent('Seller fee · 1%−1 WILD');
    expect(screen.getByLabelText('Simulated seller proceeds')).toHaveTextContent('You receive · simulated99 WILD');
    fireEvent.click(screen.getByRole('button',{name:'Create test listing'}));
    await waitFor(()=>expect(onList).toHaveBeenCalledWith(expect.objectContaining({id:'item-1'}),'100000000000000000000'));
  });
  it('shows stored zero-fee terms for legacy listings and historical sales',async()=>{
    const legacy={...listing,currency:'USD' as const,amountAtomic:'2500',priceCents:2500,feePolicyVersion:'legacy-zero',sellerFeeBps:0,sellerFeeCents:0,sellerProceedsCents:2500,sellerFeeAtomic:'0',sellerProceedsAtomic:'2500'};
    vi.spyOn(storeAccountApi,'session').mockResolvedValue(session);
    vi.spyOn(storeAccountApi,'account').mockResolvedValue({mode:'local',user,inventory:[],listings:[legacy],purchases:[],sales:[{...legacy,id:'sale-1',listingId:'listing-1',buyerId:'other',quoteId:null,paymentCurrency:'USD',paymentAmountAtomic:'2500',quoteRateId:null,quoteUsdCentsPerWild:null,quoteExpiresAt:null}],reviews:[]});
    render(<AccountPage/>);await screen.findByRole('heading',{name:'Test account'});
    fireEvent.click(screen.getByRole('button',{name:/^Listings/}));
    expect(screen.getByLabelText('Simulated seller proceeds')).toHaveTextContent('Seller fee · 0%−$0.00');
    expect(screen.getByLabelText('Simulated seller proceeds')).toHaveTextContent('You receive · simulated$25.00');
    fireEvent.click(screen.getByRole('button',{name:/^Sales/}));
    expect(screen.getByLabelText('Simulated seller proceeds')).toHaveTextContent('Seller fee · 0%−$0.00');
    expect(screen.getByLabelText('Simulated seller proceeds')).toHaveTextContent('You receive · simulated$25.00');
  });
  it('shows an unchanged buyer total and stored seller proceeds before simulated purchase',async()=>{
    vi.spyOn(storeAccountApi,'session').mockResolvedValue(session);
    vi.spyOn(storeAccountApi,'listings').mockResolvedValue({mode:'local',listings:[listing]});
    const buy=vi.spyOn(storeAccountApi,'buy');
    render(<LocalListingPanel productId="hat-1" variantId="silver" variantName="Silver"/>);
    fireEvent.click(await screen.findByRole('button',{name:'Simulate purchase'}));
    const totals=within(await screen.findByLabelText('Simulated purchase totals'));
    expect(totals.getByText('Buyer marketplace fee').parentElement).toHaveTextContent('$0.00');
    expect(totals.getByText('You pay · simulated').parentElement).toHaveTextContent('$25.00');
    expect(screen.getByText(/Seller fee: 1%/)).toHaveTextContent('Seller receives 248 WILD');
    expect(buy).not.toHaveBeenCalled();
  });
  it('does not offer a simulated purchase when stored fee totals are inconsistent',async()=>{
    vi.spyOn(storeAccountApi,'session').mockResolvedValue(session);
    vi.spyOn(storeAccountApi,'listings').mockResolvedValue({mode:'local',listings:[{...listing,sellerProceedsCents:2500}]});
    render(<LocalListingPanel productId="hat-1" variantId="silver" variantName="Silver"/>);
    expect(await screen.findByRole('button',{name:'Fee details unavailable'})).toBeDisabled();
  });
  it('requests a new server quote for WILD payment and submits exactly the displayed confirmation',async()=>{
    vi.spyOn(storeAccountApi,'session').mockResolvedValue(session);vi.spyOn(storeAccountApi,'listings').mockResolvedValue({mode:'local',listings:[listing]});
    const buy=vi.spyOn(storeAccountApi,'buy').mockRejectedValue(new StoreApiError('Network failure',0,'network'));
    render(<LocalListingPanel productId="hat-1" variantId="silver" variantName="Silver"/>);
    fireEvent.click(await screen.findByRole('button',{name:'Simulate purchase'}));await screen.findByLabelText('Simulated purchase totals');
    fireEvent.click(screen.getByRole('button',{name:'WILD'}));
    await waitFor(()=>expect(screen.getByLabelText('Simulated purchase totals')).toHaveTextContent('250 WILD'));
    await waitFor(()=>expect(screen.getByRole('button',{name:'Confirm simulated purchase'})).toBeEnabled());
    expect(storeAccountApi.quote).toHaveBeenLastCalledWith('listing-1',{paymentCurrency:'WILD',expectedCurrency:'WILD',expectedAmountAtomic:listing.amountAtomic},'test-csrf');
    fireEvent.click(screen.getByRole('button',{name:'Confirm simulated purchase'}));
    await waitFor(()=>expect(buy).toHaveBeenCalledWith('listing-1',expect.objectContaining({quoteId:'quote-WILD',expectedAmountAtomic:listing.amountAtomic,expectedCurrency:'WILD',paymentCurrency:'WILD',expectedPaymentAmountAtomic:listing.amountAtomic}),'test-csrf'));
  });
  it('rejects a mismatched server quote and never enables confirmation',async()=>{
    vi.spyOn(storeAccountApi,'session').mockResolvedValue(session);vi.spyOn(storeAccountApi,'listings').mockResolvedValue({mode:'local',listings:[listing]});
    const original=vi.mocked(storeAccountApi.quote).getMockImplementation()!;
    vi.mocked(storeAccountApi.quote).mockImplementation(async(...args)=>{const result=await original(...args);return {...result,quote:{...result.quote,paymentAmountAtomic:'1'}};});
    const buy=vi.spyOn(storeAccountApi,'buy');render(<LocalListingPanel productId="hat-1" variantId="silver" variantName="Silver"/>);
    fireEvent.click(await screen.findByRole('button',{name:'Simulate purchase'}));await screen.findByText(/purchase quote does not match/);
    expect(screen.queryByRole('button',{name:'Confirm simulated purchase'})).toBeNull();expect(buy).not.toHaveBeenCalled();
  });
  it('requires a fresh quote when a returned quote is already expired',async()=>{
    vi.spyOn(storeAccountApi,'session').mockResolvedValue(session);vi.spyOn(storeAccountApi,'listings').mockResolvedValue({mode:'local',listings:[listing]});
    const original=vi.mocked(storeAccountApi.quote).getMockImplementation()!;
    vi.mocked(storeAccountApi.quote).mockImplementation(async(...args)=>{const result=await original(...args);return {...result,quote:{...result.quote,createdAt:new Date(Date.now()-600_000).toISOString(),expiresAt:new Date(Date.now()-1000).toISOString()}};});
    render(<LocalListingPanel productId="hat-1" variantId="silver" variantName="Silver"/>);fireEvent.click(await screen.findByRole('button',{name:'Simulate purchase'}));
    await screen.findByRole('button',{name:'Refresh purchase quote'});expect(screen.queryByRole('button',{name:'Confirm simulated purchase'})).toBeNull();
  });
  it('refreshes accounts on focus and ignores an older account response after the session changes',async()=>{
    let finishOld!:(value:LocalAccount)=>void;const oldAccount=new Promise<LocalAccount>(resolve=>{finishOld=resolve;});
    const second={...user,id:'buyer-2',displayName:'Second account'};const account=(owner:typeof user):LocalAccount=>({mode:'local',user:owner,inventory:[],listings:[],purchases:[],sales:[],reviews:[]});
    vi.spyOn(storeAccountApi,'session').mockResolvedValueOnce(session).mockResolvedValue({mode:'local',user:second,csrfToken:'new-csrf'});
    const read=vi.spyOn(storeAccountApi,'account').mockReturnValueOnce(oldAccount).mockResolvedValue(account(second));render(<AccountPage/>);
    await waitFor(()=>expect(read).toHaveBeenCalledTimes(1));fireEvent(window,new Event('focus'));await screen.findByRole('heading',{name:'Second account'});
    await act(async()=>finishOld(account(user)));expect(screen.queryByRole('heading',{name:'Test account'})).toBeNull();expect(screen.getByRole('heading',{name:'Second account'})).toBeTruthy();
  });
  it('removes a sold listing after focus refresh',async()=>{vi.spyOn(storeAccountApi,'session').mockResolvedValue(session);vi.spyOn(storeAccountApi,'listings').mockResolvedValueOnce({mode:'local',listings:[listing]}).mockResolvedValue({mode:'local',listings:[]});render(<LocalListingPanel productId="hat-1" variantId="silver" variantName="Silver"/>);await screen.findByRole('button',{name:'Simulate purchase'});fireEvent(window,new Event('focus'));await screen.findByText('No test listings for this finish.');expect(screen.queryByRole('button',{name:'Simulate purchase'})).toBeNull();});
  it('refreshes the account header when a session is signed out elsewhere',async()=>{vi.spyOn(storeAccountApi,'session').mockResolvedValueOnce(session).mockResolvedValue({mode:'local',user:null});render(<StoreAccountLink/>);await screen.findByText('Your account');fireEvent(window,new Event('focus'));await screen.findByText('Sign in');});
  it('reports auth failure, clears password and does not act as signed in',async()=>{const login=vi.spyOn(storeAccountApi,'login').mockRejectedValue(new StoreApiError('Email or password is incorrect.',401,'unauthorized'));const authenticated=vi.fn();render(<AccountAuthForm onAuthenticated={authenticated}/>);fireEvent.change(screen.getByLabelText('Email'),{target:{value:'test@example.test'}});fireEvent.change(screen.getByLabelText(/^Password/),{target:{value:'test-password-123'}});fireEvent.submit(screen.getByLabelText('Email').closest('form')!);await screen.findByRole('alert');expect(screen.getByLabelText(/^Password/)).toHaveValue('');expect(login).toHaveBeenCalledOnce();expect(authenticated).not.toHaveBeenCalled();});
  it('uses catalog names/images and prevents listing an equipped test item',()=>{render(<InventoryItemCard item={{id:'item-1',productId:'hat-1',variantId:'silver',name:'Backend name',variantName:'Old label',usage:'equipped',listingId:null,acquiredAt:'2026-11-07T10:00:00Z'} as LocalInventoryItem} busy={false} onList={vi.fn()}/>);expect(screen.getByRole('img',{name:'Wilder Hat'})).toHaveAttribute('src','/silver.webp');expect(screen.getByRole('button',{name:'Unavailable while locked'})).toBeDisabled();});
  it('validates list prices and leaves server rejection visible',async()=>{const onList=vi.fn().mockRejectedValue(new Error('Item became locked.'));render(<InventoryItemCard item={{id:'item-1',productId:'hat-1',variantId:'silver',name:'Hat',variantName:'Silver',usage:'unlocked',listingId:null,acquiredAt:'2026-11-07T10:00:00Z'}} busy={false} onList={onList}/>);fireEvent.click(screen.getByRole('button',{name:'List test item'}));fireEvent.change(screen.getByLabelText(/Test asking price/),{target:{value:'0'}});fireEvent.click(screen.getByRole('button',{name:'Create test listing'}));await screen.findByRole('alert');expect(onList).not.toHaveBeenCalled();fireEvent.change(screen.getByLabelText(/Test asking price/),{target:{value:'12.01'}});fireEvent.click(screen.getByRole('button',{name:'Create test listing'}));await screen.findByText('Item became locked.');expect(onList.mock.calls[0][1]).toBe('12010000000000000000');});
  it('hides local purchase controls when the preview backend is deliberately disabled',async()=>{vi.spyOn(storeAccountApi,'session').mockRejectedValue(new StoreApiError('Not found.',404,'not_found'));const listings=vi.spyOn(storeAccountApi,'listings').mockRejectedValue(new StoreApiError('Not found.',404,'not_found'));const {container}=render(<LocalListingPanel productId="hat-1" variantId="silver" variantName="Silver"/>);await waitFor(()=>expect(listings).toHaveBeenCalled());expect(container).toBeEmptyDOMElement();});
  it('does not offer a simulated purchase of your own listing',async()=>{vi.spyOn(storeAccountApi,'session').mockResolvedValue(session);vi.spyOn(storeAccountApi,'listings').mockResolvedValue({mode:'local',listings:[{...listing,sellerId:'buyer'}]});render(<LocalListingPanel productId="hat-1" variantId="silver" variantName="Silver"/>);expect(await screen.findByRole('link',{name:'Manage your listing'})).toHaveAttribute('href','/store/account?tab=listings');expect(screen.queryByRole('button',{name:'Simulate purchase'})).toBeNull();});
  it('requires explicit confirmation and reuses an idempotency key on retry',async()=>{vi.spyOn(storeAccountApi,'session').mockResolvedValue(session);vi.spyOn(storeAccountApi,'listings').mockResolvedValue({mode:'local',listings:[listing]});const buy=vi.spyOn(storeAccountApi,'buy').mockRejectedValue(new StoreApiError('Try again.',0,'network'));render(<LocalListingPanel productId="hat-1" variantId="silver" variantName="Silver"/>);fireEvent.click(await screen.findByRole('button',{name:'Simulate purchase'}));expect(buy).not.toHaveBeenCalled();fireEvent.click(await screen.findByRole('button',{name:'Confirm simulated purchase'}));await waitFor(()=>expect(buy).toHaveBeenCalledTimes(1));await screen.findByRole('alert');fireEvent.click(await screen.findByRole('button',{name:'Confirm simulated purchase'}));await waitFor(()=>expect(buy).toHaveBeenCalledTimes(2));expect(buy.mock.calls[0][1]).toEqual(buy.mock.calls[1][1]);expect(buy.mock.calls[0][1]).toMatchObject({quoteId:'quote-USD',expectedAmountAtomic:listing.amountAtomic,expectedCurrency:'WILD',paymentCurrency:'USD',expectedPaymentAmountAtomic:'2500'});});
  it('never substitutes a different finish image for a missing preview or a retired variant',()=>{
    const item:LocalInventoryItem={id:'item-1',productId:'hat-1',variantId:'pending',name:'Hat',variantName:'Pending finish',usage:'unlocked',listingId:null,acquiredAt:'2026-11-07T10:00:00Z'};
    const onList=vi.fn();const {rerender}=render(<InventoryItemCard item={item} busy={false} onList={onList}/>);
    expect(screen.queryByRole('img')).toBeNull();expect(screen.getByText('Image coming soon.')).toBeTruthy();
    expect(screen.getByRole('link',{name:'Wilder Hat'})).toHaveAttribute('href','/store/hat-1?color=pending');
    expect(screen.getByRole('button',{name:'List test item'})).toBeEnabled();
    rerender(<InventoryItemCard item={{...item,variantId:'retired-gold',variantName:'Retired Gold'}} busy={false} onList={onList}/>);
    expect(screen.queryByRole('img')).toBeNull();expect(screen.getByText('Retired Gold')).toBeTruthy();
    expect(screen.getByText('Historical item')).toBeTruthy();expect(screen.queryByText('Available to list')).toBeNull();
    expect(screen.getByRole('button',{name:'No longer offered'})).toBeDisabled();expect(onList).not.toHaveBeenCalled();
  });
  it('reports a completed listing separately from a failed account refresh, then recovers without resubmitting',async()=>{
    const item:LocalInventoryItem={id:'item-1',productId:'hat-1',variantId:'silver',name:'Hat',variantName:'Silver',usage:'unlocked',listingId:null,acquiredAt:'2026-11-07T10:00:00Z'};
    const before:LocalAccount={mode:'local',user,inventory:[item],listings:[],purchases:[],sales:[],reviews:[]};
    const after:LocalAccount={...before,inventory:[{...item,listingId:listing.id}],listings:[{...listing,sellerId:user.id}]};
    vi.spyOn(storeAccountApi,'session').mockResolvedValue(session);
    vi.spyOn(storeAccountApi,'account').mockResolvedValueOnce(before).mockRejectedValueOnce(new StoreApiError('Offline',0,'network')).mockResolvedValue(after);
    const create=vi.spyOn(storeAccountApi,'createListing').mockResolvedValue({mode:'local',listing:{...listing,sellerId:user.id}});
    render(<AccountPage/>);fireEvent.click(await screen.findByRole('button',{name:'List test item'}));
    fireEvent.change(screen.getByLabelText(/Test asking price/),{target:{value:'250'}});fireEvent.click(screen.getByRole('button',{name:'Create test listing'}));
    await screen.findByText('Your test listing is active. No real asset was listed.');
    expect(screen.getByRole('alert')).toHaveTextContent('Your change completed, but the account could not be refreshed.');
    expect(screen.queryByRole('button',{name:'Create test listing'})).toBeNull();
    fireEvent.click(screen.getByRole('button',{name:'Try again'}));await screen.findByRole('button',{name:'Already listed'});
    expect(create).toHaveBeenCalledTimes(1);expect(create).toHaveBeenCalledWith({itemId:'item-1',amountAtomic:'250000000000000000000',currency:'WILD'},session.csrfToken);
  });
  it('refreshes cancelled listings and returns the same exact item to available inventory',async()=>{
    const item:LocalInventoryItem={id:'item-1',productId:'hat-1',variantId:'silver',name:'Hat',variantName:'Silver',usage:'unlocked',listingId:listing.id,acquiredAt:'2026-11-07T10:00:00Z'};
    const active={...listing,sellerId:user.id};const before:LocalAccount={mode:'local',user,inventory:[item],listings:[active],purchases:[],sales:[],reviews:[]};
    const after:LocalAccount={...before,inventory:[{...item,listingId:null}],listings:[{...active,status:'cancelled'}]};
    vi.spyOn(storeAccountApi,'session').mockResolvedValue(session);vi.spyOn(storeAccountApi,'account').mockResolvedValueOnce(before).mockResolvedValue(after);
    const cancel=vi.spyOn(storeAccountApi,'cancelListing').mockResolvedValue({mode:'local'});
    render(<AccountPage/>);await screen.findByRole('heading',{name:'Test account'});fireEvent.click(screen.getByRole('button',{name:/^Listings/}));
    fireEvent.click(screen.getByRole('button',{name:'Cancel listing'}));await screen.findByText('cancelled · Local test listing');
    expect(screen.queryByRole('button',{name:'Cancel listing'})).toBeNull();expect(cancel).toHaveBeenCalledWith(listing.id,session.csrfToken);
    fireEvent.click(screen.getByRole('button',{name:/^Inventory/}));await screen.findByRole('button',{name:'List test item'});
    expect(screen.getByRole('link',{name:'Wilder Hat'})).toHaveAttribute('href','/store/hat-1?color=silver');
  });
  it('refreshes an unavailable offer after a purchase conflict and removes stale confirmation',async()=>{
    vi.spyOn(storeAccountApi,'session').mockResolvedValue(session);vi.spyOn(storeAccountApi,'listings').mockResolvedValueOnce({mode:'local',listings:[listing]}).mockResolvedValue({mode:'local',listings:[]});
    const buy=vi.spyOn(storeAccountApi,'buy').mockRejectedValue(new StoreApiError('This listing is no longer available.',409,'conflict'));
    render(<LocalListingPanel productId="hat-1" variantId="silver" variantName="Silver"/>);fireEvent.click(await screen.findByRole('button',{name:'Simulate purchase'}));
    fireEvent.click(await screen.findByRole('button',{name:'Confirm simulated purchase'}));await screen.findByText('No test listings for this finish.');
    expect(screen.getByRole('status')).toHaveTextContent('This listing is no longer available.');expect(screen.queryByRole('button',{name:'Confirm simulated purchase'})).toBeNull();expect(buy).toHaveBeenCalledTimes(1);
  });
  it('removes a purchased offer, confirms success, and retains the selected variant in the refresh',async()=>{
    vi.spyOn(storeAccountApi,'session').mockResolvedValue(session);const read=vi.spyOn(storeAccountApi,'listings').mockResolvedValueOnce({mode:'local',listings:[listing]}).mockResolvedValue({mode:'local',listings:[]});
    const buy=vi.spyOn(storeAccountApi,'buy').mockResolvedValue({mode:'local',replayed:false,sale:{...listing,id:'sale-1',listingId:listing.id,buyerId:user.id,quoteId:'quote-USD',paymentCurrency:'USD',paymentAmountAtomic:'2500',quoteRateId:LOCAL_DEMO_RATE.id,quoteUsdCentsPerWild:'10',quoteExpiresAt:new Date(Date.now()+300_000).toISOString()}});
    render(<LocalListingPanel productId="hat-1" variantId="silver" variantName="Silver"/>);fireEvent.click(await screen.findByRole('button',{name:'Simulate purchase'}));
    fireEvent.click(await screen.findByRole('button',{name:'Confirm simulated purchase'}));await screen.findByText('No test listings for this finish.');
    expect(screen.getByRole('status')).toHaveTextContent('Simulated purchase complete.');expect(read).toHaveBeenLastCalledWith('hat-1','silver',expect.any(AbortSignal));expect(buy).toHaveBeenCalledTimes(1);
  });
  it('discards a pending quote when the shopper changes to another variant',async()=>{
    vi.spyOn(storeAccountApi,'session').mockResolvedValue(session);vi.spyOn(storeAccountApi,'listings').mockResolvedValue({mode:'local',listings:[listing]});
    let resolve!: (value:Awaited<ReturnType<typeof storeAccountApi.quote>>)=>void;
    const original=vi.mocked(storeAccountApi.quote).getMockImplementation()!;
    const oldQuote=await original(listing.id,{paymentCurrency:'USD',expectedCurrency:'WILD',expectedAmountAtomic:listing.amountAtomic},session.csrfToken);
    vi.mocked(storeAccountApi.quote).mockReturnValue(new Promise(done=>{resolve=done;}));
    const {rerender}=render(<LocalListingPanel productId="hat-1" variantId="silver" variantName="Silver"/>);fireEvent.click(await screen.findByRole('button',{name:'Simulate purchase'}));
    await screen.findByText('Preparing your purchase quote…');rerender(<LocalListingPanel productId="hat-1" variantId="pending" variantName="Pending finish"/>);
    await screen.findByText('No test listings for this finish.');await act(async()=>resolve(oldQuote));
    expect(screen.queryByRole('button',{name:'Confirm simulated purchase'})).toBeNull();expect(screen.queryByLabelText('Simulated purchase totals')).toBeNull();
  });
  it('moves keyboard focus into the asking-price form and restores it when cancelled',()=>{
    render(<InventoryItemCard item={{id:'item-1',productId:'hat-1',variantId:'silver',name:'Hat',variantName:'Silver',usage:'unlocked',listingId:null,acquiredAt:'2026-11-07T10:00:00Z'}} busy={false} onList={vi.fn()}/>);
    fireEvent.click(screen.getByRole('button',{name:'List test item'}));expect(screen.getByLabelText(/Test asking price/)).toHaveFocus();
    fireEvent.click(screen.getByRole('button',{name:'Cancel'}));expect(screen.getByRole('button',{name:'List test item'})).toHaveFocus();
  });
  it('moves keyboard focus into purchase confirmation and restores it when cancelled',async()=>{
    vi.spyOn(storeAccountApi,'session').mockResolvedValue(session);vi.spyOn(storeAccountApi,'listings').mockResolvedValue({mode:'local',listings:[listing]});
    render(<LocalListingPanel productId="hat-1" variantId="silver" variantName="Silver"/>);fireEvent.click(await screen.findByRole('button',{name:'Simulate purchase'}));
    await screen.findByRole('button',{name:'Confirm simulated purchase'});expect(screen.getByRole('group',{name:'Purchase confirmation'})).toHaveFocus();
    fireEvent.click(screen.getByRole('button',{name:'Cancel'}));expect(screen.getByRole('button',{name:'Simulate purchase'})).toHaveFocus();
  });
  it('labels owned rims with the separate storefront category while keeping their product identity',()=>{
    render(<InventoryItemCard item={{id:'item-2',productId:'rim-1',variantId:'silver',name:'Causeway',variantName:'Silver',usage:'unlocked',listingId:null,acquiredAt:'2026-11-07T10:00:00Z'}} busy={false} onList={vi.fn()}/>);
    expect(screen.getByText('Rims')).toBeTruthy();expect(screen.queryByText('vehicles')).toBeNull();expect(screen.getByRole('heading',{name:'Causeway'})).toBeTruthy();
  });
  it.each(['login','register'] as const)('retries only the account read after successful %s and a failed refresh',async mode=>{
    const login=vi.spyOn(storeAccountApi,'login').mockResolvedValue(session),register=vi.spyOn(storeAccountApi,'register').mockResolvedValue(session);
    const load=vi.fn().mockRejectedValueOnce(new StoreApiError('Offline',0,'network')).mockResolvedValue(undefined);
    render(<AccountAuthForm onAuthenticated={load}/>);
    if(mode==='register'){fireEvent.click(screen.getByRole('button',{name:'Create account'}));fireEvent.change(screen.getByLabelText('Display name'),{target:{value:'Test person'}});}
    fireEvent.change(screen.getByLabelText('Email'),{target:{value:'test@example.test'}});fireEvent.change(screen.getByLabelText(/^Password/),{target:{value:'test-password-123'}});
    fireEvent.submit(screen.getByLabelText('Email').closest('form')!);
    await screen.findByRole('alert');expect(screen.getByRole('alert')).toHaveTextContent('You are signed in, but your account could not be loaded.');
    expect(screen.queryByLabelText(/^Password/)).toBeNull();fireEvent.click(screen.getByRole('button',{name:'Open your account'}));
    await waitFor(()=>expect(load).toHaveBeenCalledTimes(2));expect(mode==='login'?login:register).toHaveBeenCalledTimes(1);expect(mode==='login'?register:login).not.toHaveBeenCalled();
  });
  it('returns to sign-in when the accepted session expires while opening the account',async()=>{
    const register=vi.spyOn(storeAccountApi,'register').mockResolvedValue(session),login=vi.spyOn(storeAccountApi,'login');
    render(<AccountAuthForm onAuthenticated={vi.fn().mockRejectedValue(new StoreApiError('Expired',401,'unauthorized'))}/>);
    fireEvent.click(screen.getByRole('button',{name:'Create account'}));fireEvent.change(screen.getByLabelText('Display name'),{target:{value:'Test person'}});
    fireEvent.change(screen.getByLabelText('Email'),{target:{value:'test@example.test'}});fireEvent.change(screen.getByLabelText(/^Password/),{target:{value:'test-password-123'}});fireEvent.submit(screen.getByLabelText('Email').closest('form')!);
    await screen.findByText('Your session ended. Sign in again to open your account.');expect(screen.getByLabelText(/^Password/)).toHaveValue('');expect(screen.queryByLabelText('Display name')).toBeNull();
    expect(screen.queryByRole('button',{name:'Open your account'})).toBeNull();expect(register).toHaveBeenCalledTimes(1);expect(login).not.toHaveBeenCalled();
  });
  it('opens validated account-section links, responds to route changes and preserves tab choice on refresh',async()=>{
    vi.spyOn(storeAccountApi,'session').mockResolvedValue(session);vi.spyOn(storeAccountApi,'account').mockResolvedValue({mode:'local',user,inventory:[],listings:[],purchases:[],sales:[],reviews:[]});
    const {rerender}=render(<AccountPage initialTab="listings"/>);await screen.findByRole('heading',{name:'Your listings'});
    rerender(<AccountPage initialTab="profile"/>);await screen.findByRole('heading',{name:'Profile details'});
    fireEvent.click(screen.getByRole('button',{name:/^Purchases/}));expect(new URLSearchParams(location.search).get('tab')).toBe('purchases');
    fireEvent(window,new Event('focus'));await screen.findByRole('heading',{name:'Your purchases'});
    rerender(<AccountPage initialTab="https://invalid.example"/>);await screen.findByRole('heading',{name:'Your inventory'});expect(location.pathname).toBe('/store/account');
    rerender(<AccountPage initialTab="moderation"/>);expect(screen.queryByRole('heading',{name:'Review moderation'})).toBeNull();expect(screen.getByRole('heading',{name:'Your inventory'})).toBeTruthy();
  });
  it('uses starter-grant status rather than item ownership to offer the one-time seed action',async()=>{
    vi.spyOn(storeAccountApi,'session').mockResolvedValue(session);
    const snapshot:LocalAccount={mode:'local',user,inventory:[],listings:[],purchases:[],sales:[],reviews:[],seedClaimed:true};
    const read=vi.spyOn(storeAccountApi,'account').mockResolvedValue(snapshot),seed=vi.spyOn(storeAccountApi,'seed');
    render(<AccountPage/>);expect(await screen.findByRole('button',{name:'Test items already added'})).toBeDisabled();expect(screen.getByRole('heading',{name:'Your inventory is empty.'})).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'Test items already added'}));expect(seed).not.toHaveBeenCalled();
    read.mockResolvedValue({...snapshot,seedClaimed:false,inventory:[{id:'purchased',productId:'hat-1',variantId:'silver',name:'Hat',variantName:'Silver',usage:'unlocked',listingId:null,acquiredAt:'2026-11-07T10:00:00Z'}]});fireEvent(window,new Event('focus'));
    await waitFor(()=>expect(screen.getByRole('button',{name:'Add test items'})).toBeEnabled());expect(screen.getByRole('heading',{name:'Wilder Hat'})).toBeTruthy();
  });
});
