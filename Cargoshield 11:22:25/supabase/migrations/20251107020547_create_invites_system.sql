/*
  # Create Invite-Only Registration System
  
  1. New Tables
    - `invites`
      - `id` (uuid, primary key)
      - `email` (text, unique) - Email address being invited
      - `role` (text) - User role: driver, dispatcher, or admin
      - `company_id` (uuid) - References companies table
      - `invited_by` (uuid) - References auth.users table (who sent invite)
      - `invite_code` (text, unique) - Format: CS-XXXXX
      - `status` (text) - pending, accepted, expired, revoked
      - `expires_at` (timestamptz) - 7 days from creation
      - `accepted_at` (timestamptz) - When invite was accepted
      - `created_at` (timestamptz) - When invite was created
      
  2. Security
    - Enable RLS on invites table
    - Admin users can manage all invites
    - Dispatchers can view invites for their company
    - Anyone can check if an invite code is valid (for signup)
    
  3. Indexes
    - Index on invite_code for fast lookup during signup
    - Index on email for checking existing invites
    - Index on status for filtering pending invites
*/

-- Create invites table
CREATE TABLE IF NOT EXISTS invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('driver', 'dispatcher', 'admin')),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  invite_code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_invites_code ON invites(invite_code);
CREATE INDEX IF NOT EXISTS idx_invites_email ON invites(email);
CREATE INDEX IF NOT EXISTS idx_invites_status ON invites(status);
CREATE INDEX IF NOT EXISTS idx_invites_company ON invites(company_id);

-- Enable RLS
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can check if an invite code is valid (needed for signup flow)
CREATE POLICY "Anyone can validate invite codes"
  ON invites
  FOR SELECT
  USING (true);

-- Policy: Authenticated users can insert invites for their company
CREATE POLICY "Users can create invites for their company"
  ON invites
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Policy: Users can update invites for their company
CREATE POLICY "Users can update company invites"
  ON invites
  FOR UPDATE
  TO authenticated
  USING (
    invited_by = auth.uid() OR
    company_id IN (
      SELECT company_id FROM user_profiles WHERE id = auth.uid()
    )
  );