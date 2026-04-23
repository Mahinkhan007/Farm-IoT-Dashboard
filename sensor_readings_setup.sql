-- ============================================================
-- sensor_readings table — MMU Smart Farm (Batang Kali ESP32s)
-- Run this in your NEW Supabase project → SQL Editor
-- ============================================================

-- ── 1. Create the table ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sensor_readings (
  id          BIGSERIAL PRIMARY KEY,
  esp_id      TEXT NOT NULL,          -- 'esp-1' … 'esp-6'
  land_name   TEXT NOT NULL,          -- 'Batang Kali' | 'Saba' | 'MMU Vanilla Plantation'
  zone        TEXT,                   -- 'Zone A' … 'Zone F'
  soil_1      NUMERIC,
  soil_2      NUMERIC,
  soil_3      NUMERIC,
  soil_4      NUMERIC,
  temp_1      NUMERIC,
  hum_1       NUMERIC,
  temp_2      NUMERIC,
  hum_2       NUMERIC,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. Enable RLS ─────────────────────────────────────────
ALTER TABLE public.sensor_readings ENABLE ROW LEVEL SECURITY;

-- ── 3. ESP32 devices (anon key) can INSERT ────────────────
CREATE POLICY "esp32 anon insert"
ON public.sensor_readings FOR INSERT
TO anon
WITH CHECK (true);

-- ── 4. Admin reads ALL sensor data ────────────────────────
CREATE POLICY "admin reads all sensor readings"
ON public.sensor_readings FOR SELECT
TO authenticated
USING (public.get_my_role() = 'admin');

-- ── 5. Farmers read only their assigned lands ─────────────
CREATE POLICY "farmers read assigned land readings"
ON public.sensor_readings FOR SELECT
TO authenticated
USING (
  land_name = ANY (
    SELECT unnest(assigned_lands)
    FROM public.profiles
    WHERE id = auth.uid()
  )
);

-- ── 6. Index for fast latest-per-esp queries ──────────────
CREATE INDEX IF NOT EXISTS idx_sensor_readings_esp_land
  ON public.sensor_readings (esp_id, land_name, created_at DESC);

-- ── 7. Verify setup ───────────────────────────────────────
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'sensor_readings';
