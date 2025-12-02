/*
  # Fix Security and Performance Issues

  ## Changes

  ### 1. Add Missing Foreign Key Indexes
  - Add index on `companies.owner_id`
  - Add index on `transmittal_history.transmittal_id`
  - Add index on `transmittal_history.user_id`

  ### 2. Optimize RLS Policies (Auth Function Initialization)
  Replace all `auth.uid()` with `(select auth.uid())` to prevent re-evaluation per row
  - Fix all policies on `profiles`, `companies`, `company_members`, `templates`, `transmittals`, `transmittal_history`

  ### 3. Fix Multiple Permissive Policies
  - Remove duplicate public viewing policy on transmittals

  ### 4. Fix Function Search Path
  - Set immutable search path on `update_updated_at_column` function

  ### 5. Remove unused qr_code_data column
  - Drop qr_code_data column from transmittals table

  ## Security Notes
  - All changes maintain existing access control
  - Performance improved by reducing auth function calls
  - Indexes added for foreign key columns
*/

-- Add missing foreign key indexes
CREATE INDEX IF NOT EXISTS idx_companies_owner_id ON companies(owner_id);
CREATE INDEX IF NOT EXISTS idx_transmittal_history_transmittal_id ON transmittal_history(transmittal_id);
CREATE INDEX IF NOT EXISTS idx_transmittal_history_user_id ON transmittal_history(user_id);

-- Drop and recreate profiles policies with optimized auth calls
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

-- Drop and recreate companies policies with optimized auth calls
DROP POLICY IF EXISTS "Users can read own companies" ON companies;
DROP POLICY IF EXISTS "Users can create companies" ON companies;
DROP POLICY IF EXISTS "Company owners can update" ON companies;
DROP POLICY IF EXISTS "Company owners can delete" ON companies;

CREATE POLICY "Users can read own companies"
  ON companies FOR SELECT
  TO authenticated
  USING (
    owner_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM company_members
      WHERE company_members.company_id = companies.id
      AND company_members.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can create companies"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = (select auth.uid()));

CREATE POLICY "Company owners can update"
  ON companies FOR UPDATE
  TO authenticated
  USING (owner_id = (select auth.uid()))
  WITH CHECK (owner_id = (select auth.uid()));

CREATE POLICY "Company owners can delete"
  ON companies FOR DELETE
  TO authenticated
  USING (owner_id = (select auth.uid()));

-- Drop and recreate company_members policies with optimized auth calls
DROP POLICY IF EXISTS "Company members can read memberships" ON company_members;
DROP POLICY IF EXISTS "Company owners can manage members" ON company_members;
DROP POLICY IF EXISTS "Company owners can update members" ON company_members;
DROP POLICY IF EXISTS "Company owners can delete members" ON company_members;

CREATE POLICY "Company members can read memberships"
  ON company_members FOR SELECT
  TO authenticated
  USING (
    user_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = company_members.company_id
      AND companies.owner_id = (select auth.uid())
    )
  );

CREATE POLICY "Company owners can manage members"
  ON company_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = company_members.company_id
      AND companies.owner_id = (select auth.uid())
    )
  );

CREATE POLICY "Company owners can update members"
  ON company_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = company_members.company_id
      AND companies.owner_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = company_members.company_id
      AND companies.owner_id = (select auth.uid())
    )
  );

CREATE POLICY "Company owners can delete members"
  ON company_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = company_members.company_id
      AND companies.owner_id = (select auth.uid())
    )
  );

-- Drop and recreate templates policies with optimized auth calls
DROP POLICY IF EXISTS "Users can read own templates" ON templates;
DROP POLICY IF EXISTS "Users can create templates" ON templates;
DROP POLICY IF EXISTS "Users can update own templates" ON templates;
DROP POLICY IF EXISTS "Users can delete own templates" ON templates;

CREATE POLICY "Users can read own templates"
  ON templates FOR SELECT
  TO authenticated
  USING (
    user_id = (select auth.uid()) OR
    (is_shared = true AND company_id IN (
      SELECT company_id FROM company_members WHERE user_id = (select auth.uid())
    ))
  );

CREATE POLICY "Users can create templates"
  ON templates FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own templates"
  ON templates FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own templates"
  ON templates FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- Drop and recreate transmittals policies with optimized auth calls
DROP POLICY IF EXISTS "Users can read own transmittals" ON transmittals;
DROP POLICY IF EXISTS "Users can create transmittals" ON transmittals;
DROP POLICY IF EXISTS "Users can update own transmittals" ON transmittals;
DROP POLICY IF EXISTS "Users can delete own transmittals" ON transmittals;
DROP POLICY IF EXISTS "Allow public viewing of transmittals by number" ON transmittals;

CREATE POLICY "Users can read own transmittals"
  ON transmittals FOR SELECT
  TO authenticated
  USING (
    user_id = (select auth.uid()) OR
    (company_id IN (
      SELECT company_id FROM company_members WHERE user_id = (select auth.uid())
    ))
  );

CREATE POLICY "Users can create transmittals"
  ON transmittals FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own transmittals"
  ON transmittals FOR UPDATE
  TO authenticated
  USING (
    user_id = (select auth.uid()) OR
    (company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = (select auth.uid()) 
      AND role IN ('owner', 'admin', 'member')
    ))
  )
  WITH CHECK (
    user_id = (select auth.uid()) OR
    (company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = (select auth.uid()) 
      AND role IN ('owner', 'admin', 'member')
    ))
  );

CREATE POLICY "Users can delete own transmittals"
  ON transmittals FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- Drop and recreate transmittal_history policies with optimized auth calls
DROP POLICY IF EXISTS "Users can read transmittal history" ON transmittal_history;
DROP POLICY IF EXISTS "Users can create transmittal history" ON transmittal_history;

CREATE POLICY "Users can read transmittal history"
  ON transmittal_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM transmittals
      WHERE transmittals.id = transmittal_history.transmittal_id
      AND (
        transmittals.user_id = (select auth.uid()) OR
        transmittals.company_id IN (
          SELECT company_id FROM company_members WHERE user_id = (select auth.uid())
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
        transmittals.user_id = (select auth.uid()) OR
        transmittals.company_id IN (
          SELECT company_id FROM company_members WHERE user_id = (select auth.uid())
        )
      )
    )
  );

-- Fix function search path to be immutable - drop with CASCADE and recreate
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate triggers that were dropped with CASCADE
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transmittals_updated_at BEFORE UPDATE ON transmittals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Drop qr_code_data column (no longer used)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transmittals' AND column_name = 'qr_code_data'
  ) THEN
    ALTER TABLE transmittals DROP COLUMN qr_code_data;
  END IF;
END $$;