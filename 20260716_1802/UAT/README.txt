Zhuge AI OS 0.9.0-alpha.2 — GitHub Pages Package

這個資料夾的「內容」就是 GitHub Pages 部署內容。本版對應現有的 `qqweasdzxc.github.io/worklog-workspace/` App，請優先部署到同一個 `worklog-workspace` Repository，才能沿用目前已設定的 OAuth Redirect。

GitHub Desktop 部署方式：
1. 解壓縮本套件。
2. 開啟解壓縮後的 0.9.0-alpha.2 資料夾。
3. 複製這個資料夾「裡面的所有檔案與資料夾」，不要複製外層資料夾本身。
4. 貼到 `worklog-workspace` GitHub Pages Repository 的根目錄。
5. 用 GitHub Desktop Commit，再 Push origin。
6. 在 GitHub Repository 的 Settings → Pages 選 Deploy from a branch、main、/(root)。
7. 開啟 GitHub 顯示的 Pages URL。

注意：這是部署用 App Artifact，不是 Source Repository。請不要把它覆蓋到原始碼資料夾，除非該 Repository 就是專用 Pages Repository。若改用其他 Repository 名稱，必須先更新 Supabase OAuth Redirect allowlist，否則登入回呼可能被拒絕。

若尚未建立 GitHub Pages Repository，可以先使用 Start.command 在本機預覽；只要雙擊，不需要自行輸入 Terminal 指令。

本版本的 Google OAuth 仍受外部 Google Cloud 設定影響；若 OAuth 尚未完成正式核准，登入畫面會顯示可理解的錯誤，不會繞過 Google 權限驗證。
