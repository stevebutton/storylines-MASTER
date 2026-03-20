-- Migration 025: Profiles table, trigger, and authenticated read policies
-- Run this in the Supabase SQL editor

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id        uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email     text NOT NULL,
  full_name text,
  role      text NOT NULL DEFAULT 'viewer'
            CHECK (role IN ('admin', 'user', 'viewer')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Helper to check admin role (avoids recursive RLS)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
$$ LANGUAGE sql SECURITY DEFINER;

-- Users can read own profile; admins can read all
CREATE POLICY "profiles_read" ON profiles FOR SELECT
  USING (auth.uid() = id OR is_admin());

-- Admins can update any profile (for role changes)
CREATE POLICY "profiles_admin_update" ON profiles FOR UPDATE
  USING (is_admin());

-- Trigger: auto-create profile on new auth user
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->>'role', 'viewer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- Allow authenticated users to read ALL stories (not just published)
-- This enables Viewers to browse drafts, and Users to edit any story
CREATE POLICY "stories_authenticated_read_all" ON stories
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "chapters_authenticated_read_all" ON chapters
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "slides_authenticated_read_all" ON slides
  FOR SELECT TO authenticated USING (true);

-- Admin setup (one-time manual step):
-- 1. Supabase dashboard → Authentication → Users → Invite user (enter your email)
-- 2. Accept invite, set password
-- 3. In SQL editor: UPDATE profiles SET role = 'admin' WHERE email = 'your@email.com';
