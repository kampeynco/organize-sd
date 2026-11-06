-- Run as the migration owner. Transactional, repeatable, and compatible with the old
-- deployment during rollout. Passwords are provisioned separately, never in SQL files.
BEGIN;

DO $$
DECLARE role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['organize_submissions', 'organize_results', 'organize_importer', 'organize_submit_executor'] LOOP
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('CREATE ROLE %I NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS', role_name);
    END IF;
    IF EXISTS (SELECT FROM pg_roles WHERE rolname = role_name AND (rolsuper OR rolcreatedb OR rolcreaterole OR rolinherit OR rolbypassrls))
       OR EXISTS (SELECT FROM pg_auth_members m JOIN pg_roles r ON r.oid = m.member WHERE r.rolname = role_name) THEN
      RAISE EXCEPTION 'Role % already has unexpected privileges; refusing migration', role_name;
    END IF;
  END LOOP;
END $$;

-- Only the migration owner may assume the non-login function execution role.
GRANT organize_submit_executor TO neondb_owner;
CREATE SCHEMA IF NOT EXISTS submission_api;
CREATE SCHEMA IF NOT EXISTS submission_private;
REVOKE ALL ON SCHEMA submission_api, submission_private FROM PUBLIC;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public, submission_api, submission_private TO organize_submit_executor;
GRANT USAGE ON SCHEMA submission_api TO organize_submissions;
GRANT USAGE ON SCHEMA sos TO organize_results, organize_importer;
GRANT CONNECT ON DATABASE neondb TO organize_submissions, organize_results, organize_importer;

CREATE TABLE IF NOT EXISTS submission_private.rate_limits (
  bucket text PRIMARY KEY,
  window_start timestamptz NOT NULL,
  attempts integer NOT NULL CHECK (attempts > 0)
);
CREATE INDEX IF NOT EXISTS rate_limits_expiry_idx ON submission_private.rate_limits (window_start);

REVOKE ALL ON public.applications, public.signups FROM PUBLIC, organize_submissions, organize_results, organize_importer;
GRANT SELECT, INSERT ON public.applications, public.signups TO organize_submit_executor;
GRANT USAGE ON SEQUENCE public.signups_id_seq TO organize_submit_executor;
GRANT SELECT, INSERT, UPDATE, DELETE ON submission_private.rate_limits TO organize_submit_executor;

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications FORCE ROW LEVEL SECURITY;
ALTER TABLE public.signups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signups FORCE ROW LEVEL SECURITY;
ALTER TABLE submission_private.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_private.rate_limits FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS application_submit_insert ON public.applications;
CREATE POLICY application_submit_insert ON public.applications FOR INSERT TO organize_submit_executor WITH CHECK (true);
DROP POLICY IF EXISTS application_retry_check ON public.applications;
CREATE POLICY application_retry_check ON public.applications FOR SELECT TO organize_submit_executor USING (true);
DROP POLICY IF EXISTS signup_submit_insert ON public.signups;
CREATE POLICY signup_submit_insert ON public.signups FOR INSERT TO organize_submit_executor WITH CHECK (true);
DROP POLICY IF EXISTS signup_duplicate_check ON public.signups;
CREATE POLICY signup_duplicate_check ON public.signups FOR SELECT TO organize_submit_executor USING (true);
DROP POLICY IF EXISTS rate_limit_internal ON submission_private.rate_limits;
CREATE POLICY rate_limit_internal ON submission_private.rate_limits TO organize_submit_executor USING (true) WITH CHECK (true);

DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'sos' LOOP
    EXECUTE format('ALTER TABLE sos.%I ENABLE ROW LEVEL SECURITY', t.tablename);
    EXECUTE format('ALTER TABLE sos.%I FORCE ROW LEVEL SECURITY', t.tablename);
    EXECUTE format('REVOKE ALL ON sos.%I FROM PUBLIC, organize_submissions', t.tablename);
    EXECUTE format('GRANT SELECT ON sos.%I TO organize_results', t.tablename);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON sos.%I TO organize_importer', t.tablename);
    EXECUTE format('DROP POLICY IF EXISTS results_read ON sos.%I', t.tablename);
    EXECUTE format('CREATE POLICY results_read ON sos.%I FOR SELECT TO organize_results USING (true)', t.tablename);
    EXECUTE format('DROP POLICY IF EXISTS importer_write ON sos.%I', t.tablename);
    EXECUTE format('CREATE POLICY importer_write ON sos.%I TO organize_importer USING (true) WITH CHECK (true)', t.tablename);
  END LOOP;
END $$;

-- Invoker-only internal helper: runtime roles cannot call it or touch its table.
-- Global, network, and email budgets are checked in a consistent lock order.
CREATE OR REPLACE FUNCTION submission_private.allow_submission(kind text, ip_key text, email_key text)
RETURNS boolean LANGUAGE plpgsql SET search_path = pg_catalog AS $$
DECLARE
  keys text[];
  caps integer[];
  i integer;
  used integer;
  window_time timestamptz := date_trunc('hour', statement_timestamp());
BEGIN
  IF kind NOT IN ('application', 'signup') OR ip_key IS NULL OR email_key IS NULL
     OR ip_key !~ '^[0-9a-f]{64}$' OR email_key !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'Invalid submission protection' USING ERRCODE = '22023';
  END IF;
  keys := ARRAY[kind || ':global', kind || ':ip:' || ip_key, kind || ':email:' || email_key];
  caps := CASE WHEN kind = 'application' THEN ARRAY[500, 10, 5] ELSE ARRAY[2000, 20, 5] END;
  DELETE FROM submission_private.rate_limits WHERE bucket IN (
    SELECT bucket FROM submission_private.rate_limits
    WHERE window_start < window_time - interval '2 days' ORDER BY window_start LIMIT 100
  );
  FOR i IN 1..3 LOOP
    INSERT INTO submission_private.rate_limits AS existing (bucket, window_start, attempts)
      VALUES (keys[i], window_time, 1)
    ON CONFLICT (bucket) DO UPDATE SET
      window_start = EXCLUDED.window_start,
      attempts = CASE WHEN existing.window_start < EXCLUDED.window_start THEN 1 ELSE least(existing.attempts + 1, caps[i] + 1) END
    RETURNING attempts INTO used;
    IF used > caps[i] THEN RETURN false; END IF;
  END LOOP;
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION submission_api.submit_application(
  submission_id uuid, applicant_name text, applicant_email text, applicant_answers jsonb, ip_key text, email_key text
) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
  IF submission_id IS NULL OR applicant_name IS NULL OR applicant_email IS NULL OR applicant_answers IS NULL
    OR char_length(applicant_name) NOT BETWEEN 1 AND 200 OR char_length(applicant_email) NOT BETWEEN 3 AND 254
    OR jsonb_typeof(applicant_answers) <> 'object' OR octet_length(applicant_answers::text) > 256000 THEN
    RAISE EXCEPTION 'Invalid application' USING ERRCODE = '22023';
  END IF;
  IF NOT submission_private.allow_submission('application', ip_key, email_key) THEN RETURN 'limited'; END IF;
  INSERT INTO public.applications (id, name, email, answers)
    VALUES (submission_id, applicant_name, applicant_email, applicant_answers)
    ON CONFLICT (id) DO NOTHING;
  -- Idempotent retries compare the supplied values; never return stored answers.
  IF EXISTS (SELECT FROM public.applications WHERE id = submission_id AND name = applicant_name
             AND email = applicant_email AND answers = applicant_answers) THEN RETURN 'ok'; END IF;
  RETURN 'conflict';
END $$;

CREATE OR REPLACE FUNCTION submission_api.submit_signup(
  signup_email text, signup_zip text, signup_source text, ip_key text, email_key text
) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
  IF signup_email IS NULL OR signup_zip IS NULL OR signup_source IS NULL
    OR char_length(signup_email) NOT BETWEEN 3 AND 254 OR signup_zip !~ '^[0-9]{5}$'
    OR signup_source NOT IN ('hero', 'newsletter', 'sticky') THEN
    RAISE EXCEPTION 'Invalid signup' USING ERRCODE = '22023';
  END IF;
  IF NOT submission_private.allow_submission('signup', ip_key, email_key) THEN RETURN 'limited'; END IF;
  INSERT INTO public.signups (email, zip, source) VALUES (signup_email, signup_zip, signup_source)
    ON CONFLICT (email) DO NOTHING;
  -- A public request may not modify someone else's contact record or discover membership.
  RETURN 'ok';
END $$;

GRANT CREATE ON SCHEMA submission_api, submission_private TO organize_submit_executor;
ALTER FUNCTION submission_private.allow_submission(text, text, text) OWNER TO organize_submit_executor;
ALTER FUNCTION submission_api.submit_application(uuid, text, text, jsonb, text, text) OWNER TO organize_submit_executor;
ALTER FUNCTION submission_api.submit_signup(text, text, text, text, text) OWNER TO organize_submit_executor;
REVOKE CREATE ON SCHEMA submission_api, submission_private FROM organize_submit_executor;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA submission_api, submission_private FROM PUBLIC;
GRANT EXECUTE ON FUNCTION submission_api.submit_application(uuid, text, text, jsonb, text, text),
  submission_api.submit_signup(text, text, text, text, text) TO organize_submissions;
ALTER DEFAULT PRIVILEGES IN SCHEMA submission_api, submission_private REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

COMMIT;
