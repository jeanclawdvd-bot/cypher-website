/** Commerce read models. These interfaces do not sign orders, submit payments or mint tokens. */
export type MarketCurrency = {
  symbol: string;
  decimals: number;
  kind: 'fiat' | 'native' | 'erc20';
  chainId?: number;
  contract?: string;
};
export type AtomicMoney = { amount: string; currency: MarketCurrency };
export type TokenMarketIdentity = {
  chainId: number;
  contract: string;
  /** Keep uint256 identifiers as strings. Either tokenId or an approved editionGroup is required. */
  tokenId?: string;
  editionGroup?: string;
};
export type MarketTarget = { productId: string; variantId: string; identity?: TokenMarketIdentity };
export type MarketOrder = {
  id: string; targetKey: string; side: 'ask' | 'bid'; price: AtomicMoney;
  maker: string; createdAt: string; expiresAt: string; checkedAt: string;
  status: 'active' | 'cancelled' | 'filled'; provider: string;
};
export type CompletedTrade = {
  id: string; targetKey: string; price: AtomicMoney; quantity: number;
  timestamp: string; chainId: number; txHash: string; logIndex: number;
  provider: string; finalized: boolean;
};
export type MarketSnapshot = {
  target: MarketTarget;
  status: 'unconfigured' | 'unavailable' | 'live' | 'sample';
  provider: string | null;
  asOf: string | null;
  currency: MarketCurrency | null;
  orders: readonly MarketOrder[];
  trades: readonly CompletedTrade[];
  /** Exact provider coverage; null means volume coverage is unknown. */
  historyWindow: {from:string;to:string;complete:boolean} | null;
  message: string;
};
export interface MarketReadAdapter {
  readonly id: string;
  read(target: MarketTarget, signal?: AbortSignal): Promise<MarketSnapshot>;
}
export const USD: MarketCurrency = { symbol: 'USD', decimals: 2, kind: 'fiat' };
const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const UINT = /^(0|[1-9][0-9]*)$/;
const HASH = /^0x[0-9a-fA-F]{64}$/;
const validDate = (value: string) => Number.isFinite(Date.parse(value));

export function tokenMarketKey(identity: TokenMarketIdentity): string {
  if (!Number.isSafeInteger(identity.chainId) || identity.chainId <= 0 || !ADDRESS.test(identity.contract)) throw new Error('Invalid chain or collection');
  if (identity.tokenId === undefined && !identity.editionGroup?.trim()) throw new Error('Token or approved edition identity required');
  if (identity.tokenId !== undefined && (!UINT.test(identity.tokenId) || BigInt(identity.tokenId) >= BigInt(2) ** BigInt(256))) throw new Error('Invalid token identifier');
  if (identity.editionGroup !== undefined && (!identity.editionGroup.trim() || identity.editionGroup !== identity.editionGroup.trim())) throw new Error('Invalid edition identity');
  return JSON.stringify([identity.chainId, identity.contract.toLowerCase(), identity.tokenId ?? null, identity.editionGroup ?? null]);
}
export function marketTargetKey(target: MarketTarget): string {
  if (!target.productId.trim() || !target.variantId.trim()) throw new Error('Product and selected variant required');
  return JSON.stringify([target.productId, target.variantId, target.identity ? tokenMarketKey(target.identity) : null]);
}
export function currencyKey(currency: MarketCurrency): string {
  if (!['fiat','native','erc20'].includes(currency.kind) || !/^[A-Za-z0-9._-]{1,16}$/.test(currency.symbol) || !Number.isInteger(currency.decimals) || currency.decimals < 0 || currency.decimals > 36) throw new Error('Invalid currency');
  if (currency.kind === 'fiat') {
    if (currency.chainId !== undefined || currency.contract !== undefined) throw new Error('Fiat currency cannot carry a token contract');
  } else {
    if (!Number.isSafeInteger(currency.chainId) || Number(currency.chainId) <= 0) throw new Error('Token currency requires its chain');
    if (currency.kind === 'erc20' && (!currency.contract || !ADDRESS.test(currency.contract))) throw new Error('ERC20 currency requires its contract');
    if (currency.kind === 'native' && currency.contract !== undefined) throw new Error('Native currency has no ERC20 contract');
  }
  return JSON.stringify([currency.kind, currency.chainId ?? null, currency.contract?.toLowerCase() ?? null, currency.symbol, currency.decimals]);
}
export function validateMoney(money: AtomicMoney): void {
  currencyKey(money.currency);
  if (!UINT.test(money.amount) || BigInt(money.amount) >= BigInt(2) ** BigInt(256)) throw new Error('Invalid atomic amount');
}
export function parseMoney(value: string, currency: MarketCurrency): AtomicMoney {
  currencyKey(currency);
  const match = value.trim().match(/^(0|[1-9][0-9]*)(?:\.([0-9]+))?$/);
  if (!match || (match[2]?.length ?? 0) > currency.decimals) throw new Error(`Enter an amount with up to ${currency.decimals} decimal places`);
  const amount = (BigInt(match[1]) * BigInt(10) ** BigInt(currency.decimals) + BigInt((match[2] ?? '').padEnd(currency.decimals, '0') || '0')).toString();
  const money = {amount, currency}; validateMoney(money);
  if (amount === '0') throw new Error('Amount must be greater than zero');
  return money;
}
export function formatMoney(money: AtomicMoney | null | undefined): string {
  if (!money) return '—';
  validateMoney(money);
  const raw = money.amount.padStart(money.currency.decimals + 1, '0');
  const whole = (money.currency.decimals ? raw.slice(0, -money.currency.decimals) : raw).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const fraction = money.currency.decimals ? raw.slice(-money.currency.decimals) : '';
  const places = money.currency.kind === 'fiat' ? fraction : fraction.replace(/0+$/, '');
  const amount = whole + (places ? `.${places}` : '');
  return money.currency.symbol === 'USD' && money.currency.kind === 'fiat' ? `$${amount}` : `${amount} ${money.currency.symbol}`;
}
export function compareMoney(a: AtomicMoney, b: AtomicMoney): number {
  validateMoney(a); validateMoney(b);
  if (currencyKey(a.currency) !== currencyKey(b.currency)) throw new Error('Cannot compare different currencies without an explicit conversion');
  return BigInt(a.amount) < BigInt(b.amount) ? -1 : BigInt(a.amount) > BigInt(b.amount) ? 1 : 0;
}
export function emptyMarket(target: MarketTarget): MarketSnapshot {
  marketTargetKey(target);
  return {target, status:'unconfigured', provider:null, asOf:null, currency:null, orders:[], trades:[], historyWindow:null, message:'Market data is not connected for this item yet.'};
}
export const unconfiguredMarketAdapter: MarketReadAdapter = {id:'unconfigured', async read(target) { return emptyMarket(target); }};

/** Reject mismatched identity, currencies or provenance rather than displaying unrelated sales. */
export function validateSnapshot(snapshot: MarketSnapshot, expected: MarketTarget, now = Date.now()): MarketSnapshot {
  const key = marketTargetKey(expected);
  if (marketTargetKey(snapshot.target) !== key) throw new Error('Market identity mismatch');
  if (snapshot.status !== 'live') {
    if (snapshot.orders.length || snapshot.trades.length) throw new Error('Non-live snapshots cannot contain executable orders or completed trades');
    return snapshot;
  }
  if (!snapshot.provider || !snapshot.asOf || !validDate(snapshot.asOf) || !snapshot.currency || !expected.identity) throw new Error('Live market provenance is incomplete');
  const asOf=Date.parse(snapshot.asOf);
  if (!Number.isFinite(now) || asOf>now) throw new Error('Market snapshot cannot come from the future');
  const window=snapshot.historyWindow;
  if(window&&(!validDate(window.from)||!validDate(window.to)||Date.parse(window.from)>Date.parse(window.to)||Date.parse(window.to)>asOf)) throw new Error('Invalid trade history window');
  const currency = currencyKey(snapshot.currency);
  const orderIds=new Set<string>();
  for (const order of snapshot.orders) {
    validateMoney(order.price);
    if (order.targetKey !== key || currencyKey(order.price.currency) !== currency || !ADDRESS.test(order.maker) || !order.id || !order.provider || !['ask','bid'].includes(order.side) || !['active','cancelled','filled'].includes(order.status) || BigInt(order.price.amount)<=BigInt(0) || !validDate(order.createdAt) || !validDate(order.expiresAt) || !validDate(order.checkedAt)) throw new Error('Invalid market order');
    if(Date.parse(order.createdAt)>Date.parse(order.checkedAt)||Date.parse(order.checkedAt)>asOf||Date.parse(order.expiresAt)<=Date.parse(order.createdAt)) throw new Error('Inconsistent order timestamps');
    const orderId=JSON.stringify([order.provider,order.id]);
    if(orderIds.has(orderId))throw new Error('Duplicate market order');
    orderIds.add(orderId);
  }
  const events=new Set<string>();
  for (const trade of snapshot.trades) {
    validateMoney(trade.price);
    if (trade.targetKey !== key || currencyKey(trade.price.currency) !== currency || trade.chainId !== expected.identity.chainId || !HASH.test(trade.txHash) || !Number.isSafeInteger(trade.logIndex) || trade.logIndex < 0 || !validDate(trade.timestamp) || !trade.provider || !trade.id || !trade.finalized || !Number.isSafeInteger(trade.quantity) || trade.quantity < 1 || BigInt(trade.price.amount)<=BigInt(0)) throw new Error('Invalid completed trade provenance');
    const time=Date.parse(trade.timestamp);
    if(time>asOf||window&&(time<Date.parse(window.from)||time>Date.parse(window.to)))throw new Error('Trade timestamp is outside verified history');
    const event=JSON.stringify([trade.chainId,trade.txHash.toLowerCase(),trade.logIndex]);
    if(events.has(event))throw new Error('Duplicate completed trade event');
    events.add(event);
  }
  return snapshot;
}
export const MAX_QUOTE_AGE_MS = 60_000;
export function activeOrders(snapshot: MarketSnapshot, now = Date.now()): MarketOrder[] {
  validateSnapshot(snapshot,snapshot.target,now);
  if (snapshot.status !== 'live') return [];
  return snapshot.orders.filter(order => order.status === 'active' && Date.parse(order.expiresAt) > now && Date.parse(order.checkedAt) <= now && now - Date.parse(order.checkedAt) <= MAX_QUOTE_AGE_MS);
}
export function marketStats(snapshot: MarketSnapshot, now = Date.now()) {
  validateSnapshot(snapshot,snapshot.target,now);
  const orders = activeOrders(snapshot, now);
  const asks = orders.filter(o=>o.side==='ask').sort((a,b)=>compareMoney(a.price,b.price));
  const bids = orders.filter(o=>o.side==='bid').sort((a,b)=>compareMoney(b.price,a.price));
  const trades = snapshot.status === 'live' ? [...snapshot.trades].sort((a,b)=>Date.parse(b.timestamp)-Date.parse(a.timestamp)) : [];
  const volume = snapshot.status === 'live' && snapshot.historyWindow?.complete && snapshot.currency
    ? {amount:trades.reduce((sum,trade)=>sum+BigInt(trade.price.amount)*BigInt(trade.quantity),BigInt(0)).toString(),currency:snapshot.currency} : null;
  return {lowestAsk:asks[0]?.price??null, highestBid:bids[0]?.price??null,lastSale:trades[0]?.price??null,volume,volumeWindow:volume?snapshot.historyWindow:null,asks,bids,trades};
}
export type MarketAction = 'buy' | 'bid' | 'sell' | 'list';
export type TradingContext = {wallet?:string; ownership:'verified'|'not_owned'|'unknown'; usage:'unlocked'|'equipped'|'installed'|'placed'|'unknown'};
export function actionEligibility(action: MarketAction, snapshot: MarketSnapshot, context: TradingContext, now = Date.now()) {
  try {validateSnapshot(snapshot,snapshot.target,now);} catch {return {canPrepare:false,canSubmit:false as const,reasons:['Market identity or trade evidence is invalid.']};}
  const reasons: string[] = [];
  if (snapshot.status !== 'live') reasons.push(snapshot.status === 'sample' ? 'Sample data cannot be traded.' : 'Live trading is not connected.');
  if (!snapshot.target.identity) reasons.push('Token or edition identity is not approved.');
  if (!context.wallet || !ADDRESS.test(context.wallet)) reasons.push('Connect and verify your wallet.');
  if (action === 'list' || action === 'sell') {
    if (context.ownership !== 'verified') reasons.push('Current ownership must be verified.');
    if (context.usage !== 'unlocked') reasons.push(context.usage === 'unknown' ? 'Transfer eligibility must be checked.' : `Remove this item from ${context.usage === 'installed'?'its vehicle':context.usage === 'placed'?'its placement':'your outfit'} before listing.`);
  }
  if (action === 'buy' && context.usage !== 'unlocked') reasons.push(context.usage === 'unknown'?'Transfer eligibility must be checked.':'This item is in use and cannot transfer yet.');
  if (action === 'buy' || action === 'sell') {
    const side = action === 'buy' ? 'ask' : 'bid';
    const order = activeOrders(snapshot,now).filter(item=>item.side===side).sort((a,b)=>action==='buy'?compareMoney(a.price,b.price):compareMoney(b.price,a.price))[0];
    if (!order) reasons.push(`No current ${side === 'ask'?'ask':'bid'} is available.`);
    else if (context.wallet?.toLowerCase() === order.maker.toLowerCase()) reasons.push('You cannot accept your own order.');
  }
  // Read data never grants transaction permission. A separately reviewed executor is required.
  return {canPrepare:reasons.length===0, canSubmit:false as const, reasons};
}
export type MarketDraft = {kind:'local_draft'; action:'bid'|'list'; targetKey:string; amount:AtomicMoney; createdAt:string; submitted:false; expiresAt:null};
export function makeMarketDraft(action:'bid'|'list', target:MarketTarget, value:string, currency:MarketCurrency, now = new Date().toISOString()): MarketDraft {
  if (!validDate(now)) throw new Error('Invalid draft date');
  return {kind:'local_draft',action,targetKey:marketTargetKey(target),amount:parseMoney(value,currency),createdAt:now,submitted:false,expiresAt:null};
}
export type ChartPoint = {timestamp:string; price:AtomicMoney; source:'completed_trade'|'sample'};
export const MARKET_RANGES = ['1M','3M','1Y','ALL'] as const;
export type MarketRange = typeof MARKET_RANGES[number];
export function tradeChartPoints(snapshot:MarketSnapshot, range:MarketRange, now=Date.now()): ChartPoint[] {
  validateSnapshot(snapshot,snapshot.target,now);
  if(snapshot.status!=='live') return [];
  const days = range==='1M'?30:range==='3M'?90:range==='1Y'?365:Infinity;
  return [...snapshot.trades].filter(t=>Date.parse(t.timestamp)<=now&&Date.parse(t.timestamp)>=now-days*86400000).sort((a,b)=>Date.parse(a.timestamp)-Date.parse(b.timestamp)).map(t=>({timestamp:t.timestamp,price:t.price,source:'completed_trade'}));
}
/** Deliberately separate chart-only illustration: no invented orders, fills, sales or quotes. */
export function sampleChartPoints(range:MarketRange): ChartPoint[] {
  const prices = [10000,10400,10150,10800,10600,11100,10950,11300,11000,11600,11500,11900];
  const step = range==='1M'?2:range==='3M'?7:range==='1Y'?30:45;
  return prices.map((amount,index)=>({timestamp:new Date(Date.UTC(2026,0,1+index*step)).toISOString(),price:{amount:String(amount),currency:USD},source:'sample'}));
}
