ALTER TABLE media ADD COLUMN IF NOT EXISTS story_id text references stories(id) on delete cascade;
ALTER TABLE media ADD COLUMN IF NOT EXISTS type text; -- 'image' | 'video'
CREATE INDEX IF NOT EXISTS idx_media_story_id ON media(story_id);

ALTER TABLE media ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'media' AND policyname = 'Allow all for authenticated'
    ) THEN
        CREATE POLICY "Allow all for authenticated" ON media
            FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
END $$;
