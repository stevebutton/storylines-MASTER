-- Per-story background colour for the Story View overlay
-- Default matches the existing hardcoded value (rgb(2,6,23) ≈ near-black navy)
ALTER TABLE stories
  ADD COLUMN IF NOT EXISTS overlay_bg_color text DEFAULT '#020617';
