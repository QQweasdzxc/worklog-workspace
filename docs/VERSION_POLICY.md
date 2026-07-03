# Version Policy

Web 與 Chrome Extension 版本號必須一致。

目前版本：`1.0.0-rc2`

更新版本時需同步更新：

- `/package.json`
- `/packages/shared/version.js`
- `/apps/web/version.json`
- `/apps/web/version.js`
- `/apps/chrome-extension/version.json`
- `/apps/chrome-extension/version.js`
- `/apps/chrome-extension/manifest.json` 的 `version_name`
- `/docs/RELEASE_NOTES.md`

Chrome Extension `manifest.json.version` 需符合 Chrome 規則，只能使用數字格式，例如 `1.0.0`。  
完整版本顯示使用 `version_name`，例如 `1.0.0-rc2`。
