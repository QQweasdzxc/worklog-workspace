# Sprint 4 Alpha.4 Hotfix — Root Cause Review

**Version:** `0.9.0-alpha.4`  
**Build:** `20260727-2112`  
**Status:** Revision evidence recorded

## Root causes

### Work Memory card layout

The UAT stylesheet contained a legacy `.work-memory-confirmed-card` four-column grid and a later override. The two definitions made the card layout order-dependent and allowed narrow columns to collapse Chinese titles vertically. The production card now uses the independent `.work-memory-tile` class with one authoritative `display:flex; flex-direction:column` definition. The legacy selector and post-hoc grid override are absent.

### Merge completion notice

The notice previously lived only in JavaScript memory, so a render or workspace transition could erase it. Suggestion rebuild also refreshed a timestamp without forcing a new suggestion computation. The notice is now persisted in `sessionStorage`; only rebuild or explicit dismissal clears it. Rebuild invalidates the in-memory suggestion cache and calls `workMemoryAiSuggestionItems({ force: true })` before rendering.

### Home render flow

The render guard prevented synchronous re-entry but did not explain external render sources. Root replacement is now centralized through `replaceRootContent()` (`replaceChildren()` followed by one insertion). Render diagnostics record a reason, count, and caller trace when `?debugRender=1` or `window.__ZHUGE_RENDER_DIAGNOSTICS` is enabled. Cloud sync updates its status block in place; conversation refresh renders only while the assistant workspace is open (or in its dedicated entry points).

## Files and functions

- `worklog.css`: single `.work-memory-tile` layout and title width constraint.
- `worklog-app.js`: `persistWorkMemoryMergeNotice`, `clearWorkMemoryMergeNotice`, `rebuildWorkMemorySuggestionCache`, `replaceRootContent`, and `render(reason)`.
- `app-state.js`: shared notice/cache/render-diagnostic state.
- `tests/sprint-4-alpha4-browser.html`: browser UI regression fixture with nine real tile records and merge/rebuild/workspace-switch interactions.
- `tests/sprint-4-alpha4-hotfix.test.js`: source contract and mirror synchronization checks.

## Browser evidence

The browser fixture rendered 9 tiles and reported:

```text
display=flex
flex-direction=column
grid-template-columns=none
tile width=387px
tile height=240px
title width=100px (all 9)
overlap=false
```

Merge flow evidence:

```text
merge-completed → banner visible
workspace-change → banner still visible
suggestion-refresh → banner hidden; suggestion cache changed 3 → 4
10s idle → render count unchanged at 4
```

Screenshot evidence: `tests/evidence/alpha4-work-memory-merge-banner.jpg`.

## QA result

- Node syntax checks: PASS.
- Automated regression suite: 25/25 PASS.
- Browser UI regression: PASS (computed style, overlap, merge persistence/rebuild, idle render stability).
