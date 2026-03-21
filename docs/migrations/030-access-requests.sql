-- Migration 030: Access request form submissions

CREATE TABLE IF NOT EXISTS access_requests (
  id           bigint generated always as identity primary key,
  name         text not null,
  email        text not null,
  organisation text,
  role         text,
  how_heard    text,
  message      text,
  status       text default 'pending',
  created_at   timestamptz default now()
);

ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;

-- Unauthenticated visitors can submit requests
CREATE POLICY "Public can insert access requests"
  ON access_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only admins can read requests
CREATE POLICY "Admins can read access requests"
  ON access_requests FOR SELECT
  USING (is_admin());
