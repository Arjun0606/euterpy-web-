-- Drop and recreate all triggers that fire on user creation
-- The cascade: auth.users INSERT -> handle_new_user -> profiles INSERT -> create_favorites_shelf

-- First, drop existing triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_profile_created_favorites ON profiles;

-- Recreate handle_new_user WITHOUT cascading to favorites
-- We'll create favorites shelf inside the same function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_username TEXT;
  new_profile_id UUID;
BEGIN
  new_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    'user_' || REPLACE(LEFT(NEW.id::text, 8), '-', '')
  );

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

  -- Create favorites shelf directly here instead of separate trigger
  INSERT INTO public.shelves (user_id, title, is_favorites)
  VALUES (NEW.id, 'Favorites', true);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Drop the separate favorites trigger (now handled in handle_new_user)
DROP FUNCTION IF EXISTS create_favorites_shelf() CASCADE;
