/*
  # Add Company Management Fields
  
  1. Changes to companies table
    - Add `company_type` (text) - carrier, broker, or shipper
    - Add `mc_number` (text) - Motor Carrier number
    - Add `dot_number` (text) - DOT number
    - Add `contact_email` (text) - Company contact email
    - Add `contact_phone` (text) - Company contact phone
    - Add `address` (text) - Company address
    - Add `status` (text) - active, suspended, or inactive (default: active)
    - Add `updated_at` (timestamptz) - Last update timestamp
    
  2. Notes
    - All new fields are nullable for backward compatibility
    - Status defaults to 'active' for existing companies
    - MC and DOT numbers are optional (not all companies need them)
*/

-- Add new columns to companies table
DO $$
BEGIN
  -- Add company_type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'companies' AND column_name = 'company_type'
  ) THEN
    ALTER TABLE companies ADD COLUMN company_type text CHECK (company_type IN ('carrier', 'broker', 'shipper'));
  END IF;

  -- Add mc_number
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'companies' AND column_name = 'mc_number'
  ) THEN
    ALTER TABLE companies ADD COLUMN mc_number text;
  END IF;

  -- Add dot_number
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'companies' AND column_name = 'dot_number'
  ) THEN
    ALTER TABLE companies ADD COLUMN dot_number text;
  END IF;

  -- Add contact_email
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'companies' AND column_name = 'contact_email'
  ) THEN
    ALTER TABLE companies ADD COLUMN contact_email text;
  END IF;

  -- Add contact_phone
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'companies' AND column_name = 'contact_phone'
  ) THEN
    ALTER TABLE companies ADD COLUMN contact_phone text;
  END IF;

  -- Add address
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'companies' AND column_name = 'address'
  ) THEN
    ALTER TABLE companies ADD COLUMN address text;
  END IF;

  -- Add status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'companies' AND column_name = 'status'
  ) THEN
    ALTER TABLE companies ADD COLUMN status text DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive'));
  END IF;

  -- Add updated_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'companies' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE companies ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Update existing companies to have active status
UPDATE companies SET status = 'active' WHERE status IS NULL;

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);