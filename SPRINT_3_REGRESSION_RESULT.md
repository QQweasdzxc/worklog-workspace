# Sprint 3 Regression Result

Version: `0.9.0-alpha.3`  
Build: `20260727-1517`

## Automated QA

- Test suite: **23/23 PASS**
- Syntax checks: **PASS**
- Deployment smoke test: **PASS** (Chrome + HTTP)
- Runtime mirrors: **PASS** (`root`, `apps/web`, `apps/chrome-extension`)

## Revision cases

1. 7.5h at `09:00–17:30` plus `30m` resolves to the same-day `17:30–18:00` tail.
2. Explicit date/time is retained; overlapping time returns a visible validation error.
3. Chinese IME composition is preserved in Knowledge and Work Memory search.
4. Google-document reading shows staged progress, a leave warning, and explicit success/error state.
5. Semantic merge preview covers contract, project, procurement and meeting examples; merge remains user-confirmed.
6. Control Center no longer renders Gmail or Calendar service cards.

## External validation

Google OAuth / Picker access remains dependent on the authenticated deployment environment. The UAT package includes the configured Picker build, but external Google account authorization is still validated by PM in the live environment.
