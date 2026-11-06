-- Dedicated backup access; never distribute this credential to the web deployment.
BEGIN;
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'organize_backup') THEN
    CREATE ROLE organize_backup NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'organize_backup'
             AND (rolsuper OR rolcreatedb OR rolcreaterole OR rolinherit OR rolbypassrls))
     OR EXISTS (SELECT FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.member WHERE r.rolname='organize_backup') THEN
    RAISE EXCEPTION 'Backup role has unexpected privileges';
  END IF;
END $$;
GRANT CONNECT ON DATABASE neondb TO organize_backup;
GRANT USAGE ON SCHEMA public, sos, submission_api, submission_private TO organize_backup;
GRANT SELECT ON ALL TABLES IN SCHEMA public, sos, submission_private TO organize_backup;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public, sos, submission_private TO organize_backup;
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT schemaname,tablename FROM pg_tables WHERE schemaname IN ('public','sos','submission_private') LOOP
    EXECUTE format('DROP POLICY IF EXISTS backup_read ON %I.%I',t.schemaname,t.tablename);
    EXECUTE format('CREATE POLICY backup_read ON %I.%I FOR SELECT TO organize_backup USING (true)',t.schemaname,t.tablename);
  END LOOP;
END $$;
ALTER ROLE organize_backup SET default_transaction_read_only = on;
COMMIT;
