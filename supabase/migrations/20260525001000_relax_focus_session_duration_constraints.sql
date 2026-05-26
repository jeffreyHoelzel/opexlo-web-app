alter table public.focus_sessions
drop constraint if exists focus_sessions_planned_seconds_mode_check;

alter table public.focus_sessions
drop constraint if exists focus_sessions_break_seconds_mode_check;

alter table public.focus_sessions
drop constraint if exists focus_sessions_planned_seconds_positive;

alter table public.focus_sessions
add constraint focus_sessions_planned_seconds_range_check check (
  planned_seconds is null
  or planned_seconds between 1 and 359999
);

alter table public.focus_sessions
add constraint focus_sessions_break_seconds_range_check check (
  break_seconds is null
  or break_seconds between 1 and 359999
);
