-- Migration 017: Add RLS policies for the series table
-- The series table was created in 016 without RLS policies,
-- which silently blocks all INSERT/UPDATE/DELETE operations.

ALTER TABLE series ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'series' AND policyname = 'Allow all for authenticated'
    ) THEN
        CREATE POLICY "Allow all for authenticated" ON series
            FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Also allow anon role to read published series (for public SeriesView page)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'series' AND policyname = 'Allow anon read published'
    ) THEN
        CREATE POLICY "Allow anon read published" ON series
            FOR SELECT TO anon USING (is_published = true);
    END IF;
END $$;
