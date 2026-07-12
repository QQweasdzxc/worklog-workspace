-- Zhuge AI OS / P4.5 User Work Profile Verification

select 'user_work_profiles exists' as check_name,
  to_regclass('public.user_work_profiles') is not null as pass;

select 'user_work_profiles required columns' as check_name,
  count(*) = 15 as pass
from information_schema.columns
where table_schema = 'public'
  and table_name = 'user_work_profiles'
  and column_name in (
    'id','user_uuid','ecp_responsible_person','ecp_department','default_task','default_work_model',
    'profile_completed','profile_completed_at','last_profile_check_date','last_profile_prompt_date',
    'task_effective_month','task_verified_at','expires_at','created_at','updated_at'
  );

select 'RLS enabled' as check_name,
  c.relrowsecurity as pass
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'user_work_profiles';

select 'authenticated grants' as check_name,
  bool_and(has_table_privilege('authenticated', 'public.user_work_profiles', privilege)) as pass
from unnest(array['SELECT','INSERT','UPDATE','DELETE']) as privileges(privilege);

select 'own-user policies' as check_name,
  count(*) = 4 as pass
from pg_policies
where schemaname = 'public'
  and tablename = 'user_work_profiles'
  and policyname in (
    'user_work_profiles_select_own',
    'user_work_profiles_insert_own',
    'user_work_profiles_update_own',
    'user_work_profiles_delete_own'
  );

select 'unique user_uuid index' as check_name,
  exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'user_work_profiles'
      and indexname = 'user_work_profiles_user_uuid_uidx'
  ) as pass;
