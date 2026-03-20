-- Migration 026: Login page settings (singleton table)

CREATE TABLE IF NOT EXISTS login_settings (
  id              integer PRIMARY KEY DEFAULT 1,
  heading         text NOT NULL DEFAULT 'Sign in',
  subtitle        text NOT NULL DEFAULT 'Enter your credentials to continue',
  button_text     text NOT NULL DEFAULT 'Sign in',
  -- background_source: 'homepage' uses the homepage hero; 'image' or 'video' uses custom URLs below
  background_source text NOT NULL DEFAULT 'homepage'
                  CHECK (background_source IN ('homepage', 'image', 'video')),
  background_image  text,
  background_video  text,
  -- Ensure only one row exists
  CONSTRAINT login_settings_singleton CHECK (id = 1)
);

-- Seed default row
INSERT INTO login_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

ALTER TABLE login_settings ENABLE ROW LEVEL SECURITY;

-- Public read (login page is unauthenticated)
CREATE POLICY "login_settings_public_read" ON login_settings
  FOR SELECT USING (true);

-- Admin write only
CREATE POLICY "login_settings_admin_update" ON login_settings
  FOR UPDATE USING (is_admin());
