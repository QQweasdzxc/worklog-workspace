# P2 Timezone Data Integrity Fix

Build: `20260710-1017`

## Scope

This patch fixes the P0 issue where an entered Taiwan business time such as `2026-07-10 09:00` was displayed as `01:00` and could drift backward by another eight hours after subsequent reload/save cycles.

## Root cause

Supabase `started_at` is a `timestamptz` value and returns an ISO UTC timestamp. The client previously used:

```js
String(row.started_at).slice(0, 16)
```

This removed the timezone marker without converting UTC to Asia/Taipei. The resulting UTC wall-clock text was then treated as local time and converted to UTC again during the next save. Every read/save cycle could therefore subtract another eight hours.

## Fixed rules

- Business date: `work_date` remains a date-only value.
- User input/display: always interpreted and rendered in `Asia/Taipei`.
- Cloud timestamps: `started_at` and `ended_at` remain UTC ISO timestamps.
- Taiwan local time is converted to UTC exactly once before a cloud write.
- UTC is converted to Taiwan local time exactly once after a cloud read.
- Load, render, normalize, sort, and refresh do not write timestamps back to Supabase.
- The conversion is independent of the browser/device timezone.

## Existing drifted rows

This patch stops further drift but does not automatically rewrite rows already damaged by earlier builds. Their original intended start time cannot always be inferred safely. Review and correct those entries through the edit screen after deploying this build.

## PM QA

1. Create `2026-07-10 09:00` for one hour.
2. Confirm it immediately displays `2026/07/10 09:00`.
3. Refresh five times; time must remain unchanged.
4. Log out/in; time must remain unchanged.
5. Verify Web and Mobile show the same time.
6. Edit only the title; start time must remain unchanged.
7. Create at `09:30`; it must remain `09:30` across devices and refreshes.
