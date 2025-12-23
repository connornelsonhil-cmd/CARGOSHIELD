/*
  # Allow Public Access to Companies for Sign-up

  1. Changes
    - Drop existing authenticated-only policy
    - Add new policy allowing anonymous users to view companies
    - This enables users to see company options during sign-up before authentication

  2. Security
    - Read-only access for all users (authenticated and anonymous)
    - Users still cannot modify company data
    - Only viewing is permitted
*/

DROP POLICY IF EXISTS "Authenticated users can view all companies" ON companies;

CREATE POLICY "Anyone can view companies"
  ON companies FOR SELECT
  USING (true);
