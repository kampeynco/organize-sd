-- Text message opt-ins. Run as the migration owner BEFORE deploying the /api/signup that calls
-- submit_signup_with_sms. Additive and repeatable: the old submit_signup keeps serving the current
-- deployment during rollout.
--
-- Opt-ins live in their own append-only table rather than on public.signups: signups keep the first
-- record per email and a public request may never modify it, so an existing subscriber adding a phone
-- would otherwise be dropped. Each row is one consent event with the exact language the subscriber saw.
BEGIN;

CREATE TABLE IF NOT EXISTS public.sms_optins (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  phone text NOT NULL CHECK (phone ~ '^\+1[2-9][0-9]{2}[2-9][0-9]{6}$'),
  email text NOT NULL CHECK (email = lower(email) AND char_length(email) BETWEEN 3 AND 254),
  zip text NOT NULL CHECK (zip ~ '^[0-9]{5}$'),
  source text NOT NULL CHECK (source IN ('hero', 'newsletter', 'sticky')),
  consent_text text NOT NULL CHECK (char_length(consent_text) BETWEEN 1 AND 2000),
  consented_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sms_optins_phone_idx ON public.sms_optins (phone, consented_at DESC);
COMMENT ON TABLE public.sms_optins IS
  'One row per web text-message opt-in (E.164 phone) with the consent language shown. STOP/START state lives in the SMS platform.';

REVOKE ALL ON public.sms_optins FROM PUBLIC, organize_submissions, organize_results, organize_importer;
GRANT SELECT, INSERT ON public.sms_optins TO organize_submit_executor;
DO $$ BEGIN
  EXECUTE format('GRANT USAGE ON SEQUENCE %s TO organize_submit_executor', pg_get_serial_sequence('public.sms_optins', 'id'));
END $$;
ALTER TABLE public.sms_optins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_optins FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sms_optin_submit_insert ON public.sms_optins;
CREATE POLICY sms_optin_submit_insert ON public.sms_optins FOR INSERT TO organize_submit_executor WITH CHECK (true);
DROP POLICY IF EXISTS sms_optin_submit_select ON public.sms_optins;
CREATE POLICY sms_optin_submit_select ON public.sms_optins FOR SELECT TO organize_submit_executor USING (true);

-- Keep the encrypted backups complete (see 003-backup-reader.sql).
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'organize_backup') THEN
    GRANT SELECT ON public.sms_optins TO organize_backup;
    EXECUTE format('GRANT SELECT ON SEQUENCE %s TO organize_backup', pg_get_serial_sequence('public.sms_optins', 'id'));
    DROP POLICY IF EXISTS backup_read ON public.sms_optins;
    CREATE POLICY backup_read ON public.sms_optins FOR SELECT TO organize_backup USING (true);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION submission_api.submit_signup_with_sms(
  signup_email text, signup_zip text, signup_source text, sms_phone text, sms_consent_text text,
  ip_key text, email_key text
) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
  IF signup_email IS NULL OR signup_zip IS NULL OR signup_source IS NULL
    OR char_length(signup_email) NOT BETWEEN 3 AND 254 OR signup_zip !~ '^[0-9]{5}$'
    OR signup_source NOT IN ('hero', 'newsletter', 'sticky')
    OR (sms_phone IS NULL) <> (sms_consent_text IS NULL)
    OR (sms_phone IS NOT NULL AND (sms_phone !~ '^\+1[2-9][0-9]{2}[2-9][0-9]{6}$'
      OR char_length(sms_consent_text) NOT BETWEEN 1 AND 2000)) THEN
    RAISE EXCEPTION 'Invalid signup' USING ERRCODE = '22023';
  END IF;
  IF NOT submission_private.allow_submission('signup', ip_key, email_key) THEN RETURN 'limited'; END IF;
  INSERT INTO public.signups (email, zip, source) VALUES (signup_email, signup_zip, signup_source)
    ON CONFLICT (email) DO NOTHING;
  -- Append-only: a repeat opt-in adds a newer consent record and never rewrites an earlier one.
  IF sms_phone IS NOT NULL THEN
    INSERT INTO public.sms_optins (phone, email, zip, source, consent_text)
      VALUES (sms_phone, signup_email, signup_zip, signup_source, sms_consent_text);
  END IF;
  -- Returns only a status; never reveals whether the email or phone was already on file.
  RETURN 'ok';
END $$;
GRANT CREATE ON SCHEMA submission_api TO organize_submit_executor;
ALTER FUNCTION submission_api.submit_signup_with_sms(text,text,text,text,text,text,text) OWNER TO organize_submit_executor;
REVOKE CREATE ON SCHEMA submission_api FROM organize_submit_executor;
REVOKE ALL ON FUNCTION submission_api.submit_signup_with_sms(text,text,text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION submission_api.submit_signup_with_sms(text,text,text,text,text,text,text) TO organize_submissions;
COMMIT;
