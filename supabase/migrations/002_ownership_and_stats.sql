-- Add ownership type to album ratings (vinyl, cd, cassette, digital, none)
ALTER TABLE ratings ADD COLUMN ownership TEXT CHECK (ownership IN ('vinyl', 'cd', 'cassette', 'digital', 'none')) DEFAULT 'digital';

-- Add total duration tracking to albums (in ms, from Apple Music)
-- Already have duration_ms on songs, but albums need track_count * avg or sum
-- We'll compute stats from song durations where available
