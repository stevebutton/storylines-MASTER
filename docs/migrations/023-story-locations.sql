-- Migration 023: Add story_locations column to stories table
-- Stores the geographic context entered in the Project Brief, which
-- pre-populates the "Location(s)" field in VoiceSelectionPanel for
-- all subsequent caption generation on this story.

ALTER TABLE stories
    ADD COLUMN IF NOT EXISTS story_locations text DEFAULT NULL;
