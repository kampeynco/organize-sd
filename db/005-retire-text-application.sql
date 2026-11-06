-- Apply after deploying the voice-enabled endpoint. Old function stays available only
-- to administrators for historical tooling; web credentials can no longer submit text-only pitches.
REVOKE EXECUTE ON FUNCTION submission_api.submit_application(uuid,text,text,jsonb,text,text) FROM organize_submissions;
