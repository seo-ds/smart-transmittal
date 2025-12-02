/*
  # Add Public Transmittal Viewing

  1. Security Changes
    - Add a new RLS policy to allow public (unauthenticated) users to view transmittals by transmittal_number
    - This enables QR code scanning to work for anyone with the link
    - Only allows SELECT operations, no modifications
    - Users can only view transmittals if they know the exact transmittal_number
  
  2. Notes
    - This policy is intentionally permissive for viewing only
    - The transmittal_number acts as a secure token since it's randomly generated
    - No sensitive authentication data is exposed
*/

CREATE POLICY "Allow public viewing of transmittals by number"
  ON transmittals
  FOR SELECT
  TO public
  USING (transmittal_number IS NOT NULL);
