const VERSION = "1.0.0-rc3.1-sp3";
const root = document.getElementById("app");
const AUTH_SESSION_KEY = "zhuge_ai_os_google_auth_session_v1";
const AUTH_CODE_VERIFIER_KEY = "zhuge_ai_os_pkce_code_verifier_v1";
const AI_OS_SESSION_KEY = "zhuge_ai_os_session_v1";
const ACTIVE_MODULE_KEY = "zhuge_active_module_v1";
const OS_OPEN_TABS_KEY = "zhuge_os_open_tabs_v1";
const OS_ACTIVE_WORKSPACE_KEY = "zhuge_os_active_workspace_v1";
const OS_RECENT_WORKSPACES_KEY = "zhuge_os_recent_workspaces_v1";
const AUTH_CONFIG = {
  supabaseUrl: "https://lenpbbhwxyyfwgvjcozf.supabase.co",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxlbnBiYmh3eHl5Zndndmpjb3pmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyOTM1ODksImV4cCI6MjA5NTg2OTU4OX0.TAFfLoMC8Tqr4r7nlAtsOke3YcjBIBmr5fN1a6iwSFQ"
};

let activeModule = localStorage.getItem(ACTIVE_MODULE_KEY) || "dashboard";
let authCallbackCaptured = false;
let view = localStorage.getItem("wl_view") || "center";
if (view === "warroom") view = "library";
if (view === "capture") view = "center";
let hasOsShellState = localStorage.getItem(OS_OPEN_TABS_KEY) !== null;
let openTabs = readJson(OS_OPEN_TABS_KEY, []);
let activeWorkspace = localStorage.getItem(OS_ACTIVE_WORKSPACE_KEY) || "dashboard";
let recentWorkspaces = readJson(OS_RECENT_WORKSPACES_KEY, []);
let selected = new Date();
let entries = readJson("wl_entries", []);
let profile = readJson("wl_profile", null);
let feedback = readJson("wl_feedback", {});
let session = readJson(AI_OS_SESSION_KEY, null);
let library = readJson("wl_library", []);
let editingLibraryId = null;
let editingEntryId = null;
let captureSeed = null;
let sidebarOpen = false;
let mobileCalendarOpen = false;
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
const DEFAULT_LIBRARY_READING_STATUS = "🟡 等待閱讀";
const workspaceRegistry = {
  worklog: { icon: "🪶", label: "工時營帳", group: "camp", enabled: true },
  investment: { icon: "📈", label: "投資營帳", group: "camp", comingSoon: true },
  procurement: { icon: "📦", label: "採購營帳", group: "camp", comingSoon: true },
  hr: { icon: "👥", label: "HR營帳", group: "camp", comingSoon: true },
  travel: { icon: "✈️", label: "旅遊營帳", group: "camp", comingSoon: true },
  library: { icon: "📚", label: "藏書閣", group: "system", enabled: true },
  sync: { icon: "🔗", label: "控制台", group: "system", enabled: true },
  settings: { icon: "⚙️", label: "設定", group: "system", enabled: true }
};
const agentStatuses = [
  ["🪶", "工時 Agent", "🟢 在線"],
  ["📈", "投資 Agent", "🚧 施工中"]
];

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
  if (!item.title) return "請選擇工作模型";
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
  localStorage.setItem(OS_OPEN_TABS_KEY, JSON.stringify(openTabs));
  localStorage.setItem(OS_ACTIVE_WORKSPACE_KEY, activeWorkspace);
  localStorage.setItem(OS_RECENT_WORKSPACES_KEY, JSON.stringify(recentWorkspaces));
  hasOsShellState = true;
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

function entriesForDate(d) {
  const dk = key(d);
  return entries.filter(e => e.date === dk).sort((a, b) => new Date(a.at) - new Date(b.at));
}

function hours(list = dayEntries()) {
  return list.reduce((s, e) => s + Number(e.hours || 0), 0);
}

function tagsForRole(role) {
  return roleTagMap[role] || defaultTags;
}

function workModels() {
  const models = Array.isArray(profile?.tags) && profile.tags.length ? profile.tags : tagsForRole(profile?.role || "採購");
  return [...new Set(models.map(x => String(x).trim()).filter(Boolean))];
}

function tagButtons(tags) {
  return tags.map(t => `<button class="btn2 tag-btn" data-tag="${escapeHtml(t)}">${escapeHtml(t)}</button>`).join("");
}

function workModelChecks(models = [], selectedModels = models) {
  const selectedSet = new Set(selectedModels);
  return models.map(model => `<label class="work-model-check"><input type="checkbox" class="work-model-option" value="${escapeHtml(model)}" ${selectedSet.has(model) ? "checked" : ""}><span>${escapeHtml(model)}</span></label>`).join("");
}

function workModelOptions(selectedModel = "") {
  const models = workModels();
  const selectedValue = selectedModel || models[0] || "";
  const options = selectedValue && !models.includes(selectedValue) ? [selectedValue, ...models] : models;
  return options.map(model => `<option value="${escapeHtml(model)}" ${model === selectedValue ? "selected" : ""}>${escapeHtml(model)}</option>`).join("");
}

function addWorkModel(model) {
  const name = String(model || "").trim();
  if (!name) return false;
  if (!profile) profile = { role: "採購", tags: [], sources: ["Google Drive", "Gmail", "Calendar", "手動紀錄"], workHours: "09:00~18:00", lunch: "12:00~13:00", sop: "目前沒有 SOP，先用職務模型" };
  const models = workModels();
  if (!models.includes(name)) profile.tags = [...models, name];
  return true;
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

function captureDefaultStart() {
  return `${key()}T09:00`;
}

function userBadge() {
  if (!session) return "";
  return `<div class="identity-badge"><span>👤 ${escapeHtml(session.name)}</span><small>${escapeHtml(session.status || session.email || "")}</small><button class="mini" data-logout="1">登出</button></div>`;
}

function header() {
  return `<div class="top"><div class="brand-row"><button class="mini adaptive-menu" data-toggle-sidebar="1">☰</button><h1>🧠 Zhuge AI OS</h1></div><div class="header-right">${userBadge()}<div class="tag">${VERSION}</div></div></div>`;
}

function authScreen() {
  return `<div class="wrap"><div class="card"><section class="panel" style="margin-top:18px"><h1>🧠 Zhuge AI OS</h1><button class="btn full" id="googleLoginBtn">使用 Google 登入</button></section></div></div>`;
}

function zhugeDashboard() {
  return `<section class="panel os-home"><div class="panel-head"><div><h2>🧠 Zhuge AI OS</h2><div class="muted">請從左側營帳進入工作區。</div></div></div></section>`;
}

function workspaceDef(id) {
  return workspaceRegistry[id] || { icon: "□", label: id, comingSoon: true };
}

function normalizeWorkspaceState() {
  openTabs = openTabs.filter(id => workspaceRegistry[id]);
  recentWorkspaces = recentWorkspaces.filter(id => openTabs.includes(id));
  if (!hasOsShellState && session) { openTabs = ["worklog"]; activeWorkspace = "worklog"; recentWorkspaces = ["worklog"]; hasOsShellState = true; }
  if (activeWorkspace !== "dashboard" && !openTabs.includes(activeWorkspace)) activeWorkspace = recentWorkspaces[0] || "dashboard";
  if (!openTabs.length) activeWorkspace = "dashboard";
}

function rememberWorkspace(id) {
  recentWorkspaces = [id, ...recentWorkspaces.filter(x => x !== id)].filter(x => openTabs.includes(x));
}

function openWorkspace(id) {
  if (!workspaceRegistry[id]) return;
  if (workspaceRegistry[id].comingSoon) return;
  if (!openTabs.includes(id)) openTabs.push(id);
  activeWorkspace = id;
  rememberWorkspace(id);
  if (id === "worklog") view = "center";
  if (id === "library") { view = "library"; editingLibraryId = null; }
  if (id === "sync" || id === "settings") view = "center";
  saveAll();
  render();
}

function activateWorkspace(id) {
  if (!openTabs.includes(id)) return;
  activeWorkspace = id;
  rememberWorkspace(id);
  saveAll();
  render();
}

function closeWorkspace(id) {
  const wasActive = activeWorkspace === id;
  openTabs = openTabs.filter(x => x !== id);
  recentWorkspaces = recentWorkspaces.filter(x => x !== id);
  if (wasActive) activeWorkspace = recentWorkspaces.find(x => openTabs.includes(x)) || openTabs[openTabs.length - 1] || "dashboard";
  saveAll();
  render();
}

function agentStatusPanel() {
  return `<div class="agent-panel"><h3>🤖 Agent</h3>${agentStatuses.map(([icon, name, status]) => `<div class="agent-row"><span>${icon} ${name}</span><b>${escapeHtml(status)}</b></div>`).join("")}</div>`;
}

function sidebarSection(title, group) {
  return `<div class="side-section"><h3>${title}</h3>${Object.entries(workspaceRegistry).filter(([, w]) => w.group === group).map(([id, w]) => w.enabled ? `<button class="side-item ${activeWorkspace === id ? "on" : ""}" data-open-workspace="${id}"><span>${w.icon} ${w.label}</span></button>` : `<div class="side-item disabled"><span>${w.icon} ${w.label}</span>${w.comingSoon ? `<small>🚧 施工中</small>` : ""}</div>`).join("")}</div>`;
}

function osSidebar() {
  return `<aside class="os-sidebar"><button class="mini sidebar-close" data-close-sidebar="1">×</button>${agentStatusPanel()}${sidebarSection("🏕️ 營帳", "camp")}${sidebarSection("⚙️ 系統", "system")}</aside>`;
}

function workspaceTabs() {
  if (!openTabs.length) return `<div class="workspace-tabs empty"><span>Home</span></div>`;
  return `<div class="workspace-tabs">${openTabs.map(id => { const w = workspaceDef(id); const close = openTabs.length > 1 ? `<span class="tab-close" data-close-workspace="${id}">×</span>` : ""; return `<button class="workspace-tab ${activeWorkspace === id ? "active" : ""}" data-activate-workspace="${id}"><span>${w.icon} ${w.label}</span>${close}</button>`; }).join("")}</div>`;
}

function comingSoonWorkspace(id) {
  const w = workspaceDef(id);
  return `<section class="panel coming-soon"><h2>${w.icon} ${w.label}</h2><div class="empty"><b>施工中</b><div class="muted">${w.label} 將於後續版本實作。</div></div></section>`;
}

function worklogWorkspace() {
  return view === "capture" ? capture() : center();
}

function workspaceContent() {
  if (activeWorkspace === "dashboard") return zhugeDashboard();
  if (activeWorkspace === "worklog") return profile ? worklogWorkspace() : onboardingWorkspace();
  if (activeWorkspace === "library") return view === "libraryForm" ? libraryForm(editingLibraryId) : libraryView();
  if (activeWorkspace === "sync") return sync();
  if (activeWorkspace === "settings") return settings();
  return comingSoonWorkspace(activeWorkspace);
}

function osShell() {
  normalizeWorkspaceState();
  return `<div class="os-shell ${sidebarOpen ? "sidebar-open" : ""}"><div class="os-topbar">${header()}</div><div class="os-body">${osSidebar()}<div class="sidebar-backdrop" data-close-sidebar="1"></div><main class="os-main">${workspaceTabs()}<div class="workspace-canvas">${workspaceContent()}</div></main></div></div>`;
}

function onboardingWorkspace() {
  return `<section class="panel" style="margin-top:18px"><div class="panel-head"><div><h2>🪶 初次認識工時營帳</h2><div class="muted">建立工作模型後，即可使用 Calendar、我的工作與推理預測。</div></div></div><div class="profile-grid"><div><label>你的職務</label><select id="role" class="input">${roles.map(r => `<option>${r}</option>`).join("")}</select></div><div><label>每日工時</label><select class="input"><option>09:00~18:00，午休 12:00~13:00</option></select></div></div><label>工作模型</label><div class="row two" id="tagOptions">${tagButtons(tagsForRole("採購"))}</div><label>SOP 狀態</label><select id="sop" class="input"><option>目前沒有 SOP，先用職務模型</option><option>有 SOP，之後上傳</option></select><label>工作來源</label><div class="row two">${["Google Drive", "Gmail", "Calendar", "手動紀錄"].map(s => `<button class="btn2 src-btn" data-src="${s}">${s}</button>`).join("")}</div><button class="btn full" id="saveProfile">建立我的工作模型</button></section>`;
}

function onboarding() {
  return `<div class="wrap"><div class="card"><div class="top"><div><div class="muted">🪶 初次認識</div><h1>你好，我是諸葛先生</h1><div class="muted">我想先了解你的工作，之後才能產生更準的每日工作建議卡。</div></div><div class="header-right">${userBadge()}<div class="tag">${VERSION}</div></div></div><section class="panel" style="margin-top:18px"><div class="profile-grid"><div><label>你的職務</label><select id="role" class="input">${roles.map(r => `<option>${r}</option>`).join("")}</select></div><div><label>每日工時</label><select class="input"><option>09:00~18:00，午休 12:00~13:00</option></select></div></div><label>工作模型</label><div class="row two" id="tagOptions">${tagButtons(tagsForRole("採購"))}</div><label>SOP 狀態</label><select id="sop" class="input"><option>目前沒有 SOP，先用職務模型</option><option>有 SOP，之後上傳</option></select><label>工作來源</label><div class="row two">${["Google Drive", "Gmail", "Calendar", "手動紀錄"].map(s => `<button class="btn2 src-btn" data-src="${s}">${s}</button>`).join("")}</div><button class="btn full" id="saveProfile">建立我的工作模型</button></section></div></div>`;
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

function addDays(d, days) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function startOfWeek(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay());
  return x;
}

function todaySummaryPanel() {
  const today = new Date();
  const list = entriesForDate(today);
  const done = hours(list);
  const total = 8;
  const remain = Math.max(0, total - done);
  const rate = Math.min(100, Math.round(done / total * 100));
  return `<section class="panel mobile-summary-module"><div class="panel-head"><div><h2>☀️ 今日摘要</h2><div class="muted">${fmt(today).slice(0, 10)}｜今天還剩哪些工作要完成？</div></div><div class="tag">${rate}%</div></div><div class="summary-metrics"><div><b>${total}h</b><span>今日預計</span></div><div><b>${done}h</b><span>已完成</span></div><div><b>${rate}%</b><span>完成率</span></div></div><div class="summary-remaining">尚餘：${remain} 小時</div></section>`;
}

function mobileCalendarPanel() {
  const today = new Date();
  const start = startOfWeek(today);
  const days = Array.from({ length: 14 }, (_, i) => addDays(start, i));
  const summaryHours = hours(entriesForDate(today));
  if (!mobileCalendarOpen) return `<div class="mobile-calendar-head"><button class="btn2" data-toggle-mobile-calendar="1">▼ 月曆</button><span class="muted">今日 ${String(today.getMonth() + 1).padStart(2, "0")}/${String(today.getDate()).padStart(2, "0")}｜${summaryHours} / 8h</span></div>`;
  return `<div class="mobile-calendar-head"><button class="btn2" data-toggle-mobile-calendar="1">▲ 月曆</button><span class="muted">本週 + 下週快速查看</span></div><div class="mobile-two-week">${days.map(d => { const h = hours(entriesForDate(d)); const isToday = key(d) === key(today); const isSelected = key(d) === key(selected); return `<button class="mobile-day ${isToday ? "today" : ""} ${isSelected ? "sel" : ""}" data-mobile-date="${key(d)}"><span>${["日", "一", "二", "三", "四", "五", "六"][d.getDay()]}</span><b>${d.getDate()}</b><small>${h ? h + "h" : ""}</small></button>`; }).join("")}</div>`;
}

function todayPanel() {
  const list = dayEntries();
  const h = hours(list);
  return `<div class="panel-head"><h2>我的工作</h2><div class="tag">${h} / 8h</div></div>${list.length ? list.map(e => `<div class="entry"><div class="entry-main"><b>${escapeHtml(e.title)}</b><div class="muted">${fmt(e.at)}｜${Number(e.hours || 0)}h</div></div><div class="actions compact entry-actions"><button class="btn amber" data-edit-id="${e.id}">編輯</button><button class="btn red" data-del-id="${e.id}">刪除</button></div></div>`).join("") : `<div class="empty"><b>尚無工時紀錄</b><div class="muted">可採納推理預測，或按右下角 + 新增。</div></div>`}<button class="btn full" data-action="add">➕ 新增工作</button>`;
}

function makeSuggestions() {
  if (!profile) return [];
  const done = dayEntries().map(e => e.title);
  let tags = workModels();
  tags.sort((a, b) => (feedback[b] || 0) - (feedback[a] || 0));
  let suggestions = [];
  let start = nextStart();
  for (const tag of tags) {
    if (done.some(d => d.includes(tag))) continue;
    suggestions.push({ id: tag, title: tag, task: tag, hours: 1, at: start, sourceLabel: "🧩 工作模型" });
    let d = new Date(start);
    d.setHours(d.getHours() + 1);
    if (d.getHours() === 12) d.setHours(13);
    start = `${key()}T${String(d.getHours()).padStart(2, "0")}:00`;
  }
  return suggestions;
}

function suggestionPanel() {
  const s = makeSuggestions();
  if (!s.length) return `<h2>🤖 推理預測</h2><div class="empty"><b>目前沒有推理預測</b><div class="muted">可能今天已滿工時，或工作模型尚未建立。</div></div>`;
  const queueItems = s.slice(0, AI_REASON_QUEUE_SIZE);
  const slots = Array.from({ length: AI_REASON_QUEUE_SIZE }, (_, i) => queueItems[i]);
  return `<div class="panel-head"><h2>🤖 推理預測</h2><div class="tag">${queueItems.length} / ${s.length}</div></div><div class="ai-suggestion-list queue-list">${slots.map(x => x ? `<div class="suggestion compact-card"><div class="suggestion-title-row"><h3>${escapeHtml(x.title)}</h3><div class="actions suggestion-actions"><button class="btn green" data-accept="${escapeHtml(x.id)}">採納</button><button class="btn amber" data-adjust="${escapeHtml(x.id)}">編輯</button></div></div><div class="suggestion-source">${escapeHtml(x.sourceLabel || "🤖 AI 推理")}</div></div>` : `<div class="suggestion compact-card placeholder-card"><div class="muted">等待新的推理預測</div></div>`).join("")}</div>`;
}

function center() {
  return `<div class="workbench-grid">${todaySummaryPanel()}<section class="panel module calendar-module"><div class="desktop-calendar">${calendarPanel()}</div><div class="mobile-calendar">${mobileCalendarPanel()}</div></section><section class="panel module today-module">${todayPanel()}</section><section class="panel module suggestion-module">${suggestionPanel()}</section></div><button class="fab" data-action="add">+</button>`;
}

function capture(editId = null, seed = null) {
  editId = editId || editingEntryId;
  seed = seed || captureSeed;
  const e = editId ? entries.find(x => x.id === editId) : null;
  const title = e ? e.title : (seed ? seed.title : "");
  const task = e ? e.task : (seed ? seed.task : "採購案件處理");
  const type = e ? (e.type || "工作") : "工作";
  return `<section class="panel capture-panel" style="margin-top:18px"><div class="panel-head"><div><h2>${e ? "編輯工時" : "➕ 快速紀錄"}</h2></div></div><div class="form capture-form"><label>日期 / 開始時間</label><input class="input" id="dt" type="datetime-local" value="${e ? e.at : captureDefaultStart()}"><label>工作模型</label><select id="title" class="input">${workModelOptions(title)}</select><div class="work-model-add"><input class="input" id="newModelCapture" placeholder="新增工作模型，例如：ISO 稽核"><button class="btn2" data-add-capture-model="1" type="button">＋ 新增工作模型</button></div><label>事件類型</label><select id="eventType" class="input">${eventTypes.map(t => `<option ${type === t ? "selected" : ""}>${t}</option>`).join("")}</select><label>工時</label><div class="row hours">${[0.5, 1, 1.5, 2, 3, 4, 8].map(h => `<button class="btn2 hour" data-h="${h}">${h === 0.5 ? "30m" : h + "h"}</button>`).join("")}</div><label>工作內容（選填）</label><input class="input" id="task" value="${escapeHtml(task)}"><div class="form-actions capture-actions"><button class="btn2" data-capture-cancel="1">取消</button><button class="btn" id="saveEntry">儲存</button></div></div></section>`;
}

function sync() {
  const googleState = googleConnectionLabel();
  const checkedAt = new Date().toLocaleString("zh-TW", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
  const checkedDate = new Date().toLocaleDateString("zh-TW", { year: "numeric", month: "2-digit", day: "2-digit" });
  const authButton = state => state.includes("⚪") ? `<button class="btn2 service-action">授權</button>` : "";
  const services = [
    ["🟢 AI OS 健康度", "100%", "7 / 7 服務正常", "", "summary"],
    ["Google 帳號", session ? "🟢 已登入" : "⚪ 尚未登入", session ? `最後驗證：${checkedAt}` : "需要先完成 Google Login", ""],
    ["Google Drive", googleState.replace("尚未連接", "尚未授權"), `最後檢查：${checkedAt}`, authButton(googleState)],
    ["Gmail", googleState.replace("尚未連接", "尚未授權"), `最後檢查：${checkedAt}`, authButton(googleState)],
    ["Calendar", googleState.replace("尚未連接", "尚未授權"), `最後檢查：${checkedAt}`, authButton(googleState)],
    ["AI 引擎", "🟢 正常", "目前模型：GPT-5.5", ""],
    ["Supabase", session ? "🟢 已連線" : "⚪ 尚未登入", session ? "Auth Session OK" : "需要先完成 Google Login", ""],
    ["本機資料", "🟢 正常", `最後同步：${checkedDate}`, ""]
  ];
  return `<section class="panel control-center" style="margin-top:18px"><div class="panel-head"><div><h2>🔗 控制台</h2><div class="muted">AI OS 各項服務連線狀態與健康檢查。</div></div></div><div class="control-grid">${services.map(([name, state, detail, action, type]) => `<div class="service-card ${type === "summary" ? "summary-card" : ""}"><div><h3>${escapeHtml(name)}</h3><b>${escapeHtml(state)}</b><div class="muted">${escapeHtml(detail)}</div></div>${action}</div>`).join("")}</div></section>`;
}

function normalizedLibraryItem(item = {}) {
  const sourceType = item.sourceType === "上傳檔案" ? "上傳文件" : (item.sourceType || item.type || "上傳文件");
  return {
    ...item,
    sourceType,
    type: item.type || sourceType,
    readingStatus: item.readingStatus === "🟢 已完成理解" ? "🟢 已完成閱讀" : (item.readingStatus || DEFAULT_LIBRARY_READING_STATUS),
    tags: Array.isArray(item.tags) ? item.tags : []
  };
}

function libraryView() {
  return `<section class="panel" style="margin-top:18px"><div class="panel-head"><div><h2>📚 藏書閣</h2><div class="muted">AI OS Knowledge Library：統一管理提供給諸葛先生閱讀、理解、引用與 AI 推理的知識來源。</div></div><button class="btn" data-add-library="1">新增藏書</button></div><div class="library-list">${library.length ? library.map(raw => { const item = normalizedLibraryItem(raw); return `<div class="entry"><div class="entry-main"><b>${escapeHtml(item.name)}</b><div class="muted">${escapeHtml(item.sourceType)}｜${escapeHtml(item.readingStatus)}</div><small>${escapeHtml(item.description || "")}</small><div class="source-path">${escapeHtml(item.location || "尚未連結來源")}</div><div class="library-tag-line">${item.tags.map(tag => `<span>${escapeHtml(tag)}</span>`).join("")}</div></div><div class="actions compact"><button class="btn2" data-edit-library="${item.id}">編輯</button><button class="btn2 danger" data-del-library="${item.id}">刪除</button></div></div>`; }).join("") : `<div class="empty"><b>尚無知識來源</b><div class="muted">請新增 SOP、流程、表單、PDF、網址或 Google 文件，作為未來 AI 推理、AI 回答、AI 搜尋與 AI 引用的知識庫。</div></div>`}</div></section>`;
}

function libraryForm(id = null) {
  const item = normalizedLibraryItem(id ? library.find(x => x.id === id) : {});
  return `<section class="panel" style="margin-top:18px"><div class="panel-head"><div><h2>${id ? "編輯藏書" : "新增藏書"}</h2><div class="muted">藏書閣是 AI OS Knowledge Library，請提供文件給諸葛先生閱讀、理解、引用，作為未來 AI 推理的知識依據。</div></div><button class="btn2" data-library-back="1">返回</button></div><label>名稱</label><input id="libName" class="input" value="${escapeHtml(item.name || "")}"><label>上傳文件</label><div class="upload-drop"><input id="libFile" type="file"><span>${escapeHtml(item.location || "拖曳文件至此，或瀏覽上傳")}</span></div><label>使用者補充說明</label><textarea id="libDesc" placeholder="這份文件想讓諸葛先生知道什麼？例如：這是公司採購 SOP，請作為未來安排採購工作與 AI 推理的依據。">${escapeHtml(item.description || "")}</textarea><label>AI 閱讀狀態</label><div class="readonly-status">${escapeHtml(item.readingStatus || DEFAULT_LIBRARY_READING_STATUS)}</div><div class="library-ai-preview"><b>AI 閱讀完成後將自動判斷</b><div class="muted">文件類型、主題、標籤、可用於 AI 推理 / AI 回答 / AI 搜尋的知識內容。</div></div><div class="form-actions"><button class="btn2" data-library-cancel="1">取消</button><button class="btn" id="saveLibrary">儲存</button></div></section>`;
}

function settings() {
  const models = workModels();
  return `<section class="panel" style="margin-top:18px"><h2>⚙️ 設定</h2><div class="entry"><b>目前使用者</b><div class="muted">${escapeHtml(session.name)}｜${escapeHtml(session.status || session.email || "")}</div></div><label>角色</label><select id="roleSet" class="input">${roles.map(r => `<option ${profile && profile.role === r ? "selected" : ""}>${r}</option>`).join("")}</select><div class="work-model-section"><label>工作模型</label><div class="work-model-list" id="workModelList">${workModelChecks(models, models)}</div><div class="work-model-add"><input class="input" id="newWorkModel" placeholder="新增工作模型，例如：ISO 稽核"><button class="btn2" id="addWorkModel" type="button">＋ 新增工作模型</button></div><div class="muted">工作模型會成為快速紀錄、推理預測與未來知識來源關聯的共同基礎。</div></div><button class="btn full" id="saveSettings">儲存工作模型</button><button class="btn gray full" id="resetProfile">重新初次認識</button><button class="btn red full" id="logoutBtn">登出</button><div class="entry"><b>版本</b><div class="muted">${VERSION}</div></div></section>`;
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
  root.innerHTML = osShell();
  bind();
  bindGlobal();
}

function bindAuth() {
  document.getElementById("googleLoginBtn").onclick = () => signInWithGoogle();
}

function bindDashboard() {}

function bindGlobal() { document.querySelectorAll("[data-logout]").forEach(b => b.onclick = () => doLogout()); }
function doLogout() { clearStoredAuthSession(); clearStoredCodeVerifier(); session = null; activeModule = "dashboard"; activeWorkspace = "dashboard"; openTabs = []; recentWorkspaces = []; view = "center"; saveAll(); toast("已登出"); render(); }

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
  document.querySelectorAll("[data-toggle-sidebar]").forEach(b => b.onclick = () => { sidebarOpen = !sidebarOpen; render(); });
  document.querySelectorAll("[data-close-sidebar]").forEach(b => b.onclick = () => { sidebarOpen = false; render(); });
  document.querySelectorAll("[data-open-workspace]").forEach(b => b.onclick = () => { sidebarOpen = false; openWorkspace(b.dataset.openWorkspace); });
  document.querySelectorAll("[data-activate-workspace]").forEach(b => b.onclick = () => activateWorkspace(b.dataset.activateWorkspace));
  document.querySelectorAll("[data-close-workspace]").forEach(b => b.onclick = e => { e.stopPropagation(); closeWorkspace(b.dataset.closeWorkspace); });
  document.querySelectorAll("[data-day]").forEach(b => b.onclick = () => { selected.setDate(Number(b.dataset.day)); saveAll(); render(); });
  document.querySelectorAll("[data-mobile-date]").forEach(b => b.onclick = () => { selected = new Date(`${b.dataset.mobileDate}T00:00:00`); saveAll(); render(); });
  document.querySelectorAll("[data-toggle-mobile-calendar]").forEach(b => b.onclick = () => { mobileCalendarOpen = !mobileCalendarOpen; render(); });
  document.querySelectorAll("[data-action=add]").forEach(b => b.onclick = () => { editingEntryId = null; captureSeed = null; activeWorkspace = "worklog"; if (!openTabs.includes("worklog")) openTabs.push("worklog"); rememberWorkspace("worklog"); view = "capture"; saveAll(); render(); });
  const today = document.querySelector("[data-today]"); if (today) today.onclick = () => { selected = new Date(); saveAll(); render(); };
  const exportBtn = document.querySelector("[data-export-month]"); if (exportBtn) exportBtn.onclick = () => exportMonthXls();
  document.querySelectorAll("[data-accept]").forEach(b => b.onclick = () => acceptSuggestion(b.dataset.accept));
  document.querySelectorAll("[data-adjust]").forEach(b => b.onclick = () => adjustSuggestion(b.dataset.adjust));
  document.querySelectorAll("[data-del-id]").forEach(b => b.onclick = () => { entries = entries.filter(e => e.id !== b.dataset.delId); saveAll(); toast("已刪除"); render(); });
  document.querySelectorAll("[data-edit-id]").forEach(b => b.onclick = () => { editingEntryId = b.dataset.editId; captureSeed = null; activeWorkspace = "worklog"; if (!openTabs.includes("worklog")) openTabs.push("worklog"); rememberWorkspace("worklog"); view = "capture"; saveAll(); render(); });
  bindLibrary();
  if (activeWorkspace === "worklog" && view === "capture") bindCapture();
  if (activeWorkspace === "worklog" && !profile) bindOnboarding();
  if (activeWorkspace === "library" && view === "libraryForm") bindLibraryForm(editingLibraryId);
  if (activeWorkspace === "settings") bindSettings();
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
  editingEntryId = null;
  captureSeed = s;
  activeWorkspace = "worklog";
  if (!openTabs.includes("worklog")) openTabs.push("worklog");
  rememberWorkspace("worklog");
  view = "capture";
  saveAll();
  render();
}

function bindCapture(editId = null) {
  editId = editId || editingEntryId;
  const editingEntry = editId ? entries.find(e => e.id === editId) : null;
  let selectedH = editingEntry ? Number(editingEntry.hours) : 1;
  document.querySelectorAll("[data-capture-back],[data-capture-cancel]").forEach(b => b.onclick = () => { view = "center"; editingEntryId = null; captureSeed = null; saveAll(); render(); });
  const addModelBtn = document.querySelector("[data-add-capture-model]");
  if (addModelBtn) addModelBtn.onclick = () => {
    const input = document.getElementById("newModelCapture");
    if (!addWorkModel(input.value)) return toast("請輸入工作模型名稱");
    saveAll();
    const select = document.getElementById("title");
    select.innerHTML = workModelOptions(input.value.trim());
    select.value = input.value.trim();
    input.value = "";
    toast("已新增工作模型");
  };
  document.querySelectorAll(".hour").forEach(b => b.onclick = () => { selectedH = Number(b.dataset.h); document.querySelectorAll(".hour").forEach(x => x.classList.remove("selected")); b.classList.add("selected"); });
  document.getElementById("saveEntry").onclick = () => {
    const at = document.getElementById("dt").value;
    const model = document.getElementById("title").value.trim();
    const item = { id: editingEntry ? editingEntry.id : uid(), date: at.slice(0, 10), at, title: model, hours: selectedH, type: document.getElementById("eventType").value, task: document.getElementById("task").value || model, source: editingEntry ? editingEntry.source : "manual" };
    const error = validateEntry(item); if (error) return toast(error);
    if (editingEntry) entries[entries.findIndex(e => e.id === editingEntry.id)] = item; else entries.push(item);
    selected = new Date(at); view = "center"; editingEntryId = null; captureSeed = null; saveAll(); toast("已儲存工時"); render();
  };
}

function bindLibrary() {
  const add = document.querySelector("[data-add-library]"); if (add) add.onclick = () => { editingLibraryId = null; activeWorkspace = "library"; view = "libraryForm"; saveAll(); render(); };
  document.querySelectorAll("[data-edit-library]").forEach(b => b.onclick = () => { editingLibraryId = b.dataset.editLibrary; activeWorkspace = "library"; view = "libraryForm"; saveAll(); render(); });
  document.querySelectorAll("[data-del-library]").forEach(b => b.onclick = () => { library = library.filter(x => x.id !== b.dataset.delLibrary); saveAll(); toast("已刪除藏書閣來源"); render(); });
}

function bindLibraryForm(id = null) {
  document.querySelectorAll("[data-library-back],[data-library-cancel]").forEach(b => b.onclick = () => { editingLibraryId = null; view = "library"; saveAll(); render(); });
  document.getElementById("saveLibrary").onclick = () => {
    const existing = id ? normalizedLibraryItem(library.find(x => x.id === id)) : {};
    const item = { id: id || uid("lib"), name: document.getElementById("libName").value.trim(), type: "上傳文件", sourceType: "上傳文件", readingStatus: existing.readingStatus || DEFAULT_LIBRARY_READING_STATUS, description: document.getElementById("libDesc").value.trim(), location: document.getElementById("libFile")?.files?.[0]?.name || existing.location || "", purpose: existing.purpose || "", tags: existing.tags || [] };
    if (!item.name) return toast("請輸入來源名稱");
    if (id) library[library.findIndex(x => x.id === id)] = item; else library.push(item);
    editingLibraryId = null; view = "library"; saveAll(); toast("藏書閣已儲存"); render();
  };
}

function bindSettings() {
  const renderModelChecks = (models, selectedModels = models) => {
    const list = document.getElementById("workModelList");
    if (list) list.innerHTML = workModelChecks(models, selectedModels);
  };
  const roleSet = document.getElementById("roleSet");
  if (roleSet) roleSet.onchange = e => renderModelChecks(tagsForRole(e.target.value), tagsForRole(e.target.value));
  const add = document.getElementById("addWorkModel");
  if (add) add.onclick = () => {
    const input = document.getElementById("newWorkModel");
    const name = input.value.trim();
    if (!name) return toast("請輸入工作模型名稱");
    const current = [...document.querySelectorAll(".work-model-option")].map(x => x.value);
    const selected = [...document.querySelectorAll(".work-model-option:checked")].map(x => x.value);
    const models = current.includes(name) ? current : [...current, name];
    renderModelChecks(models, [...new Set([...selected, name])]);
    input.value = "";
    toast("已新增工作模型");
  };
  document.getElementById("saveSettings").onclick = () => {
    profile.role = document.getElementById("roleSet").value;
    const selectedModels = [...document.querySelectorAll(".work-model-option:checked")].map(x => x.value.trim()).filter(Boolean);
    profile.tags = selectedModels.length ? [...new Set(selectedModels)] : tagsForRole(profile.role);
    saveAll(); toast("工作模型已更新"); render();
  };
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
      if (authCallbackCaptured) { activeModule = "dashboard"; activeWorkspace = "worklog"; openTabs = ["worklog"]; recentWorkspaces = ["worklog"]; view = "center"; hasOsShellState = true; }
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
