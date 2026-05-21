alter table public.focus_sessions
add column active_started_at timestamptz,
add column elapsed_seconds integer not null default 0,
add column planned_seconds integer;

update public.focus_sessions
set
  active_started_at = case
    when status = 'active' then started_at
    else null
  end,
  planned_seconds = case
    when planned_minutes is null then null
    else planned_minutes * 60
  end;

alter table public.focus_sessions
add constraint focus_sessions_elapsed_seconds_nonnegative check (
  elapsed_seconds >= 0
);

alter table public.focus_sessions
add constraint focus_sessions_planned_seconds_positive check (
  planned_seconds is null or planned_seconds > 0
);

alter table public.focus_sessions
add constraint focus_sessions_active_started_at_status_check check (
  (
    status = 'active'
    and active_started_at is not null
  )
  or (
    status <> 'active'
    and active_started_at is null
  )
);

create unique index focus_sessions_one_open_per_user_idx
on public.focus_sessions (user_id)
where status in ('active', 'paused');
