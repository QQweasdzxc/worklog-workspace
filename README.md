# WorkLog RC2 Monorepo

Version: `1.0.0-rc2`

## Apps
- `apps/web`：GitHub Pages / Vercel 網頁版
- `apps/chrome-extension`：Chrome Extension 插件版

## Version Rule
Web 與 Chrome Extension 版本號必須一致。

目前版本：

```text
1.0.0-rc2
```

版本來源：
- `package.json`
- `apps/web/version.json`
- `apps/chrome-extension/version.json`
- `apps/chrome-extension/manifest.json`
- `packages/shared/version.js`
- `docs/RELEASE_NOTES.md`

## RC2 改動
- 建立 monorepo 結構
- Web / Extension 共用 shared 版本號
- 同步中心定位為狀態中心
- Event 建立不再暴露給一般使用者
- 後續每次更新，Web 與插件版本同步
