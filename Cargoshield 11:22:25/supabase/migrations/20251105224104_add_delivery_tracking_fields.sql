/*
  # Add Delivery Tracking Fields
  
  1. New Columns
    - `transit_started_at` (timestamptz) - When driver begins pickup/transit
    - `arrival_at_delivery` (timestamptz) - When driver arrives at delivery location
    - `delivered_at` (timestamptz) - When delivery is completed
    - `delivery_latitude` (numeric) - GPS coordinates at delivery
    - `delivery_longitude` (numeric) - GPS coordinates at delivery
    - `delivery_accuracy` (numeric) - GPS accuracy at delivery
    - `delivery_photo` (text) - Base64 image or storage URL of delivery proof
    - `delivery_notes` (text) - Driver's notes about the delivery
    
  2. Status Constraint Update
    - Add 'verified' status (for identity verified at pickup)
    - Add 'at_delivery' status (for arrived at delivery location)
    - Updated statuses: pending, assigned, verified, at_pickup, in_transit, at_delivery, delivered, cancelled
    
  3. Notes
    - All new columns nullable (optional data)
    - Maintains backward compatibility with existing loads
*/

-- Add new tracking columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'loads' AND column_name = 'transit_started_at'
  ) THEN
    ALTER TABLE loads ADD COLUMN transit_started_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'loads' AND column_name = 'arrival_at_delivery'
  ) THEN
    ALTER TABLE loads ADD COLUMN arrival_at_delivery timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'loads' AND column_name = 'delivered_at'
  ) THEN
    ALTER TABLE loads ADD COLUMN delivered_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'loads' AND column_name = 'delivery_latitude'
  ) THEN
    ALTER TABLE loads ADD COLUMN delivery_latitude numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'loads' AND column_name = 'delivery_longitude'
  ) THEN
    ALTER TABLE loads ADD COLUMN delivery_longitude numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'loads' AND column_name = 'delivery_accuracy'
  ) THEN
    ALTER TABLE loads ADD COLUMN delivery_accuracy numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'loads' AND column_name = 'delivery_photo'
  ) THEN
    ALTER TABLE loads ADD COLUMN delivery_photo text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'loads' AND column_name = 'delivery_notes'
  ) THEN
    ALTER TABLE loads ADD COLUMN delivery_notes text;
  END IF;
END $$;

-- Drop old status constraint
ALTER TABLE loads DROP CONSTRAINT IF EXISTS loads_status_check;

-- Add updated status constraint with all statuses
ALTER TABLE loads ADD CONSTRAINT loads_status_check 
  CHECK (status IN ('pending', 'assigned', 'verified', 'at_pickup', 'in_transit', 'at_delivery', 'delivered', 'cancelled'));