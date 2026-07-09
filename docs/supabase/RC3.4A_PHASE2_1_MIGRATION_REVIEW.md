# RC3.4A Cloud Sync MVP — Phase 2.1 Migration Dry Run + One-time Migration

## Scope

Phase 2.1 adds a migration gate before PM QA.

It prevents users from entering the normal WorkLog screen while RC3.3 legacy LocalStorage data exists but has not yet been migrated to Supabase.

This phase does not modify:

- Export
- Calendar
- AI Queue
- OAuth / Identity Layer
- Knowledge Sources migration
- AI Feedback migration
- Pending Queue
- Offline Sync

## Legacy Data Inventory

The app detects these legacy LocalStorage keys:

- `wl_entries`
- `wl_profile`
- `wl_feedback`
- `wl_library`

Only the following are migrated in RC3.4A:

- `wl_entries` → `work_entries`
- `wl_profile` → `user_profiles`
- `profile.tags` → `user_work_models`
- `profile.ecpOwner / profile.ecpDepartment` → `user_export_settings`
- `profile.ecpTasks` → `user_ecp_tasks`

The following are preview-only in RC3.4A:

- `wl_feedback`
- `wl_library`

## Migration Key

```text
localstorage_rc33_to_rc34a_v1
```

The app checks `sync_migrations` for this key.

If completed, migration preview is skipped.

If not completed and legacy core data exists, migration preview is shown.

## Migration Preview

Preview shows:

- 工時：X 筆
- 工作模型：X 筆
- ECP 任務：X 筆
- ECP 設定：有 / 無
- AI Feedback：X 筆，本階段僅盤點
- 藏書閣：X 筆，本階段僅盤點

The user must click:

```text
開始 Cloud Sync Migration
```

before the normal WorkLog workspace opens.

## Migration Flow

```text
Google Login
↓
DataService.init()
↓
Read legacy inventory
↓
Check sync_migrations
↓
Show Migration Preview
↓
User confirms
↓
Read wl_entries / wl_profile directly
↓
Write Supabase:
  user_profiles
  user_export_settings
  user_work_models
  user_ecp_tasks
  work_entries
↓
Write sync_migrations completion record
↓
Reload from Supabase
↓
Update user_uuid scoped cache
↓
Enter normal WorkLog UI
```

## Failure Handling

If migration fails:

- `sync_migrations` is not written.
- Legacy LocalStorage is not deleted.
- UI remains on the migration screen.
- Error message is shown.
- Cloud Sync status becomes failed.

## Safety Notes

Legacy LocalStorage remains as safety backup after successful migration.

This phase intentionally does not clear:

- `wl_entries`
- `wl_profile`
- `wl_feedback`
- `wl_library`

## PM QA Checklist

1. Apply RC3.4A Phase 1 SQL to Supabase.
2. Upload Phase 2.1 source to GitHub Pages.
3. Login with Google.
4. If RC3.3 local data exists, confirm Migration Preview appears.
5. Confirm preview counts:
   - 工時
   - 工作模型
   - ECP 任務
   - ECP 設定
6. Click migration confirm.
7. Confirm WorkLog opens after migration.
8. Refresh page.
9. Confirm migration preview no longer appears.
10. Login from another device/browser.
11. Confirm synced:
    - 工時資料
    - 工作模型
    - ECP 設定
    - ECP 任務

## Known Out of Scope

- Knowledge migration
- AI feedback migration
- Offline pending queue
- Conflict resolution
