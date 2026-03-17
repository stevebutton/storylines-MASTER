-- Migration 019: Add map position fields to series table
ALTER TABLE series
    ADD COLUMN IF NOT EXISTS map_lat  numeric DEFAULT 20,
    ADD COLUMN IF NOT EXISTS map_lng  numeric DEFAULT 20,
    ADD COLUMN IF NOT EXISTS map_zoom numeric DEFAULT 2;
