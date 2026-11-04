CREATE TABLE IF NOT EXISTS public.applications (
  id uuid PRIMARY KEY,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  email text NOT NULL CHECK (char_length(email) BETWEEN 3 AND 254),
  answers jsonb NOT NULL CHECK (jsonb_typeof(answers) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS applications_created_at_idx ON public.applications (created_at DESC);
