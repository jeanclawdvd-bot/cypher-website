-- Wallet proof is local account linkage only, never item ownership or mint rights.
CREATE TABLE store_wallet_challenges (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES store_users(id),
 session_hash TEXT NOT NULL,
 address TEXT NOT NULL CHECK(length(address)=42 AND address=lower(address)),
 chain_id INTEGER NOT NULL CHECK(chain_id=1),
 origin TEXT NOT NULL,
 domain TEXT NOT NULL,
 nonce TEXT NOT NULL UNIQUE CHECK(length(nonce)=32),
 issued_at TEXT NOT NULL,
 expires_at TEXT NOT NULL,
 consumed_at TEXT,
 CHECK(expires_at>issued_at)
);
CREATE INDEX store_wallet_challenges_user ON store_wallet_challenges(user_id,address);
CREATE TABLE store_wallet_links (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES store_users(id),
 address TEXT NOT NULL UNIQUE CHECK(length(address)=42 AND address=lower(address)),
 chain_id INTEGER NOT NULL CHECK(chain_id=1),
 challenge_id TEXT NOT NULL UNIQUE REFERENCES store_wallet_challenges(id),
 signature_hash TEXT NOT NULL,
 linked_at TEXT NOT NULL
);
CREATE INDEX store_wallet_links_user ON store_wallet_links(user_id,linked_at);
