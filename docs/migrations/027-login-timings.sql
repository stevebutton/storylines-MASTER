-- Migration 027: Add animation timing + welcome panel columns to login_settings

ALTER TABLE login_settings
  -- Animation timings
  ADD COLUMN IF NOT EXISTS anim_bg_delay       float NOT NULL DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS anim_panel_delay    float NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS anim_panel_duration float NOT NULL DEFAULT 2.4,
  ADD COLUMN IF NOT EXISTS anim_content_delay  float NOT NULL DEFAULT 2.2,
  -- Welcome panel (left column)
  ADD COLUMN IF NOT EXISTS welcome_title       text NOT NULL DEFAULT 'Welcome to Storylines',
  ADD COLUMN IF NOT EXISTS welcome_tagline     text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS welcome_body        text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS welcome_cta_text    text NOT NULL DEFAULT 'Request Access',
  ADD COLUMN IF NOT EXISTS welcome_cta_email   text NOT NULL DEFAULT '';
