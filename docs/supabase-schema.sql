-- =============================================================================
-- Storylines — Supabase Schema
-- Derived from Base44 CSV exports (Story, Chapter, Slide)
-- =============================================================================
-- Notes:
--   • IDs kept as text (Base44 hex strings, e.g. "69a02953fb4b83bd5bf5e784")
--     to preserve all foreign key relationships during initial migration.
--     Can be replaced with uuid + gen_random_uuid() in a future cleanup.
--   • coordinates stored as jsonb — values are [lat, lng] arrays or [].
--   • Numeric fields (zoom, bearing, pitch, fly_duration) are float8 nullable;
--     Base44 exports them as empty strings which should be coerced to NULL.
--   • "order" is quoted — reserved word in PostgreSQL.
--   • story_context is a jsonb object:
--       { date_range, locations, additional_context,
--         story_description, story_title }
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Stories
-- -----------------------------------------------------------------------------
create table if not exists stories (
  id                               text primary key,
  title                            text,
  subtitle                         text,
  story_description                text,
  author                           text,
  hero_image                       text,
  hero_video                       text,
  hero_video_loop                  boolean default true,
  hero_type                        text default 'image',
  thumbnail                        text,
  coordinates                      jsonb,
  zoom                             float8,
  bearing                          float8,
  pitch                            float8,
  map_style                        text default 'light',
  is_published                     boolean default false,
  is_shareable                     boolean default false,
  is_main_story                    boolean default false,
  is_sample                        boolean default false,
  category                         text,
  caption_voice                    text,
  custom_caption_voice_description text,
  story_context                    jsonb,
  created_date                     timestamptz,
  updated_date                     timestamptz,
  created_by_id                    text,
  created_by                       text
);


-- -----------------------------------------------------------------------------
-- Chapters
-- -----------------------------------------------------------------------------
-- Note: map_style, fly_duration, zoom are NOT stored on Chapter in Base44.
-- Code references like chapter.fly_duration || 8 fall back to defaults.
-- Those columns are intentionally omitted here — add later if needed.
-- -----------------------------------------------------------------------------
create table if not exists chapters (
  id              text primary key,
  story_id        text references stories(id) on delete cascade,
  name            text,
  "order"         integer,
  alignment       text default 'left',
  is_sample       boolean default false,
  created_date    timestamptz,
  updated_date    timestamptz,
  created_by_id   text,
  created_by      text
);

create index if not exists chapters_story_id_idx on chapters(story_id);


-- -----------------------------------------------------------------------------
-- Slides
-- -----------------------------------------------------------------------------
create table if not exists slides (
  id                  text primary key,
  chapter_id          text references chapters(id) on delete cascade,
  "order"             integer,
  title               text,
  description         text,          -- HTML string, page 1 content
  extended_content    text,          -- HTML string, additional pages
  location            text,
  coordinates         jsonb,         -- [lat, lng] or null
  image               text,          -- URL
  background_image    text,
  video_url           text,
  video_thumbnail_url text,
  pdf_url             text,
  zoom                float8,
  bearing             float8,
  pitch               float8,
  fly_duration        float8,
  mapbox_layer_id     text,
  card_style          text default 'default',
  is_sample           boolean default false,
  created_date        timestamptz,
  updated_date        timestamptz,
  created_by_id       text,
  created_by          text
);

create index if not exists slides_chapter_id_idx on slides(chapter_id);


-- =============================================================================
-- Row Level Security (RLS)
-- =============================================================================
-- Enable RLS on all tables. Policies below allow:
--   • Public read of published, non-sample stories (and their chapters/slides)
--   • Authenticated users read/write their own content
-- Adjust to match your auth model once Supabase Auth is wired up.
-- =============================================================================

alter table stories  enable row level security;
alter table chapters enable row level security;
alter table slides   enable row level security;

-- Public can read published stories
create policy "Public read published stories"
  on stories for select
  using (is_published = true and is_sample = false);

-- Public can read chapters belonging to published stories
create policy "Public read chapters of published stories"
  on chapters for select
  using (
    exists (
      select 1 from stories s
      where s.id = chapters.story_id
        and s.is_published = true
        and s.is_sample = false
    )
  );

-- Public can read slides belonging to published stories
create policy "Public read slides of published stories"
  on slides for select
  using (
    exists (
      select 1 from chapters c
      join stories s on s.id = c.story_id
      where c.id = slides.chapter_id
        and s.is_published = true
        and s.is_sample = false
    )
  );

-- Authenticated users can read all their own content (published or not)
create policy "Authenticated read own stories"
  on stories for select
  to authenticated
  using (created_by_id = auth.uid()::text);

create policy "Authenticated read own chapters"
  on chapters for select
  to authenticated
  using (
    exists (
      select 1 from stories s
      where s.id = chapters.story_id
        and s.created_by_id = auth.uid()::text
    )
  );

create policy "Authenticated read own slides"
  on slides for select
  to authenticated
  using (
    exists (
      select 1 from chapters c
      join stories s on s.id = c.story_id
      where c.id = slides.chapter_id
        and s.created_by_id = auth.uid()::text
    )
  );

-- Authenticated users can insert/update/delete their own stories
create policy "Authenticated insert own stories"
  on stories for insert
  to authenticated
  with check (created_by_id = auth.uid()::text);

create policy "Authenticated update own stories"
  on stories for update
  to authenticated
  using (created_by_id = auth.uid()::text);

create policy "Authenticated delete own stories"
  on stories for delete
  to authenticated
  using (created_by_id = auth.uid()::text);

-- Authenticated users can insert/update/delete chapters in their own stories
create policy "Authenticated insert own chapters"
  on chapters for insert
  to authenticated
  with check (
    exists (
      select 1 from stories s
      where s.id = chapters.story_id
        and s.created_by_id = auth.uid()::text
    )
  );

create policy "Authenticated update own chapters"
  on chapters for update
  to authenticated
  using (
    exists (
      select 1 from stories s
      where s.id = chapters.story_id
        and s.created_by_id = auth.uid()::text
    )
  );

create policy "Authenticated delete own chapters"
  on chapters for delete
  to authenticated
  using (
    exists (
      select 1 from stories s
      where s.id = chapters.story_id
        and s.created_by_id = auth.uid()::text
    )
  );

-- Authenticated users can insert/update/delete slides in their own chapters
create policy "Authenticated insert own slides"
  on slides for insert
  to authenticated
  with check (
    exists (
      select 1 from chapters c
      join stories s on s.id = c.story_id
      where c.id = slides.chapter_id
        and s.created_by_id = auth.uid()::text
    )
  );

create policy "Authenticated update own slides"
  on slides for update
  to authenticated
  using (
    exists (
      select 1 from chapters c
      join stories s on s.id = c.story_id
      where c.id = slides.chapter_id
        and s.created_by_id = auth.uid()::text
    )
  );

create policy "Authenticated delete own slides"
  on slides for delete
  to authenticated
  using (
    exists (
      select 1 from chapters c
      join stories s on s.id = c.story_id
      where c.id = slides.chapter_id
        and s.created_by_id = auth.uid()::text
    )
  );
