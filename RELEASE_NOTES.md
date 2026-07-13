# WorkLog RC3 Release Patch1

## Build 20260713-1547 - P5.2A-1 Architecture Foundation Split

- 進行 Zero Functional Change 的 Foundation Split，將 RC3.4 已驗收底層程式抽離為多個模組。
- 新增：
  - `app-config.js`
  - `shared-utils.js`
  - `app-state.js`
  - `auth-service.js`
  - `repositories.js`
  - `data-service.js`
- `worklog-app.js` 保留 App startup、routing、rendering 與 module coordination。
- 維持既有 build flow：root / apps/web / apps/chrome-extension 三端同步，不導入 bundler 或 ES module build。
- 不修改 UI / UX、Supabase Schema、WorkLog、Conversation、Knowledge Repository、ECP Export、Mobile 三頁籤或自然語言邏輯。
- 拆分前 `worklog-app.js`：4786 行；拆分後 `worklog-app.js`：3299 行。

## Build 20260713-1054 - P4.7 Experience Polish（RC3.3 Final）

- 建立 Today-first 首頁體驗：啟動時 Calendar、我的工作、今日摘要與 Mr. KM 建議預設對齊今天。
- 將工作身分由首頁大型 Card 收斂為 Header System Status。
- 手機首頁改為 Action First：新增工時、今天工時、我的工作優先，摘要與月曆採漸進式呈現。
- 品牌統一為 Mr. KM，AI 建議圖示調整為 🪶。
- Mr. KM 今日建議改為一次顯示 5 筆，支援快速掃描與下一批。
- Calendar 對話不再顯示尚未正式寫入的「已建立」狀態，避免聊天與首頁資料不同步造成信任落差。
- 保留既有 WorkLog、Conversation Core、Cloud Sync、Export、Knowledge Repository 架構；本版不新增 AI 能力與資料表。

## Build 20260713-1405 - P4.7 Final Review Fix

- 將 Mr. KM 流程重新收斂為「自然語言 → 理解 → 確認 → 建立工時 → 工時月曆 / 首頁同步 → ECP 匯出」。
- 一般自然語言工作不再導向 Calendar 草稿；確認建立後直接寫入正式 WorkLog entry。
- 「整個上午 / 上午」預設為 09:00–12:00（3h），「整個下午 / 下午」預設為 13:00–18:00（5h），「整天」維持 8h。
- 若只有明確開始時間但無 duration，例如「下午三點面試」，仍會先詢問工時長度。
- 我的工作預設顯示今天；點選工時月曆或建立非今日工時後，會顯示選取日期的工時，避免建立成功但首頁看不到的落差。
- Chat 使用者可見文案移除 Calendar Draft / Pending / Google Calendar 概念，統一為工時月曆與工時建立。

## Build 20260713-1450 - RC3.4 Mobile UX Layout Polish

- 手機版新增三個主要頁籤：📝 工時、📊 摘要、🪶 Mr. KM 建議。
- 手機「工時」預設頁改為每日流程：工時月曆 → 新增工時 → 今日工時 / 剩餘工時 → 我的工作。
- 摘要與 Mr. KM 建議從首頁流程中分離，避免手機第一屏被統計資訊占滿。
- Mr. KM 建議標題統一為「🪶 Mr. KM 建議」，不再限定「今日」。
- 建議卡定位收斂為「工作建議助手」：只顯示工作名稱、來源與預設工時，不預先安排固定時段。
- 建議卡操作改為「加入工時 / 調整」，符合使用者將建議加入工時月曆的產品語意。
- 手機我的工作卡片與編輯 / 刪除按鈕加大，提升單手點擊體驗。

## Version

1.0.0-rc3.1-sp3

## Scope

RC3 Release Patch1 only. No new features, no version number change, no repository restructuring.

## Completed Patches

- P0-001 Calendar Default Today
  - Entering Work defaults Calendar to Today.
- P0-002 Today 與 Calendar 同步
  - Verified existing shared date state satisfies the requirement.
  - No Code Change Required.
- P0-003 Suggestion Card Position Optimization
  - Dashboard order: Calendar, Today, Suggestion Card.
  - Desktop layout: Calendar left; Today and Suggestion Card right.
  - Narrow layout: Calendar, Today, Suggestion Card.
- P0-004 Book Creation Return Flow
  - Verified existing Library save flow returns to Library and shows the new item immediately.
  - No Code Change Required.
- P0-007 Google Login Only
  - Login UI keeps only the Google login button.
  - Local QA login uses fixed session data.

## Developer QA

- Full Regression Check: PASS
- Build Verification: PASS
- Chrome Extension Verification: PASS
- Web Version Verification: PASS
- Static File Validation: PASS
- JavaScript Syntax Check: PASS
- Manifest Validation: PASS
- Version Consistency Check: PASS

## Generated Release Artifacts

- Web Build folder
- WorkLog_RC3_Web.zip
- WorkLog_RC3_ChromeExtension.zip
- WorkLog_RC3_Release_Patch1.zip

## Build 20260710-1017 - Timezone Data Integrity Fix

- Fixed `09:00` being displayed as `01:00` after cloud save.
- Fixed timestamps drifting backward by eight hours on repeated load/save cycles.
- Added explicit Asia/Taipei business-time conversion helpers.
- Kept `work_date` as date-only and `started_at` / `ended_at` as UTC timestamps.
- Existing already-drifted records are not automatically rewritten; correct them manually after deployment.

## Build 20260710-1048 - Smart Gap Scheduling + 5h Quick Select

- 保留 Timezone Data Integrity 修正：業務時間以 Asia/Taipei 顯示，Cloud timestamp 僅轉換一次。
- 快速新增依所選日期與工時長度，優先安排最早可容納的空檔。
- 午休時段視為不可安排區間。
- 當日無足夠空檔時，才接在最後一筆工作之後。
- 舊版 AI 推理卡曾顯示建議時段；RC3.4.1 起 Mr. KM 建議不再扮演排程助手。
- 新增 5h 工時快捷鍵。
