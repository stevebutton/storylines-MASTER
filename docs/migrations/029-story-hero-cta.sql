-- Migration 029: Hero secondary CTA + post-login welcome story routing

-- Secondary CTA button fields on stories (shown on hero section)
ALTER TABLE stories
  ADD COLUMN IF NOT EXISTS hero_cta_label text,
  ADD COLUMN IF NOT EXISTS hero_cta_url   text;

-- Welcome story routing on login_settings
ALTER TABLE login_settings
  ADD COLUMN IF NOT EXISTS welcome_story_id text;
