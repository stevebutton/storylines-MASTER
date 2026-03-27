-- Per-story toggle to suppress location marker icons
ALTER TABLE stories
  ADD COLUMN IF NOT EXISTS show_markers boolean DEFAULT true;
