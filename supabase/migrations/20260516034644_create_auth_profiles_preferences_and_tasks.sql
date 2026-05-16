-- Create the first Opexlo application schema slice.
--
-- Supabase Auth remains the source of truth for users. These tables store
-- app-owned profile, preference, and task data linked to auth.users.

create extension if not exists pgcrypto with schema extensions;

create table public.profiles (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text,
  email text not null,
  avatar_url text,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_timezone_not_blank check (length(btrim(timezone)) > 0)
);

create table public.user_preferences (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  default_planning_reminder_time time,
  default_shutdown_reminder_time time,
  email_reminders_enabled boolean not null default true,
  daily_planning_reminders_enabled boolean not null default false,
  shutdown_reminders_enabled boolean not null default false,
  default_focus_minutes integer not null default 25,
  default_break_minutes integer not null default 5,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_preferences_default_focus_minutes_positive check (
    default_focus_minutes > 0
  ),
  constraint user_preferences_default_break_minutes_positive check (
    default_break_minutes > 0
  )
);

create table public.tasks (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'inbox',
  priority text not null default 'medium',
  due_date date,
  planned_date date,
  estimated_minutes integer,
  completed_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_title_not_blank check (length(btrim(title)) > 0),
  constraint tasks_status_check check (
    status in ('inbox', 'planned', 'in_progress', 'completed', 'archived')
  ),
  constraint tasks_priority_check check (
    priority in ('low', 'medium', 'high', 'urgent')
  ),
  constraint tasks_estimated_minutes_positive check (
    estimated_minutes is null or estimated_minutes > 0
  )
);

create index profiles_user_id_idx on public.profiles using btree (user_id);
create index user_preferences_user_id_idx on public.user_preferences using btree (user_id);
create index tasks_user_id_idx on public.tasks using btree (user_id);
create index tasks_user_status_idx on public.tasks using btree (user_id, status);
create index tasks_user_planned_date_idx on public.tasks using btree (user_id, planned_date);
create index tasks_user_due_date_idx on public.tasks using btree (user_id, due_date);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create trigger set_user_preferences_updated_at
before update on public.user_preferences
for each row
execute function public.set_updated_at();

create trigger set_tasks_updated_at
before update on public.tasks
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_opexlo_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (
    user_id,
    email,
    full_name,
    avatar_url,
    timezone
  )
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'timezone', ''), 'UTC')
  )
  on conflict (user_id) do nothing;

  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created_create_opexlo_defaults
after insert on auth.users
for each row
execute function public.handle_new_opexlo_user();

insert into public.profiles (
  user_id,
  email,
  full_name,
  avatar_url,
  timezone
)
select
  users.id,
  coalesce(users.email, ''),
  nullif(users.raw_user_meta_data ->> 'full_name', ''),
  nullif(users.raw_user_meta_data ->> 'avatar_url', ''),
  coalesce(nullif(users.raw_user_meta_data ->> 'timezone', ''), 'UTC')
from auth.users
on conflict (user_id) do nothing;

insert into public.user_preferences (user_id)
select users.id
from auth.users
on conflict (user_id) do nothing;

alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.tasks enable row level security;

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "user_preferences_select_own"
on public.user_preferences
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "user_preferences_update_own"
on public.user_preferences
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "tasks_select_own"
on public.tasks
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "tasks_insert_own"
on public.tasks
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "tasks_update_own"
on public.tasks
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "tasks_delete_own"
on public.tasks
for delete
to authenticated
using ((select auth.uid()) = user_id);

grant usage on schema public to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select, update on public.user_preferences to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
grant all on public.profiles to service_role;
grant all on public.user_preferences to service_role;
grant all on public.tasks to service_role;
