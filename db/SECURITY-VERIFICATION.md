# Security verification — November 4, 2026

Production: https://www.organizesd.org
Deployment: https://organize-rotq0mz4c-lenoxkampeyncoms-projects.vercel.app
Database: Neon `lucky-hall-65579672`, main branch `br-mute-lab-b7qd0bsl`.
Isolated validation branch: `br-delicate-surf-b7m768bz` (also used by preview/development).

## Confirmed

- All 12 live tables have RLS enabled and forced: applications, signups, nine SOS tables, and rate limits.
- Each runtime connection uses its expected restricted role, without role creation, database creation,
  superuser, or RLS-bypass permissions. Private application SELECT attempts failed with PostgreSQL 42501
  for all three live runtime credentials. `DATABASE_URL` is absent from Vercel's environment settings.
- The migration applied twice successfully on QA and production.
- 12 application/endpoint/client tests passed.
- 42 real database assertions passed on QA, including private read/write denial, RLS after an accidental
  SELECT grant, idempotent retries, signup immutability, importer writes, and concurrent rate limits.
- Deployed preview: results/turnout/registration returned 200; normal and identical application retries
  returned 200; changed retries returned 409; sixth same-email attempts returned 429 for both forms;
  malformed signup returned 400; unauthorized cron returned 401.
- Live website: results/turnout/registration returned 200; synthetic application and retry returned 200;
  signup and duplicate returned 200; application/signup GETs returned 405; unauthorized cron returned 401.
- Live database readback confirmed synthetic application content and that duplicate signup requests did
  not overwrite ZIP/source. Synthetic test records were removed after verification.
- Live CSP, HSTS, frame denial, and nosniff headers were present. Results rendered without console errors;
  registration view and the application form rendered. The last signup input-type fix returned 400 for
  an object where an email string was required.
- Production builds passed. The build now checks that every inline bootstrap/preload script is permitted
  by CSP. Four locally built browser bundles contained none of the configured database credentials or
  rate-limiter secret. No package dependencies were changed.
- Local default development credentials target QA with restricted roles. Owner access is isolated in the
  ignored, mode-0600 `.env.migration.local` file. Sensitive runtime files are ignored and excluded from uploads.

## Voting-pitch recording

Migrations 004 and 005 are applied to QA and production. Question 10 in the standard application flow
requires a microphone recording; written historical answers remain unchanged. Recordings have playback
and re-record controls, a 60-second recorder limit, and a 1 MB server byte limit. No public download route
was introduced. Production RLS remains enabled and forced, runtime SELECT remains denied, and the old
text-only function is no longer executable by the web role.

gstack browser checks used a synthetic audio stream with the browser's real MediaRecorder, encoding,
playback, and submission transport. Mobile and desktop controls, microphone-denial recovery, re-recording,
and stopped microphone tracks passed. A full production form submission succeeded, and privileged
readback matched audio bytes, MIME, and duration exactly. Production retry returned 200, changed audio
metadata returned 409, missing audio returned 400, and private GET returned 405. The exact synthetic QA
and production records were deleted. Physical microphones and Safari/Firefox were not exercised.
Live permissions allow same-origin microphone access, and CSP permits local blob audio playback.
After the voice migration and test cleanup, a fresh encrypted local backup of all 12 tables was created
at `/Users/admin/Backups/organize-sd/production/2026-11-04T23-37-44.082Z`. It was not uploaded or separately
restore-tested; the earlier full restore drill is documented below.

## Recovery limitation

Pre-change snapshot: `snap-summer-brook-b7zthzms`.
Neon rejected daily snapshot scheduling (not enabled), seven-day history (maximum 21,600 seconds), and
an additional post-change snapshot (snapshot count limit). The original snapshot remains intact.
Recurring offsite backups are **not configured**. The user chose to keep the current plan and prepare
backups locally, choosing external storage later. No plan purchase was made. A pre-change Neon snapshot
still requires the security migration to be reapplied before use.

On November 4, an encrypted production dump was created at
`/Users/admin/Backups/organize-sd/production/2026-11-04T22-45-40.691Z` using a separate SELECT-only
`organize_backup` role and age encryption. It was restored into a fresh local PostgreSQL 18 database:
all 12 table counts/data SHA-256 fingerprints, RLS flags, policies, and function ownership/settings matched;
private runtime reads remained denied. A separate isolated-source restore also passed. Corruption,
wrong-key, source-host, and nonempty-target refusal checks passed. Temporary restored databases were
stopped and removed. The encryption identity is outside both repository and backup directory.

A daily local schedule file is prepared but is **not installed or loaded**. No backup was uploaded.
See `scripts/backups/README.md` for operations and `restore-verification.json` alongside the encrypted
production archive for the restore proof. Offsite destination, retention, failure monitoring, and a downloaded
copy restore test remain prerequisites for unattended offsite protection.

## Scope limits

No claim of a full penetration test or certification. Account MFA, staff access reviews, provider encryption
controls, and hosting firewall configuration were not audited. The scheduled SOS importer was checked
through real database permissions and an isolated write transaction; the live cron was not manually run.
Historical deployments retain their captured environment; no owner-password rotation was performed.
