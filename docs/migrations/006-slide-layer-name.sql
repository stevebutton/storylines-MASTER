-- Migration 006: add layer_display_name to slides
-- Allows editors to give a human-readable label to the Mapbox layer
-- shown in the BottomPillBar layer-toggle buttons.

alter table slides add column if not exists layer_display_name text;
