-- Zhuge AI OS / P4.5 User Work Profile Foundation
-- Scope: Work Profile identity for ECP readiness and progressive profiling.
-- Not included: OAuth changes, WorkLog schema changes, Knowledge/RAG/AI features.

begin;

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.user_work_profiles (
  id uuid primary key default gen_random_uuid(),
  user_uuid uuid not null references auth.users(id) on delete cascade,
  ecp_responsible_person text not null default '',
  ecp_department text not null default '',
  default_task text not null default '',
  default_work_model text not null default '',
  profile_completed boolean not null default false,
  profile_completed_at timestamptz,
  last_profile_check_date date,
  last_profile_prompt_date date,
  task_effective_month text,
  task_verified_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_work_profiles_effective_month_check check (task_effective_month is null or task_effective_month ~ '^[0-9]{4}-[0-9]{2}$')
);

create unique index if not exists user_work_profiles_user_uuid_uidx on public.user_work_profiles(user_uuid);
create index if not exists user_work_profiles_completed_idx on public.user_work_profiles(user_uuid, profile_completed);
create index if not exists user_work_profiles_task_month_idx on public.user_work_profiles(user_uuid, task_effective_month);

drop trigger if exists set_user_work_profiles_updated_at on public.user_work_profiles;
create trigger set_user_work_profiles_updated_at
before update on public.user_work_profiles
for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.user_work_profiles to authenticated;

alter table public.user_work_profiles enable row level security;

drop policy if exists "user_work_profiles_select_own" on public.user_work_profiles;
create policy "user_work_profiles_select_own"
on public.user_work_profiles for select to authenticated
using ((select auth.uid()) = user_uuid);

drop policy if exists "user_work_profiles_insert_own" on public.user_work_profiles;
create policy "user_work_profiles_insert_own"
on public.user_work_profiles for insert to authenticated
with check ((select auth.uid()) = user_uuid);

drop policy if exists "user_work_profiles_update_own" on public.user_work_profiles;
create policy "user_work_profiles_update_own"
on public.user_work_profiles for update to authenticated
using ((select auth.uid()) = user_uuid)
with check ((select auth.uid()) = user_uuid);

drop policy if exists "user_work_profiles_delete_own" on public.user_work_profiles;
create policy "user_work_profiles_delete_own"
on public.user_work_profiles for delete to authenticated
using ((select auth.uid()) = user_uuid);

comment on table public.user_work_profiles is 'P4.5 User Work Profile Foundation: shared work identity for ECP readiness and future agents.';

commit;
