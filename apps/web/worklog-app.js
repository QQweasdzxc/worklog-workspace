const VERSION = "1.0.0-rc3.1-sp3";
const root = document.getElementById("app");
const AUTH_SESSION_KEY = "zhuge_ai_os_google_auth_session_v1";
const AUTH_CODE_VERIFIER_KEY = "zhuge_ai_os_pkce_code_verifier_v1";
const AI_OS_SESSION_KEY = "zhuge_ai_os_session_v1";
const ACTIVE_MODULE_KEY = "zhuge_active_module_v1";
const AUTH_CONFIG = {
  supabaseUrl: "https://lenpbbhwxyyfwgvjcozf.supabase.co",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxlbnBiYmh3eHl5Zndndmpjb3pmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyOTM1ODksImV4cCI6MjA5NTg2OTU4OX0.TAFfLoMC8Tqr4r7nlAtsOke3YcjBIBmr5fN1a6iwSFQ"
};

let activeModule = localStorage.getItem(ACTIVE_MODULE_KEY) || "dashboard";
let authCallbackCaptured = false;
let view = localStorage.getItem("wl_view") || "center";
if (view === "warroom") view = "library";
let selected = new Date(localStorage.getItem("wl_selected") || Date.now());
let entries = readJson("wl_entries", []);
let profile = readJson("wl_profile", null);
let feedback = readJson("wl_feedback", {});
let session = readJson(AI_OS_SESSION_KEY, null);
let library = readJson("wl_library", []);
const AI_REASON_QUEUE_SIZE = 5;

const roles = ["採購", "行政", "人資", "業務", "行銷", "IT", "自訂"];
const defaultTags = ["採購案件處理", "發票請款", "驗收請款", "供應商聯繫", "Mail處理", "資料整理", "會議", "專案追蹤"];
const roleTagMap = {
  "採購": ["採購案件處理", "發票請款", "驗收請款", "供應商聯繫", "採購進度追蹤", "合約資料整理", "會議", "專案追蹤"],
  "行政": ["庶務行政", "文件整理", "會議安排", "費用請款", "資產管理", "跨部門聯繫", "Mail處理", "資料整理"],
  "人資": ["招募作業", "面試安排", "員工資料維護", "出勤確認", "教育訓練", "薪資資料整理", "制度公告", "跨部門溝通"],
  "業務": ["客戶聯繫", "報價追蹤", "商機更新", "合約確認", "客戶會議", "銷售資料整理", "回款追蹤", "專案追蹤"],
  "行銷": ["活動規劃", "內容製作", "社群排程", "廣告成效追蹤", "市場資料整理", "素材確認", "跨部門溝通", "專案追蹤"],
  "IT": ["系統維護", "帳號權限處理", "問題排查", "需求訪談", "系統更新", "資料備份", "資安檢查", "技術文件整理"],
  "自訂": ["自訂工作", "Mail處理", "資料整理", "會議", "專案追蹤", "跨部門溝通", "文件整理", "待辦追蹤"]
};
const eventTypes = ["工作", "特休", "事假", "病假", "會議", "出差", "教育訓練"];
const librarySourceTypes = ["上傳檔案", "Google Drive", "Google Docs", "Google Sheets", "PDF", "網址"];
const libraryReadingStatuses = ["🟡 等待閱讀", "🔵 AI 閱讀中", "🟢 已完成理解", "🟠 文件更新，待重新閱讀"];
const libraryTagGroups = {
  "部門": ["採購", "人資", "財務", "IT", "行政"],
  "文件類型": ["SOP", "流程", "法規", "教學", "範本", "表單", "合約", "報表"],
  "用途": ["AI 推理", "AI 回答", "AI 搜尋", "AI 引用", "工作建議", "學習資料"]
};

function readJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
  catch { return fallback; }
}

function authHeaders(token) {
  return { apikey: AUTH_CONFIG.supabaseAnonKey, Authorization: `Bearer ${token || AUTH_CONFIG.supabaseAnonKey}`, "Content-Type": "application/json" };
}

function getStoredAuthSession() {
  return readJson(AUTH_SESSION_KEY, null);
}

function setStoredAuthSession(value) {
  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(value));
  localStorage.removeItem("wl_google_auth_session_v1");
}

function clearStoredAuthSession() {
  localStorage.removeItem(AUTH_SESSION_KEY);
  localStorage.removeItem("wl_google_auth_session_v1");
}

function getStoredCodeVerifier() {
  return localStorage.getItem(AUTH_CODE_VERIFIER_KEY);
}

function setStoredCodeVerifier(value) {
  localStorage.setItem(AUTH_CODE_VERIFIER_KEY, value);
  localStorage.removeItem("wl_google_pkce_code_verifier_v1");
}

function clearStoredCodeVerifier() {
  localStorage.removeItem(AUTH_CODE_VERIFIER_KEY);
  localStorage.removeItem("wl_google_pkce_code_verifier_v1");
}

function recordOAuthDebug(stage, detail) {
  const payload = { stage, detail, at: new Date().toISOString(), href: location.href };
  localStorage.setItem("zhuge_ai_os_oauth_debug_v1", JSON.stringify(payload));
  console.error("Zhuge AI OS OAuth Debug", payload);
}

function base64UrlEncode(bytes) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function generateCodeVerifier() {
  const bytes = new Uint8Array(64);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

async function codeChallengeFromVerifier(verifier) {
  const bytes = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return base64UrlEncode(new Uint8Array(digest));
}

function cleanAuthCallbackUrl() {
  const params = new URLSearchParams(location.search);
  ["code", "state", "error", "error_description"].forEach(key => params.delete(key));
  const search = params.toString();
  history.replaceState(null, "", location.pathname + (search ? `?${search}` : ""));
}

function captureHashAuthSession() {
  const hash = new URLSearchParams(location.hash.replace(/^#/, ""));
  const accessToken = hash.get("access_token");
  if (!accessToken) return null;
  authCallbackCaptured = true;
  const sessionValue = {
    access_token: accessToken,
    refresh_token: hash.get("refresh_token"),
    token_type: hash.get("token_type") || "bearer",
    expires_in: Number(hash.get("expires_in") || 3600),
    expires_at: Date.now() + Number(hash.get("expires_in") || 3600) * 1000
  };
  setStoredAuthSession(sessionValue);
  clearStoredCodeVerifier();
  history.replaceState(null, "", location.pathname + location.search);
  return sessionValue;
}

async function exchangeCodeForSession() {
  const code = new URLSearchParams(location.search).get("code");
  if (!code) return null;
  const codeVerifier = getStoredCodeVerifier();
  if (!codeVerifier) return null;
  authCallbackCaptured = true;
  const res = await fetch(`${AUTH_CONFIG.supabaseUrl}/auth/v1/token?grant_type=pkce`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ auth_code: code, code_verifier: codeVerifier })
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    recordOAuthDebug("pkce_token_exchange_failed", { status: res.status, body });
    clearStoredAuthSession();
    return null;
  }
  const data = await res.json();
  const sessionValue = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    token_type: data.token_type || "bearer",
    expires_in: Number(data.expires_in || 3600),
    expires_at: Date.now() + Number(data.expires_in || 3600) * 1000
  };
  setStoredAuthSession(sessionValue);
  clearStoredCodeVerifier();
  cleanAuthCallbackUrl();
  return sessionValue;
}

async function getAuthSession() {
  return captureHashAuthSession() || await exchangeCodeForSession() || getStoredAuthSession();
}

async function signInWithGoogle() {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await codeChallengeFromVerifier(codeVerifier);
  setStoredCodeVerifier(codeVerifier);
  const redirectTo = location.origin + location.pathname;
  const params = new URLSearchParams({
    provider: "google",
    redirect_to: redirectTo,
    code_challenge: codeChallenge,
    code_challenge_method: "S256"
  });
  location.href = `${AUTH_CONFIG.supabaseUrl}/auth/v1/authorize?${params.toString()}`;
}

function googleSessionFromUser(authUser, authSession = {}) {
  const meta = authUser.user_metadata || {};
  const email = authUser.email || "";
  return {
    provider: "google-oauth",
    user_uuid: authUser.id,
    uuid: authUser.id,
    name: meta.full_name || meta.name || email || "Google User",
    email,
    avatar: meta.avatar_url || "",
    avatarUrl: meta.avatar_url || "",
    access_token: authSession.access_token || "",
    refresh_token: authSession.refresh_token || "",
    expires_at: authSession.expires_at || null,
    expires_in: authSession.expires_in || null,
    token_type: authSession.token_type || "bearer",
    loginAt: new Date().toISOString()
  };
}

async function getGoogleAuthUser() {
  const authSession = await getAuthSession();
  if (!authSession?.access_token) return null;
  const res = await fetch(`${AUTH_CONFIG.supabaseUrl}/auth/v1/user`, { headers: authHeaders(authSession.access_token) });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    recordOAuthDebug("auth_user_fetch_failed", { status: res.status, body });
    clearStoredAuthSession();
    return null;
  }
  const user = await res.json();
  return { user, authSession };
}

function hasGoogleOAuthSession() {
  return session?.provider === "google-oauth" && !!session.email && !!(session.user_uuid || session.uuid);
}

function clearInvalidAuthState() {
  if (session && !hasGoogleOAuthSession()) {
    session = null;
    saveAll();
  }
}

function uid(prefix = "wl") {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[ch]));
}

function normalizeEntries() {
  let changed = false;
  entries = entries.map(e => {
    const next = { ...e };
    if (!next.id) { next.id = uid(); changed = true; }
    if (!next.type) { next.type = "工作"; changed = true; }
    if (!next.task) { next.task = next.title || "工作"; changed = true; }
    return next;
  });
  library = library.map(item => item.id ? item : { ...item, id: uid("lib") });
  if (changed) saveAll();
}

function validateEntry(item) {
  if (!item.title) return "請輸入工作內容";
  if (!item.at || Number.isNaN(new Date(item.at).getTime())) return "請選擇正確時間";
  if (!item.hours || item.hours <= 0) return "請選擇工時";
  if (item.hours > 8) return "單筆工時不可超過 8 小時";
  const sameDayHours = entries
    .filter(e => e.date === item.date && e.id !== item.id)
    .reduce((s, e) => s + Number(e.hours || 0), 0);
  if (sameDayHours + Number(item.hours) > 12) return "同日工時已超過 12 小時，請確認是否輸入錯誤";
  return "";
}

function saveAll() {
  localStorage.setItem("wl_entries", JSON.stringify(entries));
  localStorage.setItem("wl_profile", JSON.stringify(profile));
  localStorage.setItem("wl_feedback", JSON.stringify(feedback));
  localStorage.setItem(AI_OS_SESSION_KEY, JSON.stringify(session));
  localStorage.removeItem("wl_session");
  localStorage.setItem("wl_library", JSON.stringify(library));
  localStorage.setItem(ACTIVE_MODULE_KEY, activeModule);
  localStorage.setItem("wl_view", view);
  localStorage.setItem("wl_selected", selected.toISOString());
}

function toast(t) {
  const e = document.createElement("div");
  e.className = "toast";
  e.textContent = t;
  document.body.appendChild(e);
  setTimeout(() => e.classList.add("show"), 10);
  setTimeout(() => { e.classList.remove("show"); setTimeout(() => e.remove(), 220); }, 1800);
}

function safeDate(value, fallback = new Date()) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

function key(d = selected) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function monthKey(d = selected) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function fmt(dt) {
  const d = safeDate(dt);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function dayEntries() {
  return entries.filter(e => e.date === key()).sort((a, b) => new Date(a.at) - new Date(b.at));
}

function monthEntries() {
  return entries.filter(e => String(e.date || "").startsWith(monthKey())).sort((a, b) => new Date(a.at) - new Date(b.at));
}

function hours(list = dayEntries()) {
  return list.reduce((s, e) => s + Number(e.hours || 0), 0);
}

function tagsForRole(role) {
  return roleTagMap[role] || defaultTags;
}

function tagButtons(tags) {
  return tags.map(t => `<button class="btn2 tag-btn" data-tag="${escapeHtml(t)}">${escapeHtml(t)}</button>`).join("");
}

function googleConnectionLabel() {
  return "⚪ 尚未連接";
}

function nextStart() {
  let h = 9 + Math.floor(hours());
  if (h >= 12) h += 1;
  if (h >= 18) h = 17;
  return `${key()}T${String(h).padStart(2, "0")}:00`;
}

function tabs() {
  const items = [
    ["center", "📅", "中心"],
    ["capture", "➕", "紀錄"],
    ["library", "📚", "藏書閣"],
    ["sync", "📦", "同步"],
    ["settings", "⚙️", "設定"]
  ];
  return `<div class="tabs">${items.map(t => `<button class="tab ${view === t[0] ? "on" : ""}" data-view="${t[0]}">${t[1]}<br>${t[2]}</button>`).join("")}</div>`;
}

function userBadge() {
  if (!session) return "";
  return `<div class="identity-badge"><span>👤 ${escapeHtml(session.name)}</span><small>${escapeHtml(session.status || session.email || "")}</small><button class="mini" data-logout="1">登出</button></div>`;
}

function header() {
  return `<div class="top"><div><div class="muted">🟢 WorkLog AI・Web / Extension 版本一致</div><h1>🪶 WorkLog RC3.1</h1><div class="muted">Calendar、我的工作、AI 推理三欄工作台。</div></div><div class="header-right">${userBadge()}<div class="tag">${VERSION}</div></div></div>${tabs()}`;
}

function authScreen() {
  return `<div class="wrap"><div class="card"><section class="panel" style="margin-top:18px"><h1>🧠 Zhuge AI OS</h1><button class="btn full" id="googleLoginBtn">使用 Google 登入</button></section></div></div>`;
}

function zhugeDashboard() {
  return `<div class="wrap"><div class="card"><div class="top"><div><div class="muted">Identity Hub・Module Hub</div><h1>🧠 Zhuge AI OS</h1><div class="muted">請選擇要進入的工作模組。</div></div><div class="header-right">${userBadge()}<div class="tag">${VERSION}</div></div></div><section class="panel" style="margin-top:18px"><h2>Modules</h2><div class="dashboard-grid"><div class="entry"><b>🪶 Zhuge-WorkLog</b><div class="muted">工時紀錄與工作模型</div><button class="btn full" data-open-module="worklog">進入 WorkLog</button></div><div class="entry"><b>📈 Zhuge-investment</b><div class="muted">Coming Soon</div><button class="btn gray full" disabled>Coming Soon</button></div><div class="entry"><b>✈️ Zhuge Travel</b><div class="muted">Coming Soon</div><button class="btn gray full" disabled>Coming Soon</button></div></div></section></div></div>`;
}

function onboarding() {
  return `<div class="wrap"><div class="card"><div class="top"><div><div class="muted">🪶 初次認識</div><h1>你好，我是諸葛先生</h1><div class="muted">我想先了解你的工作，之後才能產生更準的每日工作建議卡。</div></div><div class="header-right">${userBadge()}<div class="tag">${VERSION}</div></div></div><section class="panel" style="margin-top:18px"><div class="profile-grid"><div><label>你的職務</label><select id="role" class="input">${roles.map(r => `<option>${r}</option>`).join("")}</select></div><div><label>每日工時</label><select class="input"><option>09:00~18:00，午休 12:00~13:00</option></select></div></div><label>常見工作內容（可複選）</label><div class="row two" id="tagOptions">${tagButtons(tagsForRole("採購"))}</div><label>SOP 狀態</label><select id="sop" class="input"><option>目前沒有 SOP，先用職務模型</option><option>有 SOP，之後上傳</option></select><label>工作來源</label><div class="row two">${["Google Drive", "Gmail", "Calendar", "手動紀錄"].map(s => `<button class="btn2 src-btn" data-src="${s}">${s}</button>`).join("")}</div><button class="btn full" id="saveProfile">建立我的工作模型</button></section></div></div>`;
}

function calendarPanel() {
  const y = selected.getFullYear(), m = selected.getMonth(), first = new Date(y, m, 1), last = new Date(y, m + 1, 0);
  let html = `<div class="panel-head"><h2>${y}/${String(m + 1).padStart(2, "0")}</h2><button class="btn2" data-today="1">今天</button></div><div class="cal">${["日", "一", "二", "三", "四", "五", "六"].map(x => `<div class="muted cal-head">${x}</div>`).join("")}`;
  for (let i = 0; i < first.getDay(); i++) html += "<div></div>";
  for (let d = 1; d <= last.getDate(); d++) {
    const dk = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const h = entries.filter(e => e.date === dk).reduce((s, e) => s + Number(e.hours || 0), 0);
    html += `<div class="day ${d === selected.getDate() ? "sel" : ""}" data-day="${d}"><b>${d}</b><div class="bar"><div class="fill" style="width:${Math.min(100, h / 8 * 100)}%"></div></div><small>${h ? h + "h" : ""}</small></div>`;
  }
  html += `</div><div class="month-summary"><b>本月工時</b><span>${hours(monthEntries())}h</span></div><button class="btn full" data-export-month="1">⬇️ 下載本月工時（Excel）</button>`;
  return html;
}

function todayPanel() {
  const list = dayEntries();
  const h = hours(list);
  return `<div class="panel-head"><h2>我的工作</h2><div class="tag">${h} / 8h</div></div>${list.length ? list.map(e => `<div class="entry"><div class="entry-main"><b>${escapeHtml(e.title)}</b><div class="muted">${fmt(e.at)}｜${Number(e.hours || 0)}h｜${escapeHtml(e.type || "工作")}</div><small>${escapeHtml(e.task || "")}</small></div><div class="actions compact"><button class="btn2" data-edit-id="${e.id}">編輯</button><button class="btn2 danger" data-del-id="${e.id}">刪除</button></div></div>`).join("") : `<div class="empty"><b>尚無工時紀錄</b><div class="muted">可採納 AI 推理，或按右下角 + 新增。</div></div>`}<button class="btn full" data-action="add">➕ 新增工作</button>`;
}

function makeSuggestions() {
  if (!profile) return [];
  const done = dayEntries().map(e => e.title);
  let tags = [...(profile.tags || defaultTags)];
  tags.sort((a, b) => (feedback[b] || 0) - (feedback[a] || 0));
  let suggestions = [];
  let start = nextStart();
  for (const tag of tags) {
    if (done.some(d => d.includes(tag))) continue;
    suggestions.push({ id: tag, title: tag, task: tag, hours: 1, at: start });
    let d = new Date(start);
    d.setHours(d.getHours() + 1);
    if (d.getHours() === 12) d.setHours(13);
    start = `${key()}T${String(d.getHours()).padStart(2, "0")}:00`;
  }
  return suggestions;
}

function suggestionPanel() {
  const s = makeSuggestions();
  if (!s.length) return `<h2>AI 推理</h2><div class="empty"><b>目前沒有 AI 推理</b><div class="muted">可能今天已滿工時，或工作模型尚未建立。</div></div>`;
  const queueItems = s.slice(0, AI_REASON_QUEUE_SIZE);
  const slots = Array.from({ length: AI_REASON_QUEUE_SIZE }, (_, i) => queueItems[i]);
  return `<div class="panel-head"><h2>AI 推理</h2><div class="tag">${queueItems.length} / ${s.length}</div></div><div class="ai-suggestion-list queue-list">${slots.map(x => x ? `<div class="suggestion compact-card"><div class="suggestion-title-row"><h3>${escapeHtml(x.title)}</h3><div class="actions suggestion-actions"><button class="btn green" data-accept="${escapeHtml(x.id)}">採納</button><button class="btn amber" data-adjust="${escapeHtml(x.id)}">編輯</button></div></div><div class="suggestion-source">🤖 AI 推理</div></div>` : `<div class="suggestion compact-card placeholder-card"><div class="muted">等待新的 AI 推理</div></div>`).join("")}</div>`;
}

function center() {
  return `<div class="workbench-grid"><section class="panel module calendar-module">${calendarPanel()}</section><section class="panel module today-module">${todayPanel()}</section><section class="panel module suggestion-module">${suggestionPanel()}</section></div><button class="fab" data-action="add">+</button>`;
}

function capture(editId = null, seed = null) {
  const e = editId ? entries.find(x => x.id === editId) : null;
  const title = e ? e.title : (seed ? seed.title : "");
  const task = e ? e.task : (seed ? seed.task : "採購案件處理");
  const type = e ? (e.type || "工作") : "工作";
  return `<section class="panel" style="margin-top:18px"><h2>${e ? "編輯工時" : "➕ 快速紀錄"}</h2><div class="form"><input class="input" id="dt" type="datetime-local" value="${e ? e.at : nextStart()}"><textarea id="title" placeholder="今天做了什麼？">${escapeHtml(title)}</textarea><label>事件類型</label><select id="eventType" class="input">${eventTypes.map(t => `<option ${type === t ? "selected" : ""}>${t}</option>`).join("")}</select><div class="row hours">${[0.5, 1, 1.5, 2, 3, 4, 8].map(h => `<button class="btn2 hour" data-h="${h}">${h === 0.5 ? "30m" : h + "h"}</button>`).join("")}</div><input class="input" id="task" value="${escapeHtml(task)}"><button class="btn full" id="saveEntry">儲存</button></div></section>`;
}

function sync() {
  const googleState = googleConnectionLabel();
  return `<section class="panel" style="margin-top:18px"><h2>📦 同步中心</h2><p class="muted">只顯示真實狀態；未完成串接不放假按鈕。</p><div class="status"><span>Identity</span><b>${session ? "🟢 Google 已登入" : "⚪ 未登入"}</b></div><div class="status"><span>本機資料</span><b>🟢 localStorage</b></div><div class="status"><span>Google Drive</span><b>${googleState}</b></div><div class="status"><span>Gmail</span><b>${googleState}</b></div><div class="status"><span>Calendar</span><b>${googleState}</b></div><div class="status"><span>Supabase Auth</span><b>${session ? "🟢 已連接" : "⚪ 未連接"}</b></div></section>`;
}

function normalizedLibraryItem(item = {}) {
  const sourceType = item.sourceType || (librarySourceTypes.includes(item.type) ? item.type : "上傳檔案");
  return {
    ...item,
    sourceType,
    type: item.type || sourceType,
    readingStatus: item.readingStatus || "🟡 等待閱讀",
    tags: Array.isArray(item.tags) ? item.tags : []
  };
}

function libraryTagCheckboxes(selectedTags = []) {
  return Object.entries(libraryTagGroups).map(([group, tags]) => `<div class="tag-group"><b>${group}</b><div class="library-tags">${tags.map(tag => `<label class="check-chip"><input type="checkbox" class="libTag" value="${escapeHtml(tag)}" ${selectedTags.includes(tag) ? "checked" : ""}>${escapeHtml(tag)}</label>`).join("")}</div></div>`).join("");
}

function librarySourceFields(item, sourceType) {
  const location = escapeHtml(item.location || "");
  const active = type => sourceType === type ? " active" : "";
  return `<div class="library-source-field${active("上傳檔案")}" data-source-field="上傳檔案"><label>上傳檔案</label><div class="upload-drop"><input id="libFile" type="file"><span>拖曳檔案至此，或瀏覽上傳</span></div></div><div class="library-source-field${active("Google Drive")}" data-source-field="Google Drive"><label>Google Drive</label><input id="libDrive" class="input" value="${location}" placeholder="選擇或貼上 Google Drive 檔案連結"></div><div class="library-source-field${active("Google Docs")}" data-source-field="Google Docs"><label>Google Docs</label><input id="libDocs" class="input" value="${location}" placeholder="選擇或貼上 Google Docs 連結"></div><div class="library-source-field${active("Google Sheets")}" data-source-field="Google Sheets"><label>Google Sheets</label><input id="libSheets" class="input" value="${location}" placeholder="選擇或貼上 Google Sheets 連結"></div><div class="library-source-field${active("PDF")}" data-source-field="PDF"><label>PDF</label><div class="upload-drop"><input id="libPdf" type="file" accept="application/pdf"><span>拖曳 PDF 至此，或瀏覽上傳</span></div></div><div class="library-source-field${active("網址")}" data-source-field="網址"><label>網址</label><input id="libUrl" class="input" value="${location}" placeholder="https://example.com"></div>`;
}

function libraryView() {
  return `<section class="panel" style="margin-top:18px"><div class="panel-head"><div><h2>📚 藏書閣</h2><div class="muted">AI OS Knowledge Library：統一管理提供給諸葛先生閱讀、理解、引用與 AI 推理的知識來源。</div></div><button class="btn" data-add-library="1">新增藏書</button></div><div class="library-list">${library.length ? library.map(raw => { const item = normalizedLibraryItem(raw); return `<div class="entry"><div class="entry-main"><b>${escapeHtml(item.name)}</b><div class="muted">${escapeHtml(item.sourceType)}｜${escapeHtml(item.readingStatus)}</div><small>${escapeHtml(item.description || "")}</small><div class="source-path">${escapeHtml(item.location || "尚未連結來源")}</div><div class="library-tag-line">${item.tags.map(tag => `<span>${escapeHtml(tag)}</span>`).join("")}</div></div><div class="actions compact"><button class="btn2" data-edit-library="${item.id}">編輯</button><button class="btn2 danger" data-del-library="${item.id}">刪除</button></div></div>`; }).join("") : `<div class="empty"><b>尚無知識來源</b><div class="muted">請新增 SOP、流程、表單、PDF、網址或 Google 文件，作為未來 AI 推理、AI 回答、AI 搜尋與 AI 引用的知識庫。</div></div>`}</div></section>`;
}

function libraryForm(id = null) {
  const item = normalizedLibraryItem(id ? library.find(x => x.id === id) : {});
  return `<section class="panel" style="margin-top:18px"><div class="panel-head"><div><h2>${id ? "編輯藏書" : "新增藏書"}</h2><div class="muted">藏書閣是 AI OS Knowledge Library，請選擇來源並標記 AI 可閱讀的用途。</div></div><button class="btn2" data-library-back="1">返回</button></div><label>名稱</label><input id="libName" class="input" value="${escapeHtml(item.name || "")}"><label>來源</label><select id="libSourceType" class="input">${librarySourceTypes.map(t => `<option ${item.sourceType === t ? "selected" : ""}>${t}</option>`).join("")}</select>${librarySourceFields(item, item.sourceType)}<label>AI 閱讀狀態</label><select id="libReadingStatus" class="input">${libraryReadingStatuses.map(s => `<option ${item.readingStatus === s ? "selected" : ""}>${s}</option>`).join("")}</select><label>說明</label><textarea id="libDesc" placeholder="這份文件提供給諸葛先生理解哪些工作脈絡？">${escapeHtml(item.description || "")}</textarea><label>固定標籤</label><div class="library-tag-panel">${libraryTagCheckboxes(item.tags)}</div><div class="form-actions"><button class="btn2" data-library-cancel="1">取消</button><button class="btn" id="saveLibrary">儲存</button></div></section>`;
}

function settings() {
  return `<section class="panel" style="margin-top:18px"><h2>⚙️ 設定</h2><div class="entry"><b>目前使用者</b><div class="muted">${escapeHtml(session.name)}｜${escapeHtml(session.status || session.email || "")}</div></div><label>角色</label><select id="roleSet" class="input">${roles.map(r => `<option ${profile && profile.role === r ? "selected" : ""}>${r}</option>`).join("")}</select><label>工作標籤</label><textarea id="tagsSet">${profile ? escapeHtml(profile.tags.join("\n")) : ""}</textarea><button class="btn full" id="saveSettings">儲存工作模型</button><button class="btn gray full" id="resetProfile">重新初次認識</button><button class="btn red full" id="logoutBtn">登出</button><div class="entry"><b>版本</b><div class="muted">${VERSION}</div></div></section>`;
}

function currentViewHtml() {
  if (view === "center") return center();
  if (view === "capture") return capture();
  if (view === "library") return libraryView();
  if (view === "sync") return sync();
  return settings();
}

function render() {
  normalizeEntries();
  clearInvalidAuthState();
  if (!session) { root.innerHTML = authScreen(); bindAuth(); return; }
  if (activeModule !== "worklog") { root.innerHTML = zhugeDashboard(); bindDashboard(); bindGlobal(); return; }
  if (!profile) { root.innerHTML = onboarding(); bindOnboarding(); bindGlobal(); return; }
  root.innerHTML = `<div class="wrap"><div class="card">${header()}${currentViewHtml()}</div></div>`;
  bind();
  bindGlobal();
}

function bindAuth() {
  document.getElementById("googleLoginBtn").onclick = () => signInWithGoogle();
}

function bindDashboard() {
  document.querySelectorAll("[data-open-module]").forEach(b => b.onclick = () => {
    activeModule = b.dataset.openModule;
    saveAll();
    render();
  });
}

function bindGlobal() { document.querySelectorAll("[data-logout]").forEach(b => b.onclick = () => doLogout()); }
function doLogout() { clearStoredAuthSession(); clearStoredCodeVerifier(); session = null; activeModule = "dashboard"; view = "center"; saveAll(); toast("已登出"); render(); }

function bindOnboarding() {
  let tags = [], src = [];
  const bindTagButtons = () => {
    document.querySelectorAll(".tag-btn").forEach(b => b.onclick = () => { tags.includes(b.dataset.tag) ? tags = tags.filter(x => x !== b.dataset.tag) : tags.push(b.dataset.tag); b.classList.toggle("selected", tags.includes(b.dataset.tag)); });
  };
  bindTagButtons();
  document.getElementById("role").onchange = e => {
    tags = [];
    document.getElementById("tagOptions").innerHTML = tagButtons(tagsForRole(e.target.value));
    bindTagButtons();
  };
  document.querySelectorAll(".src-btn").forEach(b => b.onclick = () => { src.includes(b.dataset.src) ? src = src.filter(x => x !== b.dataset.src) : src.push(b.dataset.src); b.classList.toggle("selected", src.includes(b.dataset.src)); });
  document.getElementById("saveProfile").onclick = () => {
    const role = document.getElementById("role").value;
    profile = { role, tags: tags.length ? tags : tagsForRole(role), sources: src.length ? src : ["Google Drive", "Gmail", "Calendar", "手動紀錄"], workHours: "09:00~18:00", lunch: "12:00~13:00", sop: document.getElementById("sop").value };
    saveAll(); toast("已建立工作模型"); render();
  };
}

function bind() {
  document.querySelectorAll("[data-view]").forEach(b => b.onclick = () => { view = b.dataset.view; if (view === "center") selected = new Date(); saveAll(); render(); });
  document.querySelectorAll("[data-day]").forEach(b => b.onclick = () => { selected.setDate(Number(b.dataset.day)); saveAll(); render(); });
  document.querySelectorAll("[data-action=add]").forEach(b => b.onclick = () => { view = "capture"; saveAll(); render(); });
  const today = document.querySelector("[data-today]"); if (today) today.onclick = () => { selected = new Date(); saveAll(); render(); };
  const exportBtn = document.querySelector("[data-export-month]"); if (exportBtn) exportBtn.onclick = () => exportMonthXls();
  document.querySelectorAll("[data-accept]").forEach(b => b.onclick = () => acceptSuggestion(b.dataset.accept));
  document.querySelectorAll("[data-adjust]").forEach(b => b.onclick = () => adjustSuggestion(b.dataset.adjust));
  document.querySelectorAll("[data-del-id]").forEach(b => b.onclick = () => { entries = entries.filter(e => e.id !== b.dataset.delId); saveAll(); toast("已刪除"); render(); });
  document.querySelectorAll("[data-edit-id]").forEach(b => b.onclick = () => { view = "capture"; root.innerHTML = `<div class="wrap"><div class="card">${header()}${capture(b.dataset.editId)}</div></div>`; bindCapture(b.dataset.editId); bindGlobal(); });
  bindLibrary();
  if (view === "capture") bindCapture();
  if (view === "settings") bindSettings();
}

function acceptSuggestion(id) {
  const s = makeSuggestions().find(x => x.id === id);
  if (!s) return;
  entries.push({ id: uid(), date: key(), at: s.at, title: s.title, task: s.task, hours: 1, type: "工作", source: "ai-card" });
  feedback[s.id] = (feedback[s.id] || 0) + 1;
  saveAll(); toast("已加入我的工作"); render();
}

function adjustSuggestion(id) {
  const s = makeSuggestions().find(x => x.id === id);
  view = "capture";
  root.innerHTML = `<div class="wrap"><div class="card">${header()}${capture(null, s)}</div></div>`;
  bindCapture(); bindGlobal();
}

function bindCapture(editId = null) {
  const editingEntry = editId ? entries.find(e => e.id === editId) : null;
  let selectedH = editingEntry ? Number(editingEntry.hours) : 1;
  document.querySelectorAll(".hour").forEach(b => b.onclick = () => { selectedH = Number(b.dataset.h); document.querySelectorAll(".hour").forEach(x => x.classList.remove("selected")); b.classList.add("selected"); });
  document.getElementById("saveEntry").onclick = () => {
    const at = document.getElementById("dt").value;
    const item = { id: editingEntry ? editingEntry.id : uid(), date: at.slice(0, 10), at, title: document.getElementById("title").value.trim(), hours: selectedH, type: document.getElementById("eventType").value, task: document.getElementById("task").value || "採購案件處理", source: editingEntry ? editingEntry.source : "manual" };
    const error = validateEntry(item); if (error) return toast(error);
    if (editingEntry) entries[entries.findIndex(e => e.id === editingEntry.id)] = item; else entries.push(item);
    selected = new Date(at); view = "center"; saveAll(); toast("已儲存工時"); render();
  };
}

function bindLibrary() {
  const add = document.querySelector("[data-add-library]"); if (add) add.onclick = () => { root.innerHTML = `<div class="wrap"><div class="card">${header()}${libraryForm()}</div></div>`; bindLibraryForm(); bindGlobal(); };
  document.querySelectorAll("[data-edit-library]").forEach(b => b.onclick = () => { root.innerHTML = `<div class="wrap"><div class="card">${header()}${libraryForm(b.dataset.editLibrary)}</div></div>`; bindLibraryForm(b.dataset.editLibrary); bindGlobal(); });
  document.querySelectorAll("[data-del-library]").forEach(b => b.onclick = () => { library = library.filter(x => x.id !== b.dataset.delLibrary); saveAll(); toast("已刪除藏書閣來源"); render(); });
}

function bindLibraryForm(id = null) {
  const sourceSelect = document.getElementById("libSourceType");
  const showSourceField = () => {
    document.querySelectorAll("[data-source-field]").forEach(el => el.classList.toggle("active", el.dataset.sourceField === sourceSelect.value));
  };
  sourceSelect.onchange = showSourceField;
  showSourceField();
  document.querySelectorAll("[data-library-back],[data-library-cancel]").forEach(b => b.onclick = () => { view = "library"; saveAll(); render(); });
  document.getElementById("saveLibrary").onclick = () => {
    const sourceType = sourceSelect.value;
    const locationMap = {
      "上傳檔案": document.getElementById("libFile")?.files?.[0]?.name || "",
      "Google Drive": document.getElementById("libDrive")?.value.trim() || "",
      "Google Docs": document.getElementById("libDocs")?.value.trim() || "",
      "Google Sheets": document.getElementById("libSheets")?.value.trim() || "",
      "PDF": document.getElementById("libPdf")?.files?.[0]?.name || "",
      "網址": document.getElementById("libUrl")?.value.trim() || ""
    };
    const existing = id ? normalizedLibraryItem(library.find(x => x.id === id)) : {};
    const item = { id: id || uid("lib"), name: document.getElementById("libName").value.trim(), type: sourceType, sourceType, readingStatus: document.getElementById("libReadingStatus").value, description: document.getElementById("libDesc").value.trim(), location: locationMap[sourceType] || existing.location || "", purpose: document.querySelectorAll(".libTag:checked").length ? "Knowledge Library" : "", tags: Array.from(document.querySelectorAll(".libTag:checked")).map(x => x.value) };
    if (!item.name) return toast("請輸入來源名稱");
    if (id) library[library.findIndex(x => x.id === id)] = item; else library.push(item);
    view = "library"; saveAll(); toast("藏書閣已儲存"); render();
  };
}

function bindSettings() {
  document.getElementById("saveSettings").onclick = () => { profile.role = document.getElementById("roleSet").value; profile.tags = document.getElementById("tagsSet").value.split("\n").map(x => x.trim()).filter(Boolean); saveAll(); toast("工作模型已更新"); render(); };
  document.getElementById("resetProfile").onclick = () => { profile = null; saveAll(); render(); };
  document.getElementById("logoutBtn").onclick = () => doLogout();
}

function exportMonthXls() {
  const rows = monthEntries();
  const ym = monthKey();
  const trs = rows.length ? rows.map(e => `<tr><td>${escapeHtml(e.date)}</td><td>${fmt(e.at)}</td><td>${escapeHtml(e.type || "工作")}</td><td>${escapeHtml(e.title)}</td><td>${escapeHtml(e.task || "")}</td><td>${Number(e.hours || 0)}</td></tr>`).join("") : `<tr><td colspan="6">本月尚無工時資料</td></tr>`;
  const html = `<!doctype html><html><head><meta charset="utf-8"></head><body><table border="1"><tr><th colspan="6">WorkLog ${ym} 本月工時</th></tr><tr><th>日期</th><th>時間</th><th>類型</th><th>工作內容</th><th>任務</th><th>工時</th></tr>${trs}<tr><td colspan="5">合計</td><td>${hours(rows)}</td></tr></table></body></html>`;
  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `WorkLog-${ym}-工時.xls`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast("已下載本月工時 Excel");
}

async function boot() {
  try {
    const googleAuth = await getGoogleAuthUser();
    if (googleAuth) {
      session = googleSessionFromUser(googleAuth.user, googleAuth.authSession);
      if (authCallbackCaptured) activeModule = "dashboard";
      saveAll();
    }
  } catch {
    clearStoredAuthSession();
    if (session?.provider === "google-oauth") {
      session = null;
      saveAll();
    }
  }
  render();
}

boot();
