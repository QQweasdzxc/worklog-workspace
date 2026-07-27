# Sprint 3 — Mr.KM Intelligence

Version: `0.9.0-alpha.3`  
Build: `20260727-1517`  
Channel: Internal UAT

## Completed

- Google Docs, Sheets and Slides are exported through Google Drive and parsed into Knowledge.
- Picker configuration diagnostics now report API Key/App ID state and library-load timeouts.
- Learning UX exposes reading, analysis, work-understanding, Knowledge creation and confirmation stages.
- 我的工作 is presented as searchable, sortable category folders with Companion Cards.
- Mr. KM can suggest merge, rename and category cleanup while leaving adoption to the user.
- Knowledge re-learning records up to ten versions and supports rollback.
- Version, Build, manifest and timestamped artifacts are aligned.
- Automatic WorkLog time resolution now keeps the same-day remaining tail visible; choosing 30m can fill `17:30–18:00`, explicit date/time is respected, and overlaps return a clear validation error.
- Google-document learning now shows an animated in-page reading warning, named progress stages, guarded back navigation and explicit success/error states.
- Control Center no longer exposes Gmail or Calendar services.
- Knowledge and Work Memory searches preserve Chinese IME composition before rendering results.
- Work Memory merge suggestions now include semantic examples, similarity, canonical name, aliases, category and a confirmation preview while preserving source/history metadata.

## QA

- Automated regression: 23/23 passed.
- Deployment smoke test: PASS (Chrome + HTTP).
- PM UAT remains required for the live Google Picker → single file → Knowledge flow.

## Known limitations

- GitHub Pages push requires the Product Owner's authenticated GitHub Desktop session.
- Google OAuth publication and Drive token validity remain external environment prerequisites.
- No Drive folder scan, multi-file import or background synchronization is included.
