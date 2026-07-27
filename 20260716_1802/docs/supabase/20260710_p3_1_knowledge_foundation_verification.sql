-- P3-1 Knowledge Foundation verification

select 'knowledge_sources exists' as check_name,
  to_regclass('public.knowledge_sources') is not null as pass;

select 'knowledge_sources rls enabled' as check_name,
  relrowsecurity as pass
from pg_class
where oid = 'public.knowledge_sources'::regclass;

select 'knowledge_sources authenticated grants' as check_name,
  bool_and(has_table_privilege('authenticated', 'public.knowledge_sources', privilege)) as pass
from (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')) as p(privilege);

select 'knowledge_sources policies' as check_name,
  count(*) = 4 as pass
from pg_policies
where schemaname = 'public'
  and tablename = 'knowledge_sources'
  and policyname in (
    'knowledge_sources_select_own',
    'knowledge_sources_insert_own',
    'knowledge_sources_update_own',
    'knowledge_sources_delete_own'
  );

select 'knowledge_sources indexes' as check_name,
  count(*) >= 6 as pass
from pg_indexes
where schemaname = 'public'
  and tablename = 'knowledge_sources';
