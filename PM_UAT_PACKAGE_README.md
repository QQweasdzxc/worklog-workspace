# Sprint 2.1 — PM UAT Package

## Current UAT Artifact

This package contains one `Deployment/` folder. Copy the contents of that
folder into the root of the `worklog-workspace` GitHub Pages repository.

Do not add an extra `Deployment/` directory level.

## PM Steps

1. Extract this ZIP.
2. Open `Deployment/`.
3. Copy everything inside `Deployment/` into the `worklog-workspace` repository root.
4. Open GitHub Desktop, commit, and push to `main`.
5. Open `https://qqweasdzxc.github.io/worklog-workspace/` after Pages finishes deploying.
6. Force-refresh the page before starting UAT.

## PM Acceptance Checklist

- [ ] Google Login succeeds.
- [ ] 藏書閣 → 從 Google Drive 選取 opens Google Picker.
- [ ] Exactly one supported Drive file can be selected.
- [ ] Folder selection and multi-select are unavailable.
- [ ] Import creates a Google Drive Knowledge Source.
- [ ] Knowledge Repository shows the imported source.
- [ ] Mr.KM Copilot can use the imported Knowledge.
- [ ] Refresh preserves the source.

## Scope Freeze

This package validates only:

```text
Google Login → Google Picker → Single Drive File → Import → Knowledge → Repository → Mr.KM
```

It does not add folder scanning, multi-file import, background sync, Gmail,
Calendar, OCR, or other AI capabilities.

## Security Note

The Picker API key is browser-visible configuration and is restricted to the
approved website origins. It is not an OAuth client secret. Do not disclose or
commit OAuth client secrets, Supabase service-role keys, or refresh tokens.
