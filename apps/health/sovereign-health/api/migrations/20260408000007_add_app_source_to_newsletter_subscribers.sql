-- Add app_source to newsletter_subscribers
-- Tracks which BrickOS app the subscriber came from (issue #0394)

ALTER TABLE newsletter_subscribers
    ADD COLUMN IF NOT EXISTS app_source VARCHAR(50);

-- Backfill: detect app_source from user activity
-- Users with measurements came from SHI (join through users.email)
UPDATE newsletter_subscribers ns
SET app_source = 'sovereign-health'
WHERE app_source IS NULL
  AND EXISTS (
    SELECT 1 FROM users u
    JOIN measurements m ON m.user_id = u.id
    WHERE u.email = ns.email
  );

-- Users with short_links came from Sovereign Link
UPDATE newsletter_subscribers ns
SET app_source = 'sovereign-link'
WHERE app_source IS NULL
  AND EXISTS (
    SELECT 1 FROM users u
    JOIN short_links sl ON sl.owner_user_id = u.id
    WHERE u.email = ns.email
  );

-- Subscribers who signed up via 'signup' source came from SHI
UPDATE newsletter_subscribers
SET app_source = 'sovereign-health'
WHERE app_source IS NULL
  AND source = 'signup';

-- Subscribers who came via 'settings' source came from SHI
UPDATE newsletter_subscribers
SET app_source = 'sovereign-health'
WHERE app_source IS NULL
  AND source = 'settings';

-- Default remaining to 'website'
UPDATE newsletter_subscribers
SET app_source = 'website'
WHERE app_source IS NULL;
