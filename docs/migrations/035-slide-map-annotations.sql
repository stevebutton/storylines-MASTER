-- Migration 035: Add map_annotations column to slides
-- Each slide can have up to 5 contextual map markers (pins) with icon, color, title, body, and coordinates.

ALTER TABLE slides
  ADD COLUMN IF NOT EXISTS map_annotations jsonb DEFAULT '[]'::jsonb;
