/*
  # Add name and phone fields to invites table

  1. Changes
    - Add `name` column to store driver's full name
    - Add `phone` column to store driver's phone number
    
  2. Important Notes
    - These fields allow dispatchers to collect driver information upfront
    - Makes the invitation process more complete
    - Data will be used to pre-fill profile during sign-up
*/

-- Add name column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invites' AND column_name = 'name'
  ) THEN
    ALTER TABLE invites ADD COLUMN name text;
  END IF;
END $$;

-- Add phone column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invites' AND column_name = 'phone'
  ) THEN
    ALTER TABLE invites ADD COLUMN phone text;
  END IF;
END $$;
