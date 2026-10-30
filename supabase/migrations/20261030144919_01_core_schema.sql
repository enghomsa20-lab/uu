/*
# Core schema for university attendance system

1. Purpose
- Multi-doctor attendance management system. Each doctor signs in with their own
  Supabase Auth account (email/password). All data a doctor creates (students,
  sessions, attendance records) is isolated to that doctor via `doctor_id = auth.uid()`
  in RLS policies.

2. New Tables
- `doctors` — profile for each authenticated doctor (full name, department).
- `students` — students belonging to a doctor, grouped by grade 1..4.
- `sessions` — an attendance session (lecture) created by a doctor.
- `session_tokens` — rotating QR tokens tied to an active session.
- `attendance_records` — one row per student check-in for a session.
- `audit_log` — append-only record of significant doctor actions.

3. Security
- RLS enabled on every table.
- `doctors`, `students`, `sessions`, `attendance_records`, `audit_log`:
  CRUD scoped to `authenticated` owner (`doctor_id = auth.uid()`).
- `session_tokens`: SELECT only by the owning doctor. Students never read this
  table directly; they call the `submit_attendance` RPC, which is SECURITY DEFINER
  and validates the token server-side.
- `submit_attendance` and `rotate_session_token` RPCs: SECURITY DEFINER, callable
  by `anon` and `authenticated` (students check in as anon). Revoke execute from
  PUBLIC first, then grant to anon + authenticated.

4. Notes
- `doctor_id` columns default to `auth.uid()` so frontend inserts omitting the
  owner still satisfy the INSERT `WITH CHECK`.
- Passwords are handled by Supabase Auth (securely hashed server-side) — never
  stored in the `doctors` profile table.
- Session status is an enum: draft | active | ended | closed.
- QR tokens carry a short `expires_at`; the check-in RPC rejects expired tokens.
*/

-- ============ doctors ============
CREATE TABLE IF NOT EXISTS public.doctors (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  department text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.doctors TO authenticated;

DROP POLICY IF EXISTS "doctors_select_own" ON public.doctors;
CREATE POLICY "doctors_select_own" ON public.doctors
  FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "doctors_insert_own" ON public.doctors;
CREATE POLICY "doctors_insert_own" ON public.doctors
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "doctors_update_own" ON public.doctors;
CREATE POLICY "doctors_update_own" ON public.doctors
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============ students ============
CREATE TABLE IF NOT EXISTS public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL DEFAULT '',
  grade smallint NOT NULL DEFAULT 1 CHECK (grade BETWEEN 1 AND 4),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO authenticated;

CREATE INDEX IF NOT EXISTS idx_students_doctor ON public.students(doctor_id);
CREATE INDEX IF NOT EXISTS idx_students_doctor_grade ON public.students(doctor_id, grade);

DROP POLICY IF EXISTS "students_select_own" ON public.students;
CREATE POLICY "students_select_own" ON public.students
  FOR SELECT TO authenticated USING (auth.uid() = doctor_id);

DROP POLICY IF EXISTS "students_insert_own" ON public.students;
CREATE POLICY "students_insert_own" ON public.students
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = doctor_id);

DROP POLICY IF EXISTS "students_update_own" ON public.students;
CREATE POLICY "students_update_own" ON public.students
  FOR UPDATE TO authenticated USING (auth.uid() = doctor_id) WITH CHECK (auth.uid() = doctor_id);

DROP POLICY IF EXISTS "students_delete_own" ON public.students;
CREATE POLICY "students_delete_own" ON public.students
  FOR DELETE TO authenticated USING (auth.uid() = doctor_id);

-- ============ sessions ============
CREATE TABLE IF NOT EXISTS public.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  grade smallint NOT NULL DEFAULT 1 CHECK (grade BETWEEN 1 AND 4),
  wifi_ssid text NOT NULL DEFAULT '',
  wifi_password text NOT NULL DEFAULT '',
  require_code boolean NOT NULL DEFAULT false,
  qr_interval_sec int NOT NULL DEFAULT 15 CHECK (qr_interval_sec BETWEEN 5 AND 300),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','ended','closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  ended_at timestamptz
);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sessions TO authenticated;

CREATE INDEX IF NOT EXISTS idx_sessions_doctor ON public.sessions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_sessions_doctor_status ON public.sessions(doctor_id, status);

DROP POLICY IF EXISTS "sessions_select_own" ON public.sessions;
CREATE POLICY "sessions_select_own" ON public.sessions
  FOR SELECT TO authenticated USING (auth.uid() = doctor_id);

DROP POLICY IF EXISTS "sessions_insert_own" ON public.sessions;
CREATE POLICY "sessions_insert_own" ON public.sessions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = doctor_id);

DROP POLICY IF EXISTS "sessions_update_own" ON public.sessions;
CREATE POLICY "sessions_update_own" ON public.sessions
  FOR UPDATE TO authenticated USING (auth.uid() = doctor_id) WITH CHECK (auth.uid() = doctor_id);

DROP POLICY IF EXISTS "sessions_delete_own" ON public.sessions;
CREATE POLICY "sessions_delete_own" ON public.sessions
  FOR DELETE TO authenticated USING (auth.uid() = doctor_id);

-- ============ session_tokens (rotating QR) ============
CREATE TABLE IF NOT EXISTS public.session_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.session_tokens ENABLE ROW LEVEL SECURITY;

-- Only the owning doctor reads tokens (for display). Students validate via RPC.
GRANT SELECT, INSERT ON public.session_tokens TO authenticated;

CREATE INDEX IF NOT EXISTS idx_tokens_session ON public.session_tokens(session_id);
CREATE INDEX IF NOT EXISTS idx_tokens_token ON public.session_tokens(token);

DROP POLICY IF EXISTS "tokens_select_own" ON public.session_tokens;
CREATE POLICY "tokens_select_own" ON public.session_tokens
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_id AND s.doctor_id = auth.uid())
  );

DROP POLICY IF EXISTS "tokens_insert_own" ON public.session_tokens;
CREATE POLICY "tokens_insert_own" ON public.session_tokens
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_id AND s.doctor_id = auth.uid())
  );

-- ============ attendance_records ============
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id uuid REFERENCES public.students(id) ON DELETE SET NULL,
  student_name text NOT NULL,
  student_code text NOT NULL DEFAULT '',
  recorded_at timestamptz NOT NULL DEFAULT now(),
  manual boolean NOT NULL DEFAULT false,
  edit_reason text NOT NULL DEFAULT '',
  edited_at timestamptz
);

ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_records TO authenticated;

CREATE INDEX IF NOT EXISTS idx_att_session ON public.attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_att_doctor ON public.attendance_records(doctor_id);
CREATE INDEX IF NOT EXISTS idx_att_session_code ON public.attendance_records(session_id, student_code);

DROP POLICY IF EXISTS "att_select_own" ON public.attendance_records;
CREATE POLICY "att_select_own" ON public.attendance_records
  FOR SELECT TO authenticated USING (auth.uid() = doctor_id);

DROP POLICY IF EXISTS "att_insert_own" ON public.attendance_records;
CREATE POLICY "att_insert_own" ON public.attendance_records
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = doctor_id);

DROP POLICY IF EXISTS "att_update_own" ON public.attendance_records;
CREATE POLICY "att_update_own" ON public.attendance_records
  FOR UPDATE TO authenticated USING (auth.uid() = doctor_id) WITH CHECK (auth.uid() = doctor_id);

DROP POLICY IF EXISTS "att_delete_own" ON public.attendance_records;
CREATE POLICY "att_delete_own" ON public.attendance_records
  FOR DELETE TO authenticated USING (auth.uid() = doctor_id);

-- ============ audit_log ============
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  detail text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON public.audit_log TO authenticated;

CREATE INDEX IF NOT EXISTS idx_audit_doctor ON public.audit_log(doctor_id);

DROP POLICY IF EXISTS "audit_select_own" ON public.audit_log;
CREATE POLICY "audit_select_own" ON public.audit_log
  FOR SELECT TO authenticated USING (auth.uid() = doctor_id);

DROP POLICY IF EXISTS "audit_insert_own" ON public.audit_log;
CREATE POLICY "audit_insert_own" ON public.audit_log
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = doctor_id);

-- ============ RPC: rotate_session_token ============
-- Called by the doctor's app every qr_interval_sec. Creates a fresh token valid
-- for (interval * 2 + 10) seconds and returns it. SECURITY DEFINER so it can insert
-- into session_tokens regardless of the caller's role (doctor is authenticated).
CREATE OR REPLACE FUNCTION public.rotate_session_token(p_session_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doctor uuid;
  v_interval int;
  v_token text;
  v_expires timestamptz;
BEGIN
  SELECT doctor_id, qr_interval_sec INTO v_doctor, v_interval
  FROM public.sessions WHERE id = p_session_id;

  IF v_doctor IS NULL THEN
    RAISE EXCEPTION 'session_not_found';
  END IF;
  IF v_doctor <> auth.uid() THEN
    RAISE EXCEPTION 'not_owner';
  END IF;

  v_token := encode(gen_random_bytes(18), 'hex');
  v_expires := now() + make_interval(secs => (v_interval * 2 + 10));

  INSERT INTO public.session_tokens (session_id, token, expires_at)
  VALUES (p_session_id, v_token, v_expires);

  RETURN v_token;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rotate_session_token(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rotate_session_token(uuid) TO authenticated;

-- ============ RPC: submit_attendance ============
-- Called by students (anon) from the check-in page. Validates the rotating token,
-- confirms the session is active, prevents duplicate check-ins by code, and inserts
-- an attendance record tied to the session's doctor. SECURITY DEFINER so it can
-- write to attendance_records as the session owner.
CREATE OR REPLACE FUNCTION public.submit_attendance(
  p_token text,
  p_name text,
  p_code text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session public.sessions%ROWTYPE;
  v_existing uuid;
  v_record public.attendance_records%ROWTYPE;
BEGIN
  IF btrim(p_name) = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'name_required');
  END IF;

  SELECT * INTO v_session
  FROM public.sessions s
  JOIN public.session_tokens t ON t.session_id = s.id
  WHERE t.token = p_token
    AND t.expires_at > now()
  ORDER BY t.created_at DESC
  LIMIT 1;

  IF v_session.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_or_expired_token');
  END IF;

  IF v_session.status <> 'active' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'session_not_active');
  END IF;

  IF v_session.require_code AND btrim(p_code) = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'code_required');
  END IF;

  -- Prevent duplicate check-in: same code in same session, or same name if no code.
  IF btrim(p_code) <> '' THEN
    SELECT id INTO v_existing FROM public.attendance_records
    WHERE session_id = v_session.id AND student_code = btrim(p_code)
    LIMIT 1;
  ELSE
    SELECT id INTO v_existing FROM public.attendance_records
    WHERE session_id = v_session.id AND lower(student_name) = lower(btrim(p_name))
    LIMIT 1;
  END IF;

  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_checked_in');
  END IF;

  INSERT INTO public.attendance_records (
    session_id, doctor_id, student_name, student_code, recorded_at, manual
  ) VALUES (
    v_session.id, v_session.doctor_id, btrim(p_name), btrim(p_code), now(), false
  )
  RETURNING * INTO v_record;

  RETURN jsonb_build_object(
    'ok', true,
    'recorded_at', to_char(v_record.recorded_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_attendance(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_attendance(text, text, text) TO anon, authenticated;

-- ============ RPC: get_active_session_for_token ============
-- Lets the student check-in page fetch minimal session info (title, grade,
-- require_code) given a token, so the page can render before submit.
CREATE OR REPLACE FUNCTION public.get_session_by_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session public.sessions%ROWTYPE;
BEGIN
  SELECT s.* INTO v_session
  FROM public.sessions s
  JOIN public.session_tokens t ON t.session_id = s.id
  WHERE t.token = p_token AND t.expires_at > now()
  ORDER BY t.created_at DESC
  LIMIT 1;

  IF v_session.id IS NULL THEN
    RETURN jsonb_build_object('ok', false);
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'title', v_session.title,
    'grade', v_session.grade,
    'require_code', v_session.require_code,
    'status', v_session.status
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_session_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_session_by_token(text) TO anon, authenticated;
