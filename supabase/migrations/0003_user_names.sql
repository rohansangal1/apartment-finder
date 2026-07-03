-- Self-service email/password sign-up captures first/last name. Names previously
-- lived only in auth.users.user_metadata (populated by Google); store them in
-- public.users too so the profile row is self-describing.
alter table public.users add column if not exists first_name text;
alter table public.users add column if not exists last_name  text;
