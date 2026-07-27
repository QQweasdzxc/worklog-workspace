# Sprint 4.1 Merge Data Integrity Fix — RCA

Version: `0.9.0-alpha.4.2`  
Build: `20260727-2348`  
Stable UI baseline: `20260727_1619_ZhugeAIOS_v0.9.0-alpha.4_UAT`

## Root Cause

1. Work Memory reads returned both active and inactive Cloud rows. Ordinary Workspace and suggestion paths did not have one canonical active selector, so merged source rows could reappear.
2. Rename, category, merge, similarity, and Copilot inputs were not consistently constrained to that active dataset.
3. Re-analysis only invalidated an in-memory cache; it did not reload the formal Cloud Work Memory before rebuilding suggestions.
4. Semantic matching used a broad reverse-substring rule. Generic names such as `資料整理` could therefore match a domain-specific name such as `合約資料整理`.
5. Merge completion could be shown without verifying the persisted Cloud state.

## Fix

- Added `activeWorkMemoryObjects()` as the deduplicated active canonical dataset. Inactive records remain available to history/rollback only.
- Updated Workspace cards, counts, search, sorting, filters, merge, rename, category, similarity, manual merge, and Copilot suggestion paths to use the active dataset.
- Merge now writes source rows as `is_active=false`, retains them as history, persists the canonical row, reloads Cloud, and returns an explicit transaction result.
- `Merge Completed` is shown only when Cloud verification confirms the canonical active row and all selected source rows inactive.
- Re-analysis now reloads Cloud Work Memory, clears cache, force-recomputes suggestions, and shows a loading state while in progress.
- Semantic group matching is exact alias matching; generic substring reverse matching is removed.

## Merge Transaction Evidence

The browser regression test records:

```json
{
  "success": true,
  "beforeActiveCount": 2,
  "afterActiveCount": 1,
  "canonical": "合約管理",
  "deactivated": ["合約資料整理"],
  "activeNames": ["合約管理"]
}
```

For a new canonical (`工作 A + 工作 B → 整合工作`), the test verifies both source rows are inactive, the new canonical is active, and the Workspace contains only `整合工作`.

## Verification

- Node syntax checks: PASS (`worklog-app.js`, `data-service.js`).
- Business-logic regression: PASS.
- Browser/Playwright regression: PASS; merge persistence, inactive filtering, Cloud reload/rebuild, canonical creation, and generic substring negative case.
- Browser computed-style evidence: both cards reported `display:flex`, `flex-direction:column`, width `327.33px`, height `239.75px`, and no card-rectangle overlap. Existing baseline title nodes measured `96px` and `64px` (the stable 1619 CSS was intentionally not changed in this business-logic-only sprint).
- Screenshot evidence: `tests/evidence/sprint-4.1-merge-browser.png`.
- Deployment checksums: generated after the final source changes.

The browser test uses a deterministic Cloud repository mock. Live PM UAT against the deployed Supabase project remains the release gate for real Cloud/RLS verification.

## Scope Guard

No CSS, card layout, component name, Grid/Flex definition, HTML structure, or render-engine rewrite was made. The `index.html` changes are cache-bust metadata only; the accepted 1619 stylesheet remains byte-identical.
