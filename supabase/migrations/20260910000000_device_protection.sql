create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.device_registry (
  id uuid primary key default gen_random_uuid(),
  fingerprint_hash text not null unique,
  device_label text not null default 'Anonymous device',
  last_ip_hash text,
  is_banned boolean not null default false,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists public.browser_sessions (
  session_id uuid primary key,
  device_id uuid not null references public.device_registry(id) on delete cascade,
  fake_name text not null default 'Anonymous',
  is_banned boolean not null default false,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists device_registry_last_seen_idx on public.device_registry(last_seen_at desc);
create index if not exists browser_sessions_device_idx on public.browser_sessions(device_id, last_seen_at desc);

alter table public.admin_users enable row level security;
alter table public.device_registry enable row level security;
alter table public.browser_sessions enable row level security;

-- The browser never reads these tables directly. API routes use the service
-- role after verifying the Supabase access token and admin_users membership.
revoke all on public.device_registry from anon, authenticated;
revoke all on public.browser_sessions from anon, authenticated;
revoke all on public.admin_users from anon, authenticated;

-- After creating the first administrator in Supabase Auth, run:
-- insert into public.admin_users (user_id) values ('YOUR-AUTH-USER-UUID');
