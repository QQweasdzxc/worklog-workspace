Zhuge AI OS 0.9.0-alpha.2 — Sprint 2 Knowledge Integration
Build: 20260724-2328 (UAT ingestion initialization hotfix)

This folder is the flat GitHub Pages deployment artifact.

GitHub Desktop:
1. Copy everything inside this folder into the dedicated Pages Repository root.
2. Commit and Push.
3. In Settings → Pages, select main / (root).
4. Open the Pages URL after deployment completes.

If Google Drive Picker UAT is required, open `app-config.js` in this Deployment folder and set:

const GOOGLE_PICKER_API_KEY = "<public-browser-api-key>";
const GOOGLE_PICKER_APP_ID = "<google-cloud-project-number>";

These are public Picker settings only. Never add an OAuth client secret or Supabase service_role key.
Do not put OAuth client secrets or Supabase service_role keys in this artifact.

This is a deployment artifact, not the source repository. The matching source is delivered separately as `20260724_2331_ZhugeAIOS_v0.9.0-alpha.2_Source.zip`.
