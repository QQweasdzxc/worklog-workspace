# Sprint 3 PM UAT Guide

## Current PM Artifact

- Current UAT: `20260727_1517_ZhugeAIOS_v0.9.0-alpha.3_UAT.zip`
- Current Source: `20260727_1517_ZhugeAIOS_v0.9.0-alpha.3_Source.zip`
- Deployment base: `main`
- Only deploy the `Deployment/` folder from the UAT package.

## Start here

1. Extract the Current UAT ZIP.
2. Copy the complete `Deployment/` contents into the `worklog-workspace` repository root.
3. Commit the replacement files in GitHub Desktop.
4. Push `main`.
5. Hard-refresh the GitHub Pages URL.
6. Sign in with Google and open **藏書閣**.

## Acceptance checklist

- [ ] Google Login, refresh and session recovery still work.
- [ ] Upload a PDF or DOCX; the learning panel shows reading → analysis → work understanding → Knowledge creation → confirmation.
- [ ] Confirm the understanding and verify that the source appears as a Knowledge card.
- [ ] Search the Knowledge cards, filter by category, and change sort order.
- [ ] Open the understanding view and confirm the current Knowledge version and version history section.
- [ ] Re-learn a source, then confirm a prior version is listed and can be rolled back.
- [ ] If a similar work exists, confirm Mr.KM offers merge/rename/category suggestions and leaves adoption to the user.
- [ ] With 7.5h already logged through 17:30, create a 30m entry and confirm it stays on the same day at 17:30–18:00; edit date/time manually and verify overlap errors are explicit.
- [ ] During Google-document learning, verify the animated warning says not to leave, each named step changes, back asks for confirmation, and success/failure is visible in the page.
- [ ] Confirm the Control Center has no Gmail or Calendar service cards.
- [ ] Enter `採購`, `合約`, `專案`, `會議`, and `供應商` in both Knowledge and 我的工作 search fields and verify Chinese IME input/filtering.
- [ ] Review a merge preview for the PM examples (合約、專案、採購、會議), including similarity, canonical name, aliases and category; confirm only an explicit user action merges.
- [ ] Sign in with Google, open **從 Google Drive 選取**, choose one native Google Doc, Sheet or Slide, and import it.
- [ ] Confirm the selected file becomes a Knowledge source and is available to Mr.KM.
- [ ] Confirm no Drive folder scan or background synchronization starts.

## Scenario acceptance

### Scenario 1 — Local learning

Login → 藏書閣 → upload → 開始學習 → observe progress → 查看我的理解 → 確認理解 → return to Knowledge cards.

### Scenario 2 — Knowledge management

Search → category filter → sort → open a card → relearn → rollback to a prior version.

### Scenario 3 — Google Workspace source

Login → Google Picker → select one Doc/Sheet/Slide → Import → Knowledge Repository → Mr.KM can reference it.

Estimated time: 15–20 minutes.

### Scenario 4 — Sprint 3 revision regression

Fill the 30-minute same-day tail → change date/time manually → test Chinese search IME → start Google-document learning and try Back → inspect Control Center → review a semantic merge preview.

## Known limitations

- Google API access and OAuth publication remain external environment prerequisites; if Picker cannot open, record the environment error rather than treating local upload as failed.
- Version history is stored in the Knowledge source metadata and is capped at the ten most recent snapshots.
