-- ============================================================
-- Fix: signup is broken because handle_new_user() references a
-- dropped table.
--
-- Migration 004 defined handle_new_user() to do two things on
-- every auth.users insert:
--   1. INSERT INTO public.profiles (the essential part)
--   2. INSERT INTO public.shelves (the Favorites starter shelf)
--
-- Migration 021 then dropped the shelves table entirely when we
-- killed the shelf system in favor of lists. But nobody updated
-- handle_new_user(), so step 2 above has been raising
--   ERROR: relation "public.shelves" does not exist
-- on every new signup. The error bubbles up to the Supabase auth
-- API as "Database error saving new user" and the account is
-- never created.
--
-- This migration:
--   1. Recreates handle_new_user() without the shelves INSERT.
--      Profile creation is the only thing it needs to do — lists,
--      charts, etc. are created on demand when the user uses
--      those features, not seeded at signup.
--   2. Recreates the trigger (drop + recreate so the stale
--      function body is definitely replaced on every
--      environment).
-- ============================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_username TEXT;
BEGIN
  -- Username comes from auth signup metadata. Fall back to a
  -- synthetic "user_<first 8 chars of uuid>" if the client didn't
  -- supply one — this should never happen in practice but keeps
  -- the trigger robust if an admin creates a user directly.
  new_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    'user_' || REPLACE(LEFT(NEW.id::text, 8), '-', '')
  );

  -- Create the profile row. If the chosen username is already
  -- taken (which shouldn't happen because the signup flow checks
  -- client-side, but race conditions exist), retry once with a
  -- random 4-char suffix.
  BEGIN
    INSERT INTO public.profiles (id, username, display_name)
    VALUES (
      NEW.id,
      new_username,
      COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name')
    );
  EXCEPTION WHEN unique_violation THEN
    INSERT INTO public.profiles (id, username, display_name)
    VALUES (
      NEW.id,
      new_username || '_' || LEFT(md5(random()::text), 4),
      COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name')
    );
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
