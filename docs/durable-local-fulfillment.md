# Durable local fulfillment

Implemented locally on 2026-11-08. This module adds persistence and recovery to the
collection fulfillment domain. It adds no public route, automatically running
worker, payment provider, signing key, mint operation or production game adapter.
The production boundaries in `src/lib/store-backend/production.ts` remain closed.

## Files and authority

- `src/sites/wilderworld/collections/fulfillment.ts`: approved-offer, authenticated
  principal, provider payment, finalized mint and game-delivery domain.
- `src/sites/wilderworld/collections/durable-fulfillment.server.ts`: Node-only
  `node:sqlite` repository and explicitly invoked local worker.
- `src/sites/wilderworld/collections/durable-fulfillment.test.ts`: actual SQLite
  file persistence, transaction constraints, competing worker connections and
  adversarial recovery tests using test-only adapters.

Constructing the repository and worker requires `mode: 'local'`. The fulfillment
service remains disabled by default. No worker or fulfillment API is wired to the
actual checkout, shopping bag or local account purchase flow. Its explicit enable flag is for a trusted
server composition or local fixture, never an HTTP/body field. Current storefront
offers still have unresolved release fields and cannot pass approved-offer checks.
Local account test purchases are not payment or mint evidence for this repository.

Use a separate SQLite file from the local account database. The repository creates
its own version-marked tables and uses WAL, full synchronous writes, foreign keys
and short `BEGIN IMMEDIATE` transactions. No existing account or historical handoff
database is migrated or modified.

## Persisted state and outbox

Orders store exact string token IDs and immutable evidence claims. Global unique
keys prevent reusing a settlement, payment, provider event, mint receipt log or
token across orders. A failed transaction rolls back the order and all claims.
Invalidation never deletes claims or reopens an issuance slot.

Recording a verified mint and queuing reconciliation happen in the same database
transaction. Payment confirmation does not enqueue delivery. Outbox records use
one order identity, lease token/owner/expiry, attempt count, next due time and a
dirty flag for new reconciliation intent arriving while a worker is active.
Retrying an unchanged revocation intent does not dirty its own lease. Failed
revocations respect the scheduled backoff; a genuinely new invalidation arriving
during a lease still triggers an immediate follow-up attempt.

The worker processes at most twenty jobs per explicit batch. Defaults are a
30-second lease, six attempts, exponential retry from one second capped at one
minute, and a one-minute ownership reconciliation interval after successful
delivery. Expired leases are reclaimable. A stale worker cannot acknowledge or
fail a newer worker's lease. Exhausted jobs enter `dead` state and require explicit
operator rescheduling through `repository.schedule(orderId)` after investigation.
Failures store a generic diagnostic rather than provider secrets or raw responses.

`worker.processOne()` reports `idle`, `completed`, `retry`, `dead` or `lease_lost`.
`repository.jobs()` exposes a bounded local inspection list. No worker timer is
started by importing or constructing these classes.

## External side effects and recovery

Payment verification, receipt verification, fresh ownership reads, game grants
and revocations run outside database transactions. SQLite callbacks must be
synchronous; asynchronous callbacks and escaped transaction handles are rejected.

Delivery uses a stable grant idempotency key for the order and exact token.
The domain checks ownership before and after a grant and rereads current order
state before recording delivery. An invalidation is persisted and queued before
the revocation request. Failed revocations retain `revocation_pending` and retry
after a restart. Delivered orders receive scheduled owner checks; transfer causes
revocation rather than another grant.

The queue provides repeatable delivery attempts, not an exactly-once network
guarantee. The future game gateway must atomically:

1. Enforce the stable grant key and independently validate current ownership.
2. Revoke the entitlement and tombstone `grantIdempotencyKey`, even if a delayed
   grant has not reached it yet.
3. Reject later grants bearing that tombstoned key.

That gateway contract handles a grant delayed beyond its lease or arriving after
invalidation. The local test gateway implements these semantics; there is no
claim that a production game service already does. A new owner needs a new
authenticated ownership binding; the original order cannot be revived.

Periodic reconciliation currently checks token ownership. Production receipt
reorg/refund discovery still needs an authenticated canonical watcher that invokes
`invalidate`. Ownership may change between checks; real-time game access must
also enforce authoritative ownership at the game gateway.

## Local validation

From the active checkout, using Node with `node:sqlite` support:

```powershell
$taskTemp = Join-Path (Get-Location) '.tmp/edition-333-temp'
New-Item -ItemType Directory -Force -Path $taskTemp | Out-Null
$env:TEMP = $taskTemp
$env:TMP = $taskTemp
node node_modules/vitest/vitest.mjs run src/sites/wilderworld/collections/fulfillment.test.ts src/sites/wilderworld/collections/durable-fulfillment.test.ts
node node_modules/typescript/bin/tsc --noEmit
```

The suite uses temporary SQLite files inside the checkout's `.tmp` directory.
It covers file reopen/restart, payment and receipt replay, atomic enqueue rollback,
concurrent worker claims, abandoned leases, stale acknowledgments, loss of a grant
response, crashes before acknowledgment, bounded retry/dead jobs, ownership changes,
in-flight invalidation, failed revocation recovery, fixed-clock revocation backoff,
concurrent invalidation wakeups and transaction-handle misuse.

Recorded validation: **54 tests across two files passed**, and TypeScript passed.
Logs: `.tmp/collection-tests/durable-fulfillment-tests.log` and
`.tmp/collection-tests/durable-fulfillment-types.log`.

## Remaining production integration

No D1/distributed production repository is implemented by this Node SQLite module.
A production repository must retain the same uniqueness, short transaction,
lease/fencing and durable outbox guarantees. Authenticated wallet/game identity,
approved offers, payment evidence, canonical receipt/finality monitoring, revocable
game grants, operator authorization, deployment/backup/monitoring and independent
security review remain separate launch work. Local persistence never authorizes
charging, minting, public trading or delivery from unverified browser assertions.
