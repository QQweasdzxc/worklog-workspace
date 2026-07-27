-- P4.1 Conversation Foundation Verification
-- Expected: all rows show PASS after applying 20260711_p4_1_conversation_foundation_schema.sql

select
  table_name,
  case when to_regclass('public.' || table_name) is not null then 'PASS' else 'FAIL' end as table_exists
from (values
  ('assistant_conversations'),
  ('assistant_messages'),
  ('assistant_conversation_states')
) as t(table_name);

select
  indexname,
  'PASS' as index_exists
from pg_indexes
where schemaname = 'public'
  and indexname in (
    'assistant_conversations_user_thread_uidx',
    'assistant_messages_user_client_uidx',
    'assistant_messages_user_created_idx',
    'assistant_messages_conversation_created_idx',
    'assistant_conversation_states_user_key_uidx',
    'assistant_conversation_states_user_updated_idx'
  )
order by indexname;

select
  relname as table_name,
  case when relrowsecurity then 'PASS' else 'FAIL' end as rls_enabled
from pg_class
where oid in (
  'public.assistant_conversations'::regclass,
  'public.assistant_messages'::regclass,
  'public.assistant_conversation_states'::regclass
)
order by relname;

select
  tablename,
  policyname,
  'PASS' as policy_exists
from pg_policies
where schemaname = 'public'
  and tablename in ('assistant_conversations', 'assistant_messages', 'assistant_conversation_states')
order by tablename, policyname;

select
  table_name,
  privilege_type,
  grantee,
  'PASS' as grant_exists
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('assistant_conversations', 'assistant_messages', 'assistant_conversation_states')
  and grantee = 'authenticated'
order by table_name, privilege_type;
