/*
  # Create Verification Events Table

  1. New Tables
    - `verification_events`
      - `id` (uuid, primary key)
      - `load_id` (uuid) - Reference to load being verified
      - `driver_id` (uuid) - Driver performing verification
      - `event_type` (text) - Type of verification (gps, face, cdl, etc)
      - `status` (text) - Verification status (pending, success, failed)
      - `confidence_score` (decimal) - Confidence score for face matching (0-100)
      - `verification_data` (jsonb) - Flexible field for additional verification data
      - `error_message` (text) - Error message if verification failed
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `verification_events` table
    - Drivers can insert and view their own verification events
    - Dispatchers/admins can view all events for their company's loads

  3. Important Notes
    - Face verification stores confidence score
    - GPS verification stores coordinates and accuracy
    - All verification attempts are logged for audit trail
*/

CREATE TABLE IF NOT EXISTS verification_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  load_id uuid NOT NULL REFERENCES loads(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('gps', 'face', 'cdl', 'full_verification')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  confidence_score decimal(5, 2),
  verification_data jsonb DEFAULT '{}',
  error_message text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE verification_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers can insert own verification events"
  ON verification_events FOR INSERT
  TO authenticated
  WITH CHECK (driver_id = auth.uid());

CREATE POLICY "Drivers can view own verification events"
  ON verification_events FOR SELECT
  TO authenticated
  USING (driver_id = auth.uid());

CREATE POLICY "Dispatchers can view company verification events"
  ON verification_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN loads l ON l.company_id = up.company_id
      WHERE up.id = auth.uid()
      AND l.id = verification_events.load_id
      AND up.user_type IN ('dispatcher', 'admin')
    )
  );

CREATE INDEX idx_verification_events_load ON verification_events(load_id);
CREATE INDEX idx_verification_events_driver ON verification_events(driver_id);
CREATE INDEX idx_verification_events_type ON verification_events(event_type);
CREATE INDEX idx_verification_events_created ON verification_events(created_at DESC);
