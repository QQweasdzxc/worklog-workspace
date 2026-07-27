# Sprint 4 PM UAT Guide

**Version:** `0.9.0-alpha.4`  
**Build:** `20260727-1552`  
**Estimated time:** 10–15 minutes

## Recommended order

1. Open the UAT deployment and sign in.
2. Open **藏書閣** and confirm cards show status, category, bounded description, and a compact toolbar.
3. Use **⋯ 更多** to open secondary actions; verify the primary action remains easy to find.
4. Open **設定 → 我的工作**. Verify folders, card layout, search, category filter, and sorting.
5. If a merge suggestion exists, open **AI 建議** and verify the visual `工作 A + 工作 B → 合併結果` preview, category, aliases, and retention statement.
6. Start one Knowledge learning flow and verify visible reading/progress states and the completion/error state.
7. Refresh the page and confirm Knowledge and Work Memory remain available.

## PM checklist

- [ ] Knowledge card height and toolbar are compact and readable.
- [ ] More actions are grouped; no primary action is lost.
- [ ] Work Memory is folder/card based rather than a plain long list.
- [ ] Search, category, and sort still work.
- [ ] Merge preview is understandable without reading a long paragraph.
- [ ] Alias, Knowledge, and historical usage retention is explained before confirmation.
- [ ] Learning state is visible while reading and after completion/error.
- [ ] Desktop and mobile do not introduce horizontal overflow.
- [ ] Console has no blocking error during this flow.

## Not in this UAT

Gmail, Google Calendar, Workspace connectors, folder scanning, background synchronization, and production OAuth verification are out of scope for Sprint 4 UX UAT.

