-- Migration 007: Per-story language + translation overrides
-- Adds story_language and translations columns to stories table

alter table stories add column if not exists story_language text default 'en';
alter table stories add column if not exists translations jsonb default '{}';
