# Program applications

Apply `001-applications.sql` to the same database used by email signup before deploying the application endpoint.
Both endpoints use the server-only `DATABASE_URL` environment variable. For local testing with `.env.local`, run:

```sh
node --env-file=.env.local node_modules/vite/bin/vite.js
```

The form at `/apply` sends its name, email and program answers to `POST /api/applications`.
The endpoint validates required answers, conditional questions, choices and lengths before inserting into
`public.applications`. Contact details are stored in `name` and `email`; program answers are in `answers` (JSONB).
`created_at` is the submission timestamp. The endpoint provides no public read access.

Each submission uses a UUID. Retrying the same submission returns success without creating another row;
reusing an ID with different answers is rejected. A later application from the same email gets its own row.
Failed requests keep answers in the current form, but reloading or closing the page clears unsent answers.
Applications do not automatically subscribe applicants to the newsletter or send email notifications.

Review applications through an authenticated database connection:

```sql
SELECT id, name, email, answers, created_at
FROM public.applications
ORDER BY created_at DESC;
```

Run application validation, endpoint and client failure-handling tests with:

```sh
node --test tests/applications.test.mjs
```

To verify the endpoint's SQL against Neon without retaining test applications, run:

```sh
node --env-file=.env.local tests/applications.database.mjs
```

This runs the endpoint through a transaction-bound database transport, checks saved answers and duplicate
retries, and rolls the transaction back. It requires `001-applications.sql` to have been applied first.
