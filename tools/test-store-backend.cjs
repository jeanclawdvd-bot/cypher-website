/* Local HTTP lifecycle/security smoke test. Never contacts a public host or pays/mints. */
const assert = require('node:assert/strict');
const { randomUUID, randomBytes } = require('node:crypto');
const origin = new URL(process.argv[2] || 'http://127.0.0.1:8792');
assert.equal(origin.protocol, 'http:');
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(origin.hostname), 'Only a loopback preview may be tested.');
assert.equal(origin.pathname, '/');
const passed = [];
const password = `Local-${randomBytes(24).toString('base64url')}`;
const runId = `${Date.now()}-${randomBytes(4).toString('hex')}`;
async function call(path, { method, body, auth, headers = {} } = {}) {
  const response = await fetch(`${origin.origin}/api/store/v1${path}`, {
    method: method || (body === undefined ? 'GET' : 'POST'),
    headers: { Accept: 'application/json', ...(body === undefined ? {} : { Origin: origin.origin, 'Content-Type': 'application/json' }), ...(auth ? { Cookie: auth.cookie, 'X-CSRF-Token': auth.csrf } : {}), ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const raw = await response.text();
  let data;
  try { data = JSON.parse(raw); }
  catch { throw new Error(`${path} returned HTTP ${response.status} with a non-JSON response: ${raw.slice(0, 350)}`); }
  return { status: response.status, data, headers: response.headers };
}
function ok(result, expected) { assert.equal(result.status, expected, JSON.stringify(result.data)); return result.data; }
function rejected(result) { assert.ok(result.status >= 400 && result.status < 500, `Expected rejection, received ${result.status}`); }
function check(name) { passed.push(name); console.log(`PASS ${name}`); }
async function register(name) {
  const email = `${runId}-${name}@example.test`;
  const result = await call('/register', { body: { email, password, displayName: `Audit ${name}` } });
  const data = ok(result, 201);
  assert.equal(data.mode, 'local'); assert.ok(data.user?.id); assert.ok(data.csrfToken);
  const cookie = result.headers.get('set-cookie');
  assert.match(cookie, /HttpOnly/); assert.match(cookie, /SameSite=Strict/);
  return { id: data.user.id, email, cookie: cookie.split(';')[0], csrf: data.csrfToken };
}
async function account(auth) { return ok(await call('/account', { auth }), 200); }
async function createListing(item, auth, amountAtomic) { return ok(await call('/listings', { body: { itemId: item.id, amountAtomic:String(amountAtomic),currency:'WILD' }, auth }), 201).listing; }
const purchaseQuotes = new Map();
async function buy(listing, auth, idempotencyKey, expectedAmountAtomic = listing.amountAtomic) {
  const cacheKey = `${listing.id}:${auth.id}`;
  if(!purchaseQuotes.has(cacheKey))purchaseQuotes.set(cacheKey,call(`/listings/${listing.id}/quote`,{body:{paymentCurrency:'USD',expectedCurrency:listing.currency,expectedAmountAtomic:listing.amountAtomic},auth}));
  const result=await purchaseQuotes.get(cacheKey);
  if(result.status!==201)return result;
  const quote=result.data.quote;
  return call(`/listings/${listing.id}/buy`, { body: { idempotencyKey,quoteId:quote.id,expectedAmountAtomic:String(expectedAmountAtomic),expectedCurrency:listing.currency,paymentCurrency:quote.paymentCurrency,expectedPaymentAmountAtomic:quote.paymentAmountAtomic }, auth });
}

(async () => {
  const health = await call('/session'); ok(health, 200); assert.equal(health.data.mode, 'local');
  const seller = await register('seller'); const firstBuyer = await register('buyer-a'); const secondBuyer = await register('buyer-b');
  check('local session, registration and secure cookie flags');

  rejected(await call('/profile', { method: 'PATCH', body: { displayName: 'Blocked', bio: '' }, auth: seller, headers: { Origin: 'https://attacker.test' } }));
  rejected(await call('/profile', { method: 'PATCH', body: { displayName: 'Blocked', bio: '' }, auth: seller, headers: { 'X-CSRF-Token': firstBuyer.csrf } }));
  assert.equal((await account(seller)).user.displayName, 'Audit seller');
  ok(await call('/profile', { method: 'PATCH', body: { displayName: 'Audit seller updated', bio: 'Local lifecycle test.' }, auth: seller }), 200);
  assert.equal((await account(firstBuyer)).user.displayName, 'Audit buyer-a');
  check('profile isolation, cross-origin and session-CSRF rejection');

  const seeded = await call('/seed', { body: {}, auth: seller }); assert.ok(seeded.status < 300); assert.equal(seeded.data.created, 3);
  const items = seeded.data.inventory; assert.equal(items.length, 3); assert.ok(items.every(item => item.source === 'local_seed'));
  ok(await call('/seed', { body: {}, auth: seller }), 409); assert.equal((await account(firstBuyer)).inventory.length, 0);
  check('single local seed grant without cross-account inventory');

  rejected(await call('/listings', { body: { itemId: items[0].id, amountAtomic: '12345', currency:'WILD' }, auth: firstBuyer }));
  ok(await call('/listings', { body: { itemId: items[0].id, amountAtomic: 1.5, currency:'WILD' }, auth: seller }), 400);
  ok(await call(`/inventory/${items[0].id}/lock`, { body: { usage: 'installed' }, auth: seller }), 200);
  ok(await call('/listings', { body: { itemId: items[0].id, amountAtomic: '12345', currency:'WILD' }, auth: seller }), 409);
  ok(await call(`/inventory/${items[0].id}/lock`, { body: { usage: 'unlocked' }, auth: seller }), 200);
  const listing = await createListing(items[0], seller, 12345);
  assert.equal(listing.feePolicyVersion, '2026-11-08-seller-1pct');
  assert.equal(listing.sellerFeeBps, 100); assert.equal(listing.sellerFeeAtomic, '123'); assert.equal(listing.sellerProceedsAtomic, '12222');
  ok(await call('/listings', { body: { itemId: items[1].id, amountAtomic: '12345', currency:'WILD', sellerFeeCents: 0 }, auth: seller }), 400);
  ok(await call('/listings', { body: { itemId: items[0].id, amountAtomic: '23456', currency:'WILD' }, auth: seller }), 409);
  rejected(await call(`/listings/${listing.id}/cancel`, { body: {}, auth: firstBuyer }));
  ok(await call(`/inventory/${items[0].id}/lock`, { body: { usage: 'equipped' }, auth: seller }), 409);
  rejected(await buy(listing, seller, randomUUID()));
  check('ownership, atomic WILD price, installed locks, duplicate listing and self-buy protection');

  const buyerKeys = [randomUUID(), randomUUID()];
  const results = await Promise.all([buy(listing, firstBuyer, buyerKeys[0]), buy(listing, secondBuyer, buyerKeys[1])]);
  assert.equal(results.filter(result => result.status < 300).length, 1);
  assert.equal(results.filter(result => result.status === 409).length, 1);
  const winnerIndex = results.findIndex(result => result.status < 300);
  const winner = [firstBuyer, secondBuyer][winnerIndex]; const loser = [firstBuyer, secondBuyer][1 - winnerIndex];
  const sale = results[winnerIndex].data.sale; assert.equal(sale.simulated, true); assert.equal(sale.buyerId, winner.id); assert.equal(sale.amountAtomic, '12345');
  assert.equal(sale.paymentStatus, 'simulated'); assert.equal(sale.settlementStatus, 'simulated'); assert.equal(sale.entitlementStatus, 'not_issued');
  assert.equal(sale.feePolicyVersion, listing.feePolicyVersion); assert.equal(sale.sellerFeeBps, 100);
  assert.equal(sale.sellerFeeAtomic, '123'); assert.equal(sale.sellerProceedsAtomic, '12222');
  assert.equal(BigInt(sale.sellerFeeAtomic) + BigInt(sale.sellerProceedsAtomic), BigInt(sale.amountAtomic));
  assert.equal((await account(winner)).inventory.filter(item => item.id === items[0].id).length, 1);
  assert.equal((await account(loser)).inventory.filter(item => item.id === items[0].id).length, 0);
  assert.equal((await account(seller)).sales.filter(entry => entry.listingId === listing.id).length, 1);
  check('two buyers race: one sale, one owner, one loser');

  const replay = ok(await buy(listing, winner, buyerKeys[winnerIndex]), 200);
  assert.equal(replay.replayed, true); assert.equal(replay.sale.id, sale.id);
  assert.deepEqual(replay.sale, sale);
  ok(await buy(listing, winner, buyerKeys[winnerIndex], (BigInt(listing.amountAtomic) + 1n).toString()), 409);
  const nextListing = await createListing(items[1], seller, 999);
  ok(await buy(nextListing, winner, buyerKeys[winnerIndex]), 409);
  const priceKey = randomUUID(); ok(await buy(nextListing, loser, priceKey, 1), 409);
  const secondSale = await buy(nextListing, loser, priceKey); assert.ok(secondSale.status < 300);
  check('immutable quote, exact replay, changed request conflict and stale-ask rejection');

  const lastListing = await createListing(items[2], seller, 777);
  ok(await call(`/listings/${lastListing.id}/cancel`, { body: {}, auth: seller }), 200);
  ok(await buy(lastListing, winner, randomUUID()), 409);
  rejected(await call(`/inventory/${items[0].id}/lock`, { body: { usage: 'equipped' }, auth: seller }));
  check('cancelled listings and former owners cannot transfer or lock sold items');

  const reviewPath = `/reviews?productId=${encodeURIComponent(items[0].productId)}`;
  const beforeReviews = ok(await call(reviewPath), 200).reviews;
  const review = { productId: items[0].productId, variantId: items[0].variantId, rating: 5, title: 'Local audit review', body: 'This pending review tests the local moderation boundary.' };
  const submitted = ok(await call('/reviews', { body: review, auth: winner }), 201).review;
  assert.equal(submitted.moderation, 'pending'); assert.equal(submitted.ownershipAtSubmission, true);
  const afterReviews = ok(await call(reviewPath), 200).reviews;
  assert.equal(afterReviews.length, beforeReviews.length); assert.ok(afterReviews.every(entry => entry.id !== submitted.id));
  ok(await call('/reviews', { body: { ...review, moderation: 'published', verifiedPurchase: true }, auth: loser }), 400);
  check('pending reviews do not enter public ratings and client verification is rejected');

  ok(await call('/logout', { body: {}, auth: seller }), 200);
  ok(await call('/account', { auth: seller }), 401);
  ok(await call('/seed', { body: {}, auth: seller }), 401);
  ok(await call('/login', { body: { email: seller.email, password: 'wrong-password-value' } }), 401);
  ok(await call('/login', { body: { email: seller.email, password } }), 200);
  check('logout revocation and password authentication');

  console.log(JSON.stringify({ status: 'passed', origin: origin.origin, checks: passed.length, mode: 'local', realPayments: false, onchainTransactions: false }, null, 2));
})().catch(error => { console.error(error.message); process.exitCode = 1; });
