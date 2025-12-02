/*
  # Initial Schema for Smart Transmittal Generator

  ## Overview
  Creates the complete database schema for a multi-tenant transmittal management system with cloud sync, templates, and document tracking.

  ## New Tables

  ### 1. `profiles`
  User profile information linked to Supabase auth

  ### 2. `companies`
  Company branding and configuration

  ### 3. `company_members`
  Multi-user company access

  ### 4. `templates`
  Reusable transmittal templates

  ### 5. `transmittals`
  Complete transmittal records

  ### 6. `transmittal_history`
  Audit trail for transmittal changes

  ## Security
  - Row Level Security (RLS) enabled on all tables
  - Users can only access their own data or company data they belong to
  - Company members can access company transmittals based on their role

  ## Important Notes
  1. All tables use `gen_random_uuid()` for primary keys
  2. Timestamps use `now()` for defaults
  3. RLS policies enforce data isolation
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  logo_url text,
  contact_details text,
  color_scheme jsonb DEFAULT '{"primary": "#3B82F6", "secondary": "#1E40AF"}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Create company_members table (before companies policies that reference it)
CREATE TABLE IF NOT EXISTS company_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role text DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, user_id)
);

ALTER TABLE company_members ENABLE ROW LEVEL SECURITY;

-- Now create companies policies
CREATE POLICY "Users can read own companies"
  ON companies FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM company_members
      WHERE company_members.company_id = companies.id
      AND company_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create companies"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Company owners can update"
  ON companies FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Company owners can delete"
  ON companies FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- Create company_members policies
CREATE POLICY "Company members can read memberships"
  ON company_members FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = company_members.company_id
      AND companies.owner_id = auth.uid()
    )
  );

CREATE POLICY "Company owners can manage members"
  ON company_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = company_members.company_id
      AND companies.owner_id = auth.uid()
    )
  );

CREATE POLICY "Company owners can update members"
  ON company_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = company_members.company_id
      AND companies.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = company_members.company_id
      AND companies.owner_id = auth.uid()
    )
  );

CREATE POLICY "Company owners can delete members"
  ON company_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = company_members.company_id
      AND companies.owner_id = auth.uid()
    )
  );

-- Create templates table
CREATE TABLE IF NOT EXISTS templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  department text,
  recipient_company text,
  recipient_name text,
  recipient_address text,
  attention_to text,
  contact_no text,
  purpose text,
  template_data jsonb DEFAULT '{}'::jsonb,
  is_shared boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own templates"
  ON templates FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    (is_shared = true AND company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    ))
  );

CREATE POLICY "Users can create templates"
  ON templates FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own templates"
  ON templates FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own templates"
  ON templates FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create transmittals table
CREATE TABLE IF NOT EXISTS transmittals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  transmittal_number text UNIQUE NOT NULL,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'received', 'pending')),
  sender text,
  sender_email text,
  sender_contact_number text,
  sender_contact_details text,
  department text,
  recipient_name text,
  recipient_company text,
  recipient_address text,
  attention_to text,
  contact_no text,
  project_name text,
  project_number text,
  purpose text,
  date date,
  time_generated text,
  prepared_by text,
  noted_by text,
  prepared_by_signature text,
  noted_by_signature text,
  logo_base64 text,
  qr_code_data text,
  items jsonb DEFAULT '[]'::jsonb,
  columns jsonb DEFAULT '[]'::jsonb,
  notes text,
  follow_up_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE transmittals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own transmittals"
  ON transmittals FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    (company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    ))
  );

CREATE POLICY "Users can create transmittals"
  ON transmittals FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own transmittals"
  ON transmittals FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() OR
    (company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'member')
    ))
  )
  WITH CHECK (
    user_id = auth.uid() OR
    (company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'member')
    ))
  );

CREATE POLICY "Users can delete own transmittals"
  ON transmittals FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create transmittal_history table
CREATE TABLE IF NOT EXISTS transmittal_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transmittal_id uuid REFERENCES transmittals(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  previous_status text,
  new_status text,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE transmittal_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read transmittal history"
  ON transmittal_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM transmittals
      WHERE transmittals.id = transmittal_history.transmittal_id
      AND (
        transmittals.user_id = auth.uid() OR
        transmittals.company_id IN (
          SELECT company_id FROM company_members WHERE user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can create transmittal history"
  ON transmittal_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM transmittals
      WHERE transmittals.id = transmittal_history.transmittal_id
      AND (
        transmittals.user_id = auth.uid() OR
        transmittals.company_id IN (
          SELECT company_id FROM company_members WHERE user_id = auth.uid()
        )
      )
    )
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_transmittals_user_id ON transmittals(user_id);
CREATE INDEX IF NOT EXISTS idx_transmittals_company_id ON transmittals(company_id);
CREATE INDEX IF NOT EXISTS idx_transmittals_status ON transmittals(status);
CREATE INDEX IF NOT EXISTS idx_transmittals_date ON transmittals(date);
CREATE INDEX IF NOT EXISTS idx_transmittals_number ON transmittals(transmittal_number);
CREATE INDEX IF NOT EXISTS idx_templates_user_id ON templates(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_company_id ON templates(company_id);
CREATE INDEX IF NOT EXISTS idx_company_members_user_id ON company_members(user_id);
CREATE INDEX IF NOT EXISTS idx_company_members_company_id ON company_members(company_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transmittals_updated_at BEFORE UPDATE ON transmittals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
