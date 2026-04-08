-- Add a preferred shelf style to profiles
-- Used for "The Shelf" on the user's profile page
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS shelf_style TEXT DEFAULT 'minimal'
  CHECK (shelf_style IN ('minimal', 'wood', 'ornate', 'glass'));
