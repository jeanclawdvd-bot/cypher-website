-- Private local profile images. No external object store or ZERO synchronization.
CREATE TABLE store_profile_photos (
 user_id TEXT PRIMARY KEY REFERENCES store_users(id),
 mime_type TEXT NOT NULL CHECK(mime_type='image/jpeg'),
 image_base64 TEXT NOT NULL CHECK(length(image_base64)<=349528),
 digest TEXT NOT NULL CHECK(length(digest)=64),
 width INTEGER NOT NULL CHECK(width BETWEEN 1 AND 512),
 height INTEGER NOT NULL CHECK(height BETWEEN 1 AND 512),
 updated_at TEXT NOT NULL
);
