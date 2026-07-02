# WorkLog v1.0 Repository

WorkLog：每天只花 30 秒，AI 幫你記住一整天的工作。

## 內容
- `apps/web`：Web / RWD 版，可部署 GitHub Pages / Vercel
- `apps/chrome-extension`：Chrome Extension 版
- `packages/shared`：共用規則與文件
- `supabase/migrations`：RC1 Supabase migration
- `docs`：產品規格、同步規則、ECP Mapping、驗收清單

## 快速測試
### Web
直接開啟 `apps/web/index.html`

### Chrome Extension
Chrome → `chrome://extensions/` → 開發人員模式 → 載入未封裝項目 → 選 `apps/chrome-extension`

## RC1 驗收身份
UUID：`ac5afcc7-f045-41a9-8827-eaf085a04c0d`

正式多人版需改為 Google Login / Supabase Auth `auth.uid()`。
