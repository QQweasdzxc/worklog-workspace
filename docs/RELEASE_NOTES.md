# WorkLog RC3 Release Patch1

## Build 20260714-1421 - P5.3 Sprint 2 Work Memory Smart Merge

- 移除「我的工作」卡片上的手動合併按鈕，避免要求使用者自己思考要跟誰合併。
- 新增 Work Memory Smart Merge：Mr. KM 會主動發現相近工作並提出整理建議。
- 若沒有可整理項目，顯示「🪶 我的工作目前整理得很好。」
- 若有可整理項目，顯示相近工作、相似度、建議保留名稱、說明與來源。
- 使用者可選擇：
  - 接受建議
  - 修改後接受
  - 先保留
- 接受後會透過既有 DataService 同步更新 `我的工作`。
- 先保留會記錄 user-scoped decision，避免同一組工作一直提醒。
- 「我的工作」新增整理統計：合併、更名、新增次數。
- 本輪不新增 Supabase Schema、不新增 AI / RAG / Embedding，只做 UX-first Smart Merge。

### 🪶 Companion QA

1. 如果我是 Mr. KM，我是否主動幫主人整理工作？
   - 是。系統會主動提出可能可以整理的工作組合。
2. 主人是否不用自己找重複工作？
   - 是。卡片上移除手動合併，改由 Mr. KM 提出建議。
3. 主人是否只需要確認，而不是自己整理？
   - 是。使用者只需接受、修改後接受或先保留。
4. 我的建議是否會因主人接受或拒絕而持續學習？
   - 是。接受會更新「我的工作」；先保留會記住這組不要一直提醒。

### 🎯 Mr. KM Perspective

以前，是主人自己整理工作。

現在，我開始主動幫主人發現哪些工作其實可以整理在一起。

如果我判斷錯了，主人可以告訴我；下一次，我會更了解他的工作方式。

## Build 20260714-1409 - P5.3 Work Memory Foundation

- 新增正式功能頁 `🪶 我的工作`，作為 P5.3 Work Memory 的產品層入口。
- Work Memory 目前沿用既有 `user_work_models` / DataService state，不新增 Supabase Schema。
- 每一項「我的工作」顯示：
  - 工作名稱
  - 工作說明
  - 工作分類
  - 來源文件
  - 熟悉度
  - 最近使用時間
  - 是否啟用
- 支援新增、重新命名、合併、停用「我的工作」，並透過既有 DataService 同步到 Cloud。
- Knowledge 理解完成後，可將 Mr. KM 整理出的工作「全部接受」或「接受勾選」加入「我的工作」。
- KM 建議主線明確收斂為：文件 → Mr. KM 學習 → 我的工作 → KM 建議 → 工時。
- 本 Sprint 不新增 OCR、RAG、Embedding、Vector Search、Edge Function、工作習慣分析或新 AI 能力。

### 🪶 Companion QA

1. 我是否更懂使用者的工作？
   - 是。Mr. KM 不只停在文件理解，而是開始把理解結果整理成「我的工作」。
2. 我是否減少了一個操作？
   - 是。使用者不需要手動從整理結果重新建立工作，可直接接受 Mr. KM 建議加入「我的工作」。
3. 我是否讓工時更容易完成？
   - 是。KM 建議未來會以「我的工作」為來源，讓使用者更快加入工時。
4. 我是否符合 Product Charter？
   - 是。AI 只建議，使用者決定；每一次學習都回到讓工時更好填。

### 🎯 Mr. KM Perspective

以前，你教我一份文件。

現在，我開始記住你的工作。

因為只有真正理解你每天在做什麼，我才能在未來給你更貼近、更有幫助的工時建議。

## Build 20260714-1352 - P5.2B Review UX Refinement

- Header 視覺比例微調：`Zhuge AI OS` 作為品牌主體，`by Mr. KM` 下移為陪伴者署名。
- 藏書閣首頁補上「之後工時會更好填」的產品理由，讓使用者知道為什麼要教 Mr. KM。
- 理解完成頁從「請確認我的理解」推進為「是否接受我的理解，讓我之後依照這些工作協助你」。
- 「我的工作」加入輕量成長感：顯示目前工作數與 Mr. KM 熟悉度星等。
- KM 建議文案由「來源」再往前一步，改為說明「我是根據你的工作建議你補上這項工時」。
- README 新增 `Why Mr. KM?`，把 Mr. KM 定位為 Knowledge Mate / Mentor / Companion。
- 本輪仍為 UX / 文案 polish，不新增 AI 能力、不修改資料模型、不修改正式 Cloud Sync 流程。

### 🎯 Mr. KM Perspective

如果我是 Mr. KM，

這一版我學會了什麼？

- 我學會把「我理解了」往前推成「我可以怎麼幫你把工時填得更輕鬆」。
- 我開始讓「我的工作」看起來像會成長的理解，而不只是設定清單。

我少讓使用者做了哪些事情？

- 使用者不用自己猜：為什麼要上傳文件、為什麼要接受我的理解、為什麼這張建議跟自己有關。

使用者是否更容易完成工時？

- 是。每個知識與建議的文案都更明確地連回工時完成。

我是否更懂使用者？

- 是。雖然這版沒有新增 AI 學習能力，但產品語言開始讓使用者感覺「我正在變得更懂他的工作」。

## Build 20260714-1347 - P5.2B Product Alignment

- Header 品牌調整為「🪶 Zhuge AI OS / by Mr. KM」，首頁不再顯示工程版本號。
- 藏書閣文案收斂為「教 Mr. KM 學會你的工作」，避免把第一層體驗做成文件管理。
- 知識整理、理解結果與能力卡改用 Mr. KM 第一人稱語氣，讓使用者感覺是在教工作夥伴，而不是操作 AI 系統。
- 設定頁「工作模型」顯示語意調整為「我的工作」，KM 建議來源也改為引用「我的工作」。
- README 新增 Product Charter 摘要與「🪶 Mr. KM 成長日誌」。
- 本輪不新增 AI 能力、不修改 Supabase Schema、不修改 Storage / PDF / Unicode / DataService / Repository / WorkLog 正式流程。

### 🎯 Mr. KM Perspective

如果我是 Mr. KM，

這一版我學會了什麼？

- 我學會用更像工作夥伴的方式說話，而不是像一套 AI 系統。
- 我開始把藏書閣表達成「你正在教我新的工作」，而不是「你正在管理文件」。

我少讓使用者做了哪些事情？

- 使用者不需要先理解 Metadata、Knowledge Units 或 Recommendation Candidate 這些工程詞。
- 使用者可以更直接知道：文件最後會回到「我的工作」，並讓工時建議更準。

使用者是否更容易完成工時？

- 是。KM 建議的來源更清楚地回到「我的工作」，使用者更容易理解為什麼可以把建議加入工時。

我是否更懂使用者？

- 是。這一版讓產品主線更清楚：每一次學習，都是為了讓下一次工時更容易完成。

## Build 20260713-2210 - P5.2 Knowledge Intelligence v1

- 新增 `knowledge-intelligence.js`，將文件擷取、摘要、Knowledge Units、建議工作候選從 `worklog-app.js` 拆出。
- 藏書閣上傳後可進入 `uploaded → queued → processing → processed`，失敗時顯示可理解錯誤。
- 新增 Knowledge Intelligence 結果頁：文件摘要、主要主題、Knowledge Units、建議工作候選、確認內容、重新處理。
- 新增 P5.2 Supabase SQL：`knowledge_sources` intelligence 欄位與 `knowledge_recommendation_candidates` table。
- 本輪不做 RAG、Embedding、Knowledge Chat、跨職務推理，也不自動推送首頁建議卡。

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
