alter table public.focus_sessions
add column if not exists break_seconds integer;

alter table public.focus_sessions
drop constraint if exists focus_sessions_session_type_check;

update public.focus_sessions
set session_type = 'deep_work'
where session_type in ('custom', 'open_focus');

update public.focus_sessions
set session_type = 'deep_work'
where session_type = 'pomodoro'
  and coalesce(planned_seconds, 0) > 3300;

update public.focus_sessions
set planned_seconds = greatest(
  1,
  least(coalesce(planned_seconds, duration_minutes * 60, elapsed_seconds, 1), 43200)
)
where planned_seconds is null
  or planned_seconds <= 0
  or planned_seconds > 43200;

update public.focus_sessions
set planned_seconds = least(planned_seconds, 3300)
where session_type = 'pomodoro'
  and planned_seconds > 3300;

update public.focus_sessions
set planned_minutes = ceil(planned_seconds::numeric / 60.0)::integer
where planned_seconds is not null;

update public.focus_sessions
set break_seconds = case
  when session_type = 'pomodoro'
    then greatest(1, least(coalesce(break_seconds, 300), 600))
  else null
end;

alter table public.focus_sessions
drop constraint if exists focus_sessions_planned_seconds_positive;

alter table public.focus_sessions
alter column session_type set default 'pomodoro';

alter table public.focus_sessions
add constraint focus_sessions_session_type_check check (
  session_type in ('pomodoro', 'deep_work')
);

alter table public.focus_sessions
add constraint focus_sessions_planned_seconds_mode_check check (
  (
    session_type = 'pomodoro'
    and planned_seconds between 1 and 3300
  )
  or (
    session_type = 'deep_work'
    and planned_seconds between 1 and 43200
  )
);

alter table public.focus_sessions
add constraint focus_sessions_break_seconds_mode_check check (
  (
    session_type = 'pomodoro'
    and break_seconds between 1 and 600
  )
  or (
    session_type = 'deep_work'
    and break_seconds is null
  )
);
