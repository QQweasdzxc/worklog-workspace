-- P5.6 Work Memory Cloud Foundation verification

select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'user_work_models'
order by ordinal_position;

select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'user_work_models'
order by indexname;

select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'user_work_models'
order by policyname;

select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'user_work_models'
  and grantee = 'authenticated'
order by privilege_type;

select
  count(*) as total_rows,
  count(*) filter (where description <> '') as rows_with_description,
  count(*) filter (where category <> '一般工作') as rows_with_category,
  count(*) filter (where cardinality(aliases) > 0) as rows_with_aliases,
  count(*) filter (where jsonb_array_length(source_references) > 0) as rows_with_sources,
  count(*) filter (where not is_active) as inactive_rows
from public.user_work_models
where user_uuid = auth.uid();
