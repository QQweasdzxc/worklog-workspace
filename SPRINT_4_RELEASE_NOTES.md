# Sprint 4 — Product Experience Optimization

**Version:** `0.9.0-alpha.4`  
**Build:** `20260727-1723`  
**Status:** PM UAT candidate

## Completed

### Alpha.4 Hotfix

- Merge completion now remains visible as **✅ Merge Completed** in both the Work Memory page and AI Suggestion workspace until the user rebuilds the suggestion cache or explicitly closes it.
- Root rendering now prevents re-entrant render calls, coalesces queued updates, and clears the application root before inserting a new view.
- Work Memory confirmed cards now use the intended flex tile layout. A legacy four-column grid rule no longer squeezes card text into vertical columns.

- Knowledge Repository cards now use a compact toolbar: the primary understanding/accept action stays visible, while refresh, preview, edit, archive, and delete are grouped under **⋯ 更多**.
- Knowledge cards show a compact status indicator, bounded description, learning state, and denser card rhythm.
- AI Merge preview now presents **工作 A + 工作 B → 合併結果**, with canonical name, category, retained aliases, and an explicit confirmation reminder for historical WorkLog and Knowledge relationships.
- AI suggestions are collapsed by default; detail content and decision actions appear after **查看建議內容**.
- 我的工作 cards now offer direct **🔀 合併** entry; manual selection and AI suggestions share the same Merge Preview and confirmation engine.
- Work Memory is now a single workspace. Categories remain visible as tags and filters, while name/usage sorting spans the full set of work.
- Merge completion shows a clear success state and a **🔄 重新分析 AI 建議** action that rebuilds the suggestion cache and similarity view.
- Manual Merge and AI Merge continue to share one preview/confirmation engine.
- Learning states retain explicit reading, analysis, understanding, organizing, completion, and error feedback.
- Google OAuth verification package added under `docs/Google_Verification/`.
- Landing, Privacy, Terms, and OAuth reviewer materials now identify Zhuge AI OS as a Personal AI Productivity Assistant developed by Mr.KM.

## Scope guard

No new Google service, connector, background sync, folder scan, or AI capability was added. Google Drive remains a user-selected Knowledge Source.

## Known limitations

- Legal/operator placeholders in `docs/Google_Verification/` must be replaced and reviewed before submission.
- Production domain, support address, reviewer account, and final OAuth consent settings remain PM/operator decisions.
- This build is a UAT candidate, not a Google-verified production release.
