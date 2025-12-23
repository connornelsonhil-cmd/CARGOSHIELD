/*
  # Add Face Encoding to CDL Documents

  1. Changes
    - Add `face_image_url` column to store driver's onboarding face photo
    - Add `face_encoding` column to store facial features (for future use)

  2. Important Notes
    - Face image captured during CDL upload
    - Used for verification at pickup locations
    - Stored securely in Supabase storage
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cdl_documents' AND column_name = 'face_image_url'
  ) THEN
    ALTER TABLE cdl_documents ADD COLUMN face_image_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cdl_documents' AND column_name = 'face_encoding'
  ) THEN
    ALTER TABLE cdl_documents ADD COLUMN face_encoding text;
  END IF;
END $$;
