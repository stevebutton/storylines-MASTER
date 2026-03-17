-- Migration 016: Series and Episodes
-- Creates the series table and adds series_id + episode_number to stories.

CREATE TABLE IF NOT EXISTS series (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title        text NOT NULL DEFAULT '',
    subtitle     text DEFAULT '',
    description  text DEFAULT '',
    cover_image  text,
    category     text,
    is_published boolean DEFAULT false,
    created_at   timestamptz DEFAULT now(),
    updated_at   timestamptz DEFAULT now()
);

ALTER TABLE stories
    ADD COLUMN IF NOT EXISTS series_id      uuid REFERENCES series(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS episode_number integer;

CREATE INDEX IF NOT EXISTS idx_stories_series_id ON stories(series_id);
