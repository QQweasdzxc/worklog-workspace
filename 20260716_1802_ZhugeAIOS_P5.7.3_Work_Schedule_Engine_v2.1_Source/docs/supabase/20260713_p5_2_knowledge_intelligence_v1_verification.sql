select 'knowledge_sources p5.2 columns' as check_name,
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'knowledge_sources'
      and column_name in ('extracted_text', 'intelligence_summary', 'intelligence_error', 'processed_at', 'verified_at')
    group by table_schema, table_name
    having count(*) = 5
  ) as pass;

select 'knowledge_recommendation_candidates exists' as check_name,
  to_regclass('public.knowledge_recommendation_candidates') is not null as pass;

select 'knowledge_recommendation_candidates rls enabled' as check_name,
  relrowsecurity as pass
from pg_class
where oid = 'public.knowledge_recommendation_candidates'::regclass;

select 'knowledge_recommendation_candidates authenticated grants' as check_name,
  count(*) >= 4 as pass
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'knowledge_recommendation_candidates'
  and grantee = 'authenticated'
  and privilege_type in ('SELECT','INSERT','UPDATE','DELETE');

select 'knowledge_recommendation_candidates own-user policies' as check_name,
  count(*) >= 4 as pass
from pg_policies
where schemaname = 'public'
  and tablename = 'knowledge_recommendation_candidates'
  and policyname in (
    'knowledge_recommendation_candidates_select_own',
    'knowledge_recommendation_candidates_insert_own',
    'knowledge_recommendation_candidates_update_own',
    'knowledge_recommendation_candidates_delete_own'
  );
