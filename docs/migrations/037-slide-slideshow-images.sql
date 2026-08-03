-- Add slideshow_images column to slides table.
-- Stores an ordered array of { url: string } objects (up to 5).
-- Used in Story view to cycle through multiple images per slide.
-- The existing `image` column is unchanged (still used as the carousel thumbnail).
ALTER TABLE slides
    ADD COLUMN IF NOT EXISTS slideshow_images jsonb DEFAULT '[]'::jsonb;
