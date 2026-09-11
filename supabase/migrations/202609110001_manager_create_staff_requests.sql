-- Authenticated managers may create pending requests for a selected employee.
-- Employee identity fields are copied from the database, not from the client.

create or replace function public.create_leave_request_as_manager(
  p_id text,
  p_employee_id text,
  p_date date,
  p_leave_type text,
  p_reason text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  target_employee public.employees%rowtype;
begin
  if not exists (
    select 1 from public.employees
    where auth_user_id = auth.uid() and role = 'manager'
  ) then
    raise exception '관리자 권한이 필요합니다.' using errcode = '42501';
  end if;

  if p_leave_type not in ('연가', '공가') then
    raise exception '신청할 수 없는 휴가 종류입니다.' using errcode = '22023';
  end if;

  select * into target_employee from public.employees where id = p_employee_id;
  if not found then
    raise exception '직원 정보를 찾을 수 없습니다.' using errcode = 'P0002';
  end if;

  insert into public.leave_requests
    (id, group_id, employee_id, employee_name, hall, date, leave_type, reason, status)
  values
    (p_id, null, target_employee.id, target_employee.name, target_employee.hall,
     p_date, p_leave_type, coalesce(nullif(trim(p_reason), ''), '관리자 대리 신청'), 'pending');

  return p_id;
end;
$$;

create or replace function public.create_overtime_request_as_manager(
  p_id text,
  p_employee_id text,
  p_date date,
  p_time_of_day text,
  p_hours integer,
  p_reason text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  target_employee public.employees%rowtype;
begin
  if not exists (
    select 1 from public.employees
    where auth_user_id = auth.uid() and role = 'manager'
  ) then
    raise exception '관리자 권한이 필요합니다.' using errcode = '42501';
  end if;

  if p_time_of_day not in ('morning', 'afternoon') or p_hours not between 1 and 4 then
    raise exception '시간외 신청 정보가 올바르지 않습니다.' using errcode = '22023';
  end if;

  select * into target_employee from public.employees where id = p_employee_id;
  if not found then
    raise exception '직원 정보를 찾을 수 없습니다.' using errcode = 'P0002';
  end if;

  insert into public.overtime_requests
    (id, employee_id, employee_name, hall, date, time_of_day, hours, reason, status)
  values
    (p_id, target_employee.id, target_employee.name, target_employee.hall,
     p_date, p_time_of_day, p_hours, coalesce(nullif(trim(p_reason), ''), '관리자 대리 신청'), 'pending');

  return p_id;
end;
$$;

revoke all on function public.create_leave_request_as_manager(text, text, date, text, text) from public;
revoke all on function public.create_overtime_request_as_manager(text, text, date, text, integer, text) from public;
grant execute on function public.create_leave_request_as_manager(text, text, date, text, text) to authenticated;
grant execute on function public.create_overtime_request_as_manager(text, text, date, text, integer, text) to authenticated;
