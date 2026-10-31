/*
# Fix rotating QR token generation

1. Purpose
- Fix the QR token generator used when a doctor starts an attendance session.
- The project uses Supabase's pgcrypto extension, which is installed in the
  `extensions` schema. The previous function used `gen_random_bytes` while its
  search path was restricted to `public`, so PostgreSQL could not resolve the
  function and every QR refresh failed.

2. Modified function
- `public.rotate_session_token(uuid)` now calls
  `extensions.gen_random_bytes(18)` explicitly.
- The function remains restricted to the authenticated owner of the session.
- Existing sessions and attendance data are untouched.

3. Security
- Keep SECURITY DEFINER with an explicit `public` search path.
- Keep EXECUTE granted only to authenticated doctors.
- No new tables, columns, or data deletion.
*/

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
  FROM public.sessions
  WHERE id = p_session_id;

  IF v_doctor IS NULL THEN
    RAISE EXCEPTION 'session_not_found';
  END IF;

  IF v_doctor <> auth.uid() THEN
    RAISE EXCEPTION 'not_owner';
  END IF;

  v_token := encode(extensions.gen_random_bytes(18), 'hex');
  v_expires := now() + make_interval(secs => (v_interval * 2 + 10));

  INSERT INTO public.session_tokens (session_id, token, expires_at)
  VALUES (p_session_id, v_token, v_expires);

  RETURN v_token;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rotate_session_token(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rotate_session_token(uuid) TO authenticated;
