-- Change default for share_anonymous_data to true for new users
ALTER TABLE user_preferences ALTER COLUMN share_anonymous_data SET DEFAULT true;
