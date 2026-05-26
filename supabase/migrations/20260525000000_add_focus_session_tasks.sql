create table public.focus_session_tasks (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  focus_session_id uuid not null references public.focus_sessions(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint focus_session_tasks_sort_order_nonnegative check (sort_order >= 0),
  constraint focus_session_tasks_session_task_unique unique (
    focus_session_id,
    task_id
  )
);

insert into public.focus_session_tasks (
  user_id,
  focus_session_id,
  task_id,
  sort_order
)
select
  user_id,
  id,
  task_id,
  0
from public.focus_sessions
where task_id is not null
on conflict (focus_session_id, task_id) do nothing;

create index focus_session_tasks_user_id_idx on public.focus_session_tasks using btree (user_id);
create index focus_session_tasks_focus_session_id_idx on public.focus_session_tasks using btree (focus_session_id);
create index focus_session_tasks_task_id_idx on public.focus_session_tasks using btree (task_id);

alter table public.focus_session_tasks enable row level security;

create policy "focus_session_tasks_select_own"
on public.focus_session_tasks
for select
to authenticated
using (
  (select auth.uid()) = user_id
  and private.owns_task(task_id)
  and exists (
    select 1
    from public.focus_sessions
    where focus_sessions.id = focus_session_id
      and focus_sessions.user_id = (select auth.uid())
  )
);

create policy "focus_session_tasks_insert_own"
on public.focus_session_tasks
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and private.owns_task(task_id)
  and exists (
    select 1
    from public.focus_sessions
    where focus_sessions.id = focus_session_id
      and focus_sessions.user_id = (select auth.uid())
  )
);

create policy "focus_session_tasks_update_own"
on public.focus_session_tasks
for update
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and private.owns_task(task_id)
  and exists (
    select 1
    from public.focus_sessions
    where focus_sessions.id = focus_session_id
      and focus_sessions.user_id = (select auth.uid())
  )
);

create policy "focus_session_tasks_delete_own"
on public.focus_session_tasks
for delete
to authenticated
using ((select auth.uid()) = user_id);

revoke all on public.focus_session_tasks from anon, authenticated;
grant select, insert, update, delete on public.focus_session_tasks to authenticated;
grant all on public.focus_session_tasks to service_role;
