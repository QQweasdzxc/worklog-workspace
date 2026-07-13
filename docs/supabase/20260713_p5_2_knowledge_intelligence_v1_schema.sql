-- Zhuge AI OS / P5.2 Knowledge Intelligence v1
-- Scope: source processing metadata + Knowledge Units + recommendation candidates.
-- Explicitly not included: RAG, embeddings, vector search, cross-role sharing, automatic homepage recommendations.

begin;

alter table public.knowledge_sources
  add column if not exists extracted_text text,
  add column if not exists intelligence_summary jsonb not null default '{}'::jsonb,
  add column if not exists intelligence_error text,
  add column if not exists processed_at timestamptz,
  add column if not exists verified_at timestamptz;

create table if not exists public.knowledge_recommendation_candidates (
  id uuid primary key default gen_random_uuid(),
  user_uuid uuid not null references auth.users(id) on delete cascade,
  knowledge_source_id uuid not null references public.knowledge_sources(id) on delete cascade,
  knowledge_unit_id uuid references public.knowledge_units(id) on delete set null,
  type text not null default 'recommendation',
  title text not null,
  content text,
  source_knowledge_id text,
  source_unit_id uuid,
  default_duration numeric(4,2) not null default 1,
  applicable_role text,
  triggers text[] not null default '{}',
  related_work_models text[] not null default '{}',
  status text not null default 'candidate',
  priority text not null default 'medium',
  confidence numeric(4,3),
  version text not null default 'v1.0',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint knowledge_recommendation_candidates_type_check check (type in ('recommendation')),
  constraint knowledge_recommendation_candidates_status_check check (status in ('candidate', 'verified', 'archived')),
  constraint knowledge_recommendation_candidates_priority_check check (priority in ('high', 'medium', 'low')),
  constraint knowledge_recommendation_candidates_confidence_check check (confidence is null or (confidence >= 0 and confidence <= 1))
);

create index if not exists knowledge_recommendation_candidates_source_idx on public.knowledge_recommendation_candidates(knowledge_source_id);
create index if not exists knowledge_recommendation_candidates_user_idx on public.knowledge_recommendation_candidates(user_uuid, created_at desc);
create index if not exists knowledge_recommendation_candidates_role_idx on public.knowledge_recommendation_candidates(user_uuid, applicable_role, status);

drop trigger if exists set_knowledge_recommendation_candidates_updated_at on public.knowledge_recommendation_candidates;
create trigger set_knowledge_recommendation_candidates_updated_at
before update on public.knowledge_recommendation_candidates
for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.knowledge_recommendation_candidates to authenticated;

alter table public.knowledge_recommendation_candidates enable row level security;

drop policy if exists "knowledge_recommendation_candidates_select_own" on public.knowledge_recommendation_candidates;
create policy "knowledge_recommendation_candidates_select_own"
on public.knowledge_recommendation_candidates for select to authenticated
using ((select auth.uid()) = user_uuid);

drop policy if exists "knowledge_recommendation_candidates_insert_own" on public.knowledge_recommendation_candidates;
create policy "knowledge_recommendation_candidates_insert_own"
on public.knowledge_recommendation_candidates for insert to authenticated
with check ((select auth.uid()) = user_uuid);

drop policy if exists "knowledge_recommendation_candidates_update_own" on public.knowledge_recommendation_candidates;
create policy "knowledge_recommendation_candidates_update_own"
on public.knowledge_recommendation_candidates for update to authenticated
using ((select auth.uid()) = user_uuid)
with check ((select auth.uid()) = user_uuid);

drop policy if exists "knowledge_recommendation_candidates_delete_own" on public.knowledge_recommendation_candidates;
create policy "knowledge_recommendation_candidates_delete_own"
on public.knowledge_recommendation_candidates for delete to authenticated
using ((select auth.uid()) = user_uuid);

comment on column public.knowledge_sources.extracted_text is 'P5.2 v1 extracted document text for user-owned Knowledge Intelligence. Not used for RAG/vector search in this phase.';
comment on column public.knowledge_sources.intelligence_summary is 'P5.2 v1 structured summary: topics, work items, processes, cautions, recommendation candidates.';
comment on column public.knowledge_sources.intelligence_error is 'User-understandable processing error message when processing_status = failed.';
comment on table public.knowledge_recommendation_candidates is 'P5.2 v1 candidate work suggestions extracted from Knowledge Units. Not automatically shown on homepage.';

commit;
