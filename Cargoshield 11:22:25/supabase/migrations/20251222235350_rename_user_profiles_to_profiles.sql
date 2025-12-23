/*
  # Rename user_profiles to profiles and user_type to role

  1. Changes
    - Rename `user_profiles` table to `profiles`
    - Rename `user_type` column to `role`
    - Update all RLS policies to reference new table name
    
  2. Important Notes
    - This fixes the frontend/backend mismatch where code expects 'profiles' table with 'role' column
    - All existing data is preserved
    - Foreign key constraints are automatically updated
    - RLS policies need to be recreated with new table name
*/

-- First, drop existing policies (they reference the old table name)
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins and dispatchers can view company profiles" ON user_profiles;

-- Rename the table
ALTER TABLE IF EXISTS user_profiles RENAME TO profiles;

-- Rename the column
ALTER TABLE profiles RENAME COLUMN user_type TO role;

-- Recreate RLS policies with new table name
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Admins and dispatchers can view company profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles up
      WHERE up.id = auth.uid()
      AND up.company_id = profiles.company_id
      AND up.role IN ('admin', 'dispatcher')
    )
  );
