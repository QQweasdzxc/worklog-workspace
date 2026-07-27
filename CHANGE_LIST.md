# Sprint 4.1 Change List

Baseline: `20260727_1619_ZhugeAIOS_v0.9.0-alpha.4_UAT`
Version: `0.9.0-alpha.4.2`
Build: `20260727-2348`

## Modified Files

- `Deployment/worklog-app.js` — canonical active Work Memory selection, inactive-history preservation, Cloud-verified merge transactions, forced re-analysis, and exact semantic matching.
- `Deployment/app-state.js` — name-first sorting, session-scoped merge notice state, and rebuild loading state.
- `Deployment/data-service.js` — explicit Cloud Work Memory reload used by re-analysis and merge verification.
- `Deployment/index.html` — cache-bust query values only; DOM structure is unchanged.
- `Deployment/app-config.js`, `Deployment/version.json` — Sprint 4.1.2 version/build metadata.
- `Deployment/_deployment/manifest.json` and `Deployment/_deployment/checksums.json` — release metadata and integrity hashes.
- `tests/sprint-4.1-business-logic.test.js` — canonical active-data and stable-UI regression checks.
- `tests/sprint-4.1-merge-browser.test.js` — real Browser/Playwright merge, Cloud mock persistence, rebuild, and semantic-matching regression tests.
- `SPRINT_4_1_MERGE_FIX_RCA.md` — root-cause and verification report.

## Not Modified

- `Deployment/worklog.css`
- Work Memory card class names and card markup
- Grid/Flex layout definitions
- Component names and render engine
- Supabase schema, APIs and AI/Knowledge logic

## Behavior Delivered

- Work Memory renders as one Workspace; categories remain metadata/filter values.
- Name sorting spans all Work Memory cards; category no longer controls ordering.
- A successful merge leaves one canonical active work object while retaining selected source rows as inactive history.
- All ordinary Workspace, search, sorting, merge, rename, category, similarity, and Copilot paths use one deduplicated active dataset.
- Merge completion is shown only after Cloud rows verify canonical active + source inactive state.
- Merge completion persists for the session and offers `重新分析 AI` or `關閉`.
- Re-analysis reloads Cloud Work Memory, clears the suggestion cache, forces a fresh suggestion-engine calculation, and immediately updates the count.
- Generic substring reverse-matching no longer creates false semantic merge suggestions.
