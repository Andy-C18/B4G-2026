-- ============================================================
-- B4G-2026 Patient-Side Healthcare App – Initial Schema
-- ============================================================

-- Profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role        TEXT NOT NULL CHECK (role IN ('patient', 'doctor')),
  full_name   TEXT NOT NULL,
  avatar_url  TEXT,
  specialty   TEXT,          -- for doctors
  bio         TEXT,
  phone       TEXT,
  date_of_birth DATE,
  gender      TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  blood_type  TEXT,
  allergies   TEXT[],
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Row-level security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Symptom Reports
CREATE TABLE IF NOT EXISTS symptom_reports (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id          UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  symptoms_text       TEXT NOT NULL,
  photo_urls          TEXT[],
  video_url           TEXT,
  follow_up_answers   JSONB,
  structured_report   JSONB NOT NULL,
  suggested_doctor_type TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE symptom_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports_owner" ON symptom_reports
  USING (auth.uid() = patient_id);
CREATE POLICY "reports_doctor_read" ON symptom_reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'doctor'
    )
  );

-- Appointments
CREATE TABLE IF NOT EXISTS appointments (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id        UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  doctor_id         UUID REFERENCES profiles(id),
  symptom_report_id UUID REFERENCES symptom_reports(id),
  status            TEXT NOT NULL DEFAULT 'requested'
                      CHECK (status IN ('requested','confirmed','done','cancelled')),
  notes             TEXT,
  requested_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at      TIMESTAMPTZ
);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "appts_patient" ON appointments
  USING (auth.uid() = patient_id);
CREATE POLICY "appts_doctor" ON appointments
  USING (auth.uid() = doctor_id);

-- Medical Records / Prescriptions
CREATE TABLE IF NOT EXISTS medical_records (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id        UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  appointment_id    UUID REFERENCES appointments(id),
  prescription_url  TEXT,
  prescription_data JSONB,
  diagnosis         TEXT,
  medications       JSONB,
  lab_results       JSONB,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "records_patient" ON medical_records
  USING (auth.uid() = patient_id);
CREATE POLICY "records_doctor_read" ON medical_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'doctor'
    )
  );

-- Doctor Ratings
CREATE TABLE IF NOT EXISTS doctor_ratings (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id  UUID REFERENCES appointments(id) ON DELETE CASCADE UNIQUE NOT NULL,
  patient_id      UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  doctor_id       UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  rating          INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE doctor_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ratings_patient_owner" ON doctor_ratings
  USING (auth.uid() = patient_id);
CREATE POLICY "ratings_public_read" ON doctor_ratings
  FOR SELECT USING (TRUE);

-- Forum Posts
CREATE TABLE IF NOT EXISTS forum_posts (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id   UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  tags        TEXT[],
  upvotes     INTEGER NOT NULL DEFAULT 0,
  downvotes   INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "forum_posts_read" ON forum_posts FOR SELECT USING (TRUE);
CREATE POLICY "forum_posts_insert" ON forum_posts FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "forum_posts_update" ON forum_posts FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "forum_posts_delete" ON forum_posts FOR DELETE USING (auth.uid() = author_id);

-- Forum Comments
CREATE TABLE IF NOT EXISTS forum_comments (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id     UUID REFERENCES forum_posts(id) ON DELETE CASCADE NOT NULL,
  author_id   UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content     TEXT NOT NULL,
  upvotes     INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE forum_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments_read" ON forum_comments FOR SELECT USING (TRUE);
CREATE POLICY "comments_insert" ON forum_comments FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "comments_update" ON forum_comments FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "comments_delete" ON forum_comments FOR DELETE USING (auth.uid() = author_id);

-- Triggers: updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_forum_posts_updated_at
  BEFORE UPDATE ON forum_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
