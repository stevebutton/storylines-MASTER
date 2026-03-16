-- Footer: replace single footer_content with three editable columns
ALTER TABLE homepage ADD COLUMN IF NOT EXISTS footer_col1 text DEFAULT '';
ALTER TABLE homepage ADD COLUMN IF NOT EXISTS footer_col2 text DEFAULT '';
ALTER TABLE homepage ADD COLUMN IF NOT EXISTS footer_col3 text DEFAULT '';
