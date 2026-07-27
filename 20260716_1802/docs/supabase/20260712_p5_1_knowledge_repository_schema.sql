-- Zhuge AI OS / P5 Phase 1 Knowledge Repository Foundation
-- Scope: Knowledge Repository + Supabase Storage foundation only.
-- Explicitly not included: PDF parsing, OCR, chunking, embeddings, vector DB, RAG, Knowledge Chat, Context Engine, Reasoning, automatic Recommendations.

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

create sequence if not exists public.knowledge_id_seq start 1;

create or replace function public.next_knowledge_id()
returns text
language sql
security invoker
as $$
  select 'KB-' || lpad(nextval('public.knowledge_id_seq')::text, 6, '0');
$$;

revoke all on function public.next_knowledge_id() from public;
grant execute on function public.next_knowledge_id() to authenticated;
grant usage, select, update on sequence public.knowledge_id_seq to authenticated;

create table if not exists public.knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  user_uuid uuid not null references auth.users(id) on delete cascade,
  knowledge_id text,
  title text not null,
  description text,
  category text not null default '其他',
  scope text not null default 'personal',
  applicable_agents text[] not null default '{}',
  tags text[] not null default '{}',
  version text not null default 'v1.0',
  filename text,
  storage_path text,
  legacy_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.knowledge_sources
  add column if not exists organization_id uuid,
  add column if not exists tenant_id uuid,
  add column if not exists source_type text not null default 'file',
  add column if not exists source_name text,
  add column if not exists source_url text,
  add column if not exists mime_type text,
  add column if not exists file_size bigint,
  add column if not exists triggers text[] not null default '{}',
  add column if not exists related_roles text[] not null default '{}',
  add column if not exists related_work_models text[] not null default '{}',
  add column if not exists source_version text not null default 'v1.0',
  add column if not exists processing_status text not null default 'uploaded',
  add column if not exists status text,
  add column if not exists ai_status text,
  add column if not exists created_by uuid,
  add column if not exists updated_by uuid;

-- Backfill / normalize old P3 status and scope values before new constraints.
update public.knowledge_sources
set scope = case scope
  when 'Personal' then 'personal'
  when 'Role' then 'role'
  when 'Company' then 'company'
  when 'Public' then 'public'
  else coalesce(nullif(lower(scope), ''), 'personal')
end
where scope is not null;

update public.knowledge_sources
set processing_status = case coalesce(processing_status, status, ai_status, 'uploaded')
  when '🟡 已上傳' then 'uploaded'
  when '🔵 AI 已閱讀' then 'processed'
  when '🟢 AI 已建立知識' then 'knowledge_built'
  when '⭐ 已驗證' then 'verified'
  when '未建立' then 'uploaded'
  when '等待 AI 閱讀' then 'uploaded'
  when 'AI 已閱讀' then 'processed'
  when 'AI 已建立知識' then 'knowledge_built'
  when '已驗證' then 'verified'
  else coalesce(processing_status, 'uploaded')
end;

update public.knowledge_sources
set knowledge_id = public.next_knowledge_id()
where knowledge_id is null or length(trim(knowledge_id)) = 0;

update public.knowledge_sources
set source_name = coalesce(source_name, filename, title),
    source_version = coalesce(source_version, version, 'v1.0'),
    created_by = coalesce(created_by, user_uuid),
    updated_by = coalesce(updated_by, user_uuid)
where source_name is null or source_version is null or created_by is null or updated_by is null;

select setval(
  'public.knowledge_id_seq',
  greatest(
    coalesce((select max((regexp_match(knowledge_id, '^KB-(\d{6})$'))[1]::bigint) from public.knowledge_sources), 0),
    last_value
  )
)
from public.knowledge_id_seq;

alter table public.knowledge_sources
  alter column knowledge_id set not null,
  alter column knowledge_id set default public.next_knowledge_id(),
  alter column scope set default 'personal',
  alter column processing_status set default 'uploaded';

alter table public.knowledge_sources drop constraint if exists knowledge_sources_knowledge_id_not_blank;
alter table public.knowledge_sources drop constraint if exists knowledge_sources_title_not_blank;
alter table public.knowledge_sources drop constraint if exists knowledge_sources_category_check;
alter table public.knowledge_sources drop constraint if exists knowledge_sources_scope_check;
alter table public.knowledge_sources drop constraint if exists knowledge_sources_status_check;
alter table public.knowledge_sources drop constraint if exists knowledge_sources_ai_status_check;
alter table public.knowledge_sources drop constraint if exists knowledge_sources_source_type_check;
alter table public.knowledge_sources drop constraint if exists knowledge_sources_processing_status_check;

alter table public.knowledge_sources
  add constraint knowledge_sources_knowledge_id_not_blank check (length(trim(knowledge_id)) > 0),
  add constraint knowledge_sources_title_not_blank check (length(trim(title)) > 0),
  add constraint knowledge_sources_category_check check (category in ('SOP', '制度', '法規', '專案', '表單', '教材', '會議', '其他')),
  add constraint knowledge_sources_scope_check check (scope in ('personal', 'role', 'company', 'public')),
  add constraint knowledge_sources_source_type_check check (source_type in ('file', 'pdf', 'word', 'excel', 'powerpoint', 'markdown', 'url', 'legacy_metadata')),
  add constraint knowledge_sources_processing_status_check check (processing_status in ('uploaded', 'queued', 'processing', 'processed', 'knowledge_built', 'verified', 'failed', 'archived'));

create unique index if not exists knowledge_sources_user_knowledge_uidx
  on public.knowledge_sources(user_uuid, knowledge_id)
  where deleted_at is null;

create unique index if not exists knowledge_sources_user_legacy_uidx
  on public.knowledge_sources(user_uuid, legacy_id)
  where legacy_id is not null;

create index if not exists knowledge_sources_user_category_idx on public.knowledge_sources(user_uuid, category);
create index if not exists knowledge_sources_user_scope_idx on public.knowledge_sources(user_uuid, scope);
create index if not exists knowledge_sources_user_processing_idx on public.knowledge_sources(user_uuid, processing_status);
create index if not exists knowledge_sources_user_updated_idx on public.knowledge_sources(user_uuid, updated_at desc);
create index if not exists knowledge_sources_org_scope_idx on public.knowledge_sources(organization_id, scope) where organization_id is not null;

-- Knowledge Units are reserved for future Knowledge Intelligence. P5 Phase 1 keeps this table empty.
create table if not exists public.knowledge_units (
  id uuid primary key default gen_random_uuid(),
  user_uuid uuid not null references auth.users(id) on delete cascade,
  knowledge_source_id uuid not null references public.knowledge_sources(id) on delete cascade,
  unit_type text not null default 'reference',
  title text not null,
  content text,
  summary text,
  page_reference text,
  section_reference text,
  triggers text[] not null default '{}',
  applicable_roles text[] not null default '{}',
  applicable_agents text[] not null default '{}',
  related_work_models text[] not null default '{}',
  suggested_skills jsonb not null default '[]'::jsonb,
  priority text not null default 'medium',
  confidence numeric(4,3),
  version text not null default 'v1.0',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint knowledge_units_type_check check (unit_type in ('rule', 'checklist', 'process', 'exception', 'form', 'faq', 'recommendation', 'reference')),
  constraint knowledge_units_priority_check check (priority in ('high', 'medium', 'low')),
  constraint knowledge_units_status_check check (status in ('active', 'deprecated', 'archived')),
  constraint knowledge_units_confidence_check check (confidence is null or (confidence >= 0 and confidence <= 1))
);

create index if not exists knowledge_units_source_idx on public.knowledge_units(knowledge_source_id);
create index if not exists knowledge_units_user_idx on public.knowledge_units(user_uuid);

create table if not exists public.knowledge_suggested_skills (
  id uuid primary key default gen_random_uuid(),
  user_uuid uuid not null references auth.users(id) on delete cascade,
  knowledge_source_id uuid references public.knowledge_sources(id) on delete cascade,
  knowledge_unit_id uuid references public.knowledge_units(id) on delete cascade,
  skill_code text not null,
  skill_label text,
  default_payload_template jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint knowledge_suggested_skills_status_check check (status in ('active', 'archived'))
);

create table if not exists public.recommendation_feedback (
  id uuid primary key default gen_random_uuid(),
  user_uuid uuid not null references auth.users(id) on delete cascade,
  organization_id uuid,
  recommendation_id uuid,
  action text not null,
  reason text,
  feedback_text text,
  created_at timestamptz not null default now(),
  constraint recommendation_feedback_action_check check (action in ('accepted', 'edited', 'dismissed', 'remind_later', 'viewed_source', 'do_not_suggest_again')),
  constraint recommendation_feedback_reason_check check (reason is null or reason in ('helpful', 'not_relevant', 'already_done', 'wrong_timing', 'wrong_role', 'duplicate', 'other'))
);

create index if not exists recommendation_feedback_user_idx on public.recommendation_feedback(user_uuid, created_at desc);

-- Updated-at triggers.
drop trigger if exists set_knowledge_sources_updated_at on public.knowledge_sources;
create trigger set_knowledge_sources_updated_at before update on public.knowledge_sources for each row execute function public.set_updated_at();

drop trigger if exists set_knowledge_units_updated_at on public.knowledge_units;
create trigger set_knowledge_units_updated_at before update on public.knowledge_units for each row execute function public.set_updated_at();

drop trigger if exists set_knowledge_suggested_skills_updated_at on public.knowledge_suggested_skills;
create trigger set_knowledge_suggested_skills_updated_at before update on public.knowledge_suggested_skills for each row execute function public.set_updated_at();

-- Grants for Data API exposure. RLS below still controls rows.
grant select, insert, update, delete on public.knowledge_sources to authenticated;
grant select, insert, update, delete on public.knowledge_units to authenticated;
grant select, insert, update, delete on public.knowledge_suggested_skills to authenticated;
grant select, insert, update, delete on public.recommendation_feedback to authenticated;

alter table public.knowledge_sources enable row level security;
alter table public.knowledge_units enable row level security;
alter table public.knowledge_suggested_skills enable row level security;
alter table public.recommendation_feedback enable row level security;

-- P5 Phase 1 permission model: personal owner isolation only. Company/Role/Public metadata can be stored, but cross-user sharing awaits Organization Identity.
drop policy if exists "knowledge_sources_select_own" on public.knowledge_sources;
create policy "knowledge_sources_select_own" on public.knowledge_sources for select to authenticated using ((select auth.uid()) = user_uuid);

drop policy if exists "knowledge_sources_insert_own" on public.knowledge_sources;
create policy "knowledge_sources_insert_own" on public.knowledge_sources for insert to authenticated with check ((select auth.uid()) = user_uuid);

drop policy if exists "knowledge_sources_update_own" on public.knowledge_sources;
create policy "knowledge_sources_update_own" on public.knowledge_sources for update to authenticated using ((select auth.uid()) = user_uuid) with check ((select auth.uid()) = user_uuid);

drop policy if exists "knowledge_sources_delete_own" on public.knowledge_sources;
create policy "knowledge_sources_delete_own" on public.knowledge_sources for delete to authenticated using ((select auth.uid()) = user_uuid);

-- Child/stub tables use the same owner predicate.
drop policy if exists "knowledge_units_select_own" on public.knowledge_units;
create policy "knowledge_units_select_own" on public.knowledge_units for select to authenticated using ((select auth.uid()) = user_uuid);
drop policy if exists "knowledge_units_insert_own" on public.knowledge_units;
create policy "knowledge_units_insert_own" on public.knowledge_units for insert to authenticated with check ((select auth.uid()) = user_uuid);
drop policy if exists "knowledge_units_update_own" on public.knowledge_units;
create policy "knowledge_units_update_own" on public.knowledge_units for update to authenticated using ((select auth.uid()) = user_uuid) with check ((select auth.uid()) = user_uuid);
drop policy if exists "knowledge_units_delete_own" on public.knowledge_units;
create policy "knowledge_units_delete_own" on public.knowledge_units for delete to authenticated using ((select auth.uid()) = user_uuid);

drop policy if exists "knowledge_suggested_skills_select_own" on public.knowledge_suggested_skills;
create policy "knowledge_suggested_skills_select_own" on public.knowledge_suggested_skills for select to authenticated using ((select auth.uid()) = user_uuid);
drop policy if exists "knowledge_suggested_skills_insert_own" on public.knowledge_suggested_skills;
create policy "knowledge_suggested_skills_insert_own" on public.knowledge_suggested_skills for insert to authenticated with check ((select auth.uid()) = user_uuid);
drop policy if exists "knowledge_suggested_skills_update_own" on public.knowledge_suggested_skills;
create policy "knowledge_suggested_skills_update_own" on public.knowledge_suggested_skills for update to authenticated using ((select auth.uid()) = user_uuid) with check ((select auth.uid()) = user_uuid);
drop policy if exists "knowledge_suggested_skills_delete_own" on public.knowledge_suggested_skills;
create policy "knowledge_suggested_skills_delete_own" on public.knowledge_suggested_skills for delete to authenticated using ((select auth.uid()) = user_uuid);

drop policy if exists "recommendation_feedback_select_own" on public.recommendation_feedback;
create policy "recommendation_feedback_select_own" on public.recommendation_feedback for select to authenticated using ((select auth.uid()) = user_uuid);
drop policy if exists "recommendation_feedback_insert_own" on public.recommendation_feedback;
create policy "recommendation_feedback_insert_own" on public.recommendation_feedback for insert to authenticated with check ((select auth.uid()) = user_uuid);
drop policy if exists "recommendation_feedback_update_own" on public.recommendation_feedback;
create policy "recommendation_feedback_update_own" on public.recommendation_feedback for update to authenticated using ((select auth.uid()) = user_uuid) with check ((select auth.uid()) = user_uuid);
drop policy if exists "recommendation_feedback_delete_own" on public.recommendation_feedback;
create policy "recommendation_feedback_delete_own" on public.recommendation_feedback for delete to authenticated using ((select auth.uid()) = user_uuid);

-- Supabase Storage bucket for official Knowledge Source files.
insert into storage.buckets (id, name, public, file_size_limit)
values ('knowledge-sources', 'knowledge-sources', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = 52428800;

-- Storage object policies. Path convention: {user_uuid}/{knowledge_id}/{version}/{filename}
drop policy if exists "knowledge_sources_storage_select_own" on storage.objects;
create policy "knowledge_sources_storage_select_own"
on storage.objects for select to authenticated
using (bucket_id = 'knowledge-sources' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "knowledge_sources_storage_insert_own" on storage.objects;
create policy "knowledge_sources_storage_insert_own"
on storage.objects for insert to authenticated
with check (bucket_id = 'knowledge-sources' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "knowledge_sources_storage_update_own" on storage.objects;
create policy "knowledge_sources_storage_update_own"
on storage.objects for update to authenticated
using (bucket_id = 'knowledge-sources' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'knowledge-sources' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "knowledge_sources_storage_delete_own" on storage.objects;
create policy "knowledge_sources_storage_delete_own"
on storage.objects for delete to authenticated
using (bucket_id = 'knowledge-sources' and (storage.foldername(name))[1] = (select auth.uid())::text);

comment on table public.knowledge_sources is 'P5 Knowledge Repository Foundation: official metadata for ZhuGe AI OS Knowledge Brain sources.';
comment on table public.knowledge_units is 'P5 reserved Knowledge Unit table for future Knowledge Intelligence; P5 Phase 1 does not auto-populate it.';
comment on table public.recommendation_feedback is 'P5 reserved feedback contract for future Recommendation Cards.';

commit;
