-- Migration 028: Login settings — welcome overview (rich text) + video loop toggle

ALTER TABLE login_settings
  ADD COLUMN IF NOT EXISTS welcome_overview text,
  ADD COLUMN IF NOT EXISTS video_loop       boolean NOT NULL DEFAULT true;
