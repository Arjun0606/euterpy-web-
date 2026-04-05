-- Richer album metadata from Apple Music API
ALTER TABLE albums ADD COLUMN IF NOT EXISTS editorial_notes TEXT;
ALTER TABLE albums ADD COLUMN IF NOT EXISTS record_label TEXT;
ALTER TABLE albums ADD COLUMN IF NOT EXISTS copyright TEXT;
ALTER TABLE albums ADD COLUMN IF NOT EXISTS apple_url TEXT;
ALTER TABLE albums ADD COLUMN IF NOT EXISTS is_single BOOLEAN DEFAULT false;

-- Richer song metadata
ALTER TABLE songs ADD COLUMN IF NOT EXISTS composer_name TEXT;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS apple_url TEXT;
