-- Allow signed-out visitors to read only the information needed to draw the roster.
-- Login identifiers, auth ids, leave balances, request reasons and personal schedules
-- are intentionally excluded from this function.
create or replace function public.get_public_roster_state()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'employees', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id,
        'name', e.name,
        'hall', e.hall,
        'role', e.role,
        'shift_group', e.shift_group
      ) order by e.hall, e.shift_group, e.name)
      from public.employees e
    ), '[]'::jsonb),
    'leave_requests', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', l.id,
        'employee_id', l.employee_id,
        'date', l.date,
        'leave_type', l.leave_type,
        'status', l.status
      ) order by l.date)
      from public.leave_requests l
      where l.status = 'approved'
    ), '[]'::jsonb),
    'overtime_requests', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', o.id,
        'employee_id', o.employee_id,
        'date', o.date,
        'time_of_day', o.time_of_day,
        'hours', o.hours,
        'status', o.status
      ) order by o.date)
      from public.overtime_requests o
      where o.status = 'approved'
    ), '[]'::jsonb),
    'shift_modifications', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id,
        'employee_id', m.employee_id,
        'date', m.date,
        'shift', m.shift,
        'ot_morning', m.ot_morning,
        'ot_afternoon', m.ot_afternoon
      ) order by m.date)
      from public.shift_modifications m
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.get_public_roster_state() from public;
grant execute on function public.get_public_roster_state() to anon, authenticated;

