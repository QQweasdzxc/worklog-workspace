# RC3.4A Cloud Sync MVP — Phase 1 Schema Review

## Scope

RC3.4A Phase 1 only prepares Supabase schema, indexes, grants, RLS policies, verification SQL, and rollback notes.

This phase does not modify:

- UI
- Export
- Calendar
- AI Queue
- OAuth / Identity Layer
- App data flow

## Files

- `docs/supabase/20260709_rc3_4a_cloud_sync_schema.sql`
- `docs/supabase/20260709_rc3_4a_cloud_sync_verification.sql`

## Tables

### `user_profiles`

Stores user basic settings only.

Columns:

- `user_uuid`
- `display_name`
- `email`
- `role_code`
- `work_start_time`
- `work_end_time`
- `lunch_start_time`
- `lunch_end_time`
- `timezone`
- `created_at`
- `updated_at`

### `user_work_models`

Stores personal work models.

Columns:

- `id`
- `user_uuid`
- `role_code`
- `name`
- `source`
- `is_active`
- `sort_order`
- `created_at`
- `updated_at`

### `user_export_settings`

Stores export settings for ECP.

Columns:

- `id`
- `user_uuid`
- `export_profile`
- `ecp_owner`
- `ecp_department`
- `created_at`
- `updated_at`

### `user_ecp_tasks`

Stores user-managed ECP task list.

Columns:

- `id`
- `user_uuid`
- `name`
- `is_active`
- `sort_order`
- `created_at`
- `updated_at`

### `work_entries`

Stores WorkLog entries.

Columns:

- `id`
- `user_uuid`
- `work_date`
- `started_at`
- `ended_at`
- `hours`
- `title`
- `note`
- `event_type`
- `status`
- `source`
- `ecp_task_id`
- `ecp_task_name_snapshot`
- `work_model_id`
- `legacy_id`
- `created_at`
- `updated_at`
- `deleted_at`

`status` allowed values:

- `draft`
- `completed`
- `exported`
- `deleted`

RC3.4A creates the column but does not implement export status workflow.

### `sync_migrations`

Stores one-time migration completion records.

Columns:

- `id`
- `user_uuid`
- `migration_key`
- `source_hash`
- `completed_at`
- `created_at`

## Indexes

Key indexes:

- `user_work_models(user_uuid, is_active)`
- `user_work_models(user_uuid, role_code)`
- unique `user_work_models(user_uuid, name)`
- unique `user_export_settings(user_uuid, export_profile)`
- `user_ecp_tasks(user_uuid, is_active)`
- unique `user_ecp_tasks(user_uuid, name)`
- `work_entries(user_uuid, work_date)`
- `work_entries(user_uuid, started_at)`
- `work_entries(user_uuid, status)`
- `work_entries(user_uuid, ecp_task_id)`
- `work_entries(user_uuid, work_model_id)`
- unique `work_entries(user_uuid, legacy_id)` where `legacy_id is not null`
- unique `sync_migrations(user_uuid, migration_key)`


## Code and Time Principles

UUID generation is standardized on:

```sql
gen_random_uuid()
```

Do not mix with `uuid_generate_v4()` in RC3.4A.

All absolute time fields use `timestamptz`:

- `started_at`
- `ended_at`
- `created_at`
- `updated_at`
- `deleted_at`
- `completed_at`

`work_date` remains `date` because it represents the user's work day, not an absolute timestamp.

Role values use stable codes such as:

- `PROCUREMENT`
- `HR`
- `IT`

UI can map `role_code` to display names later.

Event type values use stable codes:

- `WORK`
- `MEETING`
- `TRAINING`
- `LEAVE`
- `BUSINESS_TRIP`

UI can map event codes to display labels later.

## Relationship Safety

`work_entries.ecp_task_id` uses a composite foreign key:

```text
(user_uuid, ecp_task_id)
↓
user_ecp_tasks(user_uuid, id)
```

`work_entries.work_model_id` uses a composite foreign key:

```text
(user_uuid, work_model_id)
↓
user_work_models(user_uuid, id)
```

This prevents a work entry owned by User A from referencing an ECP task or work model owned by User B.

## Grants

The migration grants authenticated users CRUD access to the six RC3.4A tables:

- `user_profiles`
- `user_work_models`
- `user_export_settings`
- `user_ecp_tasks`
- `work_entries`
- `sync_migrations`

RLS still controls row access.

## RLS Policies

All user-owned tables enable RLS.

All policies use:

```sql
(select auth.uid()) = user_uuid
```

Each table has separate policies for:

- select
- insert
- update
- delete

Update policies include both:

- `USING`
- `WITH CHECK`

No policy uses user metadata.

## Verification

Run:

```sql
docs/supabase/20260709_rc3_4a_cloud_sync_verification.sql
```

Expected:

- 6 tables exist.
- RLS enabled on all 6 tables.
- 24 policies exist.
- authenticated role has required table grants.
- key indexes exist.
- foreign keys exist.

Authenticated smoke tests must be done from app / REST client with real user JWTs.

## Rollback Notes

Rollback is destructive. Only run before production data exists or after confirmed backup.

Suggested rollback order:

```sql
begin;

drop table if exists public.work_entries cascade;
drop table if exists public.sync_migrations cascade;
drop table if exists public.user_ecp_tasks cascade;
drop table if exists public.user_export_settings cascade;
drop table if exists public.user_work_models cascade;
drop table if exists public.user_profiles cascade;

drop function if exists public.set_updated_at() cascade;

commit;
```

Do not run rollback after PM migration / cross-device QA has started unless PM explicitly approves data deletion.

## Impact Analysis

Phase 1 impact:

- Adds database schema only.
- Does not affect current RC3.3 app runtime.
- Does not change LocalStorage behavior.
- Does not change Export behavior.
- Does not change OAuth / Identity Layer.
- Does not change Calendar / AI Queue.

Future Phase 2+ impact:

- UI data access will move behind DataService.
- LocalStorage will become cache only.
- Work entries, work models, ECP settings, and ECP tasks will sync across devices.

## PM Review Checklist

- Confirm table names.
- Confirm `role` has been replaced by `role_code`.
- Confirm `work_entries.event_type` uses stable codes: `WORK`, `MEETING`, `TRAINING`, `LEAVE`, `BUSINESS_TRIP`.
- Confirm `work_entries.status` includes `deleted`.
- Confirm UUID generation is standardized on `gen_random_uuid()`.
- Confirm all absolute time fields use `timestamptz`.
- Confirm simplified `user_profiles`.
- Confirm composite FK strategy for same-user references.
- Confirm RLS policy pattern.
- Confirm rollback notes are acceptable.
