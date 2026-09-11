-- The mobile manager workflow is approval-only. Remove the mistakenly added
-- ability for managers to submit requests on behalf of employees.

drop function if exists public.create_leave_request_as_manager(text, text, date, text, text);
drop function if exists public.create_overtime_request_as_manager(text, text, date, text, integer, text);
