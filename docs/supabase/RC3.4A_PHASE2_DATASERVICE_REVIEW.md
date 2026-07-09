# RC3.4A Cloud Sync MVP — Phase 2 DataService Review

## Scope

Phase 2 introduces the first DataService skeleton and connects the current WorkLog runtime to Supabase-backed Cloud Sync in a minimal, non-disruptive way.

This phase does not modify:

- Export Template / ECP mapping
- Calendar core
- AI Queue
- OAuth / PKCE / Identity Layer
- RC3.4B Knowledge
- RC3.4C AI

## Changed Runtime Areas

- `DataService`
- `SupabaseRepository`
- `LocalCache`
- Cloud Sync status
- Current WorkLog profile / ECP / work model / entry save flow

## DataService Architecture

```text
UI
↓
Existing state layer
↓
DataService
↓
SupabaseRepository
↓
Supabase REST API

DataService
↓
LocalCache
↓
LocalStorage user_uuid scoped cache
```

## Components

### `LocalCache`

Uses user-scoped LocalStorage cache keys:

```text
wl_cache:{user_uuid}:profile
wl_cache:{user_uuid}:entries
wl_cache:{user_uuid}:work_models
wl_cache:{user_uuid}:ecp_settings
wl_cache:{user_uuid}:ecp_tasks
```

Legacy keys are still written for RC3.3 compatibility:

```text
wl_profile
wl_entries
wl_feedback
wl_library
```

### `SupabaseRepository`

Handles table-level Supabase REST access.

Tables currently connected:

- `user_profiles`
- `user_export_settings`
- `user_work_models`
- `user_ecp_tasks`
- `work_entries`

### `DataService`

Provides:

- `init()`
- `loadAll()`
- `syncAll()`
- `deleteEntry()`

## Cloud Sync Flow

### App Boot

```text
Google Login / stored Supabase auth session
↓
AI OS session created
↓
DataService.init()
↓
Load user_uuid scoped cache
↓
Load Supabase data
↓
Merge cloud rows into local state
↓
Update cache
↓
Cloud Sync = synced
```

If Supabase tables are not available or RLS/grants fail:

```text
Cloud Sync = failed
Current local app still renders
```

### Save

```text
User saves setting / entry / task / model
↓
Existing state updates
↓
saveAll()
↓
LocalStorage legacy save
↓
LocalCache user_uuid save
↓
DataService.syncAll()
↓
Supabase write
↓
Cloud Sync status update
```

### Delete Work Entry

```text
User deletes entry
↓
Local UI removes entry
↓
DataService.deleteEntry()
↓
Supabase work_entries.status = deleted
Supabase work_entries.deleted_at = now()
```

## Code Mapping

UI labels remain Chinese.

Supabase stable codes:

### Role

```text
採購 → PROCUREMENT
行政 → ADMIN
人資 → HR
業務 → SALES
行銷 → MARKETING
IT → IT
自訂 → CUSTOM
```

### Event Type

```text
工作 → WORK
會議 → MEETING
教育訓練 → TRAINING
特休 / 事假 / 病假 → LEAVE
出差 → BUSINESS_TRIP
```

## RC3.4A MVP Limitations

The following remain intentionally out of scope:

- Migration Dry Run UI
- Pending Queue
- Offline Sync
- Conflict Resolution
- Knowledge Sources
- AI Feedback
- Export Status Workflow

Important note:

Existing RC3.3 LocalStorage data is not automatically migrated on first boot in this Phase 2 skeleton. It is kept as local/cache state. When the user saves settings or creates/updates entries, the current active core data is synced through DataService. A formal migration dry-run screen can be added as a separate RC3.4A migration step after this skeleton is PM-reviewed.

## Impact Analysis

Expected impact:

- Existing RC3.3 UI remains mostly unchanged.
- Current local data continues to render.
- When Supabase Phase 1 schema is available, saves sync to cloud.
- Another device can load cloud-backed profile / ECP settings / ECP tasks / work models / work entries after sync.

Risk:

- If Phase 1 SQL has not been applied, Cloud Sync status will show failed.
- If RLS/grants are misconfigured, Cloud Sync status will show failed.
- Existing LocalStorage data requires a formal migration step for guaranteed one-time cloud import.

## QA Checklist

1. Apply Phase 1 SQL in Supabase.
2. Login with Google.
3. Open Control Center.
4. Confirm Cloud Sync status appears.
5. Save settings:
   - Role
   - Work Models
   - ECP Owner
   - ECP Department
   - ECP Tasks
6. Create work entry.
7. Refresh page.
8. Confirm data remains.
9. Login on second device/browser.
10. Confirm synced settings and entries appear.

## Phase 2 Result

Ready for PM Review after Source Package upload.
