# Encrypted backups — prepared locally

No Neon plan change, cloud upload, or scheduled job has been enabled.

## Local paths

- Production backup configuration: `.env.backup.local` (ignored, owner-readable only).
- Encrypted backups: `/Users/admin/Backups/organize-sd/production/`.
- Recovery identity: `/Users/admin/.config/organize-sd-backups/recovery.agekey`.
- Prepared but **not loaded** launchd schedule: `/Users/admin/.config/organize-sd-backups/com.organizesd.backup.plist`.
- Tools installed separately from the system: `/Users/admin/.local/share/organize-backup-tools/`.

Keep a separate offline/password-manager copy of the recovery identity before relying on these backups.
Never upload the identity alongside the encrypted archives or put it in GitHub/Vercel environment settings.
Losing the identity means losing access to the backups. The backup runner needs only its public recipient.

## Create a backup

From the project directory:

```sh
node --env-file=.env.backup.local scripts/backups/backup.mjs
```

The command requires PostgreSQL 18 `pg_dump`, age, and the existing Node dependencies. Paths to the
tools are set in the private local configuration. Database traffic uses verified TLS and a direct Neon
endpoint. A dedicated `organize_backup` role has SELECT-only access under explicit RLS policies; it has
no role/database creation, RLS bypass, table mutation, or submission-function privileges. Its credential
is separate from the web application. `003-backup-reader.sql` supplies this additive access.

The job exports a single repeatable-read snapshot and uses it for both `pg_dump` and table fingerprints.
It includes the `public`, `sos`, `submission_api`, and `submission_private` schemas: table data, sequences,
schema definitions, functions, ownership, ACLs, and RLS policies. Passwords and provider-admin powers
are not exported. New tables require explicit backup-reader access; the job fails if unrestricted backup
read coverage cannot be established. New application schemas must be added to the schema allowlist.

The dump streams directly into age encryption; no plaintext dump is written to disk. A manifest containing
row counts, data SHA-256 fingerprints, policies, and function ownership is encrypted separately. Files are
published as a completed directory only after both streams succeed. Failed runs remove their own partial
files, leave earlier backups untouched, and return a nonzero exit code. A lock rejects overlapping runs;
after an interrupted process, verify it is no longer running before removing a stale `.backup.lock`.

Each completed directory contains:

- `database.dump.age`: encrypted PostgreSQL custom archive.
- `manifest.json.age`: encrypted verification metadata from the same snapshot.
- `receipt.json`: creation time and ciphertext checksums, with no applicant information.
- `restore-verification.json`: added only after a successful restore drill.

The encryption provides confidentiality and corruption detection; protect storage write access too.
Receipt checksums are not a signature proving who created a replacement backup. Only restore backups
from a trusted source. No automated retention deletion is configured yet.

## Restore to a fresh target

Use an owner-only environment file containing `RESTORE_DATABASE_URL`, `RESTORE_EXPECTED_DATABASE`,
`BACKUP_AGE_IDENTITY`, `PG_BIN_DIR`, and `AGE_BIN`. The database must be empty and on a different host
from the source. Local drills can use a private Unix socket with no TCP listener. Never use the production
connection as a restore target.

```sh
node --env-file=/private/path/restore.env.local scripts/backups/restore.mjs /path/to/completed-backup
```

The restore checks ciphertext checksums, decrypts and authenticates the manifest, verifies the explicit
target name, and refuses a populated target or the source host. It creates missing application/provider
role names as **non-login, unprivileged placeholders**, without passwords or provider administration powers.
Existing roles are not changed. It replaces only the empty default `public` schema using RESTRICT, then
restores the archive in one transaction. It verifies every table's row count and data fingerprint, RLS flags,
policies, function ownership/settings, and runtime denial of private-table reads.

Default-role settings and login passwords are not in `pg_dump`. Before activating a restored deployment,
reapply the security/backup migrations, provision fresh restricted credentials, reapply CONNECT grants
for the destination database name, and run authenticated application canaries. Do not deploy an
unverified restoration. A local restore drill is not a production failover drill.

## Validation

```sh
node --test tests/backup-safety.test.mjs
```

For the four refusal checks, load a private backup/restore configuration and set `BACKUP_TEST_DIR` to a
completed backup whose corresponding restore target is already populated. The test verifies refusal of
corrupted ciphertext, a wrong recovery key, the original source host, and the populated target.

## Activation remains pending

The prepared launchd plist describes a daily 06:00 local-time job but has not been installed or loaded.
It depends on this Mac being awake and the user session being active. Before scheduling unattended backups,
choose a private offsite destination, separate the recovery key, configure failure/staleness monitoring,
and set retention (for example seven daily copies). Then verify an upload, download it again, and repeat
the restore drill from that downloaded copy. A local copy does not protect against loss of this Mac.

The current Neon plan and six-hour built-in recovery window are unchanged.

## Tool provenance

The local PostgreSQL 18.6 tools came from the official
[Postgres.app release](https://github.com/PostgresApp/PostgresApp/releases/tag/v2.9.6), and age 1.3.2 came
from the official [age release](https://github.com/FiloSottile/age/releases/tag/v1.3.2). Both downloads were
checked against SHA-256 digests in their GitHub release metadata. The PostgreSQL
[dump documentation](https://www.postgresql.org/docs/18/app-pgdump.html) explains the RLS-aware dump option;
this runner also requires an unrestricted SELECT policy and verifies the restored data.
