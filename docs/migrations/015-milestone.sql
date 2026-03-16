-- Add milestone rich text field to slides
ALTER TABLE slides ADD COLUMN IF NOT EXISTS milestone text DEFAULT '';
