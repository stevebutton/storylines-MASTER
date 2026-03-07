-- Migration 005: Add video loop flag to slides
ALTER TABLE slides
    ADD COLUMN IF NOT EXISTS video_loop boolean NOT NULL DEFAULT false;
