-- Migration 026: Clean up categories
-- Removes Base44 test categories, inserts the four correct ones,
-- and nulls out story categories that no longer exist.

-- 1. Clear the categories table
DELETE FROM categories;

-- 2. Insert the four correct categories
INSERT INTO categories (id, name, color) VALUES
    ('featured',             'featured',             'bg-amber-100 text-amber-800'),
    ('unicef',               'unicef',               'bg-blue-100 text-blue-800'),
    ('european-commission',  'european commission',  'bg-indigo-100 text-indigo-800'),
    ('wash',                 'wash',                 'bg-green-100 text-green-800');

-- 3. Null out any story category that isn't one of the four keepers
UPDATE stories
SET category = NULL
WHERE category IS NOT NULL
  AND category NOT IN ('featured', 'unicef', 'european commission', 'wash');
