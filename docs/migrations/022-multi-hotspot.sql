-- Multi-hotspot support: array of { x, y, title, body } objects (max 3)
-- Old hotspot_x/y/title/body columns are kept for backward compatibility
ALTER TABLE slides
    ADD COLUMN IF NOT EXISTS hotspots jsonb DEFAULT NULL;
