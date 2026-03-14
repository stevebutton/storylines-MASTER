CREATE TABLE IF NOT EXISTS homepage (
    id               integer PRIMARY KEY DEFAULT 1,
    -- Hero
    hero_title       text DEFAULT '',
    hero_subtitle    text DEFAULT '',
    hero_image       text,
    hero_video       text,
    hero_type        text DEFAULT 'image',
    hero_video_loop  boolean DEFAULT true,
    -- Overview
    overview_enabled  boolean DEFAULT true,
    overview_heading  text DEFAULT 'Overview',
    overview_body     text,
    overview_bg_image text,
    -- Globe
    globe_enabled   boolean DEFAULT true,
    globe_heading   text DEFAULT 'Explore Our Stories',
    -- Footer
    footer_enabled  boolean DEFAULT true,
    footer_content  text DEFAULT '',
    -- General
    map_style   text DEFAULT 'a',
    updated_at  timestamptz DEFAULT now()
);

-- Seed single row so editor always has something to load
INSERT INTO homepage (id) VALUES (1) ON CONFLICT DO NOTHING;
