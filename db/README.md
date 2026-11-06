# Database security and submissions

The runtime uses three restricted, non-owner credentials:

| Variable | Role | Access |
| --- | --- | --- |
| `SUBMISSIONS_DATABASE_URL` | `organize_submissions` | Execute submission functions only; no direct private-table access |
| `RESULTS_DATABASE_URL` | `organize_results` | Read the `sos` election tables only |
| `IMPORT_DATABASE_URL` | `organize_importer` | Read and write the `sos` tables; no applicant/signup access or schema changes |
| `SUBMISSION_RATE_SECRET` | n/a | At least 32 random characters for keyed rate-limit identifiers |

The application deliberately has no `DATABASE_URL` fallback. Keep the owner connection in a private
migration environment, outside deployment settings. Never give any database variable a `VITE_` prefix.

## Migration

Apply `001-applications.sql` and the SOS schema first, then `002-runtime-security.sql` as the owner.
The security migration is transactional and repeatable. It enables and forces RLS on applications,
signups, all existing SOS tables, and the private limiter table. New tables require an explicit security
migration before runtime access is granted.

The `organize_submit_executor` role cannot log in or bypass RLS. Its narrowly scoped, fixed-search-path
functions can insert applications and signups and compare an application retry. They return only a
status, never stored personal information. Runtime roles cannot assume this role. Application and signup
records have no runtime UPDATE/DELETE policy. Review applications through a separately authenticated
administrative database connection; never expose the owner credential to the website.

`node --env-file=.env.migration.local scripts/security/provision.mjs <expected-neon-host> <output.env.local>`
applies the migration and provisions credentials into a mode-0600 ignored file. **Running it again rotates
the three runtime passwords**, so use it during a coordinated rollout, not routine migrations.
`node scripts/security/publish-env.mjs <output.env.local> <production|preview|development>`
publishes credentials via stdin without printing them. Deploy after publishing; existing deployments
retain their previous environment until replaced. Do not roll back to a pre-security build.

## Submission behavior

- `/api/applications` validates required/conditional answers, choices, UUIDs, lengths, JSON type, origin,
  and a streamed 1.6 MB body limit. Identical UUID retries succeed; changed content returns 409.
- `/api/signup` accepts at most 4 KB of JSON and validates the email, ZIP, and source. Repeating an email
  returns the same success without overwriting its original ZIP/source or revealing whether it exists.
- Both use atomic PostgreSQL rate limits shared across all server instances. Per hour, applications allow
  10 attempts per network, 5 per email, and 500 overall; signups allow 20, 5, and 2,000 respectively.
  Limits count retries. A rejected request returns 429 with `Retry-After: 3600` and `Cache-Control: no-store`.
- Production trusts Vercel's `x-vercel-forwarded-for` only. IPv6 addresses are grouped by /64. Rate records
  store HMAC identifiers, not raw IPs/emails. Expired records are removed in bounded batches on submissions.
- Missing credentials, trusted client address, limiter secret, or database availability fail closed.
  Exceptions logged by submission handlers contain no applicant details or database error payloads.
- Answers stay in React memory while completing the form; a reload clears unsent answers.

## Voice answers

The voting-pitch question uses a required microphone recording with playback and re-recording.
The recorder stops at 60 seconds. The API accepts WebM, Ogg, or MP4 audio up to 1 MB, validates
the container signature and declared duration, and stores bytes in `public.applications.pitch_audio`.
Duration metadata is client supplied; it is not a server-side measurement of the media.
Historical written answers remain intact. Audio stays in browser memory until the final submission.

Apply `004-application-voice.sql`, deploy the voice-enabled endpoint, then apply
`005-retire-text-application.sql` to remove the web role's legacy text-only submission permission.
The existing forced RLS and read-only backup policy also cover the audio columns. There is no public
audio download endpoint, and the submission role cannot read recordings. Identical retries compare
the audio as well as the written answers.

Authorized staff can export one recording using the private administrative environment:

```sh
node --env-file=.env.migration.local scripts/security/export-application-voice.mjs <application-uuid> /private/path/answer
```

The exporter adds the appropriate audio extension and creates a mode-0600 file outside the repository.
Keep exports in private storage. The full encrypted database backup includes the audio automatically.

Local development: load the isolated QA credentials with
`node --env-file=.env.security-qa.local node_modules/vite/bin/vite.js --host 127.0.0.1`.
Preview/development should point to the isolated branch, not production.

## Verification

```sh
node --test tests/applications.test.mjs
node --env-file=.env.migration.local --env-file=.env.security-qa.local tests/security.database.mjs
npm run build
```

The database test refuses to run against the owner's original host. It verifies real role permissions,
RLS even after an accidental SELECT grant, immutable signup records, idempotent applications, importer
writes, and concurrent limiter calls. Transactions roll back; committed synthetic signup records from
concurrency tests are removed by exact test prefix. No real applicant answers are read.

Production checks should verify public results, rejected private GETs, unauthorized cron requests,
synthetic submission persistence/retry, CSP/HSTS headers, and absence of credentials in browser assets.
Remove only the identified synthetic records after readback.

## Recovery status (2026-11-04)

A pre-change Neon snapshot was created: `snap-summer-brook-b7zthzms`.
The project currently allows six hours of point-in-time recovery. Requests for seven days and daily
snapshots with seven-day retention were rejected by Neon (retention cap and scheduling not enabled).
**Recurring offsite backups are not configured.** The current plan is unchanged. A local age-encrypted
production backup and a successful full restore drill are now available; see `scripts/backups/README.md`.
The dedicated `organize_backup` reader has explicit SELECT RLS policies and no mutation privileges.
The recovery identity is separate from the encrypted archives. Storage selection and scheduling remain
pending by user choice; local backup preparation is not offsite protection.

Before changing recovery settings, confirm the plan's price and snapshot availability. After enabling
backups, restore one into an isolated branch and verify table/row counts and security policies. Do not
restore over the live branch as a test. Backup access must remain separate from website runtime roles.
