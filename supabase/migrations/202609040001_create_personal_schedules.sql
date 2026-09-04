create table if not exists public.personal_schedules (
  id uuid primary key,
  auth_user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  employee_id text not null references public.employees(id) on delete cascade,
  schedule_date date not null,
  content text not null check (char_length(btrim(content)) between 1 and 300),
  created_at timestamptz not null default now()
);

alter table public.personal_schedules enable row level security;

create index if not exists personal_schedules_owner_date_idx
  on public.personal_schedules (auth_user_id, schedule_date, created_at);

drop policy if exists "personal schedules select own" on public.personal_schedules;
create policy "personal schedules select own"
  on public.personal_schedules for select
  to authenticated
  using (auth_user_id = auth.uid());

drop policy if exists "personal schedules insert own" on public.personal_schedules;
create policy "personal schedules insert own"
  on public.personal_schedules for insert
  to authenticated
  with check (auth_user_id = auth.uid());

drop policy if exists "personal schedules update own" on public.personal_schedules;
create policy "personal schedules update own"
  on public.personal_schedules for update
  to authenticated
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

drop policy if exists "personal schedules delete own" on public.personal_schedules;
create policy "personal schedules delete own"
  on public.personal_schedules for delete
  to authenticated
  using (auth_user_id = auth.uid());
