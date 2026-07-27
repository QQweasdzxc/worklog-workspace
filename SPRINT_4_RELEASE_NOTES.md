# Sprint 4 — Product Experience Optimization

**Version:** `0.9.0-alpha.4`  
**Build:** `20260727-1619`  
**Status:** PM UAT candidate

## Completed

- Knowledge Repository cards now use a compact toolbar: the primary understanding/accept action stays visible, while refresh, preview, edit, archive, and delete are grouped under **⋯ 更多**.
- Knowledge cards show a compact status indicator, bounded description, learning state, and denser card rhythm.
- AI Merge preview now presents **工作 A + 工作 B → 合併結果**, with canonical name, category, retained aliases, and an explicit confirmation reminder for historical WorkLog and Knowledge relationships.
- AI suggestions are collapsed by default; detail content and decision actions appear after **查看建議內容**.
- 我的工作 cards now offer direct **🔀 合併** entry; manual selection and AI suggestions share the same Merge Preview and confirmation engine.
- Existing Work Memory folders, search, category filter, and sort remain available as the Dashboard-style「我的工作」surface.
- Learning states retain explicit reading, analysis, understanding, organizing, completion, and error feedback.
- Google OAuth verification package added under `docs/Google_Verification/`.

## Scope guard

No new Google service, connector, background sync, folder scan, or AI capability was added. Google Drive remains a user-selected Knowledge Source.

## Known limitations

- Legal/operator placeholders in `docs/Google_Verification/` must be replaced and reviewed before submission.
- Production domain, support address, reviewer account, and final OAuth consent settings remain PM/operator decisions.
- This build is a UAT candidate, not a Google-verified production release.
