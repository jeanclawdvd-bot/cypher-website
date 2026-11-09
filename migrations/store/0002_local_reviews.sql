-- Local-only moderation. Roles are granted by the local operator, never registration.
ALTER TABLE store_reviews ADD COLUMN moderation_revision INTEGER NOT NULL DEFAULT 0 CHECK(moderation_revision>=0);
CREATE TABLE store_moderators (
 user_id TEXT PRIMARY KEY REFERENCES store_users(id), granted_at TEXT NOT NULL
);
CREATE TABLE store_review_decisions (
 id TEXT PRIMARY KEY, review_id TEXT NOT NULL REFERENCES store_reviews(id),
 moderator_id TEXT NOT NULL REFERENCES store_users(id), decision TEXT NOT NULL CHECK(decision IN ('published','rejected')),
 reason TEXT NOT NULL CHECK(length(reason) BETWEEN 3 AND 500), expected_revision INTEGER NOT NULL CHECK(expected_revision>=0),
 idempotency_key TEXT NOT NULL, fingerprint TEXT NOT NULL, created_at TEXT NOT NULL,
 UNIQUE(moderator_id,idempotency_key), UNIQUE(review_id,expected_revision)
);
CREATE TRIGGER store_review_decision_authorized BEFORE INSERT ON store_review_decisions BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM store_moderators WHERE user_id=NEW.moderator_id)
  THEN RAISE(ABORT,'moderator_required') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM store_reviews WHERE id=NEW.review_id AND user_id<>NEW.moderator_id AND moderation_revision=NEW.expected_revision)
  THEN RAISE(ABORT,'review_revision_or_self') END;
END;
CREATE TRIGGER store_review_decision_apply AFTER INSERT ON store_review_decisions BEGIN
 UPDATE store_reviews SET moderation=NEW.decision,moderation_revision=moderation_revision+1 WHERE id=NEW.review_id;
END;
CREATE TRIGGER store_review_decision_immutable_update BEFORE UPDATE ON store_review_decisions
 BEGIN SELECT RAISE(ABORT,'decision_immutable'); END;
CREATE TRIGGER store_review_decision_immutable_delete BEFORE DELETE ON store_review_decisions
 BEGIN SELECT RAISE(ABORT,'decision_immutable'); END;
CREATE TABLE store_review_votes (
 review_id TEXT NOT NULL REFERENCES store_reviews(id), user_id TEXT NOT NULL REFERENCES store_users(id), created_at TEXT NOT NULL,
 PRIMARY KEY(review_id,user_id)
);
CREATE TRIGGER store_review_vote_eligible BEFORE INSERT ON store_review_votes BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM store_reviews WHERE id=NEW.review_id AND user_id<>NEW.user_id AND moderation='published')
  THEN RAISE(ABORT,'review_vote_ineligible') END;
END;
CREATE TRIGGER store_review_votes_immutable BEFORE UPDATE ON store_review_votes
 BEGIN SELECT RAISE(ABORT,'vote_immutable'); END;
