-- Additive rollout: existing written applications remain intact and readable.
BEGIN;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS pitch_audio bytea;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS pitch_audio_mime text;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS pitch_audio_duration_ms integer;
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_constraint WHERE conrelid='public.applications'::regclass AND conname='applications_voice_valid') THEN
    ALTER TABLE public.applications ADD CONSTRAINT applications_voice_valid CHECK (
      (pitch_audio IS NULL AND pitch_audio_mime IS NULL AND pitch_audio_duration_ms IS NULL)
      OR (pitch_audio IS NOT NULL AND pitch_audio_mime IS NOT NULL AND pitch_audio_duration_ms IS NOT NULL
        AND octet_length(pitch_audio) BETWEEN 32 AND 1000000 AND pitch_audio_duration_ms BETWEEN 1000 AND 60000
        AND ((pitch_audio_mime='audio/webm' AND substring(pitch_audio FROM 1 FOR 4)=decode('1a45dfa3','hex'))
          OR (pitch_audio_mime='audio/ogg' AND substring(pitch_audio FROM 1 FOR 4)=decode('4f676753','hex'))
          OR (pitch_audio_mime='audio/mp4' AND substring(pitch_audio FROM 5 FOR 4)=decode('66747970','hex'))))
    );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION submission_api.submit_application_with_voice(
  submission_id uuid, applicant_name text, applicant_email text, applicant_answers jsonb,
  voice_data bytea, voice_mime text, voice_duration_ms integer, ip_key text, email_key text
) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
  IF submission_id IS NULL OR applicant_name IS NULL OR applicant_email IS NULL OR applicant_answers IS NULL
    OR char_length(applicant_name) NOT BETWEEN 1 AND 200 OR char_length(applicant_email) NOT BETWEEN 3 AND 254
    OR jsonb_typeof(applicant_answers) <> 'object' OR octet_length(applicant_answers::text) > 256000
    OR applicant_answers ? 'elevator_pitch'
    OR voice_data IS NULL OR voice_mime IS NULL OR voice_duration_ms IS NULL
    OR octet_length(voice_data) NOT BETWEEN 32 AND 1000000 OR voice_duration_ms NOT BETWEEN 1000 AND 60000
    OR voice_mime NOT IN ('audio/webm','audio/ogg','audio/mp4') THEN
    RAISE EXCEPTION 'Invalid voice application' USING ERRCODE = '22023';
  END IF;
  IF NOT submission_private.allow_submission('application', ip_key, email_key) THEN RETURN 'limited'; END IF;
  INSERT INTO public.applications (id,name,email,answers,pitch_audio,pitch_audio_mime,pitch_audio_duration_ms)
    VALUES (submission_id,applicant_name,applicant_email,applicant_answers,voice_data,voice_mime,voice_duration_ms)
    ON CONFLICT (id) DO NOTHING;
  IF EXISTS (SELECT FROM public.applications WHERE id=submission_id AND name=applicant_name
    AND email=applicant_email AND answers=applicant_answers AND pitch_audio=voice_data
    AND pitch_audio_mime=voice_mime AND pitch_audio_duration_ms=voice_duration_ms) THEN RETURN 'ok'; END IF;
  RETURN 'conflict';
END $$;
GRANT CREATE ON SCHEMA submission_api TO organize_submit_executor;
ALTER FUNCTION submission_api.submit_application_with_voice(uuid,text,text,jsonb,bytea,text,integer,text,text) OWNER TO organize_submit_executor;
REVOKE CREATE ON SCHEMA submission_api FROM organize_submit_executor;
REVOKE ALL ON FUNCTION submission_api.submit_application_with_voice(uuid,text,text,jsonb,bytea,text,integer,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION submission_api.submit_application_with_voice(uuid,text,text,jsonb,bytea,text,integer,text,text) TO organize_submissions;
COMMIT;
