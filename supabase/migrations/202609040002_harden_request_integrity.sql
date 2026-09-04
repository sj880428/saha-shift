-- Keep leave/overtime request records valid even when two devices submit at once.
-- Rejected requests remain as history and do not block a later application.

alter table public.leave_requests
  alter column status set not null;

alter table public.overtime_requests
  alter column status set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.leave_requests'::regclass
      and conname = 'leave_requests_status_check'
  ) then
    alter table public.leave_requests
      add constraint leave_requests_status_check
      check (status in ('pending', 'approved', 'rejected'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.overtime_requests'::regclass
      and conname = 'overtime_requests_status_check'
  ) then
    alter table public.overtime_requests
      add constraint overtime_requests_status_check
      check (status in ('pending', 'approved', 'rejected'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.overtime_requests'::regclass
      and conname = 'overtime_requests_time_of_day_check'
  ) then
    alter table public.overtime_requests
      add constraint overtime_requests_time_of_day_check
      check (time_of_day in ('morning', 'afternoon'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.overtime_requests'::regclass
      and conname = 'overtime_requests_hours_check'
  ) then
    alter table public.overtime_requests
      add constraint overtime_requests_hours_check
      check (hours between 1 and 4);
  end if;
end
$$;

create unique index if not exists leave_requests_one_active_per_day
  on public.leave_requests (employee_id, date)
  where status in ('pending', 'approved');

create unique index if not exists overtime_requests_one_active_per_period
  on public.overtime_requests (employee_id, date, time_of_day)
  where status in ('pending', 'approved');
