-- Migration 018: Add map_style to series table
ALTER TABLE series ADD COLUMN IF NOT EXISTS map_style text DEFAULT 'a';
