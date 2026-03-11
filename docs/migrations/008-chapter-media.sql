-- Migration 008 — Chapter background media
-- Adds background image and video fields to chapters.
-- background_image was already added ad hoc on the live database;
-- ADD COLUMN IF NOT EXISTS makes this idempotent.
-- chapter_video / chapter_video_loop mirror the pattern on stories
-- (hero_video / hero_video_loop).

alter table chapters
    add column if not exists background_image    text,
    add column if not exists chapter_video       text,
    add column if not exists chapter_video_loop  boolean default true;
