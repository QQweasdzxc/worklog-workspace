-- Zhuge AI OS / P5 Phase 1 Knowledge Repository Verification

select 'knowledge_sources exists' as check_name, to_regclass('public.knowledge_sources') is not null as pass;
select 'knowledge_units exists' as check_name, to_regclass('public.knowledge_units') is not null as pass;
select 'knowledge_suggested_skills exists' as check_name, to_regclass('public.knowledge_suggested_skills') is not null as pass;
select 'recommendation_feedback exists' as check_name, to_regclass('public.recommendation_feedback') is not null as pass;

select 'knowledge bucket exists' as check_name,
  exists(select 1 from storage.buckets where id = 'knowledge-sources' and public = false) as pass;

select 'knowledge_sources required columns' as check_name,
  count(*) = 29 as pass
from information_schema.columns
where table_schema = 'public'
  and table_name = 'knowledge_sources'
  and column_name in (
    'id','knowledge_id','user_uuid','organization_id','tenant_id','title','description','scope','category',
    'source_type','source_name','source_url','storage_path','mime_type','file_size','tags','triggers',
    'applicable_agents','related_roles','related_work_models','version','source_version','processing_status',
    'created_by','updated_by','created_at','updated_at','deleted_at','legacy_id'
  );

select 'RLS enabled' as check_name,
  bool_and(c.relrowsecurity) as pass
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('knowledge_sources','knowledge_units','knowledge_suggested_skills','recommendation_feedback');

select 'authenticated grants' as check_name,
  bool_and(has_table_privilege('authenticated', table_name, privilege)) as pass
from (
  select table_name, privilege
  from unnest(array['public.knowledge_sources','public.knowledge_units','public.knowledge_suggested_skills','public.recommendation_feedback']) as tables(table_name)
  cross join unnest(array['SELECT','INSERT','UPDATE','DELETE']) as privileges(privilege)
) checks;

select 'knowledge_sources own-user policies' as check_name,
  count(*) = 4 as pass
from pg_policies
where schemaname = 'public'
  and tablename = 'knowledge_sources'
  and policyname in ('knowledge_sources_select_own','knowledge_sources_insert_own','knowledge_sources_update_own','knowledge_sources_delete_own');

select 'storage policies' as check_name,
  count(*) = 4 as pass
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and policyname in ('knowledge_sources_storage_select_own','knowledge_sources_storage_insert_own','knowledge_sources_storage_update_own','knowledge_sources_storage_delete_own');

select 'knowledge id function executable' as check_name,
  has_function_privilege('authenticated', 'public.next_knowledge_id()', 'EXECUTE') as pass;

select 'knowledge sequence grant' as check_name,
  has_sequence_privilege('authenticated', 'public.knowledge_id_seq', 'USAGE') as pass;
