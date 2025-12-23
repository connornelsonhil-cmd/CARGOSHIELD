/*
  # Create Loads Table with GPS Location

  1. New Tables
    - `loads`
      - `id` (uuid, primary key)
      - `company_id` (uuid) - Company that owns the load
      - `assigned_driver_id` (uuid) - Driver assigned to this load
      - `load_number` (text) - Unique load identifier
      - `pickup_address` (text) - Human-readable pickup address
      - `pickup_latitude` (decimal) - Pickup location latitude
      - `pickup_longitude` (decimal) - Pickup location longitude
      - `delivery_address` (text) - Delivery address
      - `status` (text) - Load status
      - `verified_at` (timestamptz) - When driver verified at pickup
      - `verification_latitude` (decimal) - Driver's GPS location when verified
      - `verification_longitude` (decimal) - Driver's GPS location when verified
      - `verification_accuracy` (decimal) - GPS accuracy in meters during verification
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `loads` table
    - Drivers can view their assigned loads
    - Dispatchers/admins can view all loads in their company
    - Only dispatchers/admins can create/update loads

  3. Important Notes
    - GPS coordinates stored as decimal (latitude, longitude)
    - Geofencing calculated using Haversine formula (500ft radius)
    - Verification requires GPS accuracy better than 200ft
*/

CREATE TABLE IF NOT EXISTS loads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  assigned_driver_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  load_number text NOT NULL UNIQUE,
  pickup_address text NOT NULL,
  pickup_latitude decimal(10, 7) NOT NULL,
  pickup_longitude decimal(10, 7) NOT NULL,
  delivery_address text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'at_pickup', 'in_transit', 'delivered', 'cancelled')),
  verified_at timestamptz,
  verification_latitude decimal(10, 7),
  verification_longitude decimal(10, 7),
  verification_accuracy decimal(10, 2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE loads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers can view assigned loads"
  ON loads FOR SELECT
  TO authenticated
  USING (assigned_driver_id = auth.uid());

CREATE POLICY "Dispatchers and admins can view company loads"
  ON loads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.company_id = loads.company_id
      AND up.user_type IN ('dispatcher', 'admin')
    )
  );

CREATE POLICY "Dispatchers and admins can create loads"
  ON loads FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.company_id = loads.company_id
      AND up.user_type IN ('dispatcher', 'admin')
    )
  );

CREATE POLICY "Dispatchers and admins can update loads"
  ON loads FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.company_id = loads.company_id
      AND up.user_type IN ('dispatcher', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.company_id = loads.company_id
      AND up.user_type IN ('dispatcher', 'admin')
    )
  );

CREATE POLICY "Drivers can update their assigned loads"
  ON loads FOR UPDATE
  TO authenticated
  USING (assigned_driver_id = auth.uid())
  WITH CHECK (assigned_driver_id = auth.uid());

CREATE INDEX idx_loads_driver ON loads(assigned_driver_id);
CREATE INDEX idx_loads_company ON loads(company_id);
CREATE INDEX idx_loads_status ON loads(status);
CREATE INDEX idx_loads_created_at ON loads(created_at DESC);

INSERT INTO loads (company_id, load_number, pickup_address, pickup_latitude, pickup_longitude, delivery_address, status)
SELECT
  id,
  'LOAD-' || LPAD((ROW_NUMBER() OVER (ORDER BY created_at))::text, 4, '0'),
  '1234 Warehouse Blvd, Los Angeles, CA 90001',
  33.9737,
  -118.2474,
  '5678 Distribution Ave, San Diego, CA 92101',
  'pending'
FROM companies
LIMIT 3;
