-- =============================================================================
-- Storylines — Supabase Schema
-- Derived from Base44 CSV exports (Story, Chapter, Slide, Category,
--   Document, Media, HomePageSection, HeroSlide)
-- =============================================================================
-- Notes:
--   • IDs kept as text (Base44 hex strings, e.g. "69a02953fb4b83bd5bf5e784")
--     to preserve all foreign key relationships during initial migration.
--     Can be replaced with uuid + gen_random_uuid() in a future cleanup.
--   • coordinates stored as jsonb — values are [lat, lng] arrays or [].
--   • Numeric fields (zoom, bearing, pitch, fly_duration, file_size) are
--     nullable; Base44 exports them as empty strings → coerce to NULL.
--   • "order" is quoted — reserved word in PostgreSQL.
--   • story_context is a jsonb object:
--       { date_range, locations, additional_context,
--         story_description, story_title }
--   • Category is a general taxonomy table used by stories, documents, and
--     media. The `type` field scopes categories by entity ('story',
--     'document', 'media'). Hierarchical via self-referential parent_id.
--   • Media and Documents are currently separate tables reflecting how
--     Base44 stored them. They are intended to merge into a unified global
--     asset library in a future migration.
-- =============================================================================


-- =============================================================================
-- Categories
-- =============================================================================
-- More robust than Base44's semi-implemented version:
--   • slug for URL-safe routing
--   • description for UI help text
--   • parent_id for hierarchical nesting
--   • type to scope categories by entity kind ('story', 'document', 'media')
--   • order for manual display ordering
--   • color kept as text (Base44 stored Tailwind class pairs e.g.
--     "bg-indigo-100 text-indigo-800"; can be any format in new UI)
-- Stories reference categories via category_id (FK), replacing the legacy
-- category text column which is retained for migration compatibility.
-- =============================================================================
create table if not exists categories (
  id            text primary key,
  name          text not null,
  slug          text unique,
  description   text,
  color         text,            -- Tailwind class pair or hex — display colour
  type          text default 'story', -- 'story' | 'document' | 'media' | 'general'
  parent_id     text references categories(id) on delete set null,
  "order"       integer,
  is_sample     boolean default false,
  created_date  timestamptz,
  updated_date  timestamptz,
  created_by_id text,
  created_by    text
);

create index if not exists categories_type_idx    on categories(type);
create index if not exists categories_parent_idx  on categories(parent_id);


-- =============================================================================
-- Stories
-- =============================================================================
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
  -- Legacy text category (Base44 migration); prefer category_id going forward
  category                         text,
  category_id                      text references categories(id) on delete set null,
  caption_voice                    text,
  custom_caption_voice_description text,
  story_context                    jsonb,
  created_date                     timestamptz,
  updated_date                     timestamptz,
  created_by_id                    text,
  created_by                       text
);

create index if not exists stories_category_id_idx on stories(category_id);


-- =============================================================================
-- Chapters
-- =============================================================================
-- Note: map_style, fly_duration, zoom are NOT stored on Chapter in Base44.
-- Code references like chapter.fly_duration || 8 fall back to defaults.
-- Those columns are intentionally omitted here — add later if needed.
-- route_geometry: pre-computed road-following route for this chapter's slides
--   stored as [[lat,lng],...] — null means no route computed (straight-line
--   fallback). Computed via Mapbox Directions API in the Story Editor.
-- =============================================================================
create table if not exists chapters (
  id              text primary key,
  story_id        text references stories(id) on delete cascade,
  name            text,
  "order"         integer,
  alignment       text default 'left',
  route_geometry  jsonb,    -- [[lat,lng],...] pre-computed road route; null = none
  is_sample       boolean default false,
  created_date    timestamptz,
  updated_date    timestamptz,
  created_by_id   text,
  created_by      text
);

create index if not exists chapters_story_id_idx on chapters(story_id);


-- =============================================================================
-- Slides
-- =============================================================================
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
-- Documents
-- =============================================================================
-- PDF and file library. story_id is nullable — documents can be attached
-- to a specific story or exist as standalone library items.
-- category here is a free-text document classification (e.g. "presentations",
-- "legal", "reports"). Future: normalise via categories table with type='document'.
-- =============================================================================
create table if not exists documents (
  id            text primary key,
  story_id      text references stories(id) on delete set null,
  title         text,
  description   text,
  file_url      text,
  folder        text,
  category      text,             -- free-text: presentations, legal, reports, etc.
  file_size     bigint,           -- bytes
  page_count    integer,
  tags          jsonb,            -- array of strings
  is_sample     boolean default false,
  created_date  timestamptz,
  updated_date  timestamptz,
  created_by_id text,
  created_by    text
);

create index if not exists documents_story_id_idx on documents(story_id);


-- =============================================================================
-- Media
-- =============================================================================
-- Global media library (images, videos, etc.).
-- Intended to merge with Documents into a unified asset library in a future
-- migration — at that point both tables fold into a single `assets` table
-- with an asset_type discriminator column.
-- dimensions stored as text (e.g. "1920x1080") matching Base44 export format.
-- =============================================================================
create table if not exists media (
  id            text primary key,
  url           text,
  filename      text,
  title         text,
  description   text,
  tags          jsonb,            -- array of strings
  category      text,             -- free-text: other, images, video, etc.
  file_size     bigint,           -- bytes
  dimensions    text,             -- e.g. "1920x1080"
  is_sample     boolean default false,
  created_date  timestamptz,
  updated_date  timestamptz,
  created_by_id text,
  created_by    text
);


-- =============================================================================
-- Homepage Sections  (CMS page builder)
-- =============================================================================
-- page_name groups sections that belong to the same page.
-- layout_type drives the frontend component selection:
--   full_width_video | hero_image_text_overlay | hero_with_slides |
--   single_column | component
-- component_type is used when layout_type = 'component':
--   interactive_story_map | (others TBD)
-- linked_story_id attaches a specific story to a component section.
-- coordinates/zoom/bearing/pitch are used by map-type components.
-- =============================================================================
create table if not exists homepage_sections (
  id              text primary key,
  page_name       text,
  title           text,
  content         text,           -- HTML rich text
  image_url       text,
  video_url       text,
  "order"         integer,
  layout_type     text,           -- full_width_video | hero_image_text_overlay | hero_with_slides | single_column | component
  component_type  text,           -- interactive_story_map | (others TBD)
  linked_story_id text references stories(id) on delete set null,
  coordinates     jsonb,
  zoom            float8,
  bearing         float8,
  pitch           float8,
  show_gradient   boolean default true,
  tagline         text,
  cta_text        text,
  cta_link        text,
  is_sample       boolean default false,
  created_date    timestamptz,
  updated_date    timestamptz,
  created_by_id   text,
  created_by      text
);

create index if not exists homepage_sections_page_name_idx      on homepage_sections(page_name);
create index if not exists homepage_sections_linked_story_idx   on homepage_sections(linked_story_id);


-- =============================================================================
-- Hero Slides  (slides within a hero_with_slides section)
-- =============================================================================
create table if not exists hero_slides (
  id            text primary key,
  section_id    text references homepage_sections(id) on delete cascade,
  "order"       integer,
  image_url     text,
  title         text,
  description   text,
  link          text,
  is_sample     boolean default false,
  created_date  timestamptz,
  updated_date  timestamptz,
  created_by_id text,
  created_by    text
);

create index if not exists hero_slides_section_id_idx on hero_slides(section_id);


-- =============================================================================
-- Row Level Security (RLS)
-- =============================================================================
-- Enable RLS on all tables. Policies below allow:
--   • Public read of published, non-sample stories (and their chapters/slides)
--   • Public read of categories, media, and homepage content
--   • Authenticated users read/write their own content
-- Adjust to match your auth model once Supabase Auth is wired up.
-- =============================================================================

alter table categories        enable row level security;
alter table stories           enable row level security;
alter table chapters          enable row level security;
alter table slides            enable row level security;
alter table documents         enable row level security;
alter table media             enable row level security;
alter table homepage_sections enable row level security;
alter table hero_slides       enable row level security;


-- -----------------------------------------------------------------------------
-- Categories — public read all; authenticated CRUD
-- -----------------------------------------------------------------------------
create policy "Public read categories"
  on categories for select
  using (true);

create policy "Authenticated insert categories"
  on categories for insert
  to authenticated
  with check (created_by_id = auth.uid()::text);

create policy "Authenticated update categories"
  on categories for update
  to authenticated
  using (created_by_id = auth.uid()::text);

create policy "Authenticated delete categories"
  on categories for delete
  to authenticated
  using (created_by_id = auth.uid()::text);


-- -----------------------------------------------------------------------------
-- Stories
-- -----------------------------------------------------------------------------
create policy "Public read published stories"
  on stories for select
  using (is_published = true and is_sample = false);

create policy "Authenticated read own stories"
  on stories for select
  to authenticated
  using (created_by_id = auth.uid()::text);

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


-- -----------------------------------------------------------------------------
-- Chapters — follow parent story's visibility
-- -----------------------------------------------------------------------------
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


-- -----------------------------------------------------------------------------
-- Slides — follow grandparent story's visibility
-- -----------------------------------------------------------------------------
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


-- -----------------------------------------------------------------------------
-- Documents — public read if no story or published story; authenticated CRUD
-- -----------------------------------------------------------------------------
create policy "Public read documents"
  on documents for select
  using (
    story_id is null
    or exists (
      select 1 from stories s
      where s.id = documents.story_id
        and s.is_published = true
        and s.is_sample = false
    )
  );

create policy "Authenticated read own documents"
  on documents for select
  to authenticated
  using (created_by_id = auth.uid()::text);

create policy "Authenticated insert own documents"
  on documents for insert
  to authenticated
  with check (created_by_id = auth.uid()::text);

create policy "Authenticated update own documents"
  on documents for update
  to authenticated
  using (created_by_id = auth.uid()::text);

create policy "Authenticated delete own documents"
  on documents for delete
  to authenticated
  using (created_by_id = auth.uid()::text);


-- -----------------------------------------------------------------------------
-- Media — public read all; authenticated CRUD
-- -----------------------------------------------------------------------------
create policy "Public read media"
  on media for select
  using (true);

create policy "Authenticated insert own media"
  on media for insert
  to authenticated
  with check (created_by_id = auth.uid()::text);

create policy "Authenticated update own media"
  on media for update
  to authenticated
  using (created_by_id = auth.uid()::text);

create policy "Authenticated delete own media"
  on media for delete
  to authenticated
  using (created_by_id = auth.uid()::text);


-- -----------------------------------------------------------------------------
-- Homepage Sections — public read all; authenticated CRUD
-- -----------------------------------------------------------------------------
create policy "Public read homepage sections"
  on homepage_sections for select
  using (true);

create policy "Authenticated insert homepage sections"
  on homepage_sections for insert
  to authenticated
  with check (created_by_id = auth.uid()::text);

create policy "Authenticated update homepage sections"
  on homepage_sections for update
  to authenticated
  using (created_by_id = auth.uid()::text);

create policy "Authenticated delete homepage sections"
  on homepage_sections for delete
  to authenticated
  using (created_by_id = auth.uid()::text);


-- -----------------------------------------------------------------------------
-- Hero Slides — follow parent section visibility (public read all)
-- -----------------------------------------------------------------------------
create policy "Public read hero slides"
  on hero_slides for select
  using (true);

create policy "Authenticated insert hero slides"
  on hero_slides for insert
  to authenticated
  with check (created_by_id = auth.uid()::text);

create policy "Authenticated update hero slides"
  on hero_slides for update
  to authenticated
  using (created_by_id = auth.uid()::text);

create policy "Authenticated delete hero slides"
  on hero_slides for delete
  to authenticated
  using (created_by_id = auth.uid()::text);
