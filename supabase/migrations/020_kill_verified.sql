-- ============================================================
-- Drop the verified system entirely.
-- Decision: everyone on Euterpy is equal. If you're a celebrity
-- post about your account on Instagram or TikTok and earn your
-- followers the same way as everyone else.
-- ============================================================

DROP INDEX IF EXISTS idx_profiles_verified;

ALTER TABLE profiles DROP COLUMN IF EXISTS is_verified;
ALTER TABLE profiles DROP COLUMN IF EXISTS verified_label;
