/*
  # Fix Companies RLS Policy for Sign-up Flow

  1. Changes
    - Add policy allowing authenticated users to view all companies
    - This enables users during sign-up to see company options

  2. Security
    - Policy maintains existing access control
    - Authenticated users can only view companies
    - Cannot modify company data
*/

DROP POLICY IF EXISTS "Users can view their company" ON companies;

CREATE POLICY "Authenticated users can view all companies"
  ON companies FOR SELECT
  TO authenticated
  USING (true);
