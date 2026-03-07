-- Migration 003: Add show_on_map flag to slides
-- Slides with show_on_map = false are still part of the story sequence
-- but do not create an interactive map marker.
ALTER TABLE slides
    ADD COLUMN IF NOT EXISTS show_on_map boolean NOT NULL DEFAULT true;
