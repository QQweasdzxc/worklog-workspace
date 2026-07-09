-- Zhuge AI OS / WorkLog
-- RC3.4A Cloud Sync MVP
-- Phase 1 Verification SQL
--
-- This file is read-only verification. It should not modify production data.

-- 1. Tables must exist.
select
  table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'user_profiles',
    'user_work_models',
    'user_export_settings',
    'user_ecp_tasks',
    'work_entries',
    'sync_migrations'
  )
order by table_name;

-- 2. RLS must be enabled and forced off.
-- relrowsecurity should be true for all six RC3.4A tables.
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as force_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'user_profiles',
    'user_work_models',
    'user_export_settings',
    'user_ecp_tasks',
    'work_entries',
    'sync_migrations'
  )
order by c.relname;

-- 3. Policies must exist.
-- Expected count:
--   user_profiles: 4
--   user_work_models: 4
--   user_export_settings: 4
--   user_ecp_tasks: 4
--   work_entries: 4
--   sync_migrations: 4
select
  schemaname,
  tablename,
  policyname,
  cmd,
  roles,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'user_profiles',
    'user_work_models',
    'user_export_settings',
    'user_ecp_tasks',
    'work_entries',
    'sync_migrations'
  )
order by tablename, policyname;

-- 4. Grants for authenticated role.
select
  table_schema,
  table_name,
  grantee,
  string_agg(privilege_type, ', ' order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
    'user_profiles',
    'user_work_models',
    'user_export_settings',
    'user_ecp_tasks',
    'work_entries',
    'sync_migrations'
  )
  and grantee = 'authenticated'
group by table_schema, table_name, grantee
order by table_name;

-- 5. Indexes.
select
  tablename,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in (
    'user_profiles',
    'user_work_models',
    'user_export_settings',
    'user_ecp_tasks',
    'work_entries',
    'sync_migrations'
  )
order by tablename, indexname;

-- 6. Foreign keys.
select
  conrelid::regclass as table_name,
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
from pg_constraint
where contype = 'f'
  and conrelid in (
    'public.user_profiles'::regclass,
    'public.user_work_models'::regclass,
    'public.user_export_settings'::regclass,
    'public.user_ecp_tasks'::regclass,
    'public.work_entries'::regclass,
    'public.sync_migrations'::regclass
  )
order by table_name::text, constraint_name;

-- 7. RLS smoke test guidance.
-- Run from the app or Supabase REST client with a real authenticated user's JWT:
--
-- A. Insert a user_profiles row with user_uuid = authenticated user's auth.uid().
--    Expected: success.
--
-- B. Insert a user_profiles row with a different user_uuid.
--    Expected: blocked by RLS.
--
-- C. User A inserts one work_entries row.
--    User B queries work_entries.
--    Expected: User B cannot see User A's row.
--
-- D. User A creates user_ecp_tasks row.
--    User A creates work_entries row using that ecp_task_id.
--    Expected: success.
--
-- E. User A attempts to create work_entries row using User B's ecp_task_id.
--    Expected: blocked by composite FK or RLS-visible ownership boundary.
