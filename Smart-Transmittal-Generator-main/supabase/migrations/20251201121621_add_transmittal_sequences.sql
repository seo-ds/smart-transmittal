/*
  # Add Transmittal Sequence Tracking

  1. New Tables
    - `transmittal_sequences`
      - `id` (uuid, primary key) - Unique identifier for the sequence record
      - `user_id` (uuid, foreign key) - References the user who owns this sequence
      - `year` (integer) - The year for this sequence (e.g., 2025)
      - `current_sequence` (integer) - The last used sequence number for the year
      - `user_code` (text) - A unique 3-letter code identifying the user (e.g., MWD for Mary Wendy)
      - `created_at` (timestamptz) - When the sequence was created
      - `updated_at` (timestamptz) - When the sequence was last updated

  2. Security
    - Enable RLS on `transmittal_sequences` table
    - Add policy for users to read their own sequence data
    - Add policy for users to insert their own sequence data
    - Add policy for users to update their own sequence data

  3. Indexes
    - Add unique index on (user_id, year) to ensure one sequence per user per year
    - Add index on year for efficient lookups

  4. Notes
    - The user_code will be generated from the user's name initials
    - Sequences reset automatically each year since they're tracked per year
    - The transmittal number format will be: TR-FP-YYYYMMDD-XXXX-UUU
      where XXXX is the 4-digit sequence and UUU is the user code
*/

CREATE TABLE IF NOT EXISTS transmittal_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  year integer NOT NULL,
  current_sequence integer NOT NULL DEFAULT 0,
  user_code text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_user_year UNIQUE (user_id, year)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_transmittal_sequences_user_year ON transmittal_sequences(user_id, year);
CREATE INDEX IF NOT EXISTS idx_transmittal_sequences_year ON transmittal_sequences(year);

-- Enable RLS
ALTER TABLE transmittal_sequences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read own sequences"
  ON transmittal_sequences
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sequences"
  ON transmittal_sequences
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sequences"
  ON transmittal_sequences
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_transmittal_sequences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS set_transmittal_sequences_updated_at ON transmittal_sequences;
CREATE TRIGGER set_transmittal_sequences_updated_at
  BEFORE UPDATE ON transmittal_sequences
  FOR EACH ROW
  EXECUTE FUNCTION update_transmittal_sequences_updated_at();
