-- ── Enums ────────────────────────────────────────────────────────────────────

CREATE TYPE deal_stage AS ENUM (
  'pre-seed', 'seed', 'series-a', 'series-b', 'series-c', 'growth'
);

CREATE TYPE deal_status AS ENUM ('active', 'passed', 'diligence');

CREATE TYPE user_role AS ENUM ('admin', 'viewer');

-- ── Tables ────────────────────────────────────────────────────────────────────

CREATE TABLE deals (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT        NOT NULL,
  sector       TEXT        NOT NULL,
  stage        deal_stage  NOT NULL,
  geography    TEXT        NOT NULL,
  status       deal_status NOT NULL DEFAULT 'active',
  source       TEXT        NOT NULL DEFAULT 'Decile Hub',
  notes        TEXT,
  date_added   DATE        NOT NULL DEFAULT CURRENT_DATE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by   UUID        REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE weekly_summaries (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start         DATE        NOT NULL,
  week_end           DATE        NOT NULL,
  summary_text       TEXT        NOT NULL,
  deal_count         INTEGER     NOT NULL,
  top_sectors        JSONB       NOT NULL DEFAULT '{}',
  stage_distribution JSONB       NOT NULL DEFAULT '{}',
  generated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  generated_by       UUID        REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE profiles (
  id         UUID      PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT      NOT NULL,
  role       user_role NOT NULL DEFAULT 'viewer',
  full_name  TEXT      NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX idx_deals_date_added  ON deals(date_added);
CREATE INDEX idx_deals_sector      ON deals(sector);
CREATE INDEX idx_deals_stage       ON deals(stage);
CREATE INDEX idx_deals_status      ON deals(status);
CREATE INDEX idx_weekly_week_start ON weekly_summaries(week_start);

-- ── Row-Level Security ────────────────────────────────────────────────────────

ALTER TABLE deals            ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;

-- Deals
CREATE POLICY "authenticated_read_deals" ON deals
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin_insert_deals" ON deals
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "admin_update_deals" ON deals
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "admin_delete_deals" ON deals
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- Weekly summaries
CREATE POLICY "authenticated_read_summaries" ON weekly_summaries
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin_insert_summaries" ON weekly_summaries
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- Profiles
CREATE POLICY "read_own_profile" ON profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "admin_read_all_profiles" ON profiles
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "update_own_profile" ON profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- ── Auto-create profile on signup ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    'viewer',
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
