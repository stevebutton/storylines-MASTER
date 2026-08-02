-- Migration 036: Add route_line_width column to stories
-- Allows per-story configuration of the animated route line width (1–10 px).

ALTER TABLE stories
  ADD COLUMN IF NOT EXISTS route_line_width integer DEFAULT 4;
