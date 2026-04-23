-- ============================================================
-- MMU Smart Farm — Supabase Schema Updates
-- Run these in Supabase Studio → SQL Editor
-- ============================================================

-- ── 1. Add assigned_lands column to profiles ───────────────
-- Stores which land(s) a farmer can access (array of land names)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS assigned_lands TEXT[] DEFAULT '{}';

-- ── 2. Sensor Readings Table ───────────────────────────────
-- For future ESP32 edge function data ingestion
CREATE TABLE IF NOT EXISTS public.sensor_readings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  land_name     TEXT NOT NULL,
  esp32_node_id INT  NOT NULL,
  zone          TEXT,
  humidity_1    FLOAT,
  humidity_2    FLOAT,
  soil_moisture_1 FLOAT,
  soil_moisture_2 FLOAT,
  soil_moisture_3 FLOAT,
  node_status   TEXT DEFAULT 'Online', -- Online | Offline | Warning | Alert
  recorded_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.sensor_readings ENABLE ROW LEVEL SECURITY;

-- Admin can read ALL sensor readings across all lands
CREATE POLICY "admin reads all sensor readings"
ON public.sensor_readings FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Farmers can only read sensor readings for their assigned lands
CREATE POLICY "farmers read assigned land sensor readings"
ON public.sensor_readings FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND land_name = ANY(assigned_lands)
  )
);

-- Edge function (service role) can insert readings
CREATE POLICY "service role can insert sensor readings"
ON public.sensor_readings FOR INSERT
TO service_role
WITH CHECK (TRUE);

-- ── 3. Update profiles RLS for assigned_lands ──────────────
-- Admins can update any profile (to assign lands to farmers)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'profiles'
      AND policyname = 'admin can update profiles'
  ) THEN
    CREATE POLICY "admin can update profiles"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
      )
    );
  END IF;
END $$;

-- ── 4. Example: Assign lands to a farmer ──────────────────
-- Run this to give a farmer access to specific lands:
--   UPDATE public.profiles
--   SET assigned_lands = ARRAY['Batang Kali', 'Saba']
--   WHERE email = 'farmer@example.com';
--
-- Available land names:
--   'Batang Kali'
--   'Saba'
--   'MMU Vanilla Plantation'

-- ── 5. Confirm admin setup ────────────────────────────────
-- Make sure the admin account has the correct role:
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'mmusmartagri@gmail.com';

-- ── 6. Verify ─────────────────────────────────────────────
SELECT id, email, role, assigned_lands FROM public.profiles;
