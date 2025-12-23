/*
  # Cargo Shield - User Authentication and Company Management

  1. New Tables
    - `companies`
      - `id` (uuid, primary key)
      - `name` (text) - Company name
      - `created_at` (timestamptz) - Record creation timestamp
    
    - `user_profiles`
      - `id` (uuid, primary key, references auth.users)
      - `phone` (text, unique) - User phone number
      - `name` (text) - Full name
      - `email` (text) - Email address
      - `company_id` (uuid, references companies) - Associated company
      - `user_type` (text) - User role: 'driver', 'dispatcher', or 'admin'
      - `created_at` (timestamptz) - Profile creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on both tables
    - Companies:
      - Users can view companies they belong to
    - User Profiles:
      - Users can read their own profile
      - Users can update their own profile
      - Admins and dispatchers can view profiles in their company

  3. Important Notes
    - Phone numbers are stored for OTP authentication
    - User types determine access levels in the application
    - Companies table allows multi-tenant architecture
    - All timestamps use UTC timezone
*/

-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone text UNIQUE NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  user_type text NOT NULL CHECK (user_type IN ('driver', 'dispatcher', 'admin')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Companies policies
CREATE POLICY "Users can view their company"
  ON companies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.company_id = companies.id
      AND user_profiles.id = auth.uid()
    )
  );

-- User profiles policies
CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Admins and dispatchers can view company profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.company_id = user_profiles.company_id
      AND up.user_type IN ('admin', 'dispatcher')
    )
  );

-- Insert sample companies
INSERT INTO companies (name) VALUES 
  ('Demo Logistics LLC'),
  ('Swift Transport Co'),
  ('Pacific Freight Lines')
ON CONFLICT DO NOTHING;
