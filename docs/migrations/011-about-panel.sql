-- About panel fields for stories
ALTER TABLE stories
    ADD COLUMN IF NOT EXISTS about_org_name   text,
    ADD COLUMN IF NOT EXISTS about_logo_url   text,
    ADD COLUMN IF NOT EXISTS about_who_we_are text,
    ADD COLUMN IF NOT EXISTS about_what_we_do text,
    ADD COLUMN IF NOT EXISTS about_website    text,
    ADD COLUMN IF NOT EXISTS about_email      text;
