-- Zhuge AI OS / P3-1 Knowledge Foundation
-- Scope: Knowledge Library metadata only.
-- Explicitly not included: PDF parsing, OCR, embedding, vector DB, chunks, AI search, RAG.

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

create table if not exists public.knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  user_uuid uuid not null references auth.users(id) on delete cascade,
  knowledge_id text not null,
  title text not null,
  description text,
  category text not null default '其他',
  scope text not null default 'Personal',
  applicable_agents text[] not null default '{}',
  tags text[] not null default '{}',
  status text not null default '🟡 已上傳',
  ai_status text not null default '未建立',
  version text not null default 'v1.0',
  filename text,
  storage_path text,
  legacy_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint knowledge_sources_knowledge_id_not_blank check (length(trim(knowledge_id)) > 0),
  constraint knowledge_sources_title_not_blank check (length(trim(title)) > 0),
  constraint knowledge_sources_category_check check (category in ('SOP', '制度', '法規', '專案', '表單', '教材', '會議', '其他')),
  constraint knowledge_sources_scope_check check (scope in ('Public', 'Company', 'Role', 'Personal')),
  constraint knowledge_sources_status_check check (status in ('🟡 已上傳', '🔵 AI 已閱讀', '🟢 AI 已建立知識', '⭐ 已驗證')),
  constraint knowledge_sources_ai_status_check check (ai_status in ('未建立', '等待 AI 閱讀', 'AI 已閱讀', 'AI 已建立知識', '已驗證'))
);

create unique index if not exists knowledge_sources_user_knowledge_uidx
  on public.knowledge_sources(user_uuid, knowledge_id)
  where deleted_at is null;

create unique index if not exists knowledge_sources_user_legacy_uidx
  on public.knowledge_sources(user_uuid, legacy_id)
  where legacy_id is not null;

create index if not exists knowledge_sources_user_category_idx
  on public.knowledge_sources(user_uuid, category);

create index if not exists knowledge_sources_user_scope_idx
  on public.knowledge_sources(user_uuid, scope);

create index if not exists knowledge_sources_user_status_idx
  on public.knowledge_sources(user_uuid, status);

create index if not exists knowledge_sources_user_updated_idx
  on public.knowledge_sources(user_uuid, updated_at desc);

drop trigger if exists set_knowledge_sources_updated_at on public.knowledge_sources;
create trigger set_knowledge_sources_updated_at
before update on public.knowledge_sources
for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.knowledge_sources to authenticated;

alter table public.knowledge_sources enable row level security;

drop policy if exists "knowledge_sources_select_own" on public.knowledge_sources;
create policy "knowledge_sources_select_own"
on public.knowledge_sources
for select
to authenticated
using ((select auth.uid()) = user_uuid);

drop policy if exists "knowledge_sources_insert_own" on public.knowledge_sources;
create policy "knowledge_sources_insert_own"
on public.knowledge_sources
for insert
to authenticated
with check ((select auth.uid()) = user_uuid);

drop policy if exists "knowledge_sources_update_own" on public.knowledge_sources;
create policy "knowledge_sources_update_own"
on public.knowledge_sources
for update
to authenticated
using ((select auth.uid()) = user_uuid)
with check ((select auth.uid()) = user_uuid);

drop policy if exists "knowledge_sources_delete_own" on public.knowledge_sources;
create policy "knowledge_sources_delete_own"
on public.knowledge_sources
for delete
to authenticated
using ((select auth.uid()) = user_uuid);

comment on table public.knowledge_sources is 'P3-1 Knowledge Foundation: metadata for AI OS Knowledge Library.';

commit;
