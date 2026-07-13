# WorkLog RC3 Release Patch1

## Build 20260713-1054 - P4.7 Experience Polish（RC3.3 Final）

- 建立 Today-first 首頁體驗：啟動時 Calendar、我的工作、今日摘要與 Mr. KM 建議預設對齊今天。
- 將工作身分由首頁大型 Card 收斂為 Header System Status。
- 手機首頁改為 Action First：新增工時、今天工時、我的工作優先，摘要與月曆採漸進式呈現。
- 品牌統一為 Mr. KM，AI 建議圖示調整為 🪶。
- Mr. KM 今日建議改為一次顯示 5 筆，支援快速掃描與下一批。
- Calendar 對話不再顯示尚未正式寫入的「已建立」狀態，避免聊天與首頁資料不同步造成信任落差。
- 保留既有 WorkLog、Conversation Core、Cloud Sync、Export、Knowledge Repository 架構；本版不新增 AI 能力與資料表。

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
- AI 推理卡顯示建議時段，採納時使用該空檔。
- 新增 5h 工時快捷鍵。
