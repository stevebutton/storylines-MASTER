-- =============================================================================
-- Migration 002: Add capture_date and story_date to slides
-- Run once in Supabase SQL editor
-- =============================================================================
--
-- capture_date  timestamptz  — EXIF datetime extracted from the image at upload.
--                              Read-only provenance; set programmatically, never
--                              edited by the user.
--
-- story_date    date         — Editable contextual date shown in the Story Editor.
--                              Defaults to capture_date::date on upload. The author
--                              can override this to reflect the date relevant to the
--                              story (e.g. the date of an event, not the photo date).
--                              Used by the timeline view.
--
-- =============================================================================

alter table slides
  add column if not exists capture_date timestamptz,
  add column if not exists story_date   date;

-- Index for timeline queries (sort/filter by story_date across a story)
create index if not exists slides_story_date_idx on slides(story_date);
