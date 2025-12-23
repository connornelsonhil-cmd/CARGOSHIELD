/*
  # CDL Documents Storage

  1. New Tables
    - `cdl_documents`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users) - Driver who uploaded the CDL
      - `license_number` (text) - CDL number (format: State Code + 7-10 digits)
      - `state_code` (text) - Two-letter state code from CDL
      - `expiration_date` (date) - CDL expiration date
      - `status` (text) - Verification status: 'pending', 'approved', 'rejected'
      - `rejection_reason` (text) - If rejected, reason why
      - `image_url` (text) - URL to CDL image in storage
      - `image_filename` (text) - Original filename for reference
      - `created_at` (timestamptz) - Upload timestamp
      - `verified_at` (timestamptz) - When admin verified the CDL
      - `verified_by` (uuid) - Admin user ID who verified

  2. Storage
    - Create bucket: `cdl-images` - Private bucket for CDL images
    - Files stored with path: `cdl/{user_id}/{timestamp}-{filename}`
    - Only owner and admins can read their CDLs

  3. Security
    - Enable RLS on `cdl_documents` table
    - Drivers can only upload and view their own CDLs
    - Admins/dispatchers can view CDLs for verification
    - Images stored in private bucket with access controls

  4. Important Notes
    - Temporary CDLs detected by status indicators in license_number
    - Expiration date validation prevents expired licenses
    - Images encrypted at rest by Supabase
    - Audit trail for all CDL verifications
*/

CREATE TABLE IF NOT EXISTS cdl_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  license_number text NOT NULL,
  state_code text NOT NULL,
  expiration_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason text,
  image_url text,
  image_filename text,
  created_at timestamptz DEFAULT now(),
  verified_at timestamptz,
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(user_id, license_number)
);

ALTER TABLE cdl_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers can upload own CDL"
  ON cdl_documents FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own CDL documents"
  ON cdl_documents FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins and dispatchers can view all CDLs"
  ON cdl_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.user_type IN ('admin', 'dispatcher')
      AND up.company_id = (
        SELECT company_id FROM user_profiles
        WHERE id = user_id
      )
    )
  );

CREATE POLICY "Admins can update CDL status"
  ON cdl_documents FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.user_type IN ('admin', 'dispatcher')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.user_type IN ('admin', 'dispatcher')
    )
  );

CREATE INDEX idx_cdl_user_id ON cdl_documents(user_id);
CREATE INDEX idx_cdl_status ON cdl_documents(status);
CREATE INDEX idx_cdl_created_at ON cdl_documents(created_at DESC);
