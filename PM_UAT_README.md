# Sprint 4.1.2 PM UAT

Version: `0.9.0-alpha.4.2`  
Build: `20260727-2348`  
Stable UI baseline: `20260727_1619_ZhugeAIOS_v0.9.0-alpha.4_UAT`

## Deployment

Copy the complete `Deployment/` directory contents to the GitHub Pages deployment root. No file selection or merge with a later Alpha.4 artifact is required.

## Suggested checks

1. Open Settings → 我的工作 and confirm one `我的工作（Workspace）` area is shown.
2. Confirm the category dropdown filters cards but does not create separate groups.
3. Select 名稱 sorting and verify names are ordered across all categories.
4. Merge `合約資料整理` + `合約管理`; wait for Cloud persistence.
5. Confirm `✓ Merge Completed`, `重新分析 AI`, and `關閉` are visible only after persistence succeeds.
6. Confirm only the active canonical `合約管理` card is shown; `合約資料整理` is retained only as inactive history.
7. Switch to another workspace and back; the notice should remain.
8. Click `重新分析 AI`; confirm Cloud reload occurs, the notice closes, and the suggestion count refreshes immediately.
9. Reload/re-login and confirm the inactive source does not return.
10. Verify `資料整理` + `合約管理` does not produce a semantic merge suggestion solely from a substring.

## Expected non-regression

- The 1619 CSS, card classes, card layout, and page structure remain unchanged.
- Home navigation and existing WorkLog/Knowledge flows are unchanged.

Browser evidence is included at:
- `tests/evidence/sprint-4.1-merge-browser.png` — active/inactive merge and canonical Workspace result.
- `tests/sprint-4.1-merge-browser.test.js` — actual browser assertions for Cloud persistence and rebuild.

The browser test uses a deterministic Cloud mock; PM must still run the same flow against the deployed Supabase project for live acceptance.
