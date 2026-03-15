-- Add Info / About panel fields to homepage singleton table
ALTER TABLE homepage
    ADD COLUMN IF NOT EXISTS about_org_name   text DEFAULT '',
    ADD COLUMN IF NOT EXISTS about_logo_url   text,
    ADD COLUMN IF NOT EXISTS about_who_we_are text DEFAULT '',
    ADD COLUMN IF NOT EXISTS about_what_we_do text DEFAULT '',
    ADD COLUMN IF NOT EXISTS about_website    text DEFAULT '',
    ADD COLUMN IF NOT EXISTS about_email      text DEFAULT '';
