ALTER TABLE stories ADD COLUMN IF NOT EXISTS is_idea boolean NOT NULL DEFAULT false;
-- Safety: ensure no story is simultaneously an idea and published
UPDATE stories SET is_published = false WHERE is_idea = true;
