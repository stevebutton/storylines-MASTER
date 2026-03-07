-- Migration 004: Add project start/end dates to stories
-- Used to auto-distribute story_date values across slides in Timeline view.
ALTER TABLE stories
    ADD COLUMN IF NOT EXISTS project_start_date date,
    ADD COLUMN IF NOT EXISTS project_end_date   date;
