-- Add photo_url to sightings (mandatory going forward, nullable for existing rows)
ALTER TABLE sightings ADD COLUMN IF NOT EXISTS photo_url text;
