-- Create the remaining Opexlo MVP schema.
--
-- This migration intentionally builds on the already-applied first migration:
-- profiles, user_preferences, tasks, and public.set_updated_at().

create schema if not exists private;
revoke all on schema private from public;

create table public.plans (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null,
  slug text not null unique,
  stripe_price_id_monthly text,
  stripe_price_id_yearly text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint plans_name_not_blank check (length(btrim(name)) > 0),
  constraint plans_slug_not_blank check (length(btrim(slug)) > 0)
);

create table public.plan_entitlements (
  id uuid primary key default extensions.gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  feature_key text not null,
  feature_limit integer,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint plan_entitlements_feature_key_not_blank check (
    length(btrim(feature_key)) > 0
  ),
  constraint plan_entitlements_feature_limit_nonnegative check (
    feature_limit is null or feature_limit >= 0
  ),
  constraint plan_entitlements_plan_feature_unique unique (plan_id, feature_key)
);

create table public.billing_customers (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  stripe_customer_id text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_customers_stripe_customer_id_not_blank check (
    length(btrim(stripe_customer_id)) > 0
  )
);

create table public.subscriptions (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.plans(id),
  stripe_subscription_id text unique,
  stripe_customer_id text not null,
  status text not null,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  trial_start timestamptz,
  trial_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_status_not_blank check (length(btrim(status)) > 0),
  constraint subscriptions_stripe_customer_id_not_blank check (
    length(btrim(stripe_customer_id)) > 0
  )
);

create table public.billing_events (
  id uuid primary key default extensions.gen_random_uuid(),
  stripe_event_id text not null unique,
  event_type text not null,
  processed_at timestamptz,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  constraint billing_events_stripe_event_id_not_blank check (
    length(btrim(stripe_event_id)) > 0
  ),
  constraint billing_events_event_type_not_blank check (
    length(btrim(event_type)) > 0
  )
);

create table public.areas (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  color text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint areas_name_not_blank check (length(btrim(name)) > 0)
);

create table public.projects (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  area_id uuid references public.areas(id) on delete set null,
  name text not null,
  description text,
  color text,
  status text not null default 'active',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_name_not_blank check (length(btrim(name)) > 0),
  constraint projects_status_check check (
    status in ('active', 'paused', 'completed', 'archived')
  )
);

create table public.goals (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  area_id uuid references public.areas(id) on delete set null,
  title text not null,
  description text,
  target_date date,
  status text not null default 'active',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint goals_title_not_blank check (length(btrim(title)) > 0),
  constraint goals_status_check check (
    status in ('active', 'completed', 'paused', 'archived')
  )
);

create table public.goal_projects (
  id uuid primary key default extensions.gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint goal_projects_goal_project_unique unique (goal_id, project_id)
);

alter table public.tasks
add column project_id uuid references public.projects(id) on delete set null,
add column area_id uuid references public.areas(id) on delete set null,
add column goal_id uuid references public.goals(id) on delete set null;

create table public.task_checklist_items (
  id uuid primary key default extensions.gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  title text not null,
  is_completed boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint task_checklist_items_title_not_blank check (length(btrim(title)) > 0),
  constraint task_checklist_items_sort_order_nonnegative check (sort_order >= 0)
);

create table public.task_events (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  event_type text not null,
  event_timestamp timestamptz not null default now(),
  metadata jsonb,
  created_at timestamptz not null default now(),
  constraint task_events_event_type_not_blank check (length(btrim(event_type)) > 0)
);

create table public.daily_plans (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_date date not null,
  notes text,
  planned_start_time time,
  planned_end_time time,
  shutdown_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_plans_user_date_unique unique (user_id, plan_date),
  constraint daily_plans_time_range_check check (
    planned_start_time is null
    or planned_end_time is null
    or planned_end_time > planned_start_time
  )
);

create table public.daily_plan_items (
  id uuid primary key default extensions.gen_random_uuid(),
  daily_plan_id uuid not null references public.daily_plans(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  sort_order integer not null default 0,
  is_top_priority boolean not null default false,
  planned_minutes integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_plan_items_plan_task_unique unique (daily_plan_id, task_id),
  constraint daily_plan_items_sort_order_nonnegative check (sort_order >= 0),
  constraint daily_plan_items_planned_minutes_positive check (
    planned_minutes is null or planned_minutes > 0
  )
);

create table public.time_blocks (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  daily_plan_id uuid references public.daily_plans(id) on delete set null,
  title text not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint time_blocks_title_not_blank check (length(btrim(title)) > 0),
  constraint time_blocks_time_range_check check (end_at > start_at)
);

create table public.focus_sessions (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_minutes integer,
  planned_minutes integer,
  status text not null default 'active',
  session_type text not null default 'custom',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint focus_sessions_time_range_check check (
    ended_at is null or ended_at >= started_at
  ),
  constraint focus_sessions_duration_minutes_positive check (
    duration_minutes is null or duration_minutes > 0
  ),
  constraint focus_sessions_planned_minutes_positive check (
    planned_minutes is null or planned_minutes > 0
  ),
  constraint focus_sessions_status_check check (
    status in ('active', 'paused', 'completed', 'cancelled')
  ),
  constraint focus_sessions_session_type_check check (
    session_type in ('pomodoro', 'custom', 'open_focus')
  )
);

create table public.reminders (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete cascade,
  reminder_type text not null,
  scheduled_at timestamptz not null,
  sent_at timestamptz,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reminders_reminder_type_check check (
    reminder_type in (
      'task_start',
      'task_stop',
      'task_deadline',
      'daily_planning',
      'shutdown_review'
    )
  ),
  constraint reminders_status_check check (
    status in ('pending', 'sent', 'failed', 'cancelled')
  )
);

create table public.email_delivery_logs (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reminder_id uuid references public.reminders(id) on delete set null,
  resend_email_id text,
  status text not null,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  constraint email_delivery_logs_status_not_blank check (length(btrim(status)) > 0)
);

create table public.recurring_task_rules (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  template_task_id uuid not null references public.tasks(id) on delete cascade,
  frequency text not null,
  interval integer not null default 1,
  days_of_week integer[],
  day_of_month integer,
  next_run_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recurring_task_rules_frequency_check check (
    frequency in ('daily', 'weekly', 'monthly')
  ),
  constraint recurring_task_rules_interval_positive check (interval > 0),
  constraint recurring_task_rules_days_of_week_check check (
    days_of_week is null
    or days_of_week <@ array[0, 1, 2, 3, 4, 5, 6]::integer[]
  ),
  constraint recurring_task_rules_day_of_month_check check (
    day_of_month is null or day_of_month between 1 and 31
  )
);

create table public.notes (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content jsonb,
  plain_text text,
  note_type text not null default 'general',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notes_title_not_blank check (length(btrim(title)) > 0),
  constraint notes_note_type_check check (
    note_type in ('general', 'meeting', 'person', 'resource', 'project_note')
  )
);

create table public.note_links (
  id uuid primary key default extensions.gen_random_uuid(),
  note_id uuid not null references public.notes(id) on delete cascade,
  linked_entity_type text not null,
  linked_entity_id uuid not null,
  created_at timestamptz not null default now(),
  constraint note_links_entity_type_check check (
    linked_entity_type in ('task', 'project', 'area', 'goal')
  ),
  constraint note_links_note_entity_unique unique (
    note_id,
    linked_entity_type,
    linked_entity_id
  )
);

create index plan_entitlements_plan_id_idx on public.plan_entitlements using btree (plan_id);
create index billing_customers_user_id_idx on public.billing_customers using btree (user_id);
create index subscriptions_user_id_idx on public.subscriptions using btree (user_id);
create index subscriptions_plan_id_idx on public.subscriptions using btree (plan_id);
create index subscriptions_stripe_customer_id_idx on public.subscriptions using btree (stripe_customer_id);
create index areas_user_id_idx on public.areas using btree (user_id);
create index projects_user_id_idx on public.projects using btree (user_id);
create index projects_area_id_idx on public.projects using btree (area_id);
create index projects_user_status_idx on public.projects using btree (user_id, status);
create index goals_user_id_idx on public.goals using btree (user_id);
create index goals_area_id_idx on public.goals using btree (area_id);
create index goals_user_status_idx on public.goals using btree (user_id, status);
create index goal_projects_goal_id_idx on public.goal_projects using btree (goal_id);
create index goal_projects_project_id_idx on public.goal_projects using btree (project_id);
create index tasks_project_id_idx on public.tasks using btree (project_id);
create index tasks_area_id_idx on public.tasks using btree (area_id);
create index tasks_goal_id_idx on public.tasks using btree (goal_id);
create index task_checklist_items_task_id_idx on public.task_checklist_items using btree (task_id);
create index task_events_user_id_idx on public.task_events using btree (user_id);
create index task_events_task_id_idx on public.task_events using btree (task_id);
create index task_events_user_timestamp_idx on public.task_events using btree (
  user_id,
  event_timestamp
);
create index daily_plans_user_id_idx on public.daily_plans using btree (user_id);
create index daily_plan_items_daily_plan_id_idx on public.daily_plan_items using btree (
  daily_plan_id
);
create index daily_plan_items_task_id_idx on public.daily_plan_items using btree (task_id);
create index time_blocks_user_id_idx on public.time_blocks using btree (user_id);
create index time_blocks_task_id_idx on public.time_blocks using btree (task_id);
create index time_blocks_daily_plan_id_idx on public.time_blocks using btree (daily_plan_id);
create index time_blocks_user_start_at_idx on public.time_blocks using btree (user_id, start_at);
create index focus_sessions_user_id_idx on public.focus_sessions using btree (user_id);
create index focus_sessions_task_id_idx on public.focus_sessions using btree (task_id);
create index focus_sessions_user_started_at_idx on public.focus_sessions using btree (
  user_id,
  started_at
);
create index reminders_user_id_idx on public.reminders using btree (user_id);
create index reminders_task_id_idx on public.reminders using btree (task_id);
create index reminders_due_idx on public.reminders using btree (status, scheduled_at);
create index email_delivery_logs_user_id_idx on public.email_delivery_logs using btree (user_id);
create index email_delivery_logs_reminder_id_idx on public.email_delivery_logs using btree (
  reminder_id
);
create index recurring_task_rules_user_id_idx on public.recurring_task_rules using btree (user_id);
create index recurring_task_rules_template_task_id_idx on public.recurring_task_rules using btree (
  template_task_id
);
create index recurring_task_rules_next_run_idx on public.recurring_task_rules using btree (
  is_active,
  next_run_at
);
create index notes_user_id_idx on public.notes using btree (user_id);
create index notes_user_note_type_idx on public.notes using btree (user_id, note_type);
create index note_links_note_id_idx on public.note_links using btree (note_id);
create index note_links_entity_idx on public.note_links using btree (
  linked_entity_type,
  linked_entity_id
);

create trigger set_plans_updated_at
before update on public.plans
for each row
execute function public.set_updated_at();

create trigger set_plan_entitlements_updated_at
before update on public.plan_entitlements
for each row
execute function public.set_updated_at();

create trigger set_billing_customers_updated_at
before update on public.billing_customers
for each row
execute function public.set_updated_at();

create trigger set_subscriptions_updated_at
before update on public.subscriptions
for each row
execute function public.set_updated_at();

create trigger set_areas_updated_at
before update on public.areas
for each row
execute function public.set_updated_at();

create trigger set_projects_updated_at
before update on public.projects
for each row
execute function public.set_updated_at();

create trigger set_goals_updated_at
before update on public.goals
for each row
execute function public.set_updated_at();

create trigger set_task_checklist_items_updated_at
before update on public.task_checklist_items
for each row
execute function public.set_updated_at();

create trigger set_daily_plans_updated_at
before update on public.daily_plans
for each row
execute function public.set_updated_at();

create trigger set_daily_plan_items_updated_at
before update on public.daily_plan_items
for each row
execute function public.set_updated_at();

create trigger set_time_blocks_updated_at
before update on public.time_blocks
for each row
execute function public.set_updated_at();

create trigger set_focus_sessions_updated_at
before update on public.focus_sessions
for each row
execute function public.set_updated_at();

create trigger set_reminders_updated_at
before update on public.reminders
for each row
execute function public.set_updated_at();

create trigger set_recurring_task_rules_updated_at
before update on public.recurring_task_rules
for each row
execute function public.set_updated_at();

create trigger set_notes_updated_at
before update on public.notes
for each row
execute function public.set_updated_at();

create or replace function private.owns_area(area_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.areas
    where id = $1
      and user_id = (select auth.uid())
  );
$$;

create or replace function private.owns_project(project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.projects
    where id = $1
      and user_id = (select auth.uid())
  );
$$;

create or replace function private.owns_goal(goal_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.goals
    where id = $1
      and user_id = (select auth.uid())
  );
$$;

create or replace function private.owns_task(task_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.tasks
    where id = $1
      and user_id = (select auth.uid())
  );
$$;

create or replace function private.owns_daily_plan(daily_plan_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.daily_plans
    where id = $1
      and user_id = (select auth.uid())
  );
$$;

create or replace function private.owns_note(note_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.notes
    where id = $1
      and user_id = (select auth.uid())
  );
$$;

create or replace function private.owns_reminder(reminder_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.reminders
    where id = $1
      and user_id = (select auth.uid())
  );
$$;

create or replace function private.can_use_task_links(
  area_id uuid,
  project_id uuid,
  goal_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    ($1 is null or private.owns_area($1))
    and ($2 is null or private.owns_project($2))
    and ($3 is null or private.owns_goal($3));
$$;

create or replace function private.can_access_goal_project(
  goal_id uuid,
  project_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.owns_goal($1) and private.owns_project($2);
$$;

create or replace function private.can_access_daily_plan_item(
  daily_plan_id uuid,
  task_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.owns_daily_plan($1) and private.owns_task($2);
$$;

create or replace function private.can_link_note(
  note_id uuid,
  linked_entity_type text,
  linked_entity_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.owns_note($1)
    and case $2
      when 'task' then private.owns_task($3)
      when 'project' then private.owns_project($3)
      when 'area' then private.owns_area($3)
      when 'goal' then private.owns_goal($3)
      else false
    end;
$$;

grant usage on schema private to authenticated;
grant execute on all functions in schema private to authenticated;

insert into public.plans (name, slug)
values
  ('Free', 'free'),
  ('Tier 1', 'tier_1'),
  ('Tier 2', 'tier_2')
on conflict (slug) do update
set
  name = excluded.name,
  updated_at = now();

drop policy if exists "tasks_insert_own" on public.tasks;
drop policy if exists "tasks_update_own" on public.tasks;

create policy "tasks_insert_own"
on public.tasks
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and private.can_use_task_links(area_id, project_id, goal_id)
);

create policy "tasks_update_own"
on public.tasks
for update
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and private.can_use_task_links(area_id, project_id, goal_id)
);

alter table public.plans enable row level security;
alter table public.plan_entitlements enable row level security;
alter table public.billing_customers enable row level security;
alter table public.subscriptions enable row level security;
alter table public.billing_events enable row level security;
alter table public.areas enable row level security;
alter table public.projects enable row level security;
alter table public.goals enable row level security;
alter table public.goal_projects enable row level security;
alter table public.task_checklist_items enable row level security;
alter table public.task_events enable row level security;
alter table public.daily_plans enable row level security;
alter table public.daily_plan_items enable row level security;
alter table public.time_blocks enable row level security;
alter table public.focus_sessions enable row level security;
alter table public.reminders enable row level security;
alter table public.email_delivery_logs enable row level security;
alter table public.recurring_task_rules enable row level security;
alter table public.notes enable row level security;
alter table public.note_links enable row level security;

create policy "plans_select_all"
on public.plans
for select
to anon, authenticated
using (true);

create policy "plan_entitlements_select_all"
on public.plan_entitlements
for select
to anon, authenticated
using (true);

create policy "billing_customers_select_own"
on public.billing_customers
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "subscriptions_select_own"
on public.subscriptions
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "areas_select_own"
on public.areas
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "areas_insert_own"
on public.areas
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "areas_update_own"
on public.areas
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "areas_delete_own"
on public.areas
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "projects_select_own"
on public.projects
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "projects_insert_own"
on public.projects
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and (area_id is null or private.owns_area(area_id))
);

create policy "projects_update_own"
on public.projects
for update
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and (area_id is null or private.owns_area(area_id))
);

create policy "projects_delete_own"
on public.projects
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "goals_select_own"
on public.goals
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "goals_insert_own"
on public.goals
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and (area_id is null or private.owns_area(area_id))
);

create policy "goals_update_own"
on public.goals
for update
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and (area_id is null or private.owns_area(area_id))
);

create policy "goals_delete_own"
on public.goals
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "goal_projects_select_own"
on public.goal_projects
for select
to authenticated
using (private.can_access_goal_project(goal_id, project_id));

create policy "goal_projects_insert_own"
on public.goal_projects
for insert
to authenticated
with check (private.can_access_goal_project(goal_id, project_id));

create policy "goal_projects_delete_own"
on public.goal_projects
for delete
to authenticated
using (private.can_access_goal_project(goal_id, project_id));

create policy "task_checklist_items_select_own"
on public.task_checklist_items
for select
to authenticated
using (private.owns_task(task_id));

create policy "task_checklist_items_insert_own"
on public.task_checklist_items
for insert
to authenticated
with check (private.owns_task(task_id));

create policy "task_checklist_items_update_own"
on public.task_checklist_items
for update
to authenticated
using (private.owns_task(task_id))
with check (private.owns_task(task_id));

create policy "task_checklist_items_delete_own"
on public.task_checklist_items
for delete
to authenticated
using (private.owns_task(task_id));

create policy "task_events_select_own"
on public.task_events
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "task_events_insert_own"
on public.task_events
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and (task_id is null or private.owns_task(task_id))
);

create policy "daily_plans_select_own"
on public.daily_plans
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "daily_plans_insert_own"
on public.daily_plans
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "daily_plans_update_own"
on public.daily_plans
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "daily_plans_delete_own"
on public.daily_plans
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "daily_plan_items_select_own"
on public.daily_plan_items
for select
to authenticated
using (private.can_access_daily_plan_item(daily_plan_id, task_id));

create policy "daily_plan_items_insert_own"
on public.daily_plan_items
for insert
to authenticated
with check (private.can_access_daily_plan_item(daily_plan_id, task_id));

create policy "daily_plan_items_update_own"
on public.daily_plan_items
for update
to authenticated
using (private.can_access_daily_plan_item(daily_plan_id, task_id))
with check (private.can_access_daily_plan_item(daily_plan_id, task_id));

create policy "daily_plan_items_delete_own"
on public.daily_plan_items
for delete
to authenticated
using (private.can_access_daily_plan_item(daily_plan_id, task_id));

create policy "time_blocks_select_own"
on public.time_blocks
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "time_blocks_insert_own"
on public.time_blocks
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and (task_id is null or private.owns_task(task_id))
  and (daily_plan_id is null or private.owns_daily_plan(daily_plan_id))
);

create policy "time_blocks_update_own"
on public.time_blocks
for update
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and (task_id is null or private.owns_task(task_id))
  and (daily_plan_id is null or private.owns_daily_plan(daily_plan_id))
);

create policy "time_blocks_delete_own"
on public.time_blocks
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "focus_sessions_select_own"
on public.focus_sessions
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "focus_sessions_insert_own"
on public.focus_sessions
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and (task_id is null or private.owns_task(task_id))
);

create policy "focus_sessions_update_own"
on public.focus_sessions
for update
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and (task_id is null or private.owns_task(task_id))
);

create policy "focus_sessions_delete_own"
on public.focus_sessions
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "reminders_select_own"
on public.reminders
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "reminders_insert_own"
on public.reminders
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and (task_id is null or private.owns_task(task_id))
);

create policy "reminders_update_own"
on public.reminders
for update
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and (task_id is null or private.owns_task(task_id))
);

create policy "reminders_delete_own"
on public.reminders
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "email_delivery_logs_select_own"
on public.email_delivery_logs
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "recurring_task_rules_select_own"
on public.recurring_task_rules
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "recurring_task_rules_insert_own"
on public.recurring_task_rules
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and private.owns_task(template_task_id)
);

create policy "recurring_task_rules_update_own"
on public.recurring_task_rules
for update
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and private.owns_task(template_task_id)
);

create policy "recurring_task_rules_delete_own"
on public.recurring_task_rules
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "notes_select_own"
on public.notes
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "notes_insert_own"
on public.notes
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "notes_update_own"
on public.notes
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "notes_delete_own"
on public.notes
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "note_links_select_own"
on public.note_links
for select
to authenticated
using (private.can_link_note(note_id, linked_entity_type, linked_entity_id));

create policy "note_links_insert_own"
on public.note_links
for insert
to authenticated
with check (private.can_link_note(note_id, linked_entity_type, linked_entity_id));

create policy "note_links_delete_own"
on public.note_links
for delete
to authenticated
using (private.can_link_note(note_id, linked_entity_type, linked_entity_id));

revoke all on public.plans from anon, authenticated;
revoke all on public.plan_entitlements from anon, authenticated;
revoke all on public.billing_customers from anon, authenticated;
revoke all on public.subscriptions from anon, authenticated;
revoke all on public.billing_events from anon, authenticated;
revoke all on public.areas from anon, authenticated;
revoke all on public.projects from anon, authenticated;
revoke all on public.goals from anon, authenticated;
revoke all on public.goal_projects from anon, authenticated;
revoke all on public.task_checklist_items from anon, authenticated;
revoke all on public.task_events from anon, authenticated;
revoke all on public.daily_plans from anon, authenticated;
revoke all on public.daily_plan_items from anon, authenticated;
revoke all on public.time_blocks from anon, authenticated;
revoke all on public.focus_sessions from anon, authenticated;
revoke all on public.reminders from anon, authenticated;
revoke all on public.email_delivery_logs from anon, authenticated;
revoke all on public.recurring_task_rules from anon, authenticated;
revoke all on public.notes from anon, authenticated;
revoke all on public.note_links from anon, authenticated;

grant select on public.plans to anon, authenticated;
grant select on public.plan_entitlements to anon, authenticated;
grant select on public.billing_customers to authenticated;
grant select on public.subscriptions to authenticated;
grant select, insert, update, delete on public.areas to authenticated;
grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, update, delete on public.goals to authenticated;
grant select, insert, delete on public.goal_projects to authenticated;
grant select, insert, update, delete on public.task_checklist_items to authenticated;
grant select, insert on public.task_events to authenticated;
grant select, insert, update, delete on public.daily_plans to authenticated;
grant select, insert, update, delete on public.daily_plan_items to authenticated;
grant select, insert, update, delete on public.time_blocks to authenticated;
grant select, insert, update, delete on public.focus_sessions to authenticated;
grant select, insert, update, delete on public.reminders to authenticated;
grant select on public.email_delivery_logs to authenticated;
grant select, insert, update, delete on public.recurring_task_rules to authenticated;
grant select, insert, update, delete on public.notes to authenticated;
grant select, insert, delete on public.note_links to authenticated;

grant all on public.plans to service_role;
grant all on public.plan_entitlements to service_role;
grant all on public.billing_customers to service_role;
grant all on public.subscriptions to service_role;
grant all on public.billing_events to service_role;
grant all on public.areas to service_role;
grant all on public.projects to service_role;
grant all on public.goals to service_role;
grant all on public.goal_projects to service_role;
grant all on public.task_checklist_items to service_role;
grant all on public.task_events to service_role;
grant all on public.daily_plans to service_role;
grant all on public.daily_plan_items to service_role;
grant all on public.time_blocks to service_role;
grant all on public.focus_sessions to service_role;
grant all on public.reminders to service_role;
grant all on public.email_delivery_logs to service_role;
grant all on public.recurring_task_rules to service_role;
grant all on public.notes to service_role;
grant all on public.note_links to service_role;
