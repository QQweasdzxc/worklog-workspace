# WorkLog RC3 Release Patch1

## Build 20260714-1641 - P5.4 Work Intelligence

- 新增純邏輯模組 `work-intelligence.js`。
- Knowledge Intelligence 不再把 checklist / process 的動作句直接轉成工作建議。
- 新 Learning Pipeline：
  - Document Evidence
  - Work Discovery
  - Work Understanding
  - Work DNA
  - Compare Work Memory
  - Suggestion Intelligence
  - Learning Review
- 每項 Work DNA 包含：
  - 工作名稱、目的、內容
  - 主要流程
  - 使用系統
  - 涉及部門
  - 輸出成果
  - 工作頻率
  - Trigger、關鍵字與來源證據
- Work DNA 儲存在既有 `intelligence_summary` JSONB，不新增 Supabase Schema。
- 建議建立前先經 Suggestion Intelligence 與「我的工作」比對；既有相似工作直接引用，不建立新候選。
- Learning Review 第一層改為 Work DNA；原本的 Unit / Chunk 降為可展開的追溯證據。
- 只有「確認／檢查／追蹤」而缺少工作脈絡時，不產生低品質工作建議。
- 新增 Work Intelligence 與完整 Learning Pipeline 自動化測試。

### 🪶 Companion QA

1. 我是否學到工作，而不是只抓到動詞？
   - 是。動作句只作為 Work DNA 的流程證據。
2. 我是否知道工作為什麼存在、如何完成與產出什麼？
   - 是。每項工作都有目的、流程、系統、部門、成果、頻率與 Trigger。
3. 我是否避免重複教主人已確認的工作？
   - 是。所有新工作在建立建議前都會比對 Work Memory。
4. 這次學習是否能改善後續工時？
   - 是。只有高層級 Work 會進入 Suggestion Queue，後續工時建議不再引用零碎動作。

### 🎯 Mr. KM Perspective

以前，我先看到「確認、檢查、追蹤」。

現在，我會先問：這些步驟共同完成的是哪一份工作？我會把句子留作證據，把真正的工作記成 Work DNA，再請主人確認我理解得對不對。

## Build 20260714-1604 - P5.3 Refactoring Sprint 1

- 新增獨立純邏輯模組 `suggestion-intelligence.js`，負責：
  - Candidate normalization
  - Generalization
  - Work Memory similarity matching
  - Cross-source deduplication
- AI 建議會先比對「我的工作」；高相似度候選直接引用既有工作，不再產生重複建議。
- 將「檢查請款文件／追蹤驗收／確認交貨」等零散動作凝聚為較高層級的「採購案件管理」。
- 相同或高度相似候選只保留一張建議卡，並合併來源資料。
- 建議 Decision Key 改以正規化後的工作名稱為主，同時相容既有 LocalStorage decision key。
- 移除 Sprint 2.2／2.3 IA 修正後已無 DOM 入口的舊事件處理、函式與 CSS。
- 新增 Suggestion Intelligence 自動化測試，覆蓋去重、泛化、Work Memory 引用與避免錯誤合併。
- 新增 Architecture Review、Project Health Check 與 Technical Debt 評估。

### 🪶 Companion QA

1. 我是否減少主人需要處理的重複建議？
   - 是。相同建議會合併，高相似度既有工作不再重複詢問。
2. 我是否把零散動作整理成更容易理解的工作？
   - 是。已加入保守、可測試的 Generalization 規則。
3. 我是否仍保留主人的決定權？
   - 是。只有真正的新工作或整理建議才進 Queue，仍需使用者採用。
4. 我是否讓後續架構更容易維護？
   - 是。Suggestion 判斷已與 UI、DataService、Supabase 分離。

### 🎯 Mr. KM Perspective

以前，同一件工作可能因為出現在不同文件裡，就被我重複提出。

現在，我會先整理、比對並確認它是不是主人已經教過我的工作。只有真正值得主人決定的新內容，我才會提出建議。

## Build 20260714-1536 - P5.3 Sprint 2.3 IA Correction

- 將「我的工作」收斂為使用者已確認的正式工作清單，第一層只顯示：
  - 已採用工作
  - 工作名稱
  - 分類
  - 啟用狀態
- 保留 `＋ 新增工作` 與 `🪶 查看 AI 建議（N）` 兩個入口。
- 將來源、熟悉程度與「採用後我可以」等 Companion Card 內容，完整移至 AI 建議 Workspace。
- 每一張 Companion Card 現在都代表一則尚未採用的 AI 建議，不再代表正式工作。
- `✅ 採用` 後才加入「我的工作」，建議卡隨即從 Queue 移除。
- 本輪只修正資訊架構；不修改 Work Memory、Knowledge、DataService、Supabase 或 KM Suggestion 生成邏輯。

### 🪶 Companion QA

1. 「我的工作」是否保持穩定可信？
   - 是。只呈現使用者已確認的正式工作，不混入 Mr. KM 的推測與敘事。
2. AI 建議是否與正式工作清楚分離？
   - 是。Companion Card 只存在於 AI 建議 Workspace。
3. 使用者是否保有最後決定權？
   - 是。建議只有在使用者按下採用後，才會成為「我的工作」。
4. 是否符合 Product Charter？
   - 是。Mr. KM 負責提出與說明建議；主人決定哪些內容能成為正式工作。

### 🎯 Mr. KM Perspective

我不能把自己的建議直接當成主人的工作。

現在，主人已確認的工作會安靜地留在「我的工作」；我想到的新建議，則會整理在另一個 Workspace，等主人有空時再決定是否採用。

## Build 20260714-1525 - P5.3 Sprint 2.3 AI Suggestion Workspace

- 將「我的工作」與「AI 建議」正式分離。
- 「我的工作」現在只呈現已被使用者確認的工作：
  - 已採用工作
  - 手動新增工作
  - 可直接編輯工作
  - 新增工作
- 在「＋ 新增工作」左側新增：
  - `🪶 查看 AI 建議（N）`
  - 無建議時顯示 `目前沒有新的 AI 建議`
- 新增隱藏式 `AI 建議` Workspace：
  - 不出現在側邊欄
  - 只能由「我的工作」按鈕開啟
  - 每張卡都是 Mr. KM 的建議，而不是正式工作
- AI 建議卡顯示：
  - AI 建議原因
  - 來源資料
  - 建議內容
- AI 建議卡提供四個操作：
  - `✏️ 編輯`
  - `🔀 合併`
  - `✅ 採用`
  - `🙈 忽略`
- 使用者按下 `✅ 採用` 後，才會加入「我的工作」，並立即更新 Work Model / KM Suggestion 可引用來源。
- `🙈 忽略` 會記住使用者決定，避免同一則建議一直出現。
- 本輪不新增 AI 能力、不新增 Schema、不修改 WorkLog / Knowledge / DataService / Supabase / KM Suggestion 正式資料流程。

### 🪶 Companion QA

1. 「我的工作」是否只代表已確認的工作？
   - 是。AI 建議不再混入正式工作列表。
2. Mr. KM 是否仍可提出建議？
   - 是。建議移到獨立 Workspace，清楚標示為提案。
3. 使用者是否保有最後決定權？
   - 是。只有採用後才加入「我的工作」；忽略則收起建議。
4. 是否讓 Work Memory 更可信？
   - 是。正式工作與 AI 建議分離後，使用者更容易理解：Mr. KM 可以建議，但不會替主人決定。

### 🎯 Mr. KM Perspective

以前，我的建議和主人已確認的工作放在一起，可能會讓主人分不清：這是事實，還是我的想法？

現在，我把它們分開了。

「我的工作」是主人已經確認的工作。

「AI 建議」是我的提案。

我可以提醒、整理、合併、建議；但真正決定是否加入的人，永遠是主人。

## Build 20260714-1507 - P5.3 Sprint 2.2 Companion Card UX Refinement

- 將 Companion Card 第一層操作收斂為：
  - `📄 來源`
  - `✏️ 編輯`
- 移除第一層固定「停用」與「重新命名」操作；停用改收進「編輯」流程。
- 將「我是從」改為 `🪶 我是從這些資料學會的：`，讓語氣更像 Mr. KM。
- 學習來源改為可點擊項目；若可對應藏書閣文件，會直接開啟該來源理解頁。
- `✏️ 編輯` 改為工作資料編輯，包含：
  - 工作名稱
  - 工作說明
  - 分類
  - 啟用狀態
- AI 整理建議不再固定顯示；只有 Mr. KM 發現相近工作時，才顯示 `🪶 AI 建議`。
- 沒有可整理建議時，不顯示 AI 建議區塊，避免使用者誤以為需要主動找功能。
- 本輪不新增 AI 能力、不新增 Schema、不修改 Work Memory / Knowledge / DataService / Supabase / KM Suggestion 資料流程。

### 🪶 Companion QA

1. 我是否把「管理工作」變得更自然？
   - 是。第一層只留下使用者現在會做的「來源」與「編輯」。
2. 主人是否不用自己思考「要不要合併」？
   - 是。合併不再是常駐按鈕；只有我真的發現相近工作時，才主動提出整理建議。
3. 主人是否知道這項工作是怎麼學會的？
   - 是。來源直接顯示在卡片內，且可點擊查看。
4. 是否符合 Product Charter？
   - 是。AI 不提供更多按鈕，而是在對的時候提出對的建議，最後仍由使用者決定。

### 🎯 Mr. KM Perspective

這一版，我沒有增加新的能力。

我只是把「我的工作」說得更像一位工作夥伴。

我不希望主人思考：「我要不要按合併？」

當我真的發現可以整理的地方時，我會主動說：

> 🪶 我發現這兩項工作很像，要不要一起整理？

真正好的 AI，不是提供更多按鈕，而是在對的時候，提出對的建議。

## Build 20260714-1453 - P5.3 IA Simplification

- 移除側邊欄獨立「我的工作」入口，避免首頁 / 系統區 / 設定重複。
- 將 Work Memory 收斂到 `設定 → 我的工作`，讓它成為工作管理中心，而不是另一個功能頁。
- 取消設定頁第一層「我的工作」Checkbox 管理方式，改為 Companion Card / 工作卡呈現。
- 在「我的工作」區塊上方新增明確目的說明：
  - 這裡是 Mr. KM 已經學會的工作
  - 也是工時建議的主要來源
  - 加入後會讓 KM 建議更準、工時更快完成
- Smart Merge 建議只在「我的工作」區有價值時呈現；沒有可整理項目時顯示自然狀態：「🪶 我的工作目前整理得很好。」
- Knowledge 理解結果接受後，導向 `設定 → 我的工作`，讓使用者看見文件如何變成 Work Memory。
- 本輪不新增功能、不新增 Schema、不修改 AI 能力；只做資訊架構收斂。

### 🪶 Companion QA

1. 使用者是否更清楚「我的工作」在哪裡？
   - 是。它回到設定中的工作管理中心，不再和首頁入口重複。
2. 使用者是否更清楚「我的工作」做什麼？
   - 是。頁面明確說明它是 KM 建議與工時建立的主要來源。
3. 是否減少無意義操作？
   - 是。第一層 checkbox 已移除，改為可理解的工作卡。
4. 是否符合 Product Charter？
   - 是。資訊架構回到「讓工時更好填」，而不是多一個功能入口。

### 🎯 Mr. KM Perspective

以前，我把「我的工作」放成一個獨立功能，主人可能會問：然後呢？

現在，我把它收回工作設定裡，清楚告訴主人：這些是我已經學會的工作，也是我之後幫你建立工時的主要依據。

## Build 20260714-1437 - P5.3 Sprint 2.1 Work Memory Companion Card

- 將「我的工作」卡片由資料卡調整為 Companion Card。
- 每張卡片改以 Mr. KM 的口吻呈現：
  - 我是從哪些來源學會這項工作
  - 最近一次陪你完成
  - 熟悉程度
  - 之後我可以怎麼幫你
  - 一句 Mr. KM 的自然回饋
- Companion Card 不再使用遊戲感星等，改以 `還在學習 / 開始熟悉 / 已經熟悉 / 非常了解` 與進度條呈現。
- 保留既有重新命名、查看來源、停用操作。
- 不新增 AI 能力、不新增 Schema、不修改 WorkLog / Knowledge / Smart Merge 資料流程。

### 🪶 Companion QA

1. 這張卡是否讓使用者感受到 Mr. KM 真的記得他的工作？
   - 是。卡片從來源、最近使用、熟悉程度與未來協助方式，說明 Mr. KM 如何陪伴使用者完成工作。
2. 是否比原本資料欄位更有生命感？
   - 是。卡片底部加入 Mr. KM 的一句自然回饋。
3. 是否讓工時更容易完成？
   - 是。每張卡明確說明之後可用於推薦工時、整理相近工作與月底提醒。
4. 是否符合 Product Charter？
   - 是。卡片不是介紹功能，而是在說 Mr. KM 如何用這份理解陪使用者完成工作。

### 🎯 Mr. KM Perspective

以前，我只是把你的工作列出來。

現在，我會告訴你：我是從哪裡學會它、最近什麼時候陪你完成過、以及之後我可以怎麼幫你。

我希望你看到的不是一張資料卡，而是我正在慢慢理解你的工作。

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
# Build 20260714-1715 - P5.5 Work Intelligence UX Optimization

- 修復 Learning Review 返回與確認流程。
- 新增 Work Memory 單一編輯入口與建立前相似度選擇。
- Learning Review 採漸進式揭露 Work DNA。
- Mr. KM 建議顯示總量與剩餘數，不再循環重新編號。
