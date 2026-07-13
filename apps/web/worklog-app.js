const VERSION = "1.0.0-rc3.1-sp3";
const RELEASE_VERSION = "RC3.3";
const BUILD_TIME = "20260713-0856";
const DEPLOY_SOURCE = `worklog-app.js?v=${BUILD_TIME}`;
const root = document.getElementById("app");
const IS_EXTENSION_ENTRY = document.body?.classList.contains("extension");
const WEB_APP_URL = "https://qqweasdzxc.github.io/worklog-workspace/";
const CHROME_EXTENSION_STORE_URL = "";
const AUTH_SESSION_KEY = "zhuge_ai_os_google_auth_session_v1";
const AUTH_CODE_VERIFIER_KEY = "zhuge_ai_os_pkce_code_verifier_v1";
const AI_OS_SESSION_KEY = "zhuge_ai_os_session_v1";
const WORKLOG_WELCOME_KEY = "zhuge_worklog_welcome_seen_v1";
const WORK_PROFILE_PROMPT_KEY = "zhuge_work_profile_prompt_date_v1";
const WORK_IDENTITY_SETUP_STEP_KEY = "zhuge_work_identity_setup_step_v1";
const WORK_IDENTITY_SETUP_DRAFT_KEY = "zhuge_work_identity_setup_draft_v1";
const WORK_IDENTITY_COMPLETION_KEY = "zhuge_work_identity_completion_pending_v1";
const MOBILE_SUMMARY_OPEN_KEY = "zhuge_mobile_summary_open_v1";
const MOBILE_CALENDAR_OPEN_KEY = "zhuge_mobile_calendar_open_v1";
const WORKLOG_CHAT_KEY = "zhuge_worklog_chat_v1";
const WORKLOG_CHAT_PENDING_KEY = "zhuge_worklog_chat_pending_v1";
const ZHUGE_ASSISTANT_WELCOME_KEY = "zhuge_assistant_welcome_seen_v1";
const ZHUGE_ASSISTANT_OPEN_KEY = "zhuge_assistant_open_v1";
const ACTIVE_MODULE_KEY = "zhuge_active_module_v1";
const OS_OPEN_TABS_KEY = "zhuge_os_open_tabs_v1";
const OS_ACTIVE_WORKSPACE_KEY = "zhuge_os_active_workspace_v1";
const OS_RECENT_WORKSPACES_KEY = "zhuge_os_recent_workspaces_v1";
const AUTH_CONFIG = {
  supabaseUrl: "https://lenpbbhwxyyfwgvjcozf.supabase.co",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxlbnBiYmh3eHl5Zndndmpjb3pmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyOTM1ODksImV4cCI6MjA5NTg2OTU4OX0.TAFfLoMC8Tqr4r7nlAtsOke3YcjBIBmr5fN1a6iwSFQ"
};
const WORKLOG_LLM_FUNCTION = "worklog-llm";

let activeModule = localStorage.getItem(ACTIVE_MODULE_KEY) || "dashboard";
let authCallbackCaptured = false;
let view = localStorage.getItem("wl_view") || "center";
if (view === "warroom") view = "library";
if (view === "capture") view = "center";
let hasOsShellState = localStorage.getItem(OS_OPEN_TABS_KEY) !== null;
let openTabs = readJson(OS_OPEN_TABS_KEY, []);
let activeWorkspace = localStorage.getItem(OS_ACTIVE_WORKSPACE_KEY) || "dashboard";
let recentWorkspaces = readJson(OS_RECENT_WORKSPACES_KEY, []);
let selected = new Date(localStorage.getItem("wl_selected") || Date.now());
if (Number.isNaN(selected.getTime())) selected = new Date();
let selectedMonth = localStorage.getItem("wl_selected_month") || monthKey(selected);
let entries = [];
let profile = readJson("wl_profile", null);
let workProfile = readJson("wl_work_profile", null);
let feedback = readJson("wl_feedback", {});
let session = readJson(AI_OS_SESSION_KEY, null);
let library = [];
let editingLibraryId = null;
let editingEntryId = null;
let captureSeed = null;
let sidebarOpen = false;
let mobileCalendarOpen = false;
let conversationMessagesState = null;
let conversationPendingState = undefined;
let conversationRefreshTimer = null;
const AI_REASON_QUEUE_SIZE = 5;

const roles = ["採購", "行政", "人資", "業務", "行銷", "IT", "自訂"];
const defaultTags = ["採購案件處理", "發票請款", "驗收請款", "供應商聯繫", "Mail處理", "資料整理", "會議", "專案追蹤"];
const defaultEcpTasks = ["採購案件處理", "驗收請款", "發票請款", "供應商聯繫", "採購進度追蹤"];
const roleTagMap = {
  "採購": ["採購案件處理", "發票請款", "驗收請款", "供應商聯繫", "採購進度追蹤", "合約資料整理", "會議", "專案追蹤"],
  "行政": ["庶務行政", "文件整理", "會議安排", "費用請款", "資產管理", "跨部門聯繫", "Mail處理", "資料整理"],
  "人資": ["招募作業", "面試安排", "員工資料維護", "出勤確認", "教育訓練", "薪資資料整理", "制度公告", "跨部門溝通"],
  "業務": ["客戶聯繫", "報價追蹤", "商機更新", "合約確認", "客戶會議", "銷售資料整理", "回款追蹤", "專案追蹤"],
  "行銷": ["活動規劃", "內容製作", "社群排程", "廣告成效追蹤", "市場資料整理", "素材確認", "跨部門溝通", "專案追蹤"],
  "IT": ["系統維護", "帳號權限處理", "問題排查", "需求訪談", "系統更新", "資料備份", "資安檢查", "技術文件整理"],
  "自訂": ["自訂工作", "Mail處理", "資料整理", "會議", "專案追蹤", "跨部門溝通", "文件整理", "待辦追蹤"]
};
const roleCodeMap = { "採購": "PROCUREMENT", "行政": "ADMIN", "人資": "HR", "業務": "SALES", "行銷": "MARKETING", "IT": "IT", "自訂": "CUSTOM" };
const roleNameMap = Object.fromEntries(Object.entries(roleCodeMap).map(([name, code]) => [code, name]));
const entryTypeOptions = [
  { value: "work", label: "工作" },
  { value: "leave", label: "請假" }
];
const leaveTypeVocabulary = ["特休", "病假", "事假", "公假", "婚假", "喪假", "補休", "育嬰假", "生理假", "家庭照顧假", "請假"];
const eventTypeCodeMap = {
  work: "WORK", meeting: "WORK", training: "WORK", leave: "LEAVE", holiday: "LEAVE",
  "工作": "WORK", "會議": "MEETING", "教育訓練": "TRAINING", "特休": "LEAVE", "事假": "LEAVE", "病假": "LEAVE", "請假": "LEAVE", "假日": "LEAVE", "出差": "BUSINESS_TRIP"
};
const eventTypeNameMap = { WORK: "work", MEETING: "work", TRAINING: "work", LEAVE: "leave", BUSINESS_TRIP: "work" };
const KNOWLEDGE_BUCKET = "knowledge-sources";
const LEGACY_KNOWLEDGE_MIGRATION_KEY = "knowledge_repository_p5_legacy_wl_library_v1";
const ECP_EXPORT_PROFILE_PATH = "resources/profiles/ecp-profile.json";
const CLOUD_MIGRATION_KEY = "localstorage_rc33_to_rc34a_v1";
const KNOWLEDGE_CATEGORIES = ["SOP", "制度", "法規", "專案", "表單", "教材", "會議", "其他"];
const KNOWLEDGE_AGENTS = ["採購 Agent", "HR Agent", "投資 Agent", "旅遊 Agent"];
const KNOWLEDGE_SCOPES = ["personal", "role", "company", "public"];
const KNOWLEDGE_SCOPE_LABELS = { personal: "👤 Personal", role: "💼 Role", company: "🏢 Company", public: "🌍 Public" };
const KNOWLEDGE_PROCESSING_STATUS = ["uploaded", "queued", "processing", "processed", "knowledge_built", "verified", "failed", "archived"];
const KNOWLEDGE_SOURCE_TYPES = ["file", "pdf", "word", "excel", "powerpoint", "markdown", "url", "legacy_metadata"];
const KNOWLEDGE_ROLE_OPTIONS = ["PROCUREMENT", "HR", "IT", "ADMIN", "FINANCE", "SALES", "MARKETING", "CUSTOM"];
const WORK_PROFILE_SCHEMA_SQL = "docs/supabase/20260712_p4_5_user_work_profile_schema.sql";
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

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function authHeaders(token) {
  return { apikey: AUTH_CONFIG.supabaseAnonKey, Authorization: `Bearer ${token || AUTH_CONFIG.supabaseAnonKey}`, "Content-Type": "application/json" };
}

function currentUserUuid() {
  return session?.user_uuid || session?.uuid || "";
}

function currentAccessToken() {
  return session?.access_token || getStoredAuthSession()?.access_token || "";
}

function tokenExpiresAtMs(value) {
  const raw = Number(value || 0);
  if (!raw) return 0;
  return raw > 1000000000000 ? raw : raw * 1000;
}

function decodeJwtPayload(token = "") {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function currentAccessTokenExpiresAtMs() {
  const stored = getStoredAuthSession();
  const explicit = tokenExpiresAtMs(session?.expires_at) || tokenExpiresAtMs(stored?.expires_at);
  if (explicit) return explicit;
  const jwt = decodeJwtPayload(currentAccessToken());
  return tokenExpiresAtMs(jwt?.exp);
}

function accessTokenNeedsRefresh(skewMs = 120000) {
  const expiresAt = currentAccessTokenExpiresAtMs();
  if (!currentAccessToken()) return true;
  if (!expiresAt) return false;
  return Date.now() + skewMs >= expiresAt;
}

function persistAiOsSessionOnly() {
  localStorage.setItem(AI_OS_SESSION_KEY, JSON.stringify(session));
}

function cloudHeaders(extra = {}) {
  return {
    apikey: AUTH_CONFIG.supabaseAnonKey,
    Authorization: `Bearer ${currentAccessToken() || AUTH_CONFIG.supabaseAnonKey}`,
    "Content-Type": "application/json",
    ...extra
  };
}

function roleCode(roleName = "採購") {
  return roleCodeMap[roleName] || roleName || "PROCUREMENT";
}

function roleName(code = "PROCUREMENT") {
  return roleNameMap[code] || code || "採購";
}

function eventTypeCode(label = "工作") {
  return eventTypeCodeMap[normalizeEntryType(label)] || eventTypeCodeMap[label] || label || "WORK";
}

function eventTypeName(code = "WORK") {
  return eventTypeLabel(eventTypeNameMap[code] || normalizeEntryType(code));
}

function normalizeEntryType(value = "work") {
  const raw = String(value || "work").trim();
  const lower = raw.toLowerCase();
  if (["work", "meeting", "holiday", "training"].includes(lower)) return "work";
  if (lower === "leave") return "leave";
  if (raw === "工作") return "work";
  if (raw === "會議") return "work";
  if (raw === "教育訓練") return "work";
  if (["特休", "事假", "病假", "請假"].includes(raw)) return "leave";
  if (raw === "假日") return "work";
  return "work";
}

function entryTypeFromDescription(value = "") {
  const text = String(value || "").trim();
  if (!text) return "work";
  return leaveTypeVocabulary.some(alias => text.includes(alias)) ? "leave" : "work";
}

function eventTypeLabel(value = "work") {
  const normalized = normalizeEntryType(value);
  return entryTypeOptions.find(option => option.value === normalized)?.label || "工作";
}

function isLeaveType(value = "work") {
  return normalizeEntryType(value) === "leave";
}

function parseWorkTimeRange(range = "09:00~18:00") {
  const [start = "09:00", end = "18:00"] = String(range).split("~").map(x => x.trim());
  return { start, end };
}

function cacheKey(name) {
  const uuid = currentUserUuid() || "anonymous";
  return `wl_cache:${uuid}:${name}`;
}

function scopedLocalKey(name) {
  return `${name}:${currentUserUuid() || "anonymous"}`;
}

function readScopedUiFlag(name, fallback = false) {
  const value = localStorage.getItem(scopedLocalKey(name));
  if (value === null) return fallback;
  return value === "1";
}

function writeScopedUiFlag(name, value) {
  localStorage.setItem(scopedLocalKey(name), value ? "1" : "0");
}

function legacyInventory() {
  const legacyEntries = readJson("wl_entries", []);
  const legacyProfile = readJson("wl_profile", null);
  const legacyFeedback = readJson("wl_feedback", {});
  const legacyLibrary = readJson("wl_library", []);
  const workModels = Array.isArray(legacyProfile?.tags) ? legacyProfile.tags.filter(Boolean) : [];
  const ecpTasksSource = Array.isArray(legacyProfile?.ecpTasks) ? legacyProfile.ecpTasks : (legacyProfile?.ecpTask ? [legacyProfile.ecpTask] : []);
  const ecpTasksCount = [...new Set(ecpTasksSource.map(x => String(x || "").trim()).filter(Boolean))].length;
  return {
    entries: Array.isArray(legacyEntries) ? legacyEntries.length : 0,
    workModels: [...new Set(workModels.map(x => String(x || "").trim()).filter(Boolean))].length,
    ecpTasks: ecpTasksCount,
    ecpSettings: !!(legacyProfile?.ecpOwner || legacyProfile?.ecpDepartment),
    feedback: legacyFeedback && typeof legacyFeedback === "object" ? Object.keys(legacyFeedback).length : 0,
    library: Array.isArray(legacyLibrary) ? legacyLibrary.length : 0,
    hasCoreData: !!legacyProfile || (Array.isArray(legacyEntries) && legacyEntries.length > 0) || ecpTasksCount > 0
  };
}

async function sha256Text(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
}

let cloudSync = readJson("wl_cloud_sync_status_v1", { status: "idle", lastSyncedAt: "", error: "" });
let conversationSync = readJson("zhuge_conversation_sync_status_v1", { status: "unknown", lastSyncedAt: "", error: "" });
let dataServiceReady = false;
let dataServiceHydrating = false;
let dataServiceSyncing = false;
let autoSaveTimer = null;
let autoSaveInFlight = false;
const autoSaveDirtyScopes = new Set();
let knowledgeFoundationNotInitialized = cloudSync.status === "knowledge_uninitialized";
let conversationFoundationNotInitialized = false;
let migrationRequired = false;
let migrationPreview = null;
let migrationRunning = false;
let migrationError = "";

function setConversationSyncStatus(status, error = "") {
  conversationSync = { status, error, lastSyncedAt: status === "synced" ? new Date().toISOString() : conversationSync.lastSyncedAt || "" };
  writeJson("zhuge_conversation_sync_status_v1", conversationSync);
  refreshCloudSyncStatusDisplay();
}

const LocalCache = {
  load(name, fallback) { return readJson(cacheKey(name), fallback); },
  save(name, value) { writeJson(cacheKey(name), value); },
  saveAll() {
    if (!hasGoogleOAuthSession()) return;
    this.save("profile", profile);
    this.save("work_profile", workProfile);
    this.save("entries", entries);
    this.save("work_models", Array.isArray(DataService.workModelsState) ? DataService.workModelsState : profile?.tags || []);
    this.save("ecp_settings", { ecpOwner: profile?.ecpOwner || "", ecpDepartment: profile?.ecpDepartment || "" });
    this.save("ecp_tasks", Array.isArray(DataService.ecpTasksState) ? DataService.ecpTasksState : profile?.ecpTasks || []);
    this.save("library", library);
  },
  hydrate() {
    if (!hasGoogleOAuthSession()) return false;
    const cachedProfile = this.load("profile", null);
    const cachedWorkProfile = this.load("work_profile", null);
    const cachedEntries = this.load("entries", []);
    const cachedLibrary = this.load("library", []);
    if (cachedProfile) profile = cachedProfile;
    if (cachedWorkProfile) workProfile = cachedWorkProfile;
    if (Array.isArray(cachedEntries) && cachedEntries.length) entries = cachedEntries;
    if (Array.isArray(cachedLibrary) && cachedLibrary.length) library = cachedLibrary;
    const cachedWorkModels = this.load("work_models", null);
    const cachedEcpTasks = this.load("ecp_tasks", null);
    if (Array.isArray(cachedWorkModels)) DataService.workModelsState = cachedWorkModels;
    if (Array.isArray(cachedEcpTasks)) DataService.ecpTasksState = cachedEcpTasks;
    return !!cachedProfile || !!cachedWorkProfile || cachedEntries.length > 0;
  }
};

const SupabaseRepository = {
  async requestError(path, options, res) {
    const body = await res.text().catch(() => "");
    let parsedBody = null;
    try { parsedBody = body ? JSON.parse(body) : null; } catch { parsedBody = null; }
    let payload = null;
    try { payload = options.body ? JSON.parse(options.body) : null; } catch { payload = options.body || null; }
    const details = {
      path,
      method: options.method || "GET",
      status: res.status,
      statusText: res.statusText,
      code: parsedBody?.code || "",
      message: parsedBody?.message || body || res.statusText,
      details: parsedBody?.details || "",
      hint: parsedBody?.hint || "",
      body,
      payload,
      user_uuid: currentUserUuid(),
      has_access_token: !!currentAccessToken(),
      access_token_expires_at: currentAccessTokenExpiresAtMs() ? new Date(currentAccessTokenExpiresAtMs()).toISOString() : ""
    };
    console.error("Supabase request failed", details);
    const error = new Error(`Supabase ${res.status}: ${details.message}`);
    error.supabase = details;
    return error;
  },
  shouldRefreshAfter(error) {
    const text = `${error?.supabase?.code || ""} ${error?.supabase?.message || ""} ${error?.supabase?.body || ""}`;
    return error?.supabase?.status === 401 && /jwt expired|PGRST303|expired/i.test(text);
  },
  async request(path, options = {}) {
    await ensureFreshAuthSession(false);
    const run = () => fetch(`${AUTH_CONFIG.supabaseUrl}/rest/v1/${path}`, {
      ...options,
      headers: cloudHeaders(options.headers || {})
    });
    let res = await run();
    if (!res.ok) {
      const firstError = await this.requestError(path, options, res);
      if (this.shouldRefreshAfter(firstError)) {
        await refreshAuthSession(true);
        res = await run();
        if (!res.ok) throw await this.requestError(path, options, res);
      } else {
        throw firstError;
      }
    }
    if (res.status === 204) return null;
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  },
  select(table, query = "") {
    return this.request(`${table}${query}`, { method: "GET" });
  },
  insert(table, payload) {
    return this.request(`${table}`, { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(payload) });
  },
  patch(table, query, payload) {
    return this.request(`${table}${query}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(payload) });
  },
  async storageRequest(path, options = {}) {
    await ensureFreshAuthSession(false);
    const run = () => fetch(`${AUTH_CONFIG.supabaseUrl}/storage/v1/${path}`, {
      ...options,
      headers: {
        apikey: AUTH_CONFIG.supabaseAnonKey,
        Authorization: `Bearer ${currentAccessToken() || AUTH_CONFIG.supabaseAnonKey}`,
        ...(options.headers || {})
      }
    });
    let res = await run();
    if (!res.ok) {
      const firstError = await this.requestError(`storage/v1/${path}`, options, res);
      if (this.shouldRefreshAfter(firstError)) {
        await refreshAuthSession(true);
        res = await run();
        if (!res.ok) throw await this.requestError(`storage/v1/${path}`, options, res);
      } else {
        throw firstError;
      }
    }
    if (res.status === 204) return null;
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  },
  encodeStoragePath(path = "") {
    return String(path || "").split("/").map(part => encodeURIComponent(part)).join("/");
  },
  async uploadKnowledgeFile(path = "", file = null) {
    if (!file) throw new Error("請選擇要上傳的正式檔案");
    return this.storageRequest(`object/${KNOWLEDGE_BUCKET}/${this.encodeStoragePath(path)}`, {
      method: "POST",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        "x-upsert": "false"
      },
      body: file
    });
  },
  async deleteKnowledgeFile(path = "") {
    if (!path) return null;
    return this.storageRequest(`object/${KNOWLEDGE_BUCKET}/${this.encodeStoragePath(path)}`, { method: "DELETE" });
  },
  async signedKnowledgeFileUrl(path = "", expiresIn = 300) {
    if (!path) throw new Error("此知識來源尚無正式檔案");
    const data = await this.storageRequest(`object/sign/${KNOWLEDGE_BUCKET}/${this.encodeStoragePath(path)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expiresIn })
    });
    const url = data?.signedURL || data?.signedUrl || data?.signed_url || "";
    if (!url) throw new Error("Storage 未回傳預覽連結");
    return url.startsWith("http") ? url : `${AUTH_CONFIG.supabaseUrl}/storage/v1${url}`;
  },
  async allocateKnowledgeId() {
    const rows = await this.request("rpc/next_knowledge_id", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({}) });
    if (typeof rows === "string") return rows;
    if (Array.isArray(rows)) return rows?.[0]?.next_knowledge_id || rows?.[0] || "";
    return rows?.next_knowledge_id || rows || "";
  },
  async upsertUserProfile(profileValue) {
    const work = parseWorkTimeRange(profileValue?.workHours);
    const lunch = parseWorkTimeRange(profileValue?.lunch || "12:00~13:00");
    const payload = {
      user_uuid: currentUserUuid(),
      display_name: session.name || "",
      email: session.email || "",
      role_code: roleCode(profileValue?.role || "採購"),
      work_start_time: work.start,
      work_end_time: work.end,
      lunch_start_time: lunch.start,
      lunch_end_time: lunch.end,
      timezone: "Asia/Taipei"
    };
    return this.request("user_profiles?on_conflict=user_uuid", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify(payload) });
  },
  async loadUserProfile() {
    const rows = await this.select("user_profiles", "?select=*&limit=1");
    return rows?.[0] || null;
  },
  async upsertExportSettings(profileValue) {
    const payload = { user_uuid: currentUserUuid(), export_profile: "ecp", ecp_owner: profileValue?.ecpOwner || "", ecp_department: profileValue?.ecpDepartment || "" };
    return this.request("user_export_settings?on_conflict=user_uuid,export_profile", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify(payload) });
  },
  async loadExportSettings() {
    const rows = await this.select("user_export_settings", "?select=*&export_profile=eq.ecp&limit=1");
    return rows?.[0] || null;
  },
  async upsertWorkProfile(value = {}) {
    const p = normalizeWorkProfile(value);
    const payload = {
      user_uuid: currentUserUuid(),
      ecp_responsible_person: p.ecpResponsiblePerson,
      ecp_department: p.ecpDepartment,
      default_task: p.defaultTask,
      default_work_model: p.defaultWorkModel,
      profile_completed: !!p.profileCompleted,
      profile_completed_at: p.profileCompletedAt || null,
      last_profile_check_date: p.lastProfileCheckDate || null,
      last_profile_prompt_date: p.lastProfilePromptDate || null,
      task_effective_month: p.taskEffectiveMonth || null,
      task_verified_at: p.taskVerifiedAt || null,
      expires_at: p.expiresAt || null
    };
    return this.request("user_work_profiles?on_conflict=user_uuid", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify(payload) });
  },
  async loadWorkProfile() {
    const rows = await this.select("user_work_profiles", "?select=*&limit=1");
    return rows?.[0] || null;
  },
  async syncNameList(table, names, extra = {}) {
    const rows = await this.select(table, "?select=id,name,is_active,sort_order");
    const current = rows || [];
    const wanted = [...new Set((names || []).map(x => String(x).trim()).filter(Boolean))];
    for (const [index, name] of wanted.entries()) {
      const existing = current.find(row => row.name === name);
      const payload = { user_uuid: currentUserUuid(), name, is_active: true, sort_order: index, ...extra };
      if (existing) await this.patch(table, `?id=eq.${encodeURIComponent(existing.id)}`, payload);
      else await this.insert(table, payload);
    }
    for (const row of current) {
      if (row.is_active && !wanted.includes(row.name)) await this.patch(table, `?id=eq.${encodeURIComponent(row.id)}`, { is_active: false });
    }
    return this.select(table, "?select=*&is_active=eq.true&order=sort_order.asc,name.asc");
  },
  loadWorkModels() {
    return this.select("user_work_models", "?select=*&is_active=eq.true&order=sort_order.asc,name.asc");
  },
  saveWorkModels(names, profileValue = profile) {
    return this.syncNameList("user_work_models", names, { role_code: roleCode(profileValue?.role || "採購"), source: "manual" });
  },
  loadEcpTasks() {
    return this.select("user_ecp_tasks", "?select=*&is_active=eq.true&order=sort_order.asc,name.asc");
  },
  saveEcpTasks(names) {
    return this.syncNameList("user_ecp_tasks", names);
  },
  async ensureAssistantConversation() {
    if (!currentUserUuid() || !currentAccessToken()) throw new Error("Cloud Sync 尚未就緒");
    const payload = {
      user_uuid: currentUserUuid(),
      thread_key: "main",
      title: "諸葛先生",
      status: "active",
      updated_at: new Date().toISOString()
    };
    const rows = await this.request("assistant_conversations?on_conflict=user_uuid,thread_key", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify(payload) });
    return rows?.[0] || null;
  },
  async loadAssistantConversation() {
    const conversation = await this.ensureAssistantConversation();
    const conversationId = conversation?.id;
    const messages = conversationId
      ? await this.select("assistant_messages", `?select=*&conversation_id=eq.${encodeURIComponent(conversationId)}&order=created_at.desc&limit=50`)
      : [];
    const states = await this.select("assistant_conversation_states", "?select=*&state_key=eq.main&limit=1");
    return { conversation, messages: (messages || []).slice().reverse(), state: states?.[0] || null };
  },
  async saveAssistantMessage(message = {}, channel = assistantChannel()) {
    if (!message || message.transient || message.role === "system") return null;
    const conversation = await this.ensureAssistantConversation();
    if (!conversation?.id) throw new Error("Conversation 尚未就緒");
    const payload = {
      user_uuid: currentUserUuid(),
      conversation_id: conversation.id,
      client_message_id: message.id || uid("msg"),
      role: message.role || "assistant",
      content: String(message.text || ""),
      card: message.card || null,
      channel,
      created_at: message.at || new Date().toISOString()
    };
    const rows = await this.request("assistant_messages?on_conflict=user_uuid,client_message_id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify(payload) });
    return rows?.[0] || null;
  },
  async saveAssistantState(command = null, channel = assistantChannel()) {
    if (!currentUserUuid() || !currentAccessToken()) throw new Error("Cloud Sync 尚未就緒");
    const conversation = await this.ensureAssistantConversation();
    const payload = {
      user_uuid: currentUserUuid(),
      conversation_id: conversation?.id || null,
      state_key: "main",
      state_type: command ? (command.action || "pending_action") : "idle",
      pending_action: command || null,
      channel,
      updated_at: new Date().toISOString()
    };
    const rows = await this.request("assistant_conversation_states?on_conflict=user_uuid,state_key", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify(payload) });
    return rows?.[0] || null;
  },
  async hasCloudCoreData() {
    const checks = await Promise.allSettled([
      this.select("user_profiles", "?select=user_uuid&limit=1"),
      this.select("user_work_models", "?select=id&limit=1"),
      this.select("user_ecp_tasks", "?select=id&limit=1"),
      this.select("user_export_settings", "?select=id&limit=1"),
      this.select("work_entries", "?select=id&status=neq.deleted&limit=1")
    ]);
    return checks.some(result => result.status === "fulfilled" && Array.isArray(result.value) && result.value.length > 0);
  },
  async loadEntries(month = monthKey()) {
    const rows = await this.select("work_entries", `?select=*&work_date=gte.${month}-01&work_date=lt.${nextMonthKey(month)}-01&status=neq.deleted&order=started_at.asc`);
    return rows || [];
  },
  async loadMigration(key = CLOUD_MIGRATION_KEY) {
    const rows = await this.select("sync_migrations", `?select=*&migration_key=eq.${encodeURIComponent(key)}&limit=1`);
    return rows?.[0] || null;
  },
  async completeMigration(sourceHash, key = CLOUD_MIGRATION_KEY) {
    const payload = { user_uuid: currentUserUuid(), migration_key: key, source_hash: sourceHash, completed_at: new Date().toISOString() };
    return this.request("sync_migrations?on_conflict=user_uuid,migration_key", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify(payload) });
  },
  async saveEntry(entry) {
    if (!currentUserUuid() || !currentAccessToken()) throw new Error("Cloud Sync 尚未就緒");
    const ecpRows = await this.loadEcpTasks();
    const ecpTask = ecpRows.find(row => row.name === entry.ecpTask);
    const existing = entry.cloudId ? [{ id: entry.cloudId }] : await this.select("work_entries", `?select=id&legacy_id=eq.${encodeURIComponent(entry.id)}&limit=1`);
    const started = parseTaipeiBusinessDateTime(entry.at);
    const ended = new Date(started.getTime() + Math.round(Number(entry.hours || 0) * 60) * 60000);
    const payload = {
      user_uuid: currentUserUuid(),
      work_date: entry.date || String(entry.at || "").slice(0, 10),
      started_at: started.toISOString(),
      ended_at: ended.toISOString(),
      hours: Number(entry.hours || 0),
      title: entry.title || "",
      note: entry.note || "",
      event_type: eventTypeCode(entry.entryType || entry.type || "work"),
      status: entry.status || "completed",
      source: entry.source || "manual",
      ecp_task_id: ecpTask?.id || null,
      ecp_task_name_snapshot: entry.ecpTask || "",
      legacy_id: entry.id
    };
    const saved = existing?.[0]?.id
      ? await this.patch("work_entries", `?id=eq.${encodeURIComponent(existing[0].id)}`, payload)
      : await this.insert("work_entries", payload);
    if (!saved?.[0]?.id) {
      console.error("Supabase saveEntry returned empty response", { payload, saved, user_uuid: currentUserUuid(), has_access_token: !!currentAccessToken() });
      throw new Error("Supabase work_entries 未回傳儲存結果");
    }
    return saved[0];
  },
  async deleteEntry(entry) {
    if (!currentUserUuid() || !currentAccessToken()) throw new Error("Cloud Sync 尚未就緒");
    const existing = entry.cloudId ? [{ id: entry.cloudId }] : await this.select("work_entries", `?select=id&legacy_id=eq.${encodeURIComponent(entry.id)}&limit=1`);
    if (!existing?.[0]?.id) return null;
    return this.patch("work_entries", `?id=eq.${encodeURIComponent(existing[0].id)}`, { status: "deleted", deleted_at: new Date().toISOString() });
  },
  loadKnowledgeSources() {
    return this.select("knowledge_sources", "?select=*&deleted_at=is.null&order=created_at.desc");
  },
  async saveKnowledgeSource(item, file = null) {
    if (!currentUserUuid() || !currentAccessToken()) throw new Error("Cloud Sync 尚未就緒");
    const isNew = !item.cloudId;
    const knowledgeId = item.knowledgeId || (isNew ? await this.allocateKnowledgeId() : "");
    if (!knowledgeId) throw new Error("無法產生 Knowledge ID");
    const version = item.version || "v1.0";
    let storagePath = item.storagePath || "";
    let uploadedPath = "";
    if (file) {
      const safeName = sanitizeStorageFileName(file.name || item.filename || "knowledge-source");
      storagePath = `${currentUserUuid()}/${knowledgeId}/${version}/${Date.now()}-${safeName}`;
      await this.uploadKnowledgeFile(storagePath, file);
      uploadedPath = storagePath;
    }
    const payload = {
      user_uuid: currentUserUuid(),
      organization_id: item.organizationId || null,
      tenant_id: item.tenantId || null,
      knowledge_id: knowledgeId,
      title: item.title,
      description: item.description || "",
      category: item.category || "其他",
      scope: normalizeKnowledgeScope(item.scope),
      source_type: item.sourceType || inferKnowledgeSourceType(file?.name || item.filename || storagePath),
      source_name: item.sourceName || file?.name || item.filename || "",
      source_url: item.sourceUrl || "",
      storage_path: storagePath,
      mime_type: file?.type || item.mimeType || "",
      file_size: file?.size || item.fileSize || null,
      applicable_agents: item.applicableAgents || [],
      related_roles: item.relatedRoles || [],
      related_work_models: item.relatedWorkModels || [],
      tags: item.tags || [],
      triggers: item.triggers || [],
      processing_status: item.processingStatus || "uploaded",
      version,
      source_version: item.sourceVersion || version,
      filename: file?.name || item.filename || "",
      legacy_id: item.id || null,
      created_by: currentUserUuid(),
      updated_by: currentUserUuid(),
      updated_at: new Date().toISOString()
    };
    const existing = item.cloudId ? [{ id: item.cloudId }] : await this.select("knowledge_sources", `?select=id&legacy_id=eq.${encodeURIComponent(item.id)}&limit=1`);
    try {
      const saved = existing?.[0]?.id
        ? await this.patch("knowledge_sources", `?id=eq.${encodeURIComponent(existing[0].id)}`, payload)
        : await this.insert("knowledge_sources", payload);
      if (!saved?.[0]?.id) throw new Error("Supabase knowledge_sources 未回傳儲存結果");
      return saved[0];
    } catch (error) {
      if (uploadedPath) {
        await this.deleteKnowledgeFile(uploadedPath).catch(cleanupError => console.warn("Knowledge orphan upload cleanup failed", { uploadedPath, cleanupError }));
      }
      throw error;
    }
  },
  async deleteKnowledgeSource(item) {
    if (!currentUserUuid() || !currentAccessToken()) throw new Error("Cloud Sync 尚未就緒");
    const existing = item.cloudId ? [{ id: item.cloudId }] : await this.select("knowledge_sources", `?select=id&legacy_id=eq.${encodeURIComponent(item.id)}&limit=1`);
    if (!existing?.[0]?.id) return null;
    return this.patch("knowledge_sources", `?id=eq.${encodeURIComponent(existing[0].id)}`, { deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  }
};

const ConversationRepository = {
  load() {
    return SupabaseRepository.loadAssistantConversation();
  },
  saveMessage(message = {}, channel = assistantChannel()) {
    return SupabaseRepository.saveAssistantMessage(message, channel);
  },
  saveState(command = null, channel = assistantChannel()) {
    return SupabaseRepository.saveAssistantState(command, channel);
  }
};

const KnowledgeRepository = {
  loadSources() {
    return SupabaseRepository.loadKnowledgeSources();
  },
  saveSource(item = {}, file = null) {
    return SupabaseRepository.saveKnowledgeSource(item, file);
  },
  deleteSource(item = {}) {
    return SupabaseRepository.deleteKnowledgeSource(item);
  },
  signedSourceUrl(path = "", expiresIn = 300) {
    return SupabaseRepository.signedKnowledgeFileUrl(path, expiresIn);
  }
};

function nextMonthKey(month = monthKey()) {
  const [year, m] = month.split("-").map(Number);
  const d = new Date(year, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function defaultWorkProfileSeed(baseProfile = profile) {
  const firstTask = (Array.isArray(baseProfile?.ecpTasks) ? baseProfile.ecpTasks : []).find(Boolean) || baseProfile?.ecpTask || "";
  const completed = !!(baseProfile?.ecpOwner && baseProfile?.ecpDepartment && firstTask);
  return {
    userUuid: currentUserUuid(),
    ecpResponsiblePerson: baseProfile?.ecpOwner || "",
    ecpDepartment: baseProfile?.ecpDepartment || "",
    defaultTask: firstTask,
    defaultWorkModel: (Array.isArray(baseProfile?.tags) ? baseProfile.tags : []).find(Boolean) || "",
    profileCompleted: completed,
    profileCompletedAt: completed ? new Date().toISOString() : "",
    lastProfileCheckDate: "",
    lastProfilePromptDate: "",
    taskEffectiveMonth: firstTask ? monthKey() : "",
    taskVerifiedAt: firstTask ? new Date().toISOString() : "",
    expiresAt: ""
  };
}

function normalizeWorkProfile(value = {}, baseProfile = profile) {
  const seed = defaultWorkProfileSeed(baseProfile);
  const pick = (camel, snake, fallback = "") => {
    if (Object.prototype.hasOwnProperty.call(value, camel)) return value[camel] ?? "";
    if (Object.prototype.hasOwnProperty.call(value, snake)) return value[snake] ?? "";
    return fallback;
  };
  const result = {
    userUuid: pick("userUuid", "user_uuid", seed.userUuid),
    ecpResponsiblePerson: pick("ecpResponsiblePerson", "ecp_responsible_person", seed.ecpResponsiblePerson),
    ecpDepartment: pick("ecpDepartment", "ecp_department", seed.ecpDepartment),
    defaultTask: pick("defaultTask", "default_task", seed.defaultTask),
    defaultWorkModel: pick("defaultWorkModel", "default_work_model", seed.defaultWorkModel),
    profileCompleted: Boolean(value.profileCompleted ?? value.profile_completed ?? seed.profileCompleted),
    profileCompletedAt: pick("profileCompletedAt", "profile_completed_at", seed.profileCompletedAt),
    lastProfileCheckDate: pick("lastProfileCheckDate", "last_profile_check_date", seed.lastProfileCheckDate),
    lastProfilePromptDate: pick("lastProfilePromptDate", "last_profile_prompt_date", seed.lastProfilePromptDate),
    taskEffectiveMonth: pick("taskEffectiveMonth", "task_effective_month", seed.taskEffectiveMonth),
    taskVerifiedAt: pick("taskVerifiedAt", "task_verified_at", seed.taskVerifiedAt),
    expiresAt: pick("expiresAt", "expires_at", seed.expiresAt)
  };
  result.profileCompleted = !!(result.ecpResponsiblePerson && result.ecpDepartment && result.defaultTask);
  if (!result.profileCompleted) result.profileCompletedAt = "";
  if (result.profileCompleted && !result.profileCompletedAt) result.profileCompletedAt = new Date().toISOString();
  if (result.defaultTask && !result.taskEffectiveMonth) result.taskEffectiveMonth = monthKey();
  if (result.defaultTask && !result.taskVerifiedAt) result.taskVerifiedAt = new Date().toISOString();
  return result;
}

function applyWorkProfileToProfile(nextWorkProfile = workProfile) {
  const p = normalizeWorkProfile(nextWorkProfile);
  if (!profile) profile = { role: "採購", tags: [], sources: ["Google Drive", "Gmail", "Calendar", "手動紀錄"], workHours: "09:00~18:00", lunch: "12:00~13:00", sop: "" };
  profile.ecpOwner = p.ecpResponsiblePerson || "";
  profile.ecpDepartment = p.ecpDepartment || "";
  if (p.defaultTask) {
    const tasks = [...new Set([p.defaultTask, ...ecpTasks()].map(x => String(x || "").trim()).filter(Boolean))];
    setEcpTasks(tasks);
  }
  if (p.defaultWorkModel) {
    const models = [...new Set([p.defaultWorkModel, ...workModels()].map(x => String(x || "").trim()).filter(Boolean))];
    setWorkModels(models);
  }
  workProfile = p;
  LocalCache.save("work_profile", workProfile);
  return workProfile;
}

function workProfileFromCloud(row = null, exportSettings = null, ecpTaskRows = [], baseProfile = profile) {
  const firstTask = Array.isArray(ecpTaskRows) ? ecpTaskRows.map(row => row.name).find(Boolean) : "";
  return normalizeWorkProfile({
    ...(row || {}),
    ecp_responsible_person: row?.ecp_responsible_person || exportSettings?.ecp_owner || baseProfile?.ecpOwner || "",
    ecp_department: row?.ecp_department || exportSettings?.ecp_department || baseProfile?.ecpDepartment || "",
    default_task: row?.default_task || firstTask || baseProfile?.ecpTask || "",
    default_work_model: row?.default_work_model || (Array.isArray(baseProfile?.tags) ? baseProfile.tags[0] : "")
  }, baseProfile);
}

function workProfileMissingFields(p = workProfile) {
  const next = normalizeWorkProfile(p);
  const missing = [];
  if (!next.ecpResponsiblePerson) missing.push("ECP 負責人");
  if (!next.ecpDepartment) missing.push("ECP 負責部門");
  if (!next.defaultTask) missing.push("目前工作任務");
  return missing;
}

function isWorkProfileReady(p = workProfile) {
  return workProfileMissingFields(p).length === 0;
}

function syncWorkProfileFromProfile() {
  workProfile = normalizeWorkProfile(workProfile || {}, profile);
  return applyWorkProfileToProfile(workProfile);
}

function profileFromCloud(cloudProfile, exportSettings, workModels, ecpTaskRows, options = {}) {
  const workHours = `${String(cloudProfile?.work_start_time || "09:00").slice(0, 5)}~${String(cloudProfile?.work_end_time || "18:00").slice(0, 5)}`;
  const lunch = `${String(cloudProfile?.lunch_start_time || "12:00").slice(0, 5)}~${String(cloudProfile?.lunch_end_time || "13:00").slice(0, 5)}`;
  const fallbackRole = profile?.role || "採購";
  const fallbackTags = Array.isArray(profile?.tags) && profile.tags.length ? profile.tags : tagsForRole(fallbackRole);
  const fallbackEcpTasks = Array.isArray(profile?.ecpTasks) && profile.ecpTasks.length ? profile.ecpTasks : defaultEcpTasks;
  const cloudWorkModels = Array.isArray(workModels) ? workModels.map(row => row.name).filter(Boolean) : [];
  const cloudEcpTasks = Array.isArray(ecpTaskRows) ? ecpTaskRows.map(row => row.name).filter(Boolean) : [];
  return {
    ...(profile || {}),
    role: roleName(cloudProfile?.role_code || roleCode(fallbackRole)),
    tags: options.workModelsLoaded ? cloudWorkModels : fallbackTags,
    workHours,
    lunch,
    ecpOwner: exportSettings?.ecp_owner || profile?.ecpOwner || "",
    ecpDepartment: exportSettings?.ecp_department || profile?.ecpDepartment || "",
    ecpTasks: options.ecpTasksLoaded ? cloudEcpTasks : fallbackEcpTasks
  };
}

function entryFromCloud(row) {
  const localAt = formatTaipeiDateTimeInput(row.started_at);
  const entryType = eventTypeNameMap[row.event_type || "WORK"] || "work";
  return {
    id: row.legacy_id || row.id,
    cloudId: row.id,
    date: row.work_date || localAt.slice(0, 10),
    at: localAt,
    title: row.title || "",
    note: row.note || "",
    ecpTask: row.ecp_task_name_snapshot || "",
    hours: Number(row.hours || 0),
    entryType,
    type: eventTypeLabel(entryType),
    status: row.status || "completed",
    source: row.source || "manual"
  };
}

function setEntries(nextEntries = []) {
  entries = Array.isArray(nextEntries) ? nextEntries : [];
  normalizeEntries();
  LocalCache.save("entries", entries);
}

function setLibrary(nextLibrary = []) {
  library = Array.isArray(nextLibrary) ? nextLibrary.map(normalizedLibraryItem) : [];
  LocalCache.save("library", library);
}

const DataService = {
  workModelsState: null,
  ecpTasksState: null,
  async init() {
    if (!hasGoogleOAuthSession()) return;
    dataServiceReady = true;
    LocalCache.hydrate();
    await this.prepareMigration();
    if (migrationRequired) return;
    await this.loadAll();
  },
  setStatus(status, error = "") {
    cloudSync = { status, error, lastSyncedAt: status === "synced" ? new Date().toISOString() : cloudSync.lastSyncedAt || "" };
    writeJson("wl_cloud_sync_status_v1", cloudSync);
    refreshCloudSyncStatusDisplay();
  },
  queueAutoSave(scopes = []) {
    const list = Array.isArray(scopes) ? scopes : [scopes];
    list.filter(Boolean).forEach(scope => autoSaveDirtyScopes.add(scope));
    LocalCache.saveAll();
    if (!hasGoogleOAuthSession()) {
      this.setStatus("failed", "尚未登入 Google，無法同步設定");
      return;
    }
    if (dataServiceHydrating || migrationRequired || migrationRunning) {
      this.setStatus("pending");
      return;
    }
    this.setStatus("pending");
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => this.flushAutoSaveQueue(), 2000);
  },
  async flushAutoSaveQueue() {
    if (autoSaveInFlight) return;
    if (!autoSaveDirtyScopes.size) return;
    if (!hasGoogleOAuthSession()) {
      this.setStatus("failed", "尚未登入 Google，無法同步設定");
      return;
    }
    if (dataServiceHydrating || migrationRequired || migrationRunning) {
      if (autoSaveTimer) clearTimeout(autoSaveTimer);
      autoSaveTimer = setTimeout(() => this.flushAutoSaveQueue(), 2000);
      return;
    }
    autoSaveInFlight = true;
    dataServiceReady = true;
    const scopes = new Set(autoSaveDirtyScopes);
    autoSaveDirtyScopes.clear();
    this.setStatus("syncing");
    try {
      if (scopes.has("profile") && profile) {
        syncWorkProfileFromProfile();
        await SupabaseRepository.upsertUserProfile(profile);
        await SupabaseRepository.upsertExportSettings(profile);
        await SupabaseRepository.upsertWorkProfile(workProfile);
      }
      if (scopes.has("workModels")) {
        const rows = await SupabaseRepository.saveWorkModels(workModels(), profile);
        setWorkModels(Array.isArray(rows) ? rows.map(row => row.name).filter(Boolean) : workModels());
      }
      if (scopes.has("ecpTasks")) {
        const rows = await SupabaseRepository.saveEcpTasks(ecpTasks());
        setEcpTasks(Array.isArray(rows) ? rows.map(row => row.name).filter(Boolean) : ecpTasks());
      }
      LocalCache.saveAll();
      this.setStatus(autoSaveDirtyScopes.size ? "pending" : "synced");
      if (autoSaveDirtyScopes.size) {
        if (autoSaveTimer) clearTimeout(autoSaveTimer);
        autoSaveTimer = setTimeout(() => this.flushAutoSaveQueue(), 2000);
      }
    } catch (error) {
      scopes.forEach(scope => autoSaveDirtyScopes.add(scope));
      console.error("Smart Auto Save failed", { error, supabase: error.supabase || null, scopes: [...scopes] });
      this.setStatus("failed", error.message || "Smart Auto Save failed");
    } finally {
      autoSaveInFlight = false;
    }
  },
  retryAutoSave() {
    if (!autoSaveDirtyScopes.size) {
      autoSaveDirtyScopes.add("profile");
      autoSaveDirtyScopes.add("workModels");
      autoSaveDirtyScopes.add("ecpTasks");
    }
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => this.flushAutoSaveQueue(), 0);
  },
  async loadConversation() {
    if (!hasGoogleOAuthSession() || migrationRequired || migrationRunning) return null;
    setConversationSyncStatus("syncing");
    try {
      const bundle = await ConversationRepository.load();
      conversationFoundationNotInitialized = false;
      applyCloudConversation(bundle);
      setConversationSyncStatus("synced");
      return bundle;
    } catch (error) {
      if (isConversationNotInitializedError(error)) {
        conversationFoundationNotInitialized = true;
        setConversationSyncStatus("uninitialized", "Conversation 尚未初始化，聊天目前僅儲存在此瀏覽器。");
        console.warn("Conversation Foundation not initialized", {
          tables: ["assistant_conversations", "assistant_messages", "assistant_conversation_states"],
          setupSql: "docs/supabase/20260711_p4_1_conversation_foundation_schema.sql",
          error
        });
        return null;
      }
      setConversationSyncStatus("failed", error?.supabase?.message || error?.message || "Conversation load failed");
      console.error("Conversation load failed", { error, supabase: error.supabase || null });
      return null;
    }
  },
  async saveConversationMessage(message = {}) {
    if (!hasGoogleOAuthSession() || dataServiceHydrating || migrationRequired || migrationRunning) return null;
    setConversationSyncStatus("pending");
    try {
      const saved = await ConversationRepository.saveMessage(message, assistantChannel());
      conversationFoundationNotInitialized = false;
      setConversationSyncStatus("synced");
      console.info("Conversation message synced", {
        user_uuid: currentUserUuid(),
        conversation_id: saved?.conversation_id || "",
        client_message_id: message.id || "",
        channel: assistantChannel(),
        role: message.role || ""
      });
      return saved;
    } catch (error) {
      if (isConversationNotInitializedError(error)) {
        conversationFoundationNotInitialized = true;
        setConversationSyncStatus("uninitialized", "Conversation 尚未初始化，聊天目前僅儲存在此瀏覽器。");
        console.warn("Conversation message saved locally; Conversation Foundation not initialized", {
          setupSql: "docs/supabase/20260711_p4_1_conversation_foundation_schema.sql",
          error
        });
        return null;
      }
      setConversationSyncStatus("failed", error?.supabase?.message || error?.message || "Conversation message sync failed");
      console.error("Conversation message sync failed", {
        user_uuid: currentUserUuid(),
        conversation_id: "",
        client_message_id: message.id || "",
        channel: assistantChannel(),
        role: message.role || "",
        status: error?.supabase?.status || "",
        code: error?.supabase?.code || error?.code || "",
        message: error?.supabase?.message || error?.message || "",
        details: error?.supabase?.details || error?.details || "",
        hint: error?.supabase?.hint || error?.hint || "",
        error,
        supabase: error.supabase || null
      });
      return null;
    }
  },
  async saveConversationState(command = null) {
    if (!hasGoogleOAuthSession() || dataServiceHydrating || migrationRequired || migrationRunning) return null;
    setConversationSyncStatus("pending");
    try {
      const saved = await ConversationRepository.saveState(command, assistantChannel());
      conversationFoundationNotInitialized = false;
      setConversationSyncStatus("synced");
      return saved;
    } catch (error) {
      if (isConversationNotInitializedError(error)) {
        conversationFoundationNotInitialized = true;
        setConversationSyncStatus("uninitialized", "Conversation 尚未初始化，聊天目前僅儲存在此瀏覽器。");
        console.warn("Conversation state saved locally; Conversation Foundation not initialized", {
          setupSql: "docs/supabase/20260711_p4_1_conversation_foundation_schema.sql",
          error
        });
        return null;
      }
      setConversationSyncStatus("failed", error?.supabase?.message || error?.message || "Conversation state sync failed");
      console.error("Conversation state sync failed", {
        user_uuid: currentUserUuid(),
        channel: assistantChannel(),
        status: error?.supabase?.status || "",
        code: error?.supabase?.code || error?.code || "",
        message: error?.supabase?.message || error?.message || "",
        details: error?.supabase?.details || error?.details || "",
        hint: error?.supabase?.hint || error?.hint || "",
        error,
        supabase: error.supabase || null,
        command
      });
      return null;
    }
  },
  async loadAll() {
    if (!dataServiceReady || dataServiceHydrating) return;
    dataServiceHydrating = true;
    this.setStatus("syncing");
    const errors = [];
    const failedLoads = new Set();
    try {
      const safeLoad = async (label, loader, fallback) => {
        try { return await loader(); }
        catch (error) {
          if (label === "knowledge" && isKnowledgeNotInitializedError(error)) {
            knowledgeFoundationNotInitialized = true;
            failedLoads.add(label);
            console.warn("Knowledge Foundation not initialized", {
              table: "knowledge_sources",
              setupSql: "docs/supabase/20260712_p5_1_knowledge_repository_schema.sql",
              error
            });
            return fallback;
          }
          if (label === "work_profile" && isWorkProfileNotInitializedError(error)) {
            failedLoads.add(label);
            console.warn("Work Profile Foundation not initialized", {
              table: "user_work_profiles",
              setupSql: WORK_PROFILE_SCHEMA_SQL,
              error
            });
            return fallback;
          }
          errors.push(`${label}: ${error.message || error}`);
          failedLoads.add(label);
          console.error(`Cloud Sync ${label} load failed`, error);
          return fallback;
        }
      };
      const cloudProfile = await safeLoad("profile", () => SupabaseRepository.loadUserProfile(), null);
      const exportSettings = await safeLoad("export_settings", () => SupabaseRepository.loadExportSettings(), null);
      const cloudWorkProfile = await safeLoad("work_profile", () => SupabaseRepository.loadWorkProfile(), null);
      const workModelsRows = await safeLoad("work_models", () => SupabaseRepository.loadWorkModels(), []);
      const ecpTaskRows = await safeLoad("ecp_tasks", () => SupabaseRepository.loadEcpTasks(), []);
      const entryRows = await safeLoad("entries", () => SupabaseRepository.loadEntries(selectedMonth), []);
      const knowledgeRows = await safeLoad("knowledge", () => KnowledgeRepository.loadSources(), []);
      await this.loadConversation();
      if (cloudProfile || exportSettings || !failedLoads.has("work_models") || !failedLoads.has("ecp_tasks")) {
        profile = profileFromCloud(cloudProfile, exportSettings, workModelsRows || [], ecpTaskRows || [], {
          workModelsLoaded: !failedLoads.has("work_models"),
          ecpTasksLoaded: !failedLoads.has("ecp_tasks")
        });
        this.workModelsState = Array.isArray(profile?.tags) ? [...profile.tags] : [];
        this.ecpTasksState = Array.isArray(profile?.ecpTasks) ? [...profile.ecpTasks] : [];
      }
      workProfile = workProfileFromCloud(cloudWorkProfile, exportSettings, ecpTaskRows || [], profile);
      applyWorkProfileToProfile(workProfile);
      if (!failedLoads.has("entries")) setEntries(Array.isArray(entryRows) ? entryRows.map(entryFromCloud) : []);
      if (!failedLoads.has("knowledge")) {
        knowledgeFoundationNotInitialized = false;
        setLibrary(Array.isArray(knowledgeRows) ? knowledgeRows.map(knowledgeFromCloud) : []);
      }
      LocalCache.saveAll();
      if (errors.length) this.setStatus("failed", errors.join(" | "));
      else if (knowledgeFoundationNotInitialized) this.setStatus("knowledge_uninitialized", "Knowledge Library 尚未初始化");
      else this.setStatus("synced");
    } catch (error) {
      console.error("Cloud Sync load failed", error);
      this.setStatus("failed", error.message || "Cloud Sync failed");
    } finally {
      dataServiceHydrating = false;
    }
  },
  async prepareMigration() {
    const inventory = legacyInventory();
    migrationRequired = false;
    migrationPreview = null;
    if (!inventory.hasCoreData) return false;
    try {
      const existing = await SupabaseRepository.loadMigration();
      if (existing?.completed_at) return false;
      const hasCloudData = await SupabaseRepository.hasCloudCoreData();
      if (hasCloudData) {
        console.info("Cloud Sync: cloud data exists; skip legacy migration prompt and use Supabase as source of truth");
        return false;
      }
      migrationPreview = inventory;
      migrationRequired = true;
      migrationError = "";
      this.setStatus("migration_required");
      return true;
    } catch (error) {
      console.error("Cloud Sync migration check failed", error);
      migrationError = error.message || "Migration check failed";
      this.setStatus("failed", migrationError);
      return false;
    }
  },
  async runMigration() {
    if (!migrationPreview || migrationRunning) return;
    migrationRunning = true;
    migrationError = "";
    this.setStatus("migrating");
    try {
      entries = readJson("wl_entries", []);
      profile = readJson("wl_profile", profile);
      normalizeEntries();
      if (profile) {
        syncWorkProfileFromProfile();
        await SupabaseRepository.upsertUserProfile(profile);
        await SupabaseRepository.upsertExportSettings(profile);
        await SupabaseRepository.upsertWorkProfile(workProfile);
        await SupabaseRepository.saveWorkModels(workModels(), profile);
        await SupabaseRepository.saveEcpTasks(ecpTasks());
      }
      for (const entry of entries.filter(e => e.status !== "deleted")) {
        const saved = await SupabaseRepository.saveEntry(entry);
        if (saved?.id) entry.cloudId = saved.id;
      }
      const sourceHash = await sha256Text(JSON.stringify({
        entries: readJson("wl_entries", []),
        profile: readJson("wl_profile", null),
        key: CLOUD_MIGRATION_KEY
      }));
      await SupabaseRepository.completeMigration(sourceHash);
      migrationRequired = false;
      migrationPreview = null;
      await this.loadAll();
      LocalCache.saveAll();
      this.setStatus("synced");
      toast("Cloud Sync Migration 完成");
    } catch (error) {
      console.error("Cloud Sync migration failed", error);
      migrationError = error.message || "Migration failed";
      this.setStatus("failed", migrationError);
      toast("Migration 失敗，legacy data 已保留");
    } finally {
      migrationRunning = false;
      render();
    }
  },
  async syncAll() {
    if (!dataServiceReady || dataServiceHydrating || dataServiceSyncing || !hasGoogleOAuthSession()) return;
    dataServiceSyncing = true;
    this.setStatus("syncing");
    try {
      if (profile) {
        syncWorkProfileFromProfile();
        await SupabaseRepository.upsertUserProfile(profile);
        await SupabaseRepository.upsertExportSettings(profile);
        await SupabaseRepository.upsertWorkProfile(workProfile);
        await SupabaseRepository.saveWorkModels(workModels(), profile);
        await SupabaseRepository.saveEcpTasks(ecpTasks());
      }
      for (const entry of entries.filter(e => e.status !== "deleted")) {
        const saved = await SupabaseRepository.saveEntry(entry);
        if (saved?.id) entry.cloudId = saved.id;
      }
      LocalCache.saveAll();
      this.setStatus("synced");
    } catch (error) {
      console.error("Cloud Sync save failed", error);
      this.setStatus("failed", error.message || "Cloud Sync failed");
    } finally {
      dataServiceSyncing = false;
    }
  },
  async deleteEntry(entry) {
    if (!dataServiceReady || !hasGoogleOAuthSession()) throw new Error("Cloud Sync 尚未就緒");
    if (dataServiceHydrating || migrationRequired || migrationRunning) throw new Error("Cloud Sync 正在初始化");
    this.setStatus("syncing");
    try {
      await SupabaseRepository.deleteEntry(entry);
      setEntries(entries.filter(e => e.id !== entry.id));
      this.setStatus("synced");
    } catch (error) {
      console.error("Cloud Sync delete failed", { error, supabase: error.supabase || null, entry });
      this.setStatus("failed", error.message || "Cloud Sync delete failed");
      throw error;
    }
  },
  async saveEntry(item) {
    if (!dataServiceReady || !hasGoogleOAuthSession()) throw new Error("Cloud Sync 尚未就緒");
    if (dataServiceHydrating || migrationRequired || migrationRunning) throw new Error("Cloud Sync 正在初始化");
    this.setStatus("syncing");
    try {
      const saved = await SupabaseRepository.saveEntry(item);
      const cloudEntry = saved ? entryFromCloud(saved) : item;
      const nextEntries = entries.filter(e => e.id !== item.id && e.cloudId !== cloudEntry.cloudId);
      nextEntries.push({ ...item, ...cloudEntry, id: item.id || cloudEntry.id, cloudId: cloudEntry.cloudId || saved?.id });
      setEntries(nextEntries);
      selected = safeDate(item.at);
      selectedMonth = monthKey(selected);
      this.setStatus("synced");
      return nextEntries.find(e => e.id === (item.id || cloudEntry.id));
    } catch (error) {
      console.error("Cloud Sync save entry failed", { error, supabase: error.supabase || null, item });
      this.setStatus("failed", error.message || "Entry sync failed");
      throw error;
    }
  },
  async loadMonthEntries(month = selectedMonth) {
    if (!hasGoogleOAuthSession() || dataServiceHydrating || migrationRequired || migrationRunning) return;
    this.setStatus("syncing");
    try {
      const entryRows = await SupabaseRepository.loadEntries(month);
      setEntries(Array.isArray(entryRows) ? entryRows.map(entryFromCloud) : []);
      LocalCache.saveAll();
      this.setStatus("synced");
    } catch (error) {
      console.error("Cloud Sync month entries load failed", { error, month });
      this.setStatus("failed", error.message || "Month entries sync failed");
    }
  },
  async saveWorkModelsOnly(options = {}) {
    try {
      LocalCache.saveAll();
      if (hasGoogleOAuthSession() && !dataServiceHydrating && !migrationRunning) {
        dataServiceReady = true;
        this.setStatus("syncing");
        const rows = await SupabaseRepository.saveWorkModels(workModels(), profile);
        setWorkModels(Array.isArray(rows) ? rows.map(row => row.name).filter(Boolean) : workModels());
        LocalCache.saveAll();
        this.setStatus("synced");
      } else {
        const reason = !hasGoogleOAuthSession() ? "尚未登入 Google" : "Cloud Sync 正在初始化";
        console.warn("Work model saved to cache; cloud sync deferred", { reason, models: workModels() });
        if (options.requireCloud) throw new Error(reason);
      }
    } catch (error) {
      console.error("Save work models failed", { error, supabase: error.supabase || null, models: workModels() });
      this.setStatus("failed", error.message || "Work model sync failed");
      if (options.requireCloud) throw error;
    }
  },
  async saveEcpTasksOnly(options = {}) {
    try {
      LocalCache.saveAll();
      if (hasGoogleOAuthSession() && !dataServiceHydrating && !migrationRunning) {
        dataServiceReady = true;
        this.setStatus("syncing");
        const rows = await SupabaseRepository.saveEcpTasks(ecpTasks());
        setEcpTasks(Array.isArray(rows) ? rows.map(row => row.name).filter(Boolean) : ecpTasks());
        LocalCache.saveAll();
        this.setStatus("synced");
      } else {
        const reason = !hasGoogleOAuthSession() ? "尚未登入 Google" : "Cloud Sync 正在初始化";
        console.warn("ECP tasks saved to cache; cloud sync deferred", { reason, tasks: ecpTasks() });
        if (options.requireCloud) throw new Error(reason);
      }
    } catch (error) {
      console.error("Save ECP tasks failed", { error, supabase: error.supabase || null, tasks: ecpTasks() });
      this.setStatus("failed", error.message || "ECP task sync failed");
      if (options.requireCloud) throw error;
    }
  },
  async saveProfileSettingsOnly(options = {}) {
    try {
      LocalCache.saveAll();
      if (hasGoogleOAuthSession() && !dataServiceHydrating && !migrationRunning && profile) {
        dataServiceReady = true;
        this.setStatus("syncing");
        syncWorkProfileFromProfile();
        await SupabaseRepository.upsertUserProfile(profile);
        await SupabaseRepository.upsertExportSettings(profile);
        await SupabaseRepository.upsertWorkProfile(workProfile);
        LocalCache.saveAll();
        this.setStatus("synced");
      } else {
        const reason = !hasGoogleOAuthSession() ? "尚未登入 Google" : "Cloud Sync 正在初始化";
        console.warn("Profile settings saved to cache; cloud sync deferred", { reason });
        if (options.requireCloud) throw new Error(reason);
      }
    } catch (error) {
      console.error("Save profile settings failed", { error, supabase: error.supabase || null });
      this.setStatus("failed", error.message || "Profile sync failed");
      if (options.requireCloud) throw error;
    }
  },
  async saveKnowledgeSource(item, options = {}) {
    const normalized = normalizedLibraryItem(item);
    try {
      if (hasGoogleOAuthSession() && !dataServiceHydrating && !migrationRunning) {
        dataServiceReady = true;
        this.setStatus("syncing");
        const saved = await KnowledgeRepository.saveSource(normalized, options.file || null);
        const cloudItem = knowledgeFromCloud(saved);
        setLibrary([cloudItem, ...library.filter(x => x.id !== normalized.id && x.cloudId !== cloudItem.cloudId)]);
        LocalCache.saveAll();
        this.setStatus("synced");
        return cloudItem;
      }
      throw new Error("Cloud Sync 尚未就緒，Knowledge Source 不可只儲存在本機");
    } catch (error) {
      console.error("Save knowledge source failed", { error, supabase: error.supabase || null, item: normalized });
      if (isKnowledgeNotInitializedError(error)) {
        knowledgeFoundationNotInitialized = true;
        this.setStatus("knowledge_uninitialized", "Knowledge Library 尚未初始化");
        throw new Error("Knowledge Library 尚未初始化，請先執行 P5 Knowledge Repository schema SQL");
      }
      this.setStatus("failed", error.message || "Knowledge sync failed");
      throw error;
    }
  },
  async deleteKnowledgeSource(item, options = {}) {
    const normalized = normalizedLibraryItem(item);
    try {
      if (hasGoogleOAuthSession() && !dataServiceHydrating && !migrationRunning) {
        dataServiceReady = true;
        this.setStatus("syncing");
        await KnowledgeRepository.deleteSource(normalized);
      } else if (options.requireCloud) {
        throw new Error("Cloud Sync 尚未就緒");
      }
      setLibrary(library.filter(x => x.id !== normalized.id));
      LocalCache.saveAll();
      this.setStatus("synced");
      return true;
    } catch (error) {
      console.error("Delete knowledge source failed", { error, supabase: error.supabase || null, item: normalized });
      if (isKnowledgeNotInitializedError(error)) {
        knowledgeFoundationNotInitialized = true;
        this.setStatus("knowledge_uninitialized", "Knowledge Library 尚未初始化");
        if (options.requireCloud) throw new Error("Knowledge Library 尚未初始化，請先執行 knowledge foundation schema SQL");
        return false;
      }
      this.setStatus("failed", error.message || "Knowledge delete failed");
      if (options.requireCloud) throw error;
      return false;
    }
  }
};

function mergeEntries(localEntries, cloudEntries) {
  const map = new Map();
  localEntries.forEach(entry => map.set(entry.id, entry));
  cloudEntries.forEach(entry => map.set(entry.id, { ...(map.get(entry.id) || {}), ...entry }));
  return [...map.values()].sort((a, b) => new Date(a.at) - new Date(b.at));
}

function getStoredAuthSession() {
  return readJson(AUTH_SESSION_KEY, null);
}

function setStoredAuthSession(value) {
  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(value));
  localStorage.removeItem("wl_google_auth_session_v1");
}

async function refreshAuthSession(force = false) {
  const stored = getStoredAuthSession();
  const refreshToken = stored?.refresh_token || session?.refresh_token || "";
  if (!force && !accessTokenNeedsRefresh()) return stored || session;
  if (!refreshToken) return null;
  const res = await fetch(`${AUTH_CONFIG.supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ refresh_token: refreshToken })
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    let parsedBody = null;
    try { parsedBody = body ? JSON.parse(body) : null; } catch { parsedBody = null; }
    console.error("Supabase refresh session failed", {
      status: res.status,
      statusText: res.statusText,
      code: parsedBody?.code || "",
      message: parsedBody?.message || body || res.statusText,
      details: parsedBody?.details || "",
      hint: parsedBody?.hint || "",
      body,
      has_refresh_token: !!refreshToken
    });
    return null;
  }
  const data = await res.json();
  const sessionValue = {
    access_token: data.access_token,
    refresh_token: data.refresh_token || refreshToken,
    token_type: data.token_type || "bearer",
    expires_in: Number(data.expires_in || 3600),
    expires_at: Date.now() + Number(data.expires_in || 3600) * 1000
  };
  setStoredAuthSession(sessionValue);
  if (session?.provider === "google-oauth") {
    session = {
      ...session,
      access_token: sessionValue.access_token,
      refresh_token: sessionValue.refresh_token,
      token_type: sessionValue.token_type,
      expires_in: sessionValue.expires_in,
      expires_at: sessionValue.expires_at
    };
    persistAiOsSessionOnly();
  }
  return sessionValue;
}

async function ensureFreshAuthSession(force = false) {
  if (!currentUserUuid() && !session?.email) return null;
  if (!force && !accessTokenNeedsRefresh()) return getStoredAuthSession() || session;
  return refreshAuthSession(force);
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
  return captureHashAuthSession() || await exchangeCodeForSession() || await refreshAuthSession(false) || getStoredAuthSession();
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
  let activeAuthSession = authSession;
  let res = await fetch(`${AUTH_CONFIG.supabaseUrl}/auth/v1/user`, { headers: authHeaders(activeAuthSession.access_token) });
  if (res.status === 401) {
    const refreshed = await refreshAuthSession(true);
    if (refreshed?.access_token) {
      activeAuthSession = refreshed;
      res = await fetch(`${AUTH_CONFIG.supabaseUrl}/auth/v1/user`, { headers: authHeaders(activeAuthSession.access_token) });
    }
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    recordOAuthDebug("auth_user_fetch_failed", { status: res.status, body });
    clearStoredAuthSession();
    return null;
  }
  const user = await res.json();
  return { user, authSession: activeAuthSession };
}

function hasGoogleOAuthSession() {
  return session?.provider === "google-oauth" && !!session.email && !!currentUserUuid() && !!currentAccessToken();
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
    const normalizedEntryType = normalizeEntryType(next.entryType || next.type || "work");
    if (next.entryType !== normalizedEntryType) { next.entryType = normalizedEntryType; changed = true; }
    const entryTypeName = eventTypeLabel(normalizedEntryType);
    if (next.type !== entryTypeName) { next.type = entryTypeName; changed = true; }
    if (next.note == null) {
      next.note = next.task && next.task !== next.title ? next.task : "";
      changed = true;
    }
    if (next.task != null) { delete next.task; changed = true; }
    if (next.ecpTask == null) { next.ecpTask = ""; changed = true; }
    return next;
  });
  library = library.map(item => item.id ? item : { ...item, id: uid("lib") });
  if (changed) saveAll();
}

function validateEntry(item) {
  if (!item.title) return "請輸入工作描述";
  if (!item.at || Number.isNaN(new Date(item.at).getTime())) return "請選擇正確時間";
  if (!item.hours || item.hours <= 0) return "請選擇工時";
  if (item.hours > 8) return "單筆工時不可超過 8 小時";
  const sameDayHours = entries
    .filter(e => e.date === item.date && e.id !== item.id)
    .reduce((s, e) => s + Number(e.hours || 0), 0);
  if (sameDayHours + Number(item.hours) > 12) return "同日工時已超過 12 小時，請確認是否輸入錯誤";
  return "";
}

function saveAll(options = {}) {
  saveLocalSnapshot();
}

function saveLocalSnapshot() {
  localStorage.setItem("wl_profile", JSON.stringify(profile));
  localStorage.setItem("wl_work_profile", JSON.stringify(workProfile));
  localStorage.setItem("wl_feedback", JSON.stringify(feedback));
  localStorage.setItem(AI_OS_SESSION_KEY, JSON.stringify(session));
  localStorage.removeItem("wl_session");
  // P5: wl_library remains legacy backup only. Official Knowledge cache is user-scoped LocalCache.
  localStorage.setItem(ACTIVE_MODULE_KEY, activeModule);
  localStorage.setItem(OS_OPEN_TABS_KEY, JSON.stringify(openTabs));
  localStorage.setItem(OS_ACTIVE_WORKSPACE_KEY, activeWorkspace);
  localStorage.setItem(OS_RECENT_WORKSPACES_KEY, JSON.stringify(recentWorkspaces));
  hasOsShellState = true;
  localStorage.setItem("wl_view", view);
  localStorage.setItem("wl_selected", selected.toISOString());
  localStorage.setItem("wl_selected_month", selectedMonth);
  LocalCache.saveAll();
}

function toast(t) {
  const e = document.createElement("div");
  e.className = "toast";
  e.textContent = t;
  document.body.appendChild(e);
  setTimeout(() => e.classList.add("show"), 10);
  setTimeout(() => { e.classList.remove("show"); setTimeout(() => e.remove(), 220); }, 1800);
}

const BUSINESS_TIME_ZONE = "Asia/Taipei";
const BUSINESS_UTC_OFFSET = "+08:00";

function parseTaipeiBusinessDateTime(value, fallback = new Date()) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? fallback : new Date(value.getTime());
  const text = String(value || "").trim();
  const localMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  const normalized = localMatch
    ? `${localMatch[1]}-${localMatch[2]}-${localMatch[3]}T${localMatch[4]}:${localMatch[5]}:${localMatch[6] || "00"}${BUSINESS_UTC_OFFSET}`
    : text;
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

function taipeiDateTimeParts(value) {
  const d = parseTaipeiBusinessDateTime(value);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false
  }).formatToParts(d);
  return Object.fromEntries(parts.filter(part => part.type !== "literal").map(part => [part.type, part.value]));
}

function formatTaipeiDateTimeInput(value) {
  if (!value) return "";
  const p = taipeiDateTimeParts(value);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

function safeDate(value, fallback = new Date()) {
  return parseTaipeiBusinessDateTime(value, fallback);
}

function key(d = selected) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function monthKey(d = selected) {
  if (typeof d === "string") return d.slice(0, 7);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function selectedMonthDate(day = 1) {
  const [year, month] = selectedMonth.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day);
}

async function setSelectedMonth(month, day = 1) {
  selectedMonth = monthKey(month);
  selected = selectedMonthDate(day);
  saveAll();
  await DataService.loadMonthEntries(selectedMonth);
  render();
}

function fmt(dt) {
  const p = taipeiDateTimeParts(dt);
  return `${p.year}/${p.month}/${p.day} ${p.hour}:${p.minute}`;
}

function dayEntries() {
  return entries.filter(e => e.date === key()).sort((a, b) => new Date(a.at) - new Date(b.at));
}

function monthEntries() {
  return entries.filter(e => String(e.date || "").startsWith(selectedMonth)).sort((a, b) => new Date(a.at) - new Date(b.at));
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
  if (Array.isArray(DataService.workModelsState)) return [...new Set(DataService.workModelsState.map(x => String(x).trim()).filter(Boolean))];
  const models = Array.isArray(profile?.tags) && profile.tags.length ? profile.tags : tagsForRole(profile?.role || "採購");
  return [...new Set(models.map(x => String(x).trim()).filter(Boolean))];
}

function setWorkModels(models = []) {
  if (!profile) profile = { role: "採購", tags: [], sources: ["Google Drive", "Gmail", "Calendar", "手動紀錄"], workHours: "09:00~18:00", lunch: "12:00~13:00", sop: "目前沒有 SOP，先用職務模型" };
  DataService.workModelsState = [...new Set((models || []).map(x => String(x).trim()).filter(Boolean))];
  profile.tags = [...DataService.workModelsState];
  LocalCache.save("work_models", profile.tags);
  return profile.tags;
}

function ecpTasks() {
  if (Array.isArray(DataService.ecpTasksState)) return [...new Set(DataService.ecpTasksState.map(x => String(x).trim()).filter(Boolean))];
  const source = Array.isArray(profile?.ecpTasks) && profile.ecpTasks.length ? profile.ecpTasks : (profile?.ecpTask ? [profile.ecpTask] : defaultEcpTasks);
  return [...new Set(source.map(x => String(x).trim()).filter(Boolean))];
}

function setEcpTasks(tasks = []) {
  if (!profile) profile = { role: "採購", tags: [], sources: ["Google Drive", "Gmail", "Calendar", "手動紀錄"], workHours: "09:00~18:00", lunch: "12:00~13:00", sop: "目前沒有 SOP，先用職務模型" };
  DataService.ecpTasksState = [...new Set((tasks || []).map(x => String(x).trim()).filter(Boolean))];
  profile.ecpTasks = [...DataService.ecpTasksState];
  profile.ecpTask = "";
  LocalCache.save("ecp_tasks", profile.ecpTasks);
  return profile.ecpTasks;
}

function ecpTaskOptions(selectedTask = "") {
  const tasks = ecpTasks();
  return `<option value="">不指定 ECP 任務</option>${tasks.map(task => `<option value="${escapeHtml(task)}" ${task === selectedTask ? "selected" : ""}>${escapeHtml(task)}</option>`).join("")}<option value="__add__">＋新增 ECP 任務</option>`;
}

function ecpTaskList(tasks = ecpTasks()) {
  return `<div class="ecp-task-list" id="ecpTaskList">${tasks.map(task => `<div class="ecp-task-item"><span>${escapeHtml(task)}</span><button class="btn2 danger" type="button" data-remove-ecp-task="${escapeHtml(task)}">移除</button></div>`).join("")}</div>`;
}

function firstEcpTaskFor(title = "") {
  const tasks = ecpTasks();
  return tasks.find(task => title && title.includes(task)) || tasks[0] || "";
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
  const models = workModels();
  if (!models.includes(name)) setWorkModels([...models, name]);
  return true;
}

async function saveWorkModel(model, options = {}) {
  const name = String(model || "").trim();
  if (!name) return false;
  addWorkModel(name);
  saveAll({ skipSync: true });
  await DataService.saveWorkModelsOnly(options);
  return true;
}

const addWorkDescription = saveWorkModel;

function googleConnectionLabel() {
  return "⚪ 尚未連接";
}

function cloudSyncLabel() {
  if (cloudSync.status === "synced") return "🟢 已同步";
  if (cloudSync.status === "syncing") return "🟡 同步中";
  if (cloudSync.status === "pending") return "🔄 尚未同步";
  if (cloudSync.status === "knowledge_uninitialized") return "🟡 Knowledge 未初始化";
  if (cloudSync.status === "migration_required") return "🟡 等待資料搬移";
  if (cloudSync.status === "migrating") return "🟡 資料搬移中";
  if (cloudSync.status === "failed") return "🔴 同步失敗";
  return "⚪ 尚未同步";
}

function cloudSyncDetail() {
  if (cloudSync.status === "failed") return cloudSync.error || "請稍後再試";
  if (cloudSync.status === "pending") return "等待自動同步";
  if (cloudSync.status === "syncing") return "同步中...";
  if (cloudSync.status === "knowledge_uninitialized") return "請先建立 Knowledge Database 與 Storage Bucket";
  if (cloudSync.status === "migration_required") return "請先確認 Migration Preview";
  if (cloudSync.status === "migrating") return "正在搬移 RC3.3 本機資料";
  if (!cloudSync.lastSyncedAt) return "等待 Cloud Sync";
  return `最後同步：${fmt(cloudSync.lastSyncedAt)}`;
}

function conversationSyncLabel() {
  if (conversationSync.status === "synced") return "💬 Conversation 已同步";
  if (conversationSync.status === "syncing") return "💬 Conversation 同步中";
  if (conversationSync.status === "pending") return "💬 Conversation 等待同步";
  if (conversationSync.status === "uninitialized") return "💬 Conversation 尚未初始化";
  if (conversationSync.status === "failed") return "💬 Conversation 同步失敗";
  return "💬 Conversation 尚未同步";
}

function conversationSyncDetail() {
  if (conversationSync.status === "uninitialized") return "聊天目前僅儲存在此瀏覽器";
  if (conversationSync.status === "failed") return conversationSync.error || "請檢查 Conversation Cloud";
  if (conversationSync.status === "pending") return "等待寫入 Supabase";
  if (conversationSync.status === "syncing") return "正在讀取 / 寫入 Conversation";
  if (!conversationSync.lastSyncedAt) return "等待 Conversation Cloud";
  return `最後同步：${fmt(conversationSync.lastSyncedAt)}`;
}

function refreshCloudSyncStatusDisplay() {
  const box = document.getElementById("developerCloudSyncStatus");
  if (!box) return;
  box.innerHTML = `<div>${escapeHtml(cloudSyncLabel())}</div><div>${escapeHtml(cloudSyncDetail())}</div><div>${escapeHtml(conversationSyncLabel())}</div><div>${escapeHtml(conversationSyncDetail())}</div>`;
}

function isKnowledgeNotInitializedError(error) {
  const text = `${error?.supabase?.status || ""} ${error?.supabase?.message || ""} ${error?.supabase?.body || ""} ${error?.message || ""}`;
  return (/404/.test(text) && /knowledge_sources|knowledge_units/i.test(text)) || /Bucket not found|knowledge-sources/i.test(text);
}

function isConversationNotInitializedError(error) {
  const text = `${error?.supabase?.status || ""} ${error?.supabase?.message || ""} ${error?.supabase?.body || ""} ${error?.message || ""}`;
  return /404/.test(text) && /assistant_(conversations|messages|conversation_states)/i.test(text);
}

function isWorkProfileNotInitializedError(error) {
  const text = `${error?.supabase?.status || ""} ${error?.supabase?.message || ""} ${error?.supabase?.body || ""} ${error?.message || ""}`;
  return /404/.test(text) && /user_work_profiles/i.test(text);
}

function minutesFromTime(value = "09:00") {
  const [h = 9, m = 0] = String(value || "09:00").slice(0, 5).split(":").map(Number);
  return h * 60 + (m || 0);
}

function timeFromMinutes(total = 540) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function profileWorkSchedule() {
  const work = parseWorkTimeRange(profile?.workHours || "09:00~18:00");
  const lunch = parseWorkTimeRange(profile?.lunch || "12:00~13:00");
  return {
    workStart: minutesFromTime(work.start || "09:00"),
    workEnd: minutesFromTime(work.end || "18:00"),
    lunchStart: minutesFromTime(lunch.start || "12:00"),
    lunchEnd: minutesFromTime(lunch.end || "13:00")
  };
}

function normalizeStartMinutes(minutes, durationHours = 1) {
  const s = profileWorkSchedule();
  let start = Math.max(Number(minutes || 0), s.workStart);
  return start;
}

function entryStartMinutes(entry) {
  const time = String(entry?.at || "").slice(11, 16);
  return minutesFromTime(time || "09:00");
}

function entryEndMinutes(entry) {
  return entryStartMinutes(entry) + Math.round(Number(entry?.hours || 0) * 60);
}

function requiresOvertimeConfirmation(entry) {
  return entryEndMinutes(entry) > profileWorkSchedule().workEnd;
}

function confirmOvertimeEntry(entry) {
  if (!requiresOvertimeConfirmation(entry)) return true;
  const s = profileWorkSchedule();
  return confirm(`此筆工時預計結束於 ${timeFromMinutes(entryEndMinutes(entry))}，已超過下班時間 ${timeFromMinutes(s.workEnd)}。是否仍要儲存？`);
}

function mergeTimeIntervals(intervals = []) {
  const sorted = intervals
    .filter(x => Number.isFinite(x.start) && Number.isFinite(x.end) && x.end > x.start)
    .sort((a, b) => a.start - b.start || a.end - b.end);
  const merged = [];
  for (const interval of sorted) {
    const last = merged[merged.length - 1];
    if (!last || interval.start > last.end) merged.push({ ...interval });
    else last.end = Math.max(last.end, interval.end);
  }
  return merged;
}

function availableStartMinutes(dateKey = key(), durationHours = 1, excludeId = null, reserved = []) {
  const s = profileWorkSchedule();
  const duration = Math.max(1, Math.round(Number(durationHours || 1) * 60));
  const occupied = entries
    .filter(e => e.date === dateKey && e.id !== excludeId && e.status !== "deleted")
    .map(e => {
      const start = entryStartMinutes(e);
      return { start, end: start + Math.round(Number(e.hours || 0) * 60) };
    });
  occupied.push(...reserved.map(x => ({ start: x.start, end: x.end })));
  const merged = mergeTimeIntervals(occupied);

  let candidate = s.workStart;
  for (const interval of merged) {
    if (interval.end <= candidate) continue;
    if (interval.start > candidate) {
      if (candidate + duration <= Math.min(interval.start, s.workEnd)) return candidate;
      candidate = interval.end;
    } else if (interval.end > candidate) {
      candidate = interval.end;
    }
    if (candidate >= s.workEnd) break;
  }
  if (candidate + duration <= s.workEnd) return candidate;

  const lastEnd = occupied.reduce((max, interval) => Math.max(max, interval.end), s.workStart);
  return normalizeStartMinutes(lastEnd, durationHours);
}

function nextAvailableStart(dateKey = key(), durationHours = 1, excludeId = null, reserved = []) {
  const start = availableStartMinutes(dateKey, durationHours, excludeId, reserved);
  return `${dateKey}T${timeFromMinutes(start)}`;
}

function nextStart() {
  return nextAvailableStart(key(), 1);
}

function captureDefaultStart(durationHours = 1) {
  return nextAvailableStart(key(), durationHours, editingEntryId);
}

function defaultEcpTaskName(title = "") {
  return firstEcpTaskFor(title) || ecpTasks()[0] || "";
}

function assistantGreeting() {
  return { role: "assistant", text: "您好，我是諸葛工時助手。今天想完成什麼？" };
}

function conversationKey() {
  return scopedLocalKey(WORKLOG_CHAT_KEY);
}

function conversationPendingKey() {
  return scopedLocalKey(WORKLOG_CHAT_PENDING_KEY);
}

function assistantWelcomeKey() {
  return scopedLocalKey(ZHUGE_ASSISTANT_WELCOME_KEY);
}

function assistantOpenKey() {
  return scopedLocalKey(ZHUGE_ASSISTANT_OPEN_KEY);
}

function isStandaloneChatRoute() {
  return /\/chat\/?$/.test(location.pathname) || new URLSearchParams(location.search).get("chat") === "1";
}

function appHomeUrl() {
  if (isStandaloneChatRoute()) return location.href.replace(/\/chat\/?(\?.*)?$/, "/").replace(/[?&]chat=1/, "");
  return WEB_APP_URL;
}

function standaloneChatUrl() {
  if (/\/chat\/?$/.test(location.pathname)) return location.href;
  const base = location.href.replace(/[?#].*$/, "").replace(/\/(index\.html)?$/, "/");
  return `${base}chat/`;
}

function assistantChannel() {
  if (IS_EXTENSION_ENTRY) return "chrome";
  return window.matchMedia?.("(max-width: 767px)")?.matches ? "mobile" : "web";
}

function isAssistantOpen() {
  return localStorage.getItem(assistantOpenKey()) === "1";
}

function hasSeenAssistantWelcome() {
  return localStorage.getItem(assistantWelcomeKey()) === "1" || hasConversationStarted();
}

function hasConversationStarted() {
  const cached = Array.isArray(conversationMessagesState) ? conversationMessagesState : readJson(conversationKey(), []);
  return (Array.isArray(cached) && cached.length > 0) || !!getAssistantPendingCommand();
}

function conversationMessages() {
  if (!Array.isArray(conversationMessagesState)) {
    const cached = readJson(conversationKey(), []);
    conversationMessagesState = Array.isArray(cached) ? cached : [];
  }
  return conversationMessagesState.length ? conversationMessagesState : [assistantGreeting()];
}

function saveConversationMessages(messages = []) {
  conversationMessagesState = Array.isArray(messages) ? messages.slice(-50) : [];
  writeJson(conversationKey(), conversationMessagesState);
}

function messageFromCloud(row = {}) {
  return {
    id: row.client_message_id || row.id || uid("msg"),
    role: row.role || "assistant",
    text: row.content || "",
    at: row.created_at || new Date().toISOString(),
    card: row.card || null,
    syncStatus: "synced"
  };
}

function applyCloudConversation(bundle = {}) {
  const rows = Array.isArray(bundle.messages) ? bundle.messages : [];
  const cloudMessages = rows.map(messageFromCloud);
  const cloudIds = new Set(cloudMessages.map(msg => msg.id));
  const localMessages = Array.isArray(conversationMessagesState) ? conversationMessagesState : readJson(conversationKey(), []);
  const pendingLocal = (Array.isArray(localMessages) ? localMessages : [])
    .filter(msg => ["pending_sync", "failed"].includes(msg?.syncStatus) && !cloudIds.has(msg.id));
  saveConversationMessages([...cloudMessages, ...pendingLocal].sort((a, b) => new Date(a.at || 0) - new Date(b.at || 0)));
  conversationPendingState = bundle.state?.pending_action || null;
  if (conversationPendingState) writeJson(conversationPendingKey(), conversationPendingState);
  else localStorage.removeItem(conversationPendingKey());
}

function markConversationMessageSyncStatus(id, syncStatus) {
  if (!id) return;
  const next = conversationMessages().map(msg => msg.id === id ? { ...msg, syncStatus } : msg);
  saveConversationMessages(next);
}

function addConversationMessage(role, text, meta = {}) {
  const messages = conversationMessages();
  const message = { id: uid("msg"), role, text: String(text || ""), at: new Date().toISOString(), syncStatus: "pending_sync", ...meta };
  messages.push(message);
  saveConversationMessages(messages);
  DataService.saveConversationMessage(message)
    .then(saved => markConversationMessageSyncStatus(message.id, saved ? "synced" : "failed"))
    .catch(error => {
      markConversationMessageSyncStatus(message.id, "failed");
      console.warn("Conversation message cloud sync deferred", { error, supabase: error.supabase || null });
    });
}

function removeConversationMessage(id) {
  if (!id) return;
  saveConversationMessages(conversationMessages().filter(msg => msg.id !== id));
}

function assistantThinkingMessage() {
  return { id: uid("thinking"), transient: true, role: "assistant", text: "諸葛先生正在整理工時...", at: new Date().toISOString() };
}

function addAssistantThinkingMessage() {
  const message = assistantThinkingMessage();
  const messages = conversationMessages();
  messages.push(message);
  saveConversationMessages(messages);
  return message.id;
}

function scrollAssistantToBottom() {
  requestAnimationFrame(() => {
    const thread = document.getElementById("assistantThread");
    if (thread) thread.scrollTop = thread.scrollHeight;
  });
}

function getAssistantPendingCommand() {
  if (conversationPendingState === undefined) conversationPendingState = readJson(conversationPendingKey(), null);
  return conversationPendingState || null;
}

function setAssistantPendingCommand(command = null) {
  if (!command) {
    conversationPendingState = null;
    localStorage.removeItem(conversationPendingKey());
    return DataService.saveConversationState(null).catch(error => console.warn("Conversation state cloud sync deferred", { error, supabase: error.supabase || null }));
  }
  conversationPendingState = command;
  writeJson(conversationPendingKey(), command);
  return DataService.saveConversationState(command).catch(error => console.warn("Conversation state cloud sync deferred", { error, supabase: error.supabase || null }));
}

function clearAssistantPendingCommand() {
  conversationPendingState = null;
  localStorage.removeItem(conversationPendingKey());
  return DataService.saveConversationState(null).catch(error => console.warn("Conversation state cloud sync deferred", { error, supabase: error.supabase || null }));
}

function refreshConversationFromCloud(renderAfter = true) {
  if (!hasGoogleOAuthSession() || migrationRequired || migrationRunning) return;
  if (conversationRefreshTimer) clearTimeout(conversationRefreshTimer);
  conversationRefreshTimer = setTimeout(() => {
    DataService.loadConversation().finally(() => {
      if (renderAfter && (isAssistantOpen() || IS_EXTENSION_ENTRY || isStandaloneChatRoute())) render();
    });
  }, 150);
}

const chineseNumberMap = { "零": 0, "一": 1, "二": 2, "兩": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9, "十": 10 };

function parseNumberToken(value = "") {
  const text = String(value || "").trim();
  if (!text) return null;
  if (/^\d+(\.\d+)?$/.test(text)) return Number(text);
  if (text === "半") return 0.5;
  if (text === "十") return 10;
  if (text.length === 1 && text in chineseNumberMap) return chineseNumberMap[text];
  const tenMatch = text.match(/^十([一二兩三四五六七八九])$/);
  if (tenMatch) return 10 + chineseNumberMap[tenMatch[1]];
  const compound = text.match(/^([一二兩三四五六七八九])十([一二兩三四五六七八九])?$/);
  if (compound) return chineseNumberMap[compound[1]] * 10 + (compound[2] ? chineseNumberMap[compound[2]] : 0);
  return null;
}

function parseAssistantDate(text = "") {
  const base = new Date();
  if (/明天|明日/.test(text)) base.setDate(base.getDate() + 1);
  if (/昨天|昨日/.test(text)) base.setDate(base.getDate() - 1);
  if (/下星期|下週|下周|下禮拜|下礼拜/.test(text)) base.setDate(base.getDate() + 7);
  const explicit = String(text).match(/(\d{1,2})[/-](\d{1,2})/);
  if (explicit) {
    base.setMonth(Number(explicit[1]) - 1);
    base.setDate(Number(explicit[2]));
  }
  return key(base);
}

function parseAssistantTimeToken(period = "", hourToken = "", minuteToken = "") {
  let hour = parseNumberToken(hourToken);
  if (hour == null) return null;
  let minute = minuteToken === "半" ? 30 : Number(minuteToken || 0);
  if (/下午|晚上|晚間/.test(period) && hour < 12) hour += 12;
  if (/中午/.test(period) && hour < 12) hour += 12;
  if (/凌晨/.test(period) && hour === 12) hour = 0;
  return { hour, minute: Number.isFinite(minute) ? minute : 0 };
}

function parseAssistantTimeRange(text = "", dateKey = key()) {
  const pattern = /(上午|下午|晚上|晚間|中午|凌晨)?\s*([0-9一二兩三四五六七八九十]{1,3})\s*(?:點|:)\s*(半|\d{1,2})?\s*(?:到|至|-|~)\s*(上午|下午|晚上|晚間|中午|凌晨)?\s*([0-9一二兩三四五六七八九十]{1,3})\s*(?:點|:)?\s*(半|\d{1,2})?/;
  const match = String(text).match(pattern);
  if (!match) return null;
  const start = parseAssistantTimeToken(match[1] || "", match[2], match[3] || "");
  const end = parseAssistantTimeToken(match[4] || match[1] || "", match[5], match[6] || "");
  if (!start || !end) return null;
  const startMinutes = start.hour * 60 + start.minute;
  let endMinutes = end.hour * 60 + end.minute;
  if (endMinutes <= startMinutes && end.hour < 12) endMinutes += 12 * 60;
  const hoursValue = Math.max(0.5, Math.round((endMinutes - startMinutes) / 30) / 2);
  return { at: `${dateKey}T${String(start.hour).padStart(2, "0")}:${String(start.minute).padStart(2, "0")}`, hours: hoursValue };
}

function parseAssistantSingleStart(text = "", dateKey = key()) {
  const pattern = /(上午|下午|晚上|晚間|中午|凌晨)?\s*([0-9一二兩三四五六七八九十]{1,3})\s*(?:點|:)\s*(半|\d{1,2})?/;
  const match = String(text).match(pattern);
  if (!match) return null;
  const start = parseAssistantTimeToken(match[1] || "", match[2], match[3] || "");
  if (!start) return null;
  return `${dateKey}T${String(start.hour).padStart(2, "0")}:${String(start.minute).padStart(2, "0")}`;
}

function parseAssistantDuration(text = "") {
  const raw = String(text || "");
  if (/半天|半日/.test(raw)) return 4;
  if (/整天|整日|全天|一整天|一天/.test(raw)) return 8;
  const numberAndHalf = raw.match(/([0-9]+|[一二兩三四五六七八九十]+)\s*(?:個)?半\s*(?:小時|鐘頭|h|H)/);
  if (numberAndHalf) return parseNumberToken(numberAndHalf[1]) + 0.5;
  if (/(一個|1個)?半\s*(?:小時|鐘頭|h|H)/.test(raw)) return 0.5;
  const half = raw.match(/半\s*(?:小時|鐘頭|h|H)/);
  if (half) return 0.5;
  const match = raw.match(/([0-9]+(?:\.[0-9]+)?|[一二兩三四五六七八九十]+)\s*(?:小時|鐘頭|h|H)/);
  if (!match) return null;
  return parseNumberToken(match[1]);
}

function parseAssistantVagueStart(text = "", dateKey = key()) {
  const raw = String(text || "");
  if (/上午/.test(raw)) return `${dateKey}T09:00`;
  if (/下午/.test(raw)) return `${dateKey}T13:00`;
  if (/晚上|晚間/.test(raw)) return `${dateKey}T18:00`;
  return null;
}

function assistantFallbackText() {
  return assistantUnknownResponse();
}

function pickAssistantResponse(pool = []) {
  if (!pool.length) return "";
  return pool[Math.floor(Math.random() * pool.length)];
}

const assistantSuggestionPool = [
  "如果需要，我可以陪您一起回想今天還有哪些工作要補。",
  "也可以直接告訴我下一筆工作，例如：今天下午兩點到四點開會。",
  "若今天還有請假、會議或教育訓練，我可以一起幫您整理。"
];

const assistantGreetingPool = [
  "👋 您好！今天想先處理哪一件事？",
  "您好，我是諸葛先生。\n\n今天需要先建立工時、安排 Calendar，還是整理一個任務？",
  "👋 您好。\n\n可以直接告訴我今天要記錄的工作，例如：今天下午三點到四點開會。"
];

const assistantMorningPool = [
  "☀️ 早安！\n\n今天有安排會議嗎？還是先建立今天第一筆工時？",
  "早安。\n\n我可以先協助您建立工時、Calendar 或任務。"
];

const assistantNightPool = [
  "🌙 晚安。\n\n如果今天還有工時沒記錄，明天也可以再找我補登。",
  "晚安。\n\n今天辛苦了。若還有工時或請假要補登，之後直接告訴我即可。"
];

const assistantThanksPool = [
  "😊 不客氣！\n\n今天還有需要我幫忙建立工時或安排 Calendar 嗎？",
  "不客氣。\n\n如果還有工時、Calendar 或任務，也可以直接告訴我。"
];

const assistantGoodbyePool = [
  "好的，我在這裡。\n\n需要補登工時或安排 Calendar 時，再直接找我。",
  "收到。祝您工作順利。"
];

const assistantUnknownPool = [
  "😊 這個問題我目前還無法直接判斷。\n\n不過如果它和今天的工作有關，我可以先幫您記成工時、任務或 Calendar。",
  "這部分我還在學習中。\n\n如果今天有相關工作，例如研究、開會或整理資料，我可以先幫您留下工作紀錄。",
  "目前這件事超出我能處理的範圍。\n\n但如果您要把它變成今天的工作安排，我可以接著協助建立工時或任務。"
];

const assistantCapabilityPool = [
  "我目前最擅長協助您處理：\n\n• 工時：新增、補登、查詢今日 / 本週進度\n• Calendar：整理行程草稿與確認\n• 任務：先建立待辦草稿\n\n您可以直接用一句話告訴我，例如：今天下午三點到四點開會。",
  "目前我主要協助工時、任務與 Calendar。\n\n如果您不確定怎麼開始，可以直接說：「我今天做了什麼？」或「幫我補一筆下午開會」。"
];

function assistantWithSuggestion(text = "") {
  return `${text}\n\n${pickAssistantResponse(assistantSuggestionPool)}`;
}

function assistantUnknownResponse() {
  return assistantWithSuggestion(pickAssistantResponse(assistantUnknownPool));
}

function formatEntryLine(entry) {
  const start = String(entry.at || "").slice(11, 16) || "--:--";
  const end = timeFromMinutes(entryEndMinutes(entry));
  return `${start}–${end}（${Number(entry.hours || 0)}h） ${entry.title || "未命名工時"}`;
}

function worklogContextAnswer(scope = "today") {
  const targetDate = new Date();
  const list = scope === "week" ? weekEntries(targetDate) : entriesForDate(targetDate);
  const done = hours(list);
  const target = scope === "week" ? 40 : 8;
  const remaining = Math.max(0, Math.round((target - done) * 10) / 10);
  const scopeLabel = scope === "week" ? "本週" : "今天";
  if (!list.length) {
    return `${scopeLabel}目前還沒有工時紀錄。\n\n如果您已經有開會、處理文件、採購、教育訓練或請假，我可以陪您一起補上。`;
  }
  const lines = list.map(e => `• ${formatEntryLine(e)}`).join("\n");
  const next = remaining > 0
    ? `${scopeLabel}距離 ${target} 小時還有 ${remaining} 小時。\n\n要不要一起回想${scope === "week" ? "這週" : "今天"}還有哪些工作需要補齊？`
    : `${scopeLabel}已達到 ${target} 小時。若還有需要補充的紀錄，我也可以繼續幫您整理。`;
  return `我幫您看了一下，${scopeLabel}目前已登記 ${done} 小時：\n\n${lines}\n\n${next}`;
}

function todayWorkListAnswer() {
  const list = entriesForDate(new Date());
  if (!list.length) {
    return "今天目前尚未看到已建立的工作紀錄。\n\n如果今天有會議、採購、文件整理、教育訓練或請假，我可以一起幫您補齊。";
  }
  const lines = list.map(e => `• ${formatEntryLine(e)}`).join("\n");
  const done = hours(list);
  const remaining = Math.max(0, Math.round((8 - done) * 10) / 10);
  return `今天目前我看到：\n\n${lines}\n\n共 ${done} 小時。${remaining > 0 ? `\n\n距離今天 8 小時還有 ${remaining} 小時。需要我陪您一起回想剩下的工作嗎？` : "\n\n今天工時已經達標了。若還有其他紀錄，也可以繼續補上。"}`;
}

function parseConversationIntent(text = "") {
  const raw = String(text || "").trim();
  if (!raw) return null;
  if (/你(可以|能)(做|幫|協助)什麼|你會什麼|功能|怎麼用/.test(raw)) return { type: "capability" };
  if (/^(早安|早|早上好)(啊|呀|喔|哦|！|!|。)?$/i.test(raw)) return { type: "greeting", subtype: "morning" };
  if (/^(晚安|晚上好)(啊|呀|喔|哦|！|!|。)?$/i.test(raw)) return { type: "greeting", subtype: "night" };
  if (/^(你好|您好|哈囉|嗨|hi|hello|hey)(啊|呀|喔|哦|！|!|。)?$/i.test(raw)) return { type: "greeting", subtype: "hello" };
  if (/^(謝謝|感謝|thanks|thank you|thx)(你|您)?(啦|喔|哦|！|!|。)?$/i.test(raw)) return { type: "thanks" };
  if (/^(掰掰|拜拜|再見|bye|goodbye)(啦|喔|哦|！|!|。)?$/i.test(raw)) return { type: "goodbye" };
  if (/^(收到|ok|okay|好的|好|嗯|了解|知道了)(啦|喔|哦|！|!|。)?$/i.test(raw)) return { type: "ack" };
  return null;
}

function executeConversationIntent(intent = null) {
  if (!intent) return null;
  if (intent.type === "capability") return assistantResult(pickAssistantResponse(assistantCapabilityPool));
  if (intent.type === "greeting" && intent.subtype === "morning") return assistantResult(assistantWithSuggestion(pickAssistantResponse(assistantMorningPool)));
  if (intent.type === "greeting" && intent.subtype === "night") return assistantResult(pickAssistantResponse(assistantNightPool));
  if (intent.type === "greeting") return assistantResult(assistantWithSuggestion(pickAssistantResponse(assistantGreetingPool)));
  if (intent.type === "thanks") return assistantResult(pickAssistantResponse(assistantThanksPool));
  if (intent.type === "goodbye") return assistantResult(pickAssistantResponse(assistantGoodbyePool));
  if (intent.type === "ack") return assistantResult(assistantWithSuggestion("收到。"));
  return null;
}

function pendingConversationGuidance(pending = null) {
  if (!pending) return "";
  if (isDurationPending(pending)) return "這筆草稿還缺少時間長度。您可以直接回覆：30m、1h、1.5h、2h，或輸入自訂時間。";
  if (pending.action === "confirm_add_entry") return "目前有一筆工時等待確認。您可以按「確認建立」，或按「取消」重新開始。";
  if (pending.action === "confirm_calendar") return "目前有一筆 Calendar 等待確認。您可以按「確認建立」，或按「取消」重新開始。";
  if (pending.action === "calendar_worklog_offer") return "Calendar 已建立，正在等待您決定是否同步建立工時。";
  return "目前有一個尚未完成的動作，請先確認或取消後再繼續。";
}

function assistantEntryTitle(raw = "", entryType = "work") {
  const text = String(raw || "");
  const cleaned = extractAssistantDescription(text);
  if (/開會|會議/.test(text) && !cleaned) return "會議";
  return cleaned || (entryType === "leave" ? "請假" : "工時紀錄");
}

function includesAny(text = "", words = []) {
  const raw = String(text || "");
  return words.some(word => raw.includes(word));
}

function stripAssistantSlots(raw = "") {
  return String(raw || "")
    .replace(/(\d{1,2})[/-](\d{1,2})/g, "")
    .replace(/今天|今日|明天|明日|昨天|昨日|下星期|下週|下周|下禮拜|下礼拜/g, "")
    .replace(/上午|下午|晚上|晚間|中午|凌晨/g, "")
    .replace(/[0-9一二兩三四五六七八九十半]+點(半|\d{1,2})?\s*(到|至|-|~)\s*(上午|下午|晚上|晚間|中午|凌晨)?\s*[0-9一二兩三四五六七八九十半]+點?(半|\d{1,2})?/g, "")
    .replace(/[0-9一二兩三四五六七八九十半]+點(半|\d{1,2})?/g, "")
    .replace(/[0-9一二兩三四五六七八九十半]+(?:\.[0-9]+)?\s*(?:小時|h|H)/g, "")
    .replace(/半天|半日|整天|整日|全天|一整天|一天/g, "")
    .replace(/^(我|幫我|請幫我|麻煩|請|要|想要|需要|有|新增|建立|記錄|紀錄|補|提醒我|提醒)/g, "")
    .replace(/(工時|一下|一筆|一個|預計|大概|約|大約|的|了|有|都在|忘了)/g, "")
    .replace(/[，,。.!！?？]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractAssistantDescription(raw = "") {
  const text = String(raw || "");
  if (/開會/.test(text)) return "會議";
  const cleaned = stripAssistantSlots(text);
  return cleaned || "";
}

function parseAssistantSlots(raw = "") {
  const dateKey = parseAssistantDate(raw);
  const range = parseAssistantTimeRange(raw, dateKey);
  const singleStart = parseAssistantSingleStart(raw, dateKey);
  const vagueStart = parseAssistantVagueStart(raw, dateKey);
  const duration = parseAssistantDuration(raw);
  const entryType = entryTypeFromDescription(raw);
  const description = assistantEntryTitle(raw, entryType);
  return { dateKey, range, singleStart, vagueStart, duration, entryType, description };
}

function inferAssistantIntent(raw = "", slots = {}) {
  const text = String(raw || "");
  const hasTime = Boolean(slots.range || slots.singleStart || slots.vagueStart);
  const hasDuration = Boolean(slots.duration);
  const isLeave = slots.entryType === "leave";
  const taskWords = ["提醒我", "提醒", "待辦", "todo", "Todo", "建立待辦", "新增待辦"];
  const unsupportedWords = ["股票", "投資", "基金", "ETF", "新聞", "天氣", "匯率", "餐廳", "旅遊"];
  if (includesAny(text, unsupportedWords)) return "unknown";
  if (isLeave) return "leave";
  if (includesAny(text, taskWords)) return "task";
  if (/新增.+案件|建立.+案件/.test(text) && !hasTime && !hasDuration) return "task";
  if (hasTime && includesAny(text, ["面試", "看醫生", "就醫", "聚餐", "私人"])) return "calendar";
  if (/明天|明日|下星期|下週|下周|下禮拜|下礼拜/.test(text) && hasTime && !hasDuration && !/工時|補/.test(text)) return "calendar";
  if (hasTime || hasDuration || includesAny(text, ["工時", "補", "記錄", "紀錄", "開會", "會議", "驗收", "寫程式", "拜訪", "處理", "整理", "請款", "採購", "教育訓練"])) return "worklog";
  return "unknown";
}

function buildAssistantEntry(command = {}) {
  return createEntry({
    title: command.title,
    at: command.at,
    date: String(command.at || "").slice(0, 10),
    hours: command.hours,
    entryType: command.entryType || "work",
    source: "manual"
  });
}

function assistantCommandFromParts({ raw = "", dateKey = key(), at = "", hours = 1, entryType = "work" } = {}) {
  const hasHours = hours !== undefined && hours !== null && hours !== "";
  return {
    title: assistantEntryTitle(raw, entryType),
    dateKey,
    at,
    hours: hasHours ? Number(hours) : 1,
    entryType
  };
}

function assistantConfirmationPayload(command = {}) {
  const item = buildAssistantEntry(command);
  return {
    title: item.title,
    date: item.date,
    start: String(item.at || "").slice(11, 16),
    end: timeFromMinutes(entryEndMinutes(item)),
    hours: item.hours,
    entryType: item.entryType,
    at: item.at
  };
}

function isWorkNatureCalendar(command = {}) {
  return /會議|開會|教育訓練|訓練|拜訪|客戶|專案|工作/.test(String(command.title || ""));
}

function isDurationPending(pending = null) {
  return ["awaiting_duration", "add_entry_duration", "calendar_duration"].includes(String(pending?.action || ""));
}

function durationPendingIntent(pending = null) {
  if (pending?.intent) return pending.intent;
  if (pending?.action === "calendar_duration") return "calendar";
  if (pending?.command?.entryType === "leave") return "leave";
  return "worklog";
}

function assistantDurationQuestion(intent = "worklog", command = {}) {
  if (intent === "calendar") return `我可以幫您建立 Calendar。想確認一下，這場${command.title || "行程"}預計多久？`;
  if (intent === "leave") return "請問是全天、半天，還是幾個小時？";
  return "請問大約花了多久？";
}

function shouldPromptWorkProfileToday() {
  if (isWorkProfileReady(workProfile)) return false;
  const today = key(new Date());
  const prompted = normalizeWorkProfile(workProfile || {}, profile).lastProfilePromptDate || localStorage.getItem(scopedLocalKey(WORK_PROFILE_PROMPT_KEY));
  return prompted !== today;
}

function startWorkProfileConversation() {
  const next = normalizeWorkProfile({ ...(workProfile || {}), lastProfileCheckDate: key(new Date()), lastProfilePromptDate: key(new Date()) }, profile);
  workProfile = next;
  localStorage.setItem(scopedLocalKey(WORK_PROFILE_PROMPT_KEY), key(new Date()));
  saveAll();
  setAssistantPendingCommand({ action: "collect_work_profile", step: "ecp_owner", profileDraft: next });
  return assistantResult("您好，為了讓之後建立工時可以直接匯入 ECP，我們先完成您的工作身分。\n\n我會一步一步協助您，花不到一分鐘即可。\n\n請問您的 ECP 負責人？");
}

function handleWorkProfileConversationReply(text = "", pending = {}) {
  const draft = normalizeWorkProfile(pending.profileDraft || workProfile || {}, profile);
  const value = String(text || "").trim();
  if (/稍後|下次|先不要/.test(value)) {
    setAssistantPendingCommand(null);
    return assistantResult("好的，先不打擾。您仍可建立工時；匯出 ECP 前我會再提醒完成工作身分。");
  }
  if (pending.step === "ecp_owner") {
    draft.ecpResponsiblePerson = value;
    setAssistantPendingCommand({ action: "collect_work_profile", step: "ecp_department", profileDraft: draft });
    return assistantResult("收到。請問您的 ECP 部門？");
  }
  if (pending.step === "ecp_department") {
    draft.ecpDepartment = value;
    setAssistantPendingCommand({ action: "collect_work_profile", step: "default_task", profileDraft: draft });
    return assistantResult("收到。請問您目前主要使用的工作任務？");
  }
  if (pending.step === "default_task") {
    draft.defaultTask = value;
    draft.taskEffectiveMonth = monthKey();
    draft.taskVerifiedAt = new Date().toISOString();
    const normalized = normalizeWorkProfile(draft, profile);
    setAssistantPendingCommand({ action: "confirm_work_profile", profileDraft: normalized });
    return assistantResult("請確認您的工作身分：", { type: "work_profile_confirm", payload: normalized });
  }
  return null;
}

async function confirmWorkProfileFromConversation(draft = {}) {
  applyWorkProfileToProfile(normalizeWorkProfile(draft, profile));
  saveAll();
  await DataService.saveProfileSettingsOnly({ requireCloud: true });
  await DataService.saveEcpTasksOnly({ requireCloud: true });
  await clearAssistantPendingCommand();
  localStorage.setItem(scopedLocalKey(WORKLOG_WELCOME_KEY), "1");
}

function assistantResult(text = "", card = null) {
  return card ? { text, card } : { text };
}

function assistantCommandErrorDebug({ input = "", parsedIntent = null, parsedCommand = null, entryPayload = null, error = null } = {}) {
  return {
    input,
    parsedIntent,
    parsedCommand,
    entryPayload,
    error,
    code: error?.supabase?.code || error?.code || "",
    message: error?.supabase?.message || error?.message || "",
    details: error?.supabase?.details || error?.details || "",
    hint: error?.supabase?.hint || error?.hint || ""
  };
}

function hasExplicitAssistantDuration(raw = "") {
  return Boolean(parseAssistantDuration(raw) || parseAssistantTimeRange(raw, parseAssistantDate(raw)));
}

async function callWorkLogDomainLLM(raw = "") {
  if (!hasGoogleOAuthSession()) return null;
  try {
    await ensureFreshAuthSession(false);
    const res = await fetch(`${AUTH_CONFIG.supabaseUrl}/functions/v1/${WORKLOG_LLM_FUNCTION}`, {
      method: "POST",
      headers: cloudHeaders(),
      body: JSON.stringify({
        input: String(raw || ""),
        today: key(new Date()),
        selectedDate: key(selected),
        timezone: "Asia/Taipei",
        scope: ["WorkLog", "Task", "Calendar"]
      })
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn("WorkLog Domain LLM unavailable; fallback to local parser", { status: res.status, body });
      return null;
    }
    const data = await res.json();
    return data?.draft || data || null;
  } catch (error) {
    console.warn("WorkLog Domain LLM failed; fallback to local parser", { error });
    return null;
  }
}

function normalizeClock(value = "") {
  const match = String(value || "").match(/^(\d{1,2}):(\d{1,2})/);
  if (!match) return "";
  return `${String(Number(match[1])).padStart(2, "0")}:${String(Number(match[2])).padStart(2, "0")}`;
}

function hoursBetween(start = "", end = "") {
  const s = minutesFromTime(start);
  let e = minutesFromTime(end);
  if (e <= s) e += 24 * 60;
  return Math.max(0.5, Math.round((e - s) / 30) / 2);
}

function intentFromDomainDraft(raw = "", draft = null) {
  if (!draft || typeof draft !== "object") return null;
  const intent = String(draft.intent || "").toLowerCase();
  const dateKey = String(draft.date || "").match(/^\d{4}-\d{2}-\d{2}$/) ? draft.date : parseAssistantDate(raw);
  const startTime = normalizeClock(draft.startTime || draft.start_time || "");
  const endTime = normalizeClock(draft.endTime || draft.end_time || "");
  const explicitDuration = hasExplicitAssistantDuration(raw);
  const draftDuration = Number(draft.durationHours || draft.duration_hours || draft.hours || 0);
  const duration = explicitDuration ? (draftDuration || (startTime && endTime ? hoursBetween(startTime, endTime) : 0)) : 0;
  const entryType = intent === "leave" ? "leave" : entryTypeFromDescription(draft.description || raw);
  const title = String(draft.description || draft.title || extractAssistantDescription(raw) || (entryType === "leave" ? "請假" : "工時紀錄")).trim();
  const at = startTime ? `${dateKey}T${startTime}` : (entryType === "leave" ? `${dateKey}T09:00` : "");
  const parsedCommand = { title, dateKey, at, hours: duration, entryType };
  if (intent === "task") return { type: "task_draft", parsedCommand: { title, raw, llmDraft: draft } };
  if (intent === "calendar") {
    const command = { ...parsedCommand, at: at || `${dateKey}T09:00`, entryType: "work" };
    if (!command.hours) return { type: "calendar_need_duration", parsedCommand: command, llmDraft: draft };
    return { type: "confirm_calendar", parsedCommand: command, entryPayload: assistantConfirmationPayload(command), llmDraft: draft };
  }
  if (intent === "worklog" || intent === "leave") {
    if (!parsedCommand.hours) return { type: "need_duration", parsedCommand: { ...parsedCommand, at: parsedCommand.at || (entryType === "leave" ? `${dateKey}T09:00` : nextAvailableStart(dateKey, 1)) }, llmDraft: draft };
    const hoursValue = parsedCommand.hours;
    if (!hoursValue) return { type: "need_duration", parsedCommand: { ...parsedCommand, at: parsedCommand.at || nextAvailableStart(dateKey, 1) }, llmDraft: draft };
    const command = { ...parsedCommand, hours: hoursValue, at: parsedCommand.at || nextAvailableStart(dateKey, hoursValue) };
    return { type: "confirm_add_entry", parsedCommand: command, entryPayload: assistantConfirmationPayload(command), llmDraft: draft };
  }
  return null;
}

function parseWorklogIntentLocal(text = "") {
  const raw = String(text || "").trim();
  if (!raw) return { type: "empty" };
  if (/(今天|今日).*(哪些工作|有什麼工作|做了什麼|做哪些|工作)|我.*今天.*(做了什麼|有哪些工作)|還有.*工作|其他工作/.test(raw)) return { type: "query_today_work" };
  if (/(今天|今日).*(工時|完成|登記|記錄|紀錄|多少)|工時.*(今天|今日)/.test(raw)) return { type: "query_today" };
  if (/(本週|本周|這週|這周).*(工時|完成|登記|記錄|紀錄|多少)|工時.*(本週|本周|這週|這周)/.test(raw)) return { type: "query_week" };
  if (/刪除|移除/.test(raw)) return { type: /最後|上一筆|剛剛/.test(raw) ? "delete_last" : "unsupported_delete" };
  if (/修改|改成|調整/.test(raw)) return { type: /最後|上一筆|剛剛/.test(raw) ? "update_last" : "unsupported_update", hours: parseAssistantDuration(raw) };
  const slots = parseAssistantSlots(raw);
  const intent = inferAssistantIntent(raw, slots);
  if (intent === "task") {
    return { type: "task_draft", parsedCommand: { title: slots.description || stripAssistantSlots(raw) || "待辦", raw } };
  }
  if (intent === "calendar") {
    const at = slots.range?.at || slots.singleStart || `${slots.dateKey}T09:00`;
    const parsedCommand = assistantCommandFromParts({ raw, dateKey: slots.dateKey, at, hours: slots.range?.hours || slots.duration || 0, entryType: "work" });
    if (!parsedCommand.hours) return { type: "calendar_need_duration", parsedCommand };
    return { type: "confirm_calendar", parsedCommand, entryPayload: assistantConfirmationPayload(parsedCommand) };
  }
  if (intent === "worklog" || intent === "leave") {
    const { dateKey, range, singleStart, vagueStart, duration, entryType } = slots;
    if (range) {
      const parsedCommand = assistantCommandFromParts({ raw, dateKey, at: range.at, hours: range.hours, entryType });
      return { type: "confirm_add_entry", parsedCommand, entryPayload: assistantConfirmationPayload(parsedCommand) };
    }
    const start = singleStart || vagueStart;
    if (start && !duration && entryType !== "leave") {
      const parsedCommand = assistantCommandFromParts({ raw, dateKey, at: start, hours: 0, entryType });
      return { type: "need_duration", parsedCommand };
    }
    if (entryType === "leave" && !duration && !/半天|半日|整天|整日|全天|一整天|一天/.test(raw)) {
      const parsedCommand = assistantCommandFromParts({ raw, dateKey, at: start || `${dateKey}T09:00`, hours: 0, entryType });
      return { type: "need_duration", parsedCommand };
    }
    if (!duration && !start) {
      const parsedCommand = assistantCommandFromParts({ raw, dateKey, at: nextAvailableStart(dateKey, 1), hours: 0, entryType });
      return { type: "need_duration", parsedCommand };
    }
    const hoursValue = duration || (entryType === "leave" ? 8 : 0);
    const at = start || (entryType === "leave" ? `${dateKey}T09:00` : nextAvailableStart(dateKey, hoursValue));
    const parsedCommand = assistantCommandFromParts({ raw, dateKey, at, hours: hoursValue, entryType });
    return { type: "confirm_add_entry", parsedCommand, entryPayload: assistantConfirmationPayload(parsedCommand) };
  }
  return { type: "unsupported" };
}

async function parseWorklogIntent(text = "") {
  const localFirst = String(text || "").trim();
  if (!localFirst) return { type: "empty" };
  if (/(今天|今日).*(哪些工作|有什麼工作|做了什麼|做哪些|工作)|我.*今天.*(做了什麼|有哪些工作)|還有.*工作|其他工作/.test(localFirst)) return parseWorklogIntentLocal(localFirst);
  if (/(今天|今日).*(工時|完成|登記|記錄|紀錄|多少)|工時.*(今天|今日)/.test(localFirst)) return parseWorklogIntentLocal(localFirst);
  if (/(本週|本周|這週|這周).*(工時|完成|登記|記錄|紀錄|多少)|工時.*(本週|本周|這週|這周)/.test(localFirst)) return parseWorklogIntentLocal(localFirst);
  if (/刪除|移除|修改|改成|調整/.test(localFirst)) return parseWorklogIntentLocal(localFirst);
  const llmDraft = await callWorkLogDomainLLM(localFirst);
  const llmIntent = intentFromDomainDraft(localFirst, llmDraft);
  return llmIntent || parseWorklogIntentLocal(localFirst);
}

async function saveAssistantEntry(command = {}) {
  if (!session || !hasGoogleOAuthSession()) throw new Error("尚未完成 Google Login");
  const item = buildAssistantEntry(command);
  const error = validateEntry(item);
  if (error) throw new Error(error);
  if (!confirmOvertimeEntry(item)) return { cancelled: true };
  const saved = await persistEntry(item, { requireCloud: true });
  if (!saved) throw new Error("DataService.saveEntry 回傳失敗");
  return { saved, item };
}

async function executeWorklogCommand(intent) {
  if (intent.type === "empty") return assistantResult("請直接告訴我想記錄的工時，例如：今天下午三點到四點開會。");
  if (intent.type === "query_today_work") return assistantResult(todayWorkListAnswer());
  if (intent.type === "query_today") return assistantResult(worklogContextAnswer("today"));
  if (intent.type === "query_week") return assistantResult(worklogContextAnswer("week"));
  if (intent.type === "delete_last") {
    const list = dayEntries();
    const last = list[list.length - 1];
    if (!last) return assistantResult("今天目前沒有可刪除的工時。");
    await DataService.deleteEntry(last);
    return assistantResult(`已刪除最後一筆工時：${last.title}。`);
  }
  if (intent.type === "update_last") {
    const list = dayEntries();
    const last = list[list.length - 1];
    if (!last) return assistantResult("今天目前沒有可修改的工時。");
    if (!intent.hours) return assistantResult("請告訴我要把最後一筆改成幾小時。");
    const item = createEntry({ ...last, hours: intent.hours, id: last.id, cloudId: last.cloudId });
    const error = validateEntry(item); if (error) return assistantResult(error);
    await persistEntry(item, { requireCloud: true });
    return assistantResult(`已將最後一筆「${last.title}」調整為 ${intent.hours}h。`);
  }
  if (intent.type === "unsupported_delete") return assistantResult("刪除工時目前請指定「刪除最後一筆」，或先到我的工作列表操作。");
  if (intent.type === "unsupported_update") return assistantResult("修改工時目前請指定「修改最後一筆為 X 小時」，或先到我的工作列表操作。");
  if (intent.type === "need_duration") {
    const pendingIntent = intent.parsedCommand?.entryType === "leave" ? "leave" : "worklog";
    await setAssistantPendingCommand({ action: "awaiting_duration", intent: pendingIntent, command: intent.parsedCommand });
    return assistantResult(assistantDurationQuestion(pendingIntent, intent.parsedCommand), { type: "duration_prompt", intent: pendingIntent, command: intent.parsedCommand });
  }
  if (intent.type === "calendar_need_duration") {
    await setAssistantPendingCommand({ action: "awaiting_duration", intent: "calendar", command: intent.parsedCommand });
    return assistantResult(assistantDurationQuestion("calendar", intent.parsedCommand), { type: "duration_prompt", intent: "calendar", command: intent.parsedCommand });
  }
  if (intent.type === "task_draft") {
    return assistantResult("我先幫您整理成任務草稿：", { type: "task_draft", payload: intent.parsedCommand });
  }
  if (intent.type === "confirm_calendar") {
    await setAssistantPendingCommand({ action: "confirm_calendar", command: intent.parsedCommand });
    return assistantResult("請確認建立 Calendar：", { type: "confirm_calendar", payload: assistantConfirmationPayload(intent.parsedCommand) });
  }
  if (intent.type === "confirm_pending_calendar") {
    await clearAssistantPendingCommand();
    const payload = assistantConfirmationPayload(intent.parsedCommand);
    if (isWorkNatureCalendar(intent.parsedCommand)) {
      await setAssistantPendingCommand({ action: "calendar_worklog_offer", command: intent.parsedCommand });
      return assistantResult("Calendar 已建立。這看起來也可能是工作相關事件，是否同步建立工時？", { type: "calendar_created", payload, offerWorklog: true });
    }
    return assistantResult("Calendar 已建立。", { type: "calendar_created", payload });
  }
  if (intent.type === "create_worklog_from_calendar") {
    const result = await saveAssistantEntry(intent.parsedCommand);
    await clearAssistantPendingCommand();
    if (result.cancelled) return assistantResult("已取消儲存工時。");
    return assistantResult("已同步建立工時。", { type: "entry_created", payload: assistantConfirmationPayload(result.item) });
  }
  if (intent.type === "confirm_add_entry") {
    const item = buildAssistantEntry(intent.parsedCommand);
    const error = validateEntry(item);
    if (error) throw new Error(error);
    await setAssistantPendingCommand({ action: "confirm_add_entry", command: intent.parsedCommand });
    return assistantResult("請確認這筆工時：", { type: "confirm_entry", payload: assistantConfirmationPayload(intent.parsedCommand) });
  }
  if (intent.type === "confirm_pending_entry") {
    const result = await saveAssistantEntry(intent.parsedCommand);
    await clearAssistantPendingCommand();
    if (result.cancelled) return assistantResult("已取消儲存。");
    return assistantResult("還需要新增其他工時嗎？", { type: "entry_created", payload: assistantConfirmationPayload(result.item) });
  }
  return assistantResult(assistantFallbackText());
}

function userBadge() {
  if (!session) return "";
  return `<div class="identity-badge"><span>👤 ${escapeHtml(session.name)}</span><small>${escapeHtml(session.status || session.email || "")}</small><button class="mini" data-logout="1">登出</button></div>`;
}

function header() {
  return `<div class="top"><div class="brand-row"><button class="mini adaptive-menu" data-toggle-sidebar="1">☰</button><h1>🧠 Zhuge AI OS</h1><span class="header-version">${RELEASE_VERSION}</span></div><div class="header-right">${userBadge()}</div></div>`;
}

function authScreen() {
  return `<div class="wrap"><div class="card"><section class="panel" style="margin-top:18px"><h1>🧠 Zhuge AI OS</h1><button class="btn full" id="googleLoginBtn">使用 Google 登入</button></section></div></div>`;
}

function worklogWelcomeSeen() {
  return localStorage.getItem(scopedLocalKey(WORKLOG_WELCOME_KEY)) === "1";
}

function needsWorklogWelcome() {
  return !!session && (!isWorkProfileReady(workProfile) || localStorage.getItem(scopedLocalKey(WORK_IDENTITY_COMPLETION_KEY)) === "1");
}

function worklogWelcomeScreen() {
  const completionPending = localStorage.getItem(scopedLocalKey(WORK_IDENTITY_COMPLETION_KEY)) === "1";
  if (completionPending && isWorkProfileReady(workProfile)) {
    return `<div class="wrap"><div class="card"><section class="panel welcome-panel work-identity-complete" style="margin-top:18px"><h1>🎉 工作身分建立完成！</h1><p>之後您只需要用自然語言，例如：</p><div class="work-identity-example">今天下午開會兩小時</div><p>我就可以協助您：</p><ul class="work-identity-list"><li>✅ 建立工時</li><li>✅ 建立 Calendar</li><li>✅ 建立任務</li></ul><div class="form-actions"><button class="btn" data-enter-ai-os="1">開始使用</button></div></section></div></div>`;
  }
  const step = localStorage.getItem(scopedLocalKey(WORK_IDENTITY_SETUP_STEP_KEY)) || "welcome";
  const draft = normalizeWorkProfile(readJson(scopedLocalKey(WORK_IDENTITY_SETUP_DRAFT_KEY), workProfile || {}), profile);
  const progress = {
    owner: ["Step 1 / 4", "■□□□", "ECP 負責人", "setupEcpOwner", draft.ecpResponsiblePerson, "例如：陳彥達-UU"],
    department: ["Step 2 / 4", "■■□□", "ECP 負責部門", "setupEcpDepartment", draft.ecpDepartment, "例如：UU管理部"],
    task: ["Step 3 / 4", "■■■□", "目前工作任務（Current Active Task）", "setupEcpTask", draft.defaultTask, "例如：202607管理部月工作-採購及管理(含臨時交辦)"],
    confirm: ["Step 4 / 4", "■■■■"]
  };
  if (step === "welcome") {
    return `<div class="wrap"><div class="card"><section class="panel welcome-panel work-identity-welcome" style="margin-top:18px"><h1>👋 歡迎來到 ZhuGe AI OS</h1><p class="work-identity-tagline">一句話記錄工作，一步步建立專屬於你的 AI 工作助理。</p><p>我是諸葛先生。</p><p>未來我會逐漸學習您的工作方式，成為最了解您的 AI 助理。</p><p>開始之前，我們先花不到一分鐘，建立您的工作身分。</p><div class="muted">工作身分是 ZhuGe AI OS 對您工作角色的理解基礎，未來 Knowledge Brain、Recommendation Engine 與 Suggestion Engine 都會以此作為 Context。</div><div class="form-actions"><button class="btn" data-work-identity-start="1">開始設定</button></div></section></div></div>`;
  }
  if (step === "confirm") {
    const [label, bars] = progress.confirm;
    return `<div class="wrap"><div class="card"><section class="panel welcome-panel work-profile-setup" style="margin-top:18px"><div class="setup-progress"><span>建立工作身分</span><b>${label}</b><em>${bars}</em></div><h1>請確認您的工作身分</h1><div class="work-profile-confirm"><div>負責人：<b>${escapeHtml(draft.ecpResponsiblePerson || "尚未填寫")}</b></div><div>部門：<b>${escapeHtml(draft.ecpDepartment || "尚未填寫")}</b></div><div>目前工作任務：<b>${escapeHtml(draft.defaultTask || "尚未填寫")}</b></div></div><div class="form-actions"><button class="btn2" data-work-identity-back="task">修改</button><button class="btn" data-confirm-work-profile-setup="1">確認</button></div></section></div></div>`;
  }
  const cfg = progress[step] || progress.owner;
  return `<div class="wrap"><div class="card"><section class="panel welcome-panel work-profile-setup" style="margin-top:18px"><div class="setup-progress"><span>建立工作身分</span><b>${escapeHtml(cfg[0])}</b><em>${escapeHtml(cfg[1])}</em></div><h1>${escapeHtml(cfg[2])}</h1><p class="muted">我會一步一步協助您完成。這些資訊會讓未來工時與 ECP 匯出更順。</p><label>${escapeHtml(cfg[2])}</label><input class="input" id="${escapeHtml(cfg[3])}" value="${escapeHtml(cfg[4])}" placeholder="${escapeHtml(cfg[5])}"><div class="form-actions"><button class="btn2" data-work-identity-prev="1">返回</button><button class="btn" data-work-identity-next="${escapeHtml(step)}">下一步</button></div></section></div></div>`;
}

function migrationScreen() {
  const p = migrationPreview || legacyInventory();
  return `<div class="wrap"><div class="card"><div class="top"><div><div class="muted">☁ RC3.4A Cloud Sync</div><h1>資料上雲確認</h1><div class="muted">系統偵測到 RC3.3 本機資料。請確認後執行一次性搬移，完成後正式資料將以 Supabase 為準，LocalStorage 僅保留安全備份與快取。</div></div><div class="header-right">${userBadge()}</div></div><section class="panel" style="margin-top:18px"><h2>Migration Preview</h2><div class="dashboard-grid"><div class="entry"><b>工時</b><div class="muted">${p.entries} 筆</div></div><div class="entry"><b>工作模型</b><div class="muted">${p.workModels} 筆</div></div><div class="entry"><b>ECP 任務</b><div class="muted">${p.ecpTasks} 筆</div></div><div class="entry"><b>ECP 設定</b><div class="muted">${p.ecpSettings ? "有" : "無"}</div></div><div class="entry"><b>AI Feedback</b><div class="muted">${p.feedback} 筆，本階段僅盤點</div></div><div class="entry"><b>藏書閣</b><div class="muted">${p.library} 筆，本階段僅盤點</div></div></div>${migrationError ? `<div class="empty" style="margin-top:12px"><b>Migration 失敗</b><div class="muted">${escapeHtml(migrationError)}</div></div>` : ""}<div class="form-actions"><button class="btn2" data-logout="1">先不要，登出</button><button class="btn" data-run-migration="1" ${migrationRunning ? "disabled" : ""}>${migrationRunning ? "搬移中..." : "開始 Cloud Sync Migration"}</button></div><div class="muted" style="margin-top:10px">失敗時不會清除 legacy LocalStorage。請確認 Supabase Phase 1 SQL 已套用。</div></section></div></div>`;
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
  const checked = new Date().toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `<aside class="os-sidebar"><button class="mini sidebar-close" data-close-sidebar="1">×</button>${agentStatusPanel()}${sidebarSection("🏕️ 營帳", "camp")}${sidebarSection("⚙️ 系統", "system")}<div class="developer-build-info"><div id="developerCloudSyncStatus" data-retry-cloud-sync="1"><div>${escapeHtml(cloudSyncLabel())}</div><div>${escapeHtml(cloudSyncDetail())}</div><div>${escapeHtml(conversationSyncLabel())}</div><div>${escapeHtml(conversationSyncDetail())}</div></div><div>${RELEASE_VERSION}</div><div>Build ${BUILD_TIME}</div><div>GitHub Pages：最後檢查 ${checked}</div><div>Source：${DEPLOY_SOURCE}</div></div></aside>`;
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
  return `<div class="os-shell ${sidebarOpen ? "sidebar-open" : ""}"><div class="os-topbar">${header()}</div><div class="os-body">${osSidebar()}<div class="sidebar-backdrop" data-close-sidebar="1"></div><main class="os-main">${workspaceTabs()}<div class="workspace-canvas">${workspaceContent()}</div></main></div>${floatingAssistantWidget()}</div>`;
}

function onboardingWorkspace() {
  return `<section class="panel" style="margin-top:18px"><div class="panel-head"><div><h2>🪶 初次認識工時營帳</h2><div class="muted">建立工作模型後，即可使用 Calendar、我的工作與推理預測。</div></div></div><div class="profile-grid"><div><label>你的職務</label><select id="role" class="input">${roles.map(r => `<option>${r}</option>`).join("")}</select></div><div><label>每日工時</label><select class="input"><option>09:00~18:00，午休 12:00~13:00</option></select></div></div><label>工作模型</label><div class="row two" id="tagOptions">${tagButtons(tagsForRole("採購"))}</div><label>SOP 狀態</label><select id="sop" class="input"><option>目前沒有 SOP，先用職務模型</option><option>有 SOP，之後上傳</option></select><label>工作來源</label><div class="row two">${["Google Drive", "Gmail", "Calendar", "手動紀錄"].map(s => `<button class="btn2 src-btn" data-src="${s}">${s}</button>`).join("")}</div><button class="btn full" id="saveProfile">建立我的工作模型</button></section>`;
}

function onboarding() {
  return `<div class="wrap"><div class="card"><div class="top"><div><div class="muted">🪶 初次認識</div><h1>你好，我是諸葛先生</h1><div class="muted">我想先了解你的工作，之後才能產生更準的每日工作建議卡。</div></div><div class="header-right">${userBadge()}<div class="tag">${VERSION}</div></div></div><section class="panel" style="margin-top:18px"><div class="profile-grid"><div><label>你的職務</label><select id="role" class="input">${roles.map(r => `<option>${r}</option>`).join("")}</select></div><div><label>每日工時</label><select class="input"><option>09:00~18:00，午休 12:00~13:00</option></select></div></div><label>工作模型</label><div class="row two" id="tagOptions">${tagButtons(tagsForRole("採購"))}</div><label>SOP 狀態</label><select id="sop" class="input"><option>目前沒有 SOP，先用職務模型</option><option>有 SOP，之後上傳</option></select><label>工作來源</label><div class="row two">${["Google Drive", "Gmail", "Calendar", "手動紀錄"].map(s => `<button class="btn2 src-btn" data-src="${s}">${s}</button>`).join("")}</div><button class="btn full" id="saveProfile">建立我的工作模型</button></section></div></div>`;
}

function calendarPanel() {
  const base = selectedMonthDate(1);
  const y = base.getFullYear(), m = base.getMonth(), first = new Date(y, m, 1), last = new Date(y, m + 1, 0);
  const selectedInMonth = monthKey(selected) === selectedMonth;
  const monthLabel = `${y}/${String(m + 1).padStart(2, "0")}`;
  let html = `<div class="panel-head"><h2>${monthLabel}</h2><div class="actions compact"><button class="btn2" data-month-nav="-1">上一月</button><button class="btn2" data-today="1">今天</button><button class="btn2" data-month-nav="1">下一月</button></div></div><div class="cal">${["日", "一", "二", "三", "四", "五", "六"].map(x => `<div class="muted cal-head">${x}</div>`).join("")}`;
  for (let i = 0; i < first.getDay(); i++) html += "<div></div>";
  for (let d = 1; d <= last.getDate(); d++) {
    const dk = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const h = entries.filter(e => e.date === dk).reduce((s, e) => s + Number(e.hours || 0), 0);
    html += `<div class="day ${selectedInMonth && d === selected.getDate() ? "sel" : ""}" data-day="${d}"><b>${d}</b><div class="bar"><div class="fill" style="width:${Math.min(100, h / 8 * 100)}%"></div></div><small>${h ? h + "h" : ""}</small></div>`;
  }
  html += `</div><div class="month-summary"><b>${monthLabel} 工時</b><span>${hours(monthEntries())}h</span></div><button class="btn full" data-export-month="1">⬇️ 下載 ${monthLabel} ECP 匯入檔</button>`;
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

function startOfWorkWeek(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay();
  x.setDate(x.getDate() + (day === 0 ? -6 : 1 - day));
  return x;
}

function workdaysInMonth(year, month) {
  const last = new Date(year, month + 1, 0).getDate();
  let count = 0;
  for (let day = 1; day <= last; day++) {
    const d = new Date(year, month, day);
    if (d.getDay() !== 0 && d.getDay() !== 6) count++;
  }
  return count;
}

function remainingWorkdaysInMonth(date = new Date()) {
  const year = date.getFullYear(), month = date.getMonth();
  const last = new Date(year, month + 1, 0).getDate();
  let count = 0;
  for (let day = date.getDate(); day <= last; day++) {
    const d = new Date(year, month, day);
    if (d.getDay() !== 0 && d.getDay() !== 6) count++;
  }
  return count;
}


function weekEntries(d = new Date()) {
  const start = startOfWorkWeek(d);
  const end = addDays(start, 4);
  return entries.filter(entry => {
    const entryDate = safeDate(`${entry.date || ""}T00:00:00`);
    return entryDate >= start && entryDate <= end;
  });
}

function workHoursHealth(avgDailyNeed) {
  if (avgDailyNeed <= 8) return { label: "🟢 正常", className: "good" };
  if (avgDailyNeed <= 10) return { label: "🟡 稍落後", className: "warn" };
  return { label: "🔴 建議補時", className: "bad" };
}

function todaySummaryPanel() {
  const today = new Date();
  const monthDate = selectedMonthDate(1);
  const year = monthDate.getFullYear(), month = monthDate.getMonth();
  const monthlyDone = hours(monthEntries());
  const monthlyTarget = workdaysInMonth(year, month) * 8;
  const monthProgress = monthlyTarget ? Math.min(100, Math.round(monthlyDone / monthlyTarget * 100)) : 0;
  const remaining = Math.max(0, monthlyTarget - monthlyDone);
  const remainingDays = year === today.getFullYear() && month === today.getMonth() ? remainingWorkdaysInMonth(today) : workdaysInMonth(year, month);
  const avgDailyNeed = remainingDays ? Math.round(remaining / remainingDays * 10) / 10 : 0;
  const health = workHoursHealth(avgDailyNeed);
  const todayDone = hours(entriesForDate(today));
  const weekDone = hours(weekEntries(today));
  const weekProgress = Math.min(100, Math.round(weekDone / 40 * 100));
  const todayProgress = Math.min(100, Math.round(todayDone / 8 * 100));
  const remainingToday = Math.max(0, Math.round((8 - todayDone) * 10) / 10);
  const mobileOpen = readScopedUiFlag(MOBILE_SUMMARY_OPEN_KEY, false);
  return `<section class="panel mobile-summary-module summary-dashboard ${mobileOpen ? "mobile-open" : "mobile-collapsed"}"><div class="summary-dashboard-head"><h2>☀️ 今日摘要</h2><div class="summary-dashboard-label">📊 工時儀表板</div><button class="btn2 mobile-collapse-toggle" type="button" data-toggle-mobile-summary="1">${mobileOpen ? "▲" : "▼"}</button></div><div class="mobile-summary-compact"><div><span>今天</span><b>${todayDone} / 8h</b></div><div><span>還差</span><b>${remainingToday}h</b></div><div><span>達標</span><b>${health.label}</b></div></div><div class="summary-grid"><div class="summary-tile"><span>本月進度</span><b>${monthlyDone} / ${monthlyTarget}h</b><em>${monthProgress}%</em></div><div class="summary-tile"><span>本週進度</span><b>${weekDone} / 40h</b><em>${weekProgress}%</em></div><div class="summary-tile"><span>今日進度</span><b>${todayDone} / 8h</b><em>${todayProgress}%</em></div><div class="summary-tile summary-forecast ${health.className}"><span>達標預測</span><b>${health.label}</b></div></div></section>`;
}

function mobileCalendarPanel() {
  const isOpen = readScopedUiFlag(MOBILE_CALENDAR_OPEN_KEY, false);
  const today = new Date();
  const base = selectedMonthDate(1);
  const y = base.getFullYear(), m = base.getMonth();
  const first = new Date(y, m, 1);
  const start = startOfWeek(first);
  const last = new Date(y, m + 1, 0);
  const end = addDays(last, 6 - last.getDay());
  const days = [];
  for (let d = new Date(start); d <= end; d = addDays(d, 1)) days.push(d);
  const summaryHours = hours(entriesForDate(today));
  if (!isOpen) return `<div class="mobile-calendar-head"><button class="btn2" data-toggle-mobile-calendar="1">▼ 月曆</button><span class="muted">今日 ${String(today.getMonth() + 1).padStart(2, "0")}/${String(today.getDate()).padStart(2, "0")}｜${summaryHours} / 8h</span></div>`;
  return `<div class="mobile-calendar-head"><button class="btn2" data-toggle-mobile-calendar="1">▲ 月曆</button><span class="muted">${y} / ${String(m + 1).padStart(2, "0")}｜上下滑查看整月</span></div><div class="mobile-month-scroll"><div class="mobile-week-head">${["日", "一", "二", "三", "四", "五", "六"].map(x => `<span>${x}</span>`).join("")}</div><div class="mobile-two-week">${days.map(d => { const h = hours(entriesForDate(d)); const isToday = key(d) === key(today); const isSelected = key(d) === key(selected); const out = d.getMonth() !== m; return `<button class="mobile-day ${isToday ? "today" : ""} ${isSelected ? "sel" : ""} ${out ? "out" : ""}" data-mobile-date="${key(d)}"><b>${d.getDate()}</b><small>${h ? h + "h" : ""}</small></button>`; }).join("")}</div></div>`;
}

function mobileHomeActionPanel() {
  const todayDone = hours(entriesForDate(new Date()));
  const remaining = Math.max(0, Math.round((8 - todayDone) * 10) / 10);
  const message = remaining > 0 ? `💬 今天還有 ${remaining}h 尚未記錄` : "💬 今天工時已完成 ✅";
  return `<section class="panel mobile-home-action"><button class="btn full" data-action="add">＋ 新增工時</button><div class="mobile-today-mini"><span>今日工時</span><b>${todayDone} / 8h</b></div><div class="muted">${message}</div></section>`;
}

function todayPanel() {
  const list = dayEntries();
  const h = hours(list);
  return `<div class="panel-head"><h2>我的工作</h2><div class="tag">${h} / 8h</div></div>${list.length ? list.map(e => `<div class="entry"><div class="entry-main"><b>${escapeHtml(e.title)}</b><div class="muted">${fmt(e.at)}｜${Number(e.hours || 0)}h${e.ecpTask ? `｜🏷 任務` : ""}</div></div><div class="actions compact entry-actions"><button class="btn amber" data-edit-id="${e.id}">編輯</button><button class="btn red" data-del-id="${e.id}">刪除</button></div></div>`).join("") : `<div class="empty"><b>尚無工時紀錄</b><div class="muted">可採納推理預測，或使用下方按鈕新增工作。</div></div>`}<button class="btn full today-add-bottom" data-action="add">➕ 新增工作</button>`;
}

function makeSuggestions() {
  if (!profile) return [];
  const done = dayEntries().map(e => e.title);
  let tags = workModels();
  tags.sort((a, b) => (feedback[b] || 0) - (feedback[a] || 0));
  const suggestions = [];
  const reserved = [];
  for (const tag of tags) {
    if (done.some(d => d.includes(tag))) continue;
    const hours = 1;
    const startMinutes = availableStartMinutes(key(), hours, null, reserved);
    const at = `${key()}T${timeFromMinutes(startMinutes)}`;
    const endMinutes = startMinutes + Math.round(hours * 60);
    reserved.push({ start: startMinutes, end: endMinutes });
    suggestions.push({
      id: tag,
      title: tag,
      note: "",
      hours,
      at,
      ecpTask: defaultEcpTaskName(tag),
      sourceLabel: "🧩 工作模型",
      suggestedTimeLabel: `${timeFromMinutes(startMinutes)}–${timeFromMinutes(endMinutes)}`
    });
  }
  return suggestions;
}

function suggestionPanel() {
  const s = makeSuggestions();
  if (!s.length) return `<h2>🤖 推理預測</h2><div class="empty"><b>目前沒有推理預測</b><div class="muted">可能今天已滿工時，或工作模型尚未建立。</div></div>`;
  const queueItems = s.slice(0, AI_REASON_QUEUE_SIZE);
  const slots = Array.from({ length: AI_REASON_QUEUE_SIZE }, (_, i) => queueItems[i]);
  return `<div class="panel-head"><h2>🤖 推理預測</h2><div class="tag">${queueItems.length} / ${s.length}</div></div><div class="ai-suggestion-list queue-list">${slots.map(x => x ? `<div class="suggestion compact-card"><div class="suggestion-title-row"><h3>${escapeHtml(x.title)}</h3><div class="actions suggestion-actions"><button class="btn green" data-accept="${escapeHtml(x.id)}">採納</button><button class="btn amber" data-adjust="${escapeHtml(x.id)}">編輯</button></div></div><div class="suggestion-source">${escapeHtml(x.sourceLabel || "🤖 AI 推理")}｜🕘 建議 ${escapeHtml(x.suggestedTimeLabel || String(x.at || "").slice(11, 16))}</div></div>` : `<div class="suggestion compact-card placeholder-card"><div class="muted">等待新的推理預測</div></div>`).join("")}</div>`;
}

function renderAssistantCard(card = null) {
  if (!card) return "";
  if (card.type === "quick_suggestions") {
    return `<div class="assistant-command-card assistant-quick-card"><div class="assistant-card-title">可以從這裡開始</div><div class="assistant-quick-row"><button class="btn2" type="button" data-assistant-quick="worklog">💼 建立工時</button><button class="btn2" type="button" data-assistant-quick="calendar">📅 建立 Calendar</button><button class="btn2" type="button" data-assistant-quick="task">✅ 建立任務</button></div></div>`;
  }
  if (card.type === "confirm_entry") {
    const p = card.payload || {};
    return `<div class="assistant-command-card"><div class="assistant-card-title">請確認這筆工時</div><div class="assistant-card-grid"><span>日期</span><b>${escapeHtml(p.date || "")}</b><span>時間</span><b>${escapeHtml(p.start || "")}–${escapeHtml(p.end || "")}</b><span>工時</span><b>${escapeHtml(String(p.hours || ""))}h</b><span>描述</span><b>${escapeHtml(p.title || "")}</b></div><div class="assistant-card-actions"><button class="btn green" type="button" data-assistant-confirm-entry="1">確認建立</button><button class="btn2" type="button" data-assistant-cancel-command="1">取消</button></div></div>`;
  }
  if (card.type === "duration_prompt") {
    const title = card.intent === "leave" ? "請選擇請假時間" : "請選擇預計時間";
    return `<div class="assistant-command-card"><div class="assistant-card-title">${escapeHtml(title)}</div><div class="assistant-duration-row">${[0.5, 1, 1.5, 2].map(h => `<button class="btn2" type="button" data-assistant-duration="${h}">${h === 0.5 ? "30m" : h + "h"}</button>`).join("")}<button class="btn2" type="button" data-assistant-custom-duration="1">自訂</button></div></div>`;
  }
  if (card.type === "entry_created") {
    const p = card.payload || {};
    return `<div class="assistant-command-card assistant-created-card"><div class="assistant-card-title">✅ 已建立工時</div><div class="assistant-card-grid"><span>描述</span><b>${escapeHtml(p.title || "")}</b><span>日期</span><b>${escapeHtml(p.date || "")}</b><span>時間</span><b>${escapeHtml(p.start || "")}–${escapeHtml(p.end || "")}</b><span>工時</span><b>${escapeHtml(String(p.hours || ""))}h</b></div></div>`;
  }
  if (card.type === "task_draft") {
    const p = card.payload || {};
    return `<div class="assistant-command-card"><div class="assistant-card-title">📝 任務草稿</div><div class="assistant-card-grid"><span>任務</span><b>${escapeHtml(p.title || "待辦")}</b><span>狀態</span><b>待建立正式任務功能</b></div></div>`;
  }
  if (card.type === "calendar_draft") {
    const p = card.payload || {};
    return `<div class="assistant-command-card"><div class="assistant-card-title">📅 Calendar 草稿</div><div class="assistant-card-grid"><span>日期</span><b>${escapeHtml(p.date || "")}</b><span>時間</span><b>${escapeHtml(p.start || "")}–${escapeHtml(p.end || "")}</b><span>內容</span><b>${escapeHtml(p.title || "")}</b><span>狀態</span><b>待建立 Calendar 寫入功能</b></div></div>`;
  }
  if (card.type === "confirm_calendar") {
    const p = card.payload || {};
    return `<div class="assistant-command-card"><div class="assistant-card-title">請確認建立 Calendar</div><div class="assistant-card-grid"><span>日期</span><b>${escapeHtml(p.date || "")}</b><span>時間</span><b>${escapeHtml(p.start || "")}–${escapeHtml(p.end || "")}</b><span>Duration</span><b>${escapeHtml(String(p.hours || ""))}h</b><span>內容</span><b>${escapeHtml(p.title || "")}</b></div><div class="assistant-card-actions"><button class="btn green" type="button" data-assistant-confirm-calendar="1">確認建立</button><button class="btn2" type="button" data-assistant-cancel-command="1">取消</button></div></div>`;
  }
  if (card.type === "calendar_created") {
    const p = card.payload || {};
    return `<div class="assistant-command-card assistant-created-card"><div class="assistant-card-title">✅ Calendar 已建立</div><div class="assistant-card-grid"><span>內容</span><b>${escapeHtml(p.title || "")}</b><span>日期</span><b>${escapeHtml(p.date || "")}</b><span>時間</span><b>${escapeHtml(p.start || "")}–${escapeHtml(p.end || "")}</b><span>Duration</span><b>${escapeHtml(String(p.hours || ""))}h</b></div>${card.offerWorklog ? `<div class="assistant-card-actions"><button class="btn green" type="button" data-assistant-calendar-to-worklog="1">建立工時</button><button class="btn2" type="button" data-assistant-calendar-no-worklog="1">不用</button></div>` : ""}</div>`;
  }
  if (card.type === "work_profile_confirm") {
    const p = normalizeWorkProfile(card.payload || {}, profile);
    return `<div class="assistant-command-card"><div class="assistant-card-title">請確認您的工作身分</div><div class="assistant-card-grid"><span>負責人</span><b>${escapeHtml(p.ecpResponsiblePerson || "")}</b><span>部門</span><b>${escapeHtml(p.ecpDepartment || "")}</b><span>目前工作任務</span><b>${escapeHtml(p.defaultTask || "")}</b></div><div class="assistant-card-actions"><button class="btn green" type="button" data-assistant-confirm-work-profile="1">確認</button><button class="btn2" type="button" data-assistant-edit-work-profile="1">修改</button><button class="btn2" type="button" data-assistant-later-work-profile="1">稍後</button></div></div>`;
  }
  return "";
}

function renderAssistantMessage(msg = {}) {
  const roleClass = msg.role === "user" ? "user" : "bot";
  const time = chatMessageTime(msg.at);
  return `<div class="assistant-msg ${roleClass} ${msg.transient ? "thinking" : ""}"><div class="assistant-msg-time">${escapeHtml(time)}</div>${escapeHtml(msg.text)}${renderAssistantCard(msg.card)}</div>`;
}

function chatMessageTime(value = "") {
  if (!value) return "";
  const p = taipeiDateTimeParts(value);
  return `${p.hour}:${p.minute}`;
}

function chatDividerLabel(value = "") {
  const p = taipeiDateTimeParts(value || new Date().toISOString());
  const today = taipeiDateTimeParts(new Date().toISOString());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const y = taipeiDateTimeParts(yesterday.toISOString());
  const date = `${p.year}-${p.month}-${p.day}`;
  if (date === `${today.year}-${today.month}-${today.day}`) return "今天";
  if (date === `${y.year}-${y.month}-${y.day}`) return "昨天";
  return `${p.year}/${p.month}/${p.day}`;
}

function renderAssistantThread(messages = []) {
  let last = "";
  return messages.map(msg => {
    const label = chatDividerLabel(msg.at);
    const divider = label !== last ? `<div class="assistant-date-divider"><span>${escapeHtml(label)}</span></div>` : "";
    last = label;
    return divider + renderAssistantMessage(msg);
  }).join("");
}

function assistantNudgeText() {
  const done = profile ? hours(entriesForDate(new Date())) : 0;
  const remaining = Math.max(0, Math.round((8 - done) * 10) / 10);
  if (!profile) return "💬 諸葛先生";
  if (remaining <= 0) return "💬 今天工時已完成 ✅";
  return `💬 今天還有 ${remaining}h 尚未紀錄`;
}

function assistantWelcomePanel(mode = "floating") {
  const modeClass = mode === "extension" ? "extension-assistant" : (mode === "standalone" ? "standalone-assistant" : "floating-assistant");
  return `<section class="panel assistant-panel ${modeClass}"><div class="assistant-welcome"><h2>歡迎來到 ZhuGe AI OS</h2><p>我是諸葛先生。</p><p>我會協助你管理工時，之後也會協助你閱讀公司的知識。</p><p>今天先完成工時助手。</p><button class="btn full" type="button" data-start-assistant="1">開始</button>${mode === "floating" ? `<button class="btn2 full" type="button" data-close-assistant="1">稍後</button>` : ""}</div></section>`;
}

function worklogAssistantPanel(mode = "web") {
  const messages = conversationMessages();
  const visibleMessages = messages.filter(msg => !msg.transient);
  const starter = !visibleMessages.length ? renderAssistantMessage({
    role: "assistant",
    text: "您好，我是諸葛先生。\n\n今天想完成什麼？",
    card: { type: "quick_suggestions" }
  }) : "";
  const intro = mode === "extension"
    ? `<div class="muted">您可以直接告訴我：今天下午三點到四點開會、明天下午請特休、今天補一小時工時。</div>`
    : `<div class="muted">今天想完成什麼？</div>`;
  const title = "👤 諸葛先生";
  const modeClass = mode === "extension" ? "extension-assistant" : (mode === "floating" ? "floating-assistant" : (mode === "standalone" ? "standalone-assistant" : "assistant-module"));
  const installAction = mode === "standalone"
    ? (CHROME_EXTENSION_STORE_URL
      ? `<a class="assistant-icon-action" href="${escapeHtml(CHROME_EXTENSION_STORE_URL)}" target="_blank" rel="noopener" title="安裝 Chrome 擴充功能" aria-label="安裝 Chrome 擴充功能">🧩</a>`
      : `<button class="assistant-icon-action disabled" type="button" disabled title="安裝 Chrome 擴充功能（即將推出）" aria-label="安裝 Chrome 擴充功能（即將推出）">🧩</button>`)
    : "";
  const osAction = mode === "extension" || mode === "standalone"
    ? `<a class="assistant-icon-action" href="${escapeHtml(appHomeUrl())}" target="${mode === "extension" ? "_blank" : "_self"}" rel="noopener" title="開啟 ZhuGe AI OS" aria-label="開啟 ZhuGe AI OS">🖥</a>`
    : "";
  const fullscreenAction = mode === "floating"
    ? `<a class="assistant-icon-action" href="${escapeHtml(standaloneChatUrl())}" title="全螢幕開啟" aria-label="全螢幕開啟">↗</a>`
    : "";
  const close = mode === "floating" ? `<button class="assistant-icon-action" type="button" data-close-assistant="1" title="關閉" aria-label="關閉">×</button>` : "";
  const headerActions = `<div class="assistant-header-actions">${installAction}${osAction}${fullscreenAction}${close}</div>`;
  const statusNotice = conversationSync.status === "uninitialized"
    ? `<div class="assistant-sync-warning">Conversation 尚未初始化，聊天目前僅儲存在此瀏覽器。</div>`
    : (conversationSync.status === "failed" ? `<div class="assistant-sync-warning">Conversation 同步失敗：${escapeHtml(conversationSync.error || "請稍後再試")}</div>` : "");
  return `<section class="panel assistant-panel ${modeClass}"><div class="panel-head assistant-chat-head"><div><h2>${title}</h2>${intro}</div>${headerActions}</div>${statusNotice}<div class="assistant-thread" id="assistantThread">${starter}${renderAssistantThread(messages)}</div><div class="assistant-input-row chat-composer"><textarea class="input" id="assistantInput" rows="1" placeholder="例如：今天下午三點到四點開會"></textarea><button class="assistant-send" id="assistantSend" type="button" disabled title="送出" aria-label="送出">➤</button></div></section>`;
}

function extensionAssistantScreen() {
  return `<div class="wrap extension-quick-entry"><div class="card">${hasSeenAssistantWelcome() ? worklogAssistantPanel("extension") : assistantWelcomePanel("extension")}</div></div>`;
}

function standaloneChatScreen() {
  const body = hasSeenAssistantWelcome() ? worklogAssistantPanel("standalone") : assistantWelcomePanel("standalone");
  return `<main class="standalone-chat-page">${body}</main>`;
}

function floatingAssistantWidget() {
  if (!session) return "";
  if (!isAssistantOpen()) return `<div class="floating-assistant-widget collapsed"><button class="floating-assistant-button" type="button" data-open-assistant="1"><span>${escapeHtml(assistantNudgeText())}</span></button></div>`;
  const body = hasSeenAssistantWelcome() ? worklogAssistantPanel("floating") : assistantWelcomePanel("floating");
  return `<div class="floating-assistant-widget open">${body}</div>`;
}

function center() {
  return `<div class="workbench-grid">${workProfileStatusCard()}${mobileHomeActionPanel()}${todaySummaryPanel()}<section class="panel module calendar-module"><div class="desktop-calendar">${calendarPanel()}</div><div class="mobile-calendar">${mobileCalendarPanel()}</div></section><section class="panel module today-module">${todayPanel()}</section><section class="panel module suggestion-module">${suggestionPanel()}</section></div>`;
}

function workProfileStatusCard() {
  const missing = workProfileMissingFields(workProfile);
  const ready = !missing.length;
  const task = normalizeWorkProfile(workProfile).defaultTask || "尚未設定";
  return `<section class="panel work-profile-status ${ready ? "ready" : "incomplete"}"><button class="work-identity-status-button" type="button" data-open-workspace="settings"><span>${ready ? "🟢" : "🟠"} 工作身分</span><b>${ready ? "已完成" : "尚未完成"}</b></button><div class="work-identity-detail"><div class="muted">${ready ? "✓ 已完成" : `⚠ 尚未完成：${missing.join("、")}`}</div><div class="source-path">目前工作任務：${escapeHtml(task)}</div></div><button class="btn2 work-identity-settings" data-open-workspace="settings">設定</button></section>`;
}

function workDescriptionSuggestions(query = "") {
  const source = workModels().map(x => String(x || "").trim()).filter(Boolean);
  const unique = [...new Set(source)];
  const q = query.trim().toLowerCase();
  return unique.filter(x => !q || x.toLowerCase().includes(q));
}

function descriptionSuggestionChips(query = "") {
  const list = workDescriptionSuggestions(query);
  return `<div class="history-suggestions" id="descriptionSuggestions">${list.map(x => `<button class="btn2 suggestion-chip" type="button" data-title-suggestion="${escapeHtml(x)}">${escapeHtml(x)}</button>`).join("")}<button class="btn2 suggestion-chip add-chip" type="button" data-open-work-description-dialog="1">＋新增</button></div><div class="quick-add-dialog" id="workDescriptionDialog" style="display:none"><div class="quick-add-card"><h3>新增工作描述</h3><label>名稱：</label><input class="input" id="newWorkDescription" placeholder="例如：請假-特休、會議、主管交辦"><div class="form-actions"><button class="btn2" type="button" data-cancel-work-description="1">取消</button><button class="btn" type="button" data-add-work-description="1">新增</button></div></div></div>`;
}

function capture(editId = null, seed = null) {
  editId = editId || editingEntryId;
  seed = seed || captureSeed;
  const e = editId ? entries.find(x => x.id === editId) : null;
  const title = e ? e.title : (seed ? seed.title : "");
  const note = e ? (e.note || "") : (seed ? seed.note || "" : "");
  const ecpTask = e ? (e.ecpTask || "") : (seed ? seed.ecpTask || defaultEcpTaskName(seed.title) : defaultEcpTaskName(title));
  return `<section class="panel capture-panel" style="margin-top:18px"><div class="panel-head"><div><h2>${e ? "編輯工時" : "➕ 快速紀錄"}</h2></div></div><div class="form capture-form"><label>日期 / 開始時間</label><input class="input" id="dt" type="datetime-local" value="${e ? e.at : captureDefaultStart()}"><label>工作描述（必填）</label><input class="input" id="title" value="${escapeHtml(title)}" placeholder="例如：採購案件處理、特休" autocomplete="off">${descriptionSuggestionChips(title)}<label>ECP 任務（選填）</label><select id="ecpTaskSelect" class="input">${ecpTaskOptions(ecpTask)}</select><div class="work-model-add ecp-task-quick-add" id="ecpTaskQuickAdd" style="display:none"><input class="input" id="newEcpTaskCapture" placeholder="新增 ECP 任務，例如：採購案件處理"><button class="btn2" data-add-capture-ecp-task="1" type="button">＋ 新增</button></div><label>工時</label><div class="row hours">${[0.5, 1, 1.5, 2, 3, 4, 5, 8].map(h => `<button class="btn2 hour" data-h="${h}">${h === 0.5 ? "30m" : h + "h"}</button>`).join("")}</div><label>備註（選填）</label><input class="input" id="note" value="${escapeHtml(note)}" placeholder="補充說明，不參與 ECP 匯出"><div class="form-actions capture-actions"><button class="btn2" data-capture-cancel="1">取消</button><button class="btn" id="saveEntry">儲存</button></div></div></section>`;
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
    ["Cloud Sync", cloudSyncLabel(), cloudSyncDetail(), ""],
    ["AI 引擎", "🟢 正常", "目前模型：GPT-5.5", ""],
    ["Supabase", session ? "🟢 已連線" : "⚪ 尚未登入", session ? "Auth Session OK" : "需要先完成 Google Login", ""],
    ["本機資料", "🟢 正常", `最後同步：${checkedDate}`, ""]
  ];
  return `<section class="panel control-center" style="margin-top:18px"><div class="panel-head"><div><h2>🔗 控制台</h2><div class="muted">AI OS 各項服務連線狀態與健康檢查。</div></div></div><div class="control-grid">${services.map(([name, state, detail, action, type]) => `<div class="service-card ${type === "summary" ? "summary-card" : ""}"><div><h3>${escapeHtml(name)}</h3><b>${escapeHtml(state)}</b><div class="muted">${escapeHtml(detail)}</div></div>${action}</div>`).join("")}</div></section>`;
}

function nextKnowledgeId() {
  const max = library
    .map(item => String(item.knowledgeId || "").match(/^KB-(\d{6})$/)?.[1])
    .filter(Boolean)
    .map(Number)
    .reduce((n, v) => Math.max(n, v), 0);
  return `KB-${String(max + 1).padStart(6, "0")}`;
}

function knowledgeStatusFromLegacy(item = {}) {
  const status = item.status || item.readingStatus || "";
  if (status.includes("已驗證")) return "⭐ 已驗證";
  if (status.includes("已建立知識")) return "🟢 AI 已建立知識";
  if (status.includes("已閱讀") || status.includes("已完成")) return "🔵 AI 已閱讀";
  return "🟡 已上傳";
}

function aiStatusFromLegacy(item = {}) {
  const ai = item.aiStatus || item.readingStatus || "";
  if (ai.includes("已驗證")) return "已驗證";
  if (ai.includes("已建立知識")) return "AI 已建立知識";
  if (ai.includes("已閱讀") || ai.includes("已完成")) return "AI 已閱讀";
  if (ai.includes("等待")) return "等待 AI 閱讀";
  return "未建立";
}

function arrayFromInput(value) {
  if (Array.isArray(value)) return value.map(x => String(x).trim()).filter(Boolean);
  return String(value || "").split(/[,\n，]/).map(x => x.trim()).filter(Boolean);
}

function normalizeKnowledgeScope(value = "personal") {
  const raw = String(value || "personal").trim();
  const map = { Personal: "personal", Role: "role", Company: "company", Public: "public" };
  const normalized = map[raw] || raw.toLowerCase();
  return KNOWLEDGE_SCOPES.includes(normalized) ? normalized : "personal";
}

function normalizeKnowledgeProcessingStatus(value = "uploaded") {
  const raw = String(value || "uploaded").trim();
  const legacyMap = {
    "🟡 已上傳": "uploaded",
    "🔵 AI 已閱讀": "processed",
    "🟢 AI 已建立知識": "knowledge_built",
    "⭐ 已驗證": "verified",
    "未建立": "uploaded",
    "等待 AI 閱讀": "uploaded"
  };
  const normalized = legacyMap[raw] || raw;
  return KNOWLEDGE_PROCESSING_STATUS.includes(normalized) ? normalized : "uploaded";
}

function sanitizeStorageFileName(name = "") {
  const cleaned = String(name || "knowledge-source")
    .replace(/[\\/:*?"<>|#%{}^~\\[\\]`]/g, "-")
    .replace(/\s+/g, "_")
    .slice(0, 140);
  return cleaned || "knowledge-source";
}

function inferKnowledgeSourceType(name = "") {
  const lower = String(name || "").toLowerCase();
  if (/\.pdf$/.test(lower)) return "pdf";
  if (/\.(doc|docx)$/.test(lower)) return "word";
  if (/\.(xls|xlsx|csv)$/.test(lower)) return "excel";
  if (/\.(ppt|pptx)$/.test(lower)) return "powerpoint";
  if (/\.(md|markdown|txt)$/.test(lower)) return "markdown";
  if (/^https?:\/\//.test(lower)) return "url";
  return "file";
}

function normalizeKnowledgeSourceType(value = "", fallbackName = "") {
  const raw = String(value || "").trim();
  const map = { "上傳文件": "file", "PDF": "pdf", "網址": "url", legacy: "legacy_metadata" };
  const normalized = map[raw] || raw.toLowerCase();
  return KNOWLEDGE_SOURCE_TYPES.includes(normalized) ? normalized : inferKnowledgeSourceType(fallbackName);
}

function processingStatusLabel(status = "uploaded") {
  const labels = {
    uploaded: "🟡 uploaded",
    queued: "⚪ queued",
    processing: "🔄 processing",
    processed: "🔵 processed",
    knowledge_built: "🟢 knowledge_built",
    verified: "⭐ verified",
    failed: "🔴 failed",
    archived: "⚫ archived"
  };
  return labels[status] || status;
}

function normalizedLibraryItem(item = {}) {
  const now = new Date().toISOString();
  const filename = item.filename || item.storagePath || item.location || "";
  const title = item.title || item.name || filename || "";
  const createdAt = item.createdAt || item.created_at || now;
  return {
    id: item.id || uid("kb"),
    cloudId: item.cloudId || item.cloud_id || undefined,
    organizationId: item.organizationId || item.organization_id || null,
    tenantId: item.tenantId || item.tenant_id || null,
    knowledgeId: item.knowledgeId || item.knowledge_id || "",
    title,
    name: title,
    description: item.description || "",
    category: KNOWLEDGE_CATEGORIES.includes(item.category) ? item.category : "其他",
    scope: normalizeKnowledgeScope(item.scope),
    sourceType: normalizeKnowledgeSourceType(item.sourceType || item.source_type || item.type, filename),
    sourceName: item.sourceName || item.source_name || filename,
    sourceUrl: item.sourceUrl || item.source_url || "",
    mimeType: item.mimeType || item.mime_type || "",
    fileSize: Number(item.fileSize || item.file_size || 0) || 0,
    applicableAgents: arrayFromInput(item.applicableAgents || item.applicable_agents || ["採購 Agent"]),
    relatedRoles: arrayFromInput(item.relatedRoles || item.related_roles),
    relatedWorkModels: arrayFromInput(item.relatedWorkModels || item.related_work_models),
    tags: arrayFromInput(item.tags),
    triggers: arrayFromInput(item.triggers),
    processingStatus: normalizeKnowledgeProcessingStatus(item.processingStatus || item.processing_status || item.status || item.aiStatus || item.ai_status),
    status: normalizeKnowledgeProcessingStatus(item.processingStatus || item.processing_status || item.status || item.aiStatus || item.ai_status),
    aiStatus: normalizeKnowledgeProcessingStatus(item.processingStatus || item.processing_status || item.status || item.aiStatus || item.ai_status),
    version: item.version || "v1.0",
    sourceVersion: item.sourceVersion || item.source_version || item.version || "v1.0",
    createdAt,
    updatedAt: item.updatedAt || item.updated_at || createdAt,
    filename,
    storagePath: item.storagePath || item.storage_path || filename,
    type: normalizeKnowledgeSourceType(item.type || item.sourceType || item.source_type, filename),
    readingStatus: normalizeKnowledgeProcessingStatus(item.processingStatus || item.processing_status || item.status || item.aiStatus || item.ai_status),
    location: filename,
    purpose: item.purpose || ""
  };
}

function knowledgeFromCloud(row = {}) {
  return normalizedLibraryItem({
    id: row.legacy_id || row.id,
    cloudId: row.id,
    knowledgeId: row.knowledge_id,
    title: row.title,
    description: row.description,
    category: row.category,
    scope: row.scope,
    organizationId: row.organization_id,
    tenantId: row.tenant_id,
    sourceType: row.source_type,
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    mimeType: row.mime_type,
    fileSize: row.file_size,
    applicableAgents: row.applicable_agents || [],
    relatedRoles: row.related_roles || [],
    relatedWorkModels: row.related_work_models || [],
    tags: row.tags || [],
    triggers: row.triggers || [],
    processingStatus: row.processing_status,
    status: row.processing_status,
    aiStatus: row.processing_status,
    version: row.version,
    sourceVersion: row.source_version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    filename: row.filename,
    storagePath: row.storage_path
  });
}

function selectOptions(options = [], selected = "") {
  return options.map(option => `<option value="${escapeHtml(option)}" ${option === selected ? "selected" : ""}>${escapeHtml(option)}</option>`).join("");
}

function checkboxGroup(options = [], selected = [], name = "") {
  const set = new Set(selected || []);
  return `<div class="work-model-list">${options.map(option => `<label class="work-model-check"><input type="checkbox" name="${escapeHtml(name)}" value="${escapeHtml(option)}" ${set.has(option) ? "checked" : ""}><span>${escapeHtml(option)}</span></label>`).join("")}</div>`;
}

function formatKnowledgeTime(value = "") {
  if (!value) return "";
  return fmt(value);
}

function formatFileSize(bytes = 0) {
  const n = Number(bytes || 0);
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 102.4) / 10} KB`;
  return `${Math.round(n / 1024 / 102.4) / 10} MB`;
}

function legacyKnowledgeItems() {
  return readJson("wl_library", []).filter(item => item && !item.p5Migrated);
}

function hasLegacyKnowledgeMigrationDone() {
  return localStorage.getItem(scopedLocalKey(LEGACY_KNOWLEDGE_MIGRATION_KEY)) === "1";
}

function knowledgeInitializationNotice() {
  return `<div class="empty"><b>📚 藏書閣尚未初始化</b><div class="muted">Knowledge Database 或 Storage Bucket 尚未建立。這不影響 WorkLog / Conversation / Calendar / OAuth。</div><div class="source-path">請先執行：docs/supabase/20260712_p5_1_knowledge_repository_schema.sql</div><div class="muted">完成 SQL 與 Storage Policy 建立後，重新整理頁面即可啟用 Knowledge Repository。</div></div>`;
}

function libraryView() {
  const addButton = knowledgeFoundationNotInitialized ? "" : `<button class="btn" data-add-library="1">新增知識</button>`;
  const legacyItems = legacyKnowledgeItems();
  const legacyBlock = !knowledgeFoundationNotInitialized && legacyItems.length && !hasLegacyKnowledgeMigrationDone()
    ? `<div class="empty knowledge-migration-preview"><b>偵測到舊版 wl_library：${legacyItems.length} 筆</b><div class="muted">Legacy Migration 需使用者確認。若舊資料沒有原始 File 物件，將先搬 Metadata，原始檔請後續編輯補上傳。</div><button class="btn2" data-preview-legacy-knowledge="1">預覽 / 搬移 Legacy 藏書</button></div>`
    : "";
  const body = knowledgeFoundationNotInitialized
    ? knowledgeInitializationNotice()
    : (library.length ? library.map(raw => {
      const item = normalizedLibraryItem(raw);
      return `<div class="entry knowledge-card"><div class="entry-main"><b>${escapeHtml(item.title)}</b><div class="muted">${escapeHtml(item.knowledgeId || "待 Cloud 產生")}｜${escapeHtml(item.category)}｜${escapeHtml(KNOWLEDGE_SCOPE_LABELS[item.scope] || item.scope)}｜${escapeHtml(item.version)}</div><small>${escapeHtml(item.description || "")}</small><div class="library-tag-line">${item.tags.map(tag => `<span>${escapeHtml(tag)}</span>`).join("")}</div><div class="library-tag-line">${item.triggers.map(tag => `<span>Trigger：${escapeHtml(tag)}</span>`).join("")}</div><div class="source-path">Agents：${escapeHtml(item.applicableAgents.join("、") || "未指定")}｜Roles：${escapeHtml(item.relatedRoles.join("、") || "未指定")}｜Work Models：${escapeHtml(item.relatedWorkModels.join("、") || "未指定")}</div><div class="source-path">Processing：${escapeHtml(processingStatusLabel(item.processingStatus))}｜Source：${escapeHtml(item.sourceType)}｜File：${escapeHtml(item.filename || item.sourceName || "尚未上傳正式檔案")} ${escapeHtml(formatFileSize(item.fileSize))}</div><div class="source-path">Uploaded：${escapeHtml(formatKnowledgeTime(item.createdAt))}｜Updated：${escapeHtml(formatKnowledgeTime(item.updatedAt))}</div></div><div class="actions compact"><button class="btn2" data-preview-library="${item.id}">預覽</button><button class="btn2" data-download-library="${item.id}">下載原始檔</button><button class="btn2" data-edit-library="${item.id}">編輯 Metadata</button><button class="btn2" data-archive-library="${item.id}">封存</button><button class="btn2 danger" data-del-library="${item.id}">刪除</button></div></div>`;
    }).join("") : `<div class="empty"><b>尚無 Knowledge Source</b><div class="muted">請新增 SOP、制度、法規、表單或教材，建立諸葛先生的 Knowledge Brain 地基。</div></div>`);
  return `<section class="panel" style="margin-top:18px"><div class="panel-head"><div><h2>📚 藏書閣</h2><div class="muted">Knowledge Repository Foundation：將正式文件上傳至 Cloud Storage，並建立可供未來 AI 判斷的 Knowledge Source。</div></div>${addButton}</div>${legacyBlock}<div class="library-list">${body}</div></section>`;
}

function libraryForm(id = null) {
  const item = normalizedLibraryItem(id ? library.find(x => x.id === id) : {});
  return `<section class="panel" style="margin-top:18px"><div class="panel-head"><div><h2>${id ? "編輯 Knowledge Metadata" : "新增 Knowledge Source"}</h2><div class="muted">P5 Phase 1 只建立 Knowledge Repository，不做 AI/RAG/Embedding。</div></div><button class="btn2" data-library-back="1">返回</button></div><label>Knowledge ID</label><input id="libKnowledgeId" class="input" value="${escapeHtml(item.knowledgeId || "儲存後由 Cloud 產生")}" readonly><label>Title</label><input id="libTitle" class="input" value="${escapeHtml(item.title || "")}" placeholder="例如：採購請購 SOP"><label>Description</label><textarea id="libDesc" placeholder="這份知識想讓諸葛先生知道什麼？">${escapeHtml(item.description || "")}</textarea><label>Category</label><select id="libCategory" class="input">${selectOptions(KNOWLEDGE_CATEGORIES, item.category)}</select><label>Knowledge Scope</label><select id="libScope" class="input">${KNOWLEDGE_SCOPES.map(scope => `<option value="${escapeHtml(scope)}" ${scope === item.scope ? "selected" : ""}>${escapeHtml(KNOWLEDGE_SCOPE_LABELS[scope])}</option>`).join("")}</select><div class="muted">Company / Role scope 目前為架構預留；正式多人共享權限待 Organization Identity 完成。</div><label>Applicable Agents</label>${checkboxGroup(KNOWLEDGE_AGENTS, item.applicableAgents, "libAgents")}<label>Related Roles</label>${checkboxGroup(KNOWLEDGE_ROLE_OPTIONS, item.relatedRoles, "libRoles")}<label>Related Work Models</label>${checkboxGroup(workModels(), item.relatedWorkModels, "libWorkModels")}<label>Tags</label><input id="libTags" class="input" value="${escapeHtml(item.tags.join("、"))}" placeholder="採購、請購、供應商、SOP"><label>Triggers</label><input id="libTriggers" class="input" value="${escapeHtml(item.triggers.join("、"))}" placeholder="供應商會議、新供應商、年度評鑑"><label>Version</label><input id="libVersion" class="input" value="${escapeHtml(item.version || "v1.0")}" placeholder="v1.0"><label>Source Version</label><input id="libSourceVersion" class="input" value="${escapeHtml(item.sourceVersion || item.version || "v1.0")}" placeholder="v1.0"><label>Processing Status</label><div class="readonly-status">${escapeHtml(processingStatusLabel(item.processingStatus || "uploaded"))}</div><label>正式檔案</label><div class="upload-drop"><input id="libFile" type="file"><span>${escapeHtml(item.filename || "請選擇要上傳至 Supabase Storage 的檔案")}</span></div><div class="library-ai-preview"><b>本階段不執行 AI 閱讀</b><div class="muted">檔案會成為正式 Knowledge Source；未來才由 Knowledge Intelligence 建立 Units、Citation 與 Recommendation。</div></div><div class="form-actions"><button class="btn2" data-library-cancel="1">取消</button><button class="btn" id="saveLibrary">儲存 Knowledge Source</button></div></section>`;
}

function settings() {
  const models = workModels();
  const tasks = ecpTasks();
  const wp = normalizeWorkProfile(workProfile || {}, profile);
  const profileStatus = isWorkProfileReady(wp) ? "✓ 已完成" : `⚠ 尚未完成：${workProfileMissingFields(wp).join("、")}`;
  return `<section class="panel" style="margin-top:18px"><h2>⚙️ 設定</h2><div class="entry"><b>目前使用者</b><div class="muted">${escapeHtml(session.name)}｜${escapeHtml(session.status || session.email || "")}</div></div><div class="entry"><b>工作身分</b><div class="muted">${escapeHtml(profileStatus)}</div><div class="source-path">目前工作任務：${escapeHtml(wp.defaultTask || "尚未設定")}｜有效月份：${escapeHtml(wp.taskEffectiveMonth || "尚未設定")}</div></div><div class="entry"><b>Smart Auto Save</b><div class="muted">設定一修改即更新本機狀態，約 2 秒後自動同步 Cloud。</div></div><label>角色</label><select id="roleSet" class="input">${roles.map(r => `<option ${profile && profile.role === r ? "selected" : ""}>${r}</option>`).join("")}</select><div class="work-model-section"><label>工作模型</label><div class="work-model-list" id="workModelList">${workModelChecks(models, models)}</div><div class="work-model-add"><input class="input" id="newWorkModel" placeholder="新增工作模型，例如：ISO 稽核"><button class="btn2" id="addWorkModel" type="button">＋ 新增工作模型</button></div><div class="muted">工作模型給 AI 學習、推理與推薦使用，不直接等於 ECP 匯入欄位。</div></div><div class="work-model-section"><label>ECP 設定</label><label>ECP 負責人</label><input class="input" id="ecpOwner" value="${escapeHtml(profile?.ecpOwner || "")}" placeholder="例如：陳彥達-UU"><label>ECP 負責部門</label><input class="input" id="ecpDepartment" value="${escapeHtml(profile?.ecpDepartment || "")}" placeholder="例如：UU管理部"><label>目前工作任務（Current Active Task）</label>${ecpTaskList(tasks)}<div class="work-model-add"><input class="input" id="newEcpTask" placeholder="新增 ECP 任務，例如：採購案件處理"><button class="btn2" id="addEcpTask" type="button">＋ 新增 ECP 任務</button></div><div class="muted">目前工作任務會作為 ECP 匯出的任務欄位來源；快速紀錄仍可選「不指定 ECP 任務」。</div></div><button class="btn gray full" id="resetProfile">重新初次認識</button><button class="btn red full" id="logoutBtn">登出</button><div class="entry"><b>版本</b><div class="muted">${VERSION}</div></div></section>`;
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
  if (IS_EXTENSION_ENTRY) { root.innerHTML = extensionAssistantScreen(); bindWorklogAssistant(); return; }
  clearInvalidAuthState();
  if (!session) { root.innerHTML = authScreen(); bindAuth(); return; }
  if (migrationRequired) { root.innerHTML = migrationScreen(); bindMigration(); bindGlobal(); return; }
  if (isStandaloneChatRoute()) { root.innerHTML = standaloneChatScreen(); bindWorklogAssistant(); bindGlobal(); return; }
  if (needsWorklogWelcome()) { root.innerHTML = worklogWelcomeScreen(); bindWorklogWelcome(); bindGlobal(); return; }
  root.innerHTML = osShell();
  bind();
  bindGlobal();
}

function bindAuth() {
  document.getElementById("googleLoginBtn").onclick = () => signInWithGoogle();
}

function bindMigration() {
  document.querySelectorAll("[data-run-migration]").forEach(b => b.onclick = () => DataService.runMigration());
}

function bindDashboard() {}

function bindWorklogWelcome() {
  const draftKey = scopedLocalKey(WORK_IDENTITY_SETUP_DRAFT_KEY);
  const stepKey = scopedLocalKey(WORK_IDENTITY_SETUP_STEP_KEY);
  const readDraft = () => normalizeWorkProfile(readJson(draftKey, workProfile || {}), profile);
  const writeDraft = draft => writeJson(draftKey, normalizeWorkProfile(draft, profile));
  const setStep = step => { localStorage.setItem(stepKey, step); render(); };
  document.querySelectorAll("[data-work-identity-start]").forEach(b => b.onclick = () => setStep("owner"));
  document.querySelectorAll("[data-work-identity-back]").forEach(b => b.onclick = () => setStep(b.dataset.workIdentityBack || "owner"));
  document.querySelectorAll("[data-work-identity-prev]").forEach(b => b.onclick = () => {
    const step = localStorage.getItem(stepKey) || "owner";
    setStep(step === "department" ? "owner" : (step === "task" ? "department" : "welcome"));
  });
  document.querySelectorAll("[data-work-identity-next]").forEach(b => b.onclick = () => {
    const step = b.dataset.workIdentityNext || "owner";
    const draft = readDraft();
    if (step === "owner") {
      const value = document.getElementById("setupEcpOwner")?.value.trim() || "";
      if (!value) return toast("請輸入 ECP 負責人");
      writeDraft({ ...draft, ecpResponsiblePerson: value });
      return setStep("department");
    }
    if (step === "department") {
      const value = document.getElementById("setupEcpDepartment")?.value.trim() || "";
      if (!value) return toast("請輸入 ECP 負責部門");
      writeDraft({ ...draft, ecpDepartment: value });
      return setStep("task");
    }
    if (step === "task") {
      const value = document.getElementById("setupEcpTask")?.value.trim() || "";
      if (!value) return toast("請輸入目前工作任務");
      writeDraft({ ...draft, defaultTask: value, taskEffectiveMonth: monthKey(), taskVerifiedAt: new Date().toISOString() });
      return setStep("confirm");
    }
  });
  document.querySelectorAll("[data-confirm-work-profile-setup]").forEach(b => b.onclick = async () => {
    const draft = readDraft();
    const next = normalizeWorkProfile({
      ...draft,
      taskEffectiveMonth: monthKey(),
      taskVerifiedAt: new Date().toISOString(),
      lastProfileCheckDate: key(new Date())
    }, profile);
    if (!isWorkProfileReady(next)) return toast(`尚未完成工作身分：${workProfileMissingFields(next).join("、")}`);
    applyWorkProfileToProfile(next);
    localStorage.setItem(scopedLocalKey(WORKLOG_WELCOME_KEY), "1");
    activeWorkspace = "worklog";
    openTabs = ["worklog"];
    recentWorkspaces = ["worklog"];
    hasOsShellState = true;
    saveAll();
    try {
      await DataService.saveProfileSettingsOnly({ requireCloud: true });
      await DataService.saveEcpTasksOnly({ requireCloud: true });
      localStorage.setItem(scopedLocalKey(WORK_IDENTITY_COMPLETION_KEY), "1");
      localStorage.removeItem(stepKey);
      localStorage.removeItem(draftKey);
      toast("工作身分已完成");
    } catch (error) {
      console.error("Work Profile setup sync failed", { error, supabase: error.supabase || null });
      toast("工作身分同步失敗，請稍後再試");
      return;
    }
    render();
  });
  document.querySelectorAll("[data-enter-ai-os]").forEach(b => b.onclick = () => {
    localStorage.removeItem(scopedLocalKey(WORK_IDENTITY_COMPLETION_KEY));
    activeWorkspace = "worklog";
    openTabs = ["worklog"];
    recentWorkspaces = ["worklog"];
    hasOsShellState = true;
    saveAll();
    render();
  });
}

function bindWorklogAssistant() {
  document.querySelectorAll("[data-open-assistant]").forEach(button => button.onclick = () => {
    localStorage.setItem(assistantOpenKey(), "1");
    refreshConversationFromCloud(true);
  });
  document.querySelectorAll("[data-close-assistant]").forEach(button => button.onclick = () => {
    localStorage.setItem(assistantOpenKey(), "0");
    render();
  });
  document.querySelectorAll("[data-start-assistant]").forEach(button => button.onclick = () => {
    localStorage.setItem(assistantWelcomeKey(), "1");
    localStorage.setItem(assistantOpenKey(), "1");
    render();
  });
  const input = document.getElementById("assistantInput");
  const send = document.getElementById("assistantSend");
  if (!input || !send) return;
  const addAssistantResult = result => {
    const normalized = typeof result === "string" ? { text: result } : (result || { text: "" });
    addConversationMessage("assistant", normalized.text || "", normalized.card ? { card: normalized.card } : {});
  };
  const updateSendState = () => {
    const hasText = input.value.trim().length > 0;
    send.disabled = !hasText;
    send.classList.toggle("ready", hasText);
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 140)}px`;
  };
  updateSendState();
  input.addEventListener("input", updateSendState);
  scrollAssistantToBottom();
  const completePendingDuration = async (hoursValue, userLabel = "") => {
    const pending = getAssistantPendingCommand();
    if (!pending?.command || !hoursValue || !isDurationPending(pending)) return toast("找不到待補充時間的草稿");
    const parsedCommand = { ...pending.command, hours: hoursValue };
    const entryPayload = assistantConfirmationPayload(parsedCommand);
    if (userLabel) addConversationMessage("user", userLabel);
    const thinkingId = addAssistantThinkingMessage();
    render();
    await new Promise(resolve => setTimeout(resolve, 250));
    removeConversationMessage(thinkingId);
    if (durationPendingIntent(pending) === "calendar") {
      await setAssistantPendingCommand({ action: "confirm_calendar", command: parsedCommand });
      addConversationMessage("assistant", "請確認建立 Calendar：", { card: { type: "confirm_calendar", payload: entryPayload } });
    } else {
      await setAssistantPendingCommand({ action: "confirm_add_entry", command: parsedCommand });
      addConversationMessage("assistant", "請確認這筆工時：", { card: { type: "confirm_entry", payload: entryPayload } });
    }
    render();
  };
  const submit = async () => {
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    updateSendState();
    addConversationMessage("user", text);
    const thinkingId = addAssistantThinkingMessage();
    render();
    await new Promise(resolve => setTimeout(resolve, 350));
    let parsedIntent = null;
    try {
      const pending = getAssistantPendingCommand();
      const durationReply = isDurationPending(pending) ? parseAssistantDuration(text) : null;
      if (durationReply) {
        removeConversationMessage(thinkingId);
        const parsedCommand = { ...pending.command, hours: durationReply };
        const entryPayload = assistantConfirmationPayload(parsedCommand);
        if (durationPendingIntent(pending) === "calendar") {
          await setAssistantPendingCommand({ action: "confirm_calendar", command: parsedCommand });
          addAssistantResult({ text: "請確認建立 Calendar：", card: { type: "confirm_calendar", payload: entryPayload } });
        } else {
          await setAssistantPendingCommand({ action: "confirm_add_entry", command: parsedCommand });
          addAssistantResult({ text: "請確認這筆工時：", card: { type: "confirm_entry", payload: entryPayload } });
        }
        render();
        return;
      }
      if (pending?.action === "collect_work_profile") {
        const response = handleWorkProfileConversationReply(text, pending);
        removeConversationMessage(thinkingId);
        addAssistantResult(response);
        render();
        return;
      }
      const conversationIntent = parseConversationIntent(text);
      if (pending && conversationIntent) {
        removeConversationMessage(thinkingId);
        addAssistantResult(pendingConversationGuidance(pending));
        render();
        return;
      }
      if (!pending && conversationIntent) {
        const conversationResponse = executeConversationIntent(conversationIntent);
        if (conversationResponse) {
          removeConversationMessage(thinkingId);
          addAssistantResult(conversationResponse);
          render();
          return;
        }
      }
      const contextIntent = parseWorklogIntentLocal(text);
      if (!pending && ["query_today_work", "query_today", "query_week"].includes(contextIntent.type)) {
        const response = await executeWorklogCommand(contextIntent);
        removeConversationMessage(thinkingId);
        addAssistantResult(response);
        render();
        return;
      }
      if (!pending && /股票|投資|基金|ETF|新聞|天氣|匯率|餐廳|旅遊/.test(text)) {
        removeConversationMessage(thinkingId);
        addAssistantResult(assistantUnknownResponse());
        render();
        return;
      }
      if (shouldPromptWorkProfileToday()) {
        removeConversationMessage(thinkingId);
        addAssistantResult(startWorkProfileConversation());
        render();
        return;
      }
      parsedIntent = await parseWorklogIntent(text);
      const response = await executeWorklogCommand(parsedIntent);
      removeConversationMessage(thinkingId);
      addAssistantResult(response);
    } catch (error) {
      removeConversationMessage(thinkingId);
      console.error("WorkLog chatbot command failed", assistantCommandErrorDebug({
        input: text,
        parsedIntent,
        parsedCommand: parsedIntent?.parsedCommand || null,
        entryPayload: parsedIntent?.entryPayload || null,
        error
      }));
      addConversationMessage("assistant", `工時建立失敗：${error?.message || "未知錯誤"}`);
    }
    render();
  };
  send.onclick = submit;
  input.onkeydown = e => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };
  document.querySelectorAll("[data-assistant-duration]").forEach(button => button.onclick = async () => {
    const hoursValue = Number(button.dataset.assistantDuration || 0);
    await completePendingDuration(hoursValue, hoursValue === 0.5 ? "30m" : `${hoursValue}h`);
  });
  document.querySelectorAll("[data-assistant-custom-duration]").forEach(button => button.onclick = () => {
    input.placeholder = "請輸入工時，例如：一個半小時、1.5h、半天";
    input.focus();
  });
  document.querySelectorAll("[data-assistant-quick]").forEach(button => button.onclick = () => {
    const kind = button.dataset.assistantQuick || "";
    const map = {
      worklog: {
        user: "建立工時",
        assistant: "可以。請直接告訴我日期、時間與工作內容，例如：今天下午兩點到四點開會。"
      },
      calendar: {
        user: "建立 Calendar",
        assistant: "可以。請告訴我日期、時間與事件內容，例如：明天下午三點面試。"
      },
      task: {
        user: "建立任務",
        assistant: "可以。請告訴我要提醒或整理的任務，例如：提醒我寄採購資料。"
      }
    };
    const item = map[kind];
    if (!item) return;
    addConversationMessage("user", item.user);
    addConversationMessage("assistant", item.assistant);
    render();
  });
  document.querySelectorAll("[data-assistant-cancel-command]").forEach(button => button.onclick = () => {
    clearAssistantPendingCommand();
    addConversationMessage("user", "取消");
    addConversationMessage("assistant", "已取消這筆工時建立。");
    render();
  });
  document.querySelectorAll("[data-assistant-confirm-entry]").forEach(button => button.onclick = async () => {
    const pending = getAssistantPendingCommand();
    const parsedCommand = pending?.command || null;
    const entryPayload = parsedCommand ? assistantConfirmationPayload(parsedCommand) : null;
    addConversationMessage("user", "確認建立");
    const thinkingId = addAssistantThinkingMessage();
    render();
    await new Promise(resolve => setTimeout(resolve, 350));
    try {
      if (!parsedCommand) throw new Error("找不到待確認的工時");
      const response = await executeWorklogCommand({ type: "confirm_pending_entry", parsedCommand, entryPayload });
      removeConversationMessage(thinkingId);
      addAssistantResult(response);
    } catch (error) {
      removeConversationMessage(thinkingId);
      console.error("WorkLog chatbot command failed", assistantCommandErrorDebug({
        input: "assistant_confirm_entry",
        parsedIntent: { type: "confirm_pending_entry", parsedCommand, entryPayload },
        parsedCommand,
        entryPayload,
        error
      }));
      addConversationMessage("assistant", `工時建立失敗：${error?.message || "未知錯誤"}`);
    }
    render();
  });
  document.querySelectorAll("[data-assistant-confirm-calendar]").forEach(button => button.onclick = async () => {
    const pending = getAssistantPendingCommand();
    const parsedCommand = pending?.command || null;
    const entryPayload = parsedCommand ? assistantConfirmationPayload(parsedCommand) : null;
    addConversationMessage("user", "確認建立 Calendar");
    const thinkingId = addAssistantThinkingMessage();
    render();
    await new Promise(resolve => setTimeout(resolve, 300));
    try {
      if (!parsedCommand) throw new Error("找不到待確認的 Calendar");
      const response = await executeWorklogCommand({ type: "confirm_pending_calendar", parsedCommand, entryPayload });
      removeConversationMessage(thinkingId);
      addAssistantResult(response);
    } catch (error) {
      removeConversationMessage(thinkingId);
      console.error("Calendar conversation command failed", assistantCommandErrorDebug({
        input: "assistant_confirm_calendar",
        parsedIntent: { type: "confirm_pending_calendar", parsedCommand, entryPayload },
        parsedCommand,
        entryPayload,
        error
      }));
      addConversationMessage("assistant", `Calendar 建立失敗：${error?.message || "未知錯誤"}`);
    }
    render();
  });
  document.querySelectorAll("[data-assistant-calendar-to-worklog]").forEach(button => button.onclick = async () => {
    const pending = getAssistantPendingCommand();
    const parsedCommand = pending?.command || null;
    const entryPayload = parsedCommand ? assistantConfirmationPayload(parsedCommand) : null;
    addConversationMessage("user", "建立工時");
    const thinkingId = addAssistantThinkingMessage();
    render();
    await new Promise(resolve => setTimeout(resolve, 300));
    try {
      if (!parsedCommand) throw new Error("找不到可同步建立的工時");
      const response = await executeWorklogCommand({ type: "create_worklog_from_calendar", parsedCommand, entryPayload });
      removeConversationMessage(thinkingId);
      addAssistantResult(response);
    } catch (error) {
      removeConversationMessage(thinkingId);
      console.error("Calendar to WorkLog command failed", assistantCommandErrorDebug({
        input: "assistant_calendar_to_worklog",
        parsedIntent: { type: "create_worklog_from_calendar", parsedCommand, entryPayload },
        parsedCommand,
        entryPayload,
        error
      }));
      addConversationMessage("assistant", `工時建立失敗：${error?.message || "未知錯誤"}`);
    }
    render();
  });
  document.querySelectorAll("[data-assistant-calendar-no-worklog]").forEach(button => button.onclick = () => {
    clearAssistantPendingCommand();
    addConversationMessage("user", "不用");
    addConversationMessage("assistant", "好的，已保留 Calendar，不建立工時。");
    render();
  });
  document.querySelectorAll("[data-assistant-confirm-work-profile]").forEach(button => button.onclick = async () => {
    const pending = getAssistantPendingCommand();
    const draft = pending?.profileDraft || workProfile || {};
    addConversationMessage("user", "確認");
    const thinkingId = addAssistantThinkingMessage();
    render();
    try {
      await confirmWorkProfileFromConversation(draft);
      removeConversationMessage(thinkingId);
      addConversationMessage("assistant", "工作身分已完成。之後建立工時與匯出 ECP 會使用這份設定。");
    } catch (error) {
      removeConversationMessage(thinkingId);
      console.error("Work Profile conversation sync failed", { error, supabase: error.supabase || null, draft });
      addConversationMessage("assistant", `工作身分同步失敗：${error?.message || "請稍後再試"}`);
    }
    render();
  });
  document.querySelectorAll("[data-assistant-edit-work-profile]").forEach(button => button.onclick = () => {
    const pending = getAssistantPendingCommand();
    setAssistantPendingCommand({ action: "collect_work_profile", step: "ecp_owner", profileDraft: pending?.profileDraft || workProfile || {} });
    addConversationMessage("user", "修改");
    addConversationMessage("assistant", "好的，我們重新確認一次。請問您的 ECP 負責人？");
    render();
  });
  document.querySelectorAll("[data-assistant-later-work-profile]").forEach(button => button.onclick = () => {
    clearAssistantPendingCommand();
    const next = normalizeWorkProfile({ ...(workProfile || {}), lastProfilePromptDate: key(new Date()) }, profile);
    workProfile = next;
    saveAll();
    addConversationMessage("user", "稍後");
    addConversationMessage("assistant", "好的，您仍可先建立工時。匯出 ECP 前，我會提醒補齊工作身分。");
    render();
  });
}

function bindGlobal() {
  document.querySelectorAll("[data-logout]").forEach(b => b.onclick = () => doLogout());
  document.querySelectorAll("[data-retry-cloud-sync]").forEach(b => b.onclick = () => {
    if (cloudSync.status === "failed") DataService.retryAutoSave();
  });
}
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
  document.getElementById("saveProfile").onclick = async () => {
    const role = document.getElementById("role").value;
    profile = { role, tags: tags.length ? tags : tagsForRole(role), sources: src.length ? src : ["Google Drive", "Gmail", "Calendar", "手動紀錄"], workHours: "09:00~18:00", lunch: "12:00~13:00", sop: document.getElementById("sop").value };
    setWorkModels(profile.tags);
    saveAll();
    await DataService.saveProfileSettingsOnly();
    await DataService.saveWorkModelsOnly();
    toast("已建立工作模型"); render();
  };
}

function bind() {
  document.querySelectorAll("[data-toggle-sidebar]").forEach(b => b.onclick = () => { sidebarOpen = !sidebarOpen; render(); });
  document.querySelectorAll("[data-close-sidebar]").forEach(b => b.onclick = () => { sidebarOpen = false; render(); });
  document.querySelectorAll("[data-open-workspace]").forEach(b => b.onclick = () => { sidebarOpen = false; openWorkspace(b.dataset.openWorkspace); });
  document.querySelectorAll("[data-activate-workspace]").forEach(b => b.onclick = () => activateWorkspace(b.dataset.activateWorkspace));
  document.querySelectorAll("[data-close-workspace]").forEach(b => b.onclick = e => { e.stopPropagation(); closeWorkspace(b.dataset.closeWorkspace); });
  document.querySelectorAll("[data-month-nav]").forEach(b => b.onclick = async () => {
    const base = selectedMonthDate(1);
    base.setMonth(base.getMonth() + Number(b.dataset.monthNav || 0));
    await setSelectedMonth(monthKey(base), 1);
  });
  document.querySelectorAll("[data-day]").forEach(b => b.onclick = () => { selected = selectedMonthDate(Number(b.dataset.day)); selectedMonth = monthKey(selected); saveAll(); render(); });
  document.querySelectorAll("[data-mobile-date]").forEach(b => b.onclick = async () => {
    const nextDate = new Date(`${b.dataset.mobileDate}T00:00:00`);
    const nextMonth = monthKey(nextDate);
    selected = nextDate;
    if (nextMonth !== selectedMonth) await setSelectedMonth(nextMonth, nextDate.getDate());
    else { selectedMonth = nextMonth; saveAll(); render(); }
  });
  document.querySelectorAll("[data-toggle-mobile-summary]").forEach(b => b.onclick = () => {
    writeScopedUiFlag(MOBILE_SUMMARY_OPEN_KEY, !readScopedUiFlag(MOBILE_SUMMARY_OPEN_KEY, false));
    render();
  });
  document.querySelectorAll("[data-toggle-mobile-calendar]").forEach(b => b.onclick = () => {
    const next = !readScopedUiFlag(MOBILE_CALENDAR_OPEN_KEY, false);
    mobileCalendarOpen = next;
    writeScopedUiFlag(MOBILE_CALENDAR_OPEN_KEY, next);
    render();
  });
  document.querySelectorAll("[data-action=add]").forEach(b => b.onclick = () => { editingEntryId = null; captureSeed = null; activeWorkspace = "worklog"; if (!openTabs.includes("worklog")) openTabs.push("worklog"); rememberWorkspace("worklog"); view = "capture"; saveAll(); render(); });
  const today = document.querySelector("[data-today]"); if (today) today.onclick = async () => { selected = new Date(); await setSelectedMonth(monthKey(selected), selected.getDate()); };
  const exportBtn = document.querySelector("[data-export-month]"); if (exportBtn) exportBtn.onclick = () => exportEcpImportFile();
  document.querySelectorAll("[data-accept]").forEach(b => b.onclick = () => acceptSuggestion(b.dataset.accept));
  document.querySelectorAll("[data-adjust]").forEach(b => b.onclick = () => adjustSuggestion(b.dataset.adjust));
  document.querySelectorAll("[data-del-id]").forEach(b => b.onclick = async () => {
    const removed = entries.find(e => e.id === b.dataset.delId);
    if (!removed) return;
    try {
      await DataService.deleteEntry(removed);
      saveAll({ skipSync: true });
      toast("已刪除");
      render();
    } catch (error) {
      console.error("Delete entry failed", error);
      toast("刪除同步失敗，請稍後再試");
    }
  });
  document.querySelectorAll("[data-edit-id]").forEach(b => b.onclick = () => { editingEntryId = b.dataset.editId; captureSeed = null; activeWorkspace = "worklog"; if (!openTabs.includes("worklog")) openTabs.push("worklog"); rememberWorkspace("worklog"); view = "capture"; saveAll(); render(); });
  bindLibrary();
  if (activeWorkspace === "worklog" && view === "capture") bindCapture();
  bindWorklogAssistant();
  if (activeWorkspace === "worklog" && !profile) bindOnboarding();
  if (activeWorkspace === "library" && view === "libraryForm") bindLibraryForm(editingLibraryId);
  if (activeWorkspace === "settings") bindSettings();
}


function createEntry(input = {}) {
  const at = input.at || nextAvailableStart(input.date || key(), input.hours || 1, input.id || null);
  const date = input.date || String(at).slice(0, 10);
  const entryType = normalizeEntryType(input.entryType || input.type || "work");
  return {
    id: input.id || uid(),
    date,
    at,
    title: String(input.title || "").trim(),
    note: String(input.note || "").trim(),
    ecpTask: isLeaveType(entryType) ? "" : (input.ecpTask == null ? defaultEcpTaskName(input.title || "") : String(input.ecpTask || "").trim()),
    hours: Number(input.hours || 1),
    entryType,
    type: eventTypeLabel(entryType),
    source: input.source || "manual",
    status: input.status || "completed",
    cloudId: input.cloudId || undefined
  };
}

async function persistEntry(item, options = {}) {
  try {
    return await DataService.saveEntry(item);
  } catch (error) {
    if (options.requireCloud) throw error;
    toast("工時同步失敗，請稍後再試");
    return null;
  }
}

async function acceptSuggestion(id) {
  const s = makeSuggestions().find(x => x.id === id);
  if (!s) return;
  const item = createEntry({ title: s.title, note: s.note || "", hours: s.hours || 1, at: s.at, ecpTask: s.ecpTask || defaultEcpTaskName(s.title), entryType: "work", source: "ai-card" });
  const error = validateEntry(item); if (error) return toast(error);
  if (!confirmOvertimeEntry(item)) return;
  const saved = await persistEntry(item);
  if (!saved) return;
  feedback[s.id] = (feedback[s.id] || 0) + 1;
  saveAll({ skipSync: true });
  toast("已加入我的工作");
  render();
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
  const titleInput = document.getElementById("title");
  const bindDescriptionSuggestions = () => {
    document.querySelectorAll("[data-title-suggestion]").forEach(b => b.onclick = () => {
      titleInput.value = b.dataset.titleSuggestion;
    });
    document.querySelectorAll("[data-open-work-description-dialog]").forEach(b => b.onclick = () => {
      const dialog = document.getElementById("workDescriptionDialog");
      const input = document.getElementById("newWorkDescription");
      if (dialog) dialog.style.display = "grid";
      if (input) {
        input.value = "";
        setTimeout(() => input.focus(), 0);
      }
    });
    document.querySelectorAll("[data-cancel-work-description]").forEach(b => b.onclick = () => {
      const dialog = document.getElementById("workDescriptionDialog");
      const input = document.getElementById("newWorkDescription");
      if (input) input.value = "";
      if (dialog) dialog.style.display = "none";
    });
    document.querySelectorAll("[data-add-work-description]").forEach(b => b.onclick = async () => {
      const dialog = document.getElementById("workDescriptionDialog");
      const input = document.getElementById("newWorkDescription");
      const name = input?.value.trim() || "";
      if (!name) return toast("請輸入工作描述名稱");
      b.disabled = true;
      try {
        await saveWorkModel(name);
        titleInput.value = name;
        const box = document.getElementById("descriptionSuggestions");
        if (box) {
          box.outerHTML = descriptionSuggestionChips(titleInput.value);
          bindDescriptionSuggestions();
        }
        const nextDialog = document.getElementById("workDescriptionDialog");
        if (nextDialog) nextDialog.style.display = "none";
        if (dialog) dialog.style.display = "none";
        toast("已選取工作描述並同步");
      } catch (error) {
        console.error("Add work description failed", error);
        toast("工作描述同步失敗，請稍後再試");
      } finally {
        b.disabled = false;
      }
    });
    const input = document.getElementById("newWorkDescription");
    if (input) input.onkeydown = e => {
      if (e.key === "Enter") {
        e.preventDefault();
        document.querySelector("[data-add-work-description]")?.click();
      }
      if (e.key === "Escape") document.querySelector("[data-cancel-work-description]")?.click();
    };
  };
  bindDescriptionSuggestions();
  if (titleInput) titleInput.oninput = () => {
    const box = document.getElementById("descriptionSuggestions");
    if (box) {
      box.outerHTML = descriptionSuggestionChips(titleInput.value);
      bindDescriptionSuggestions();
    }
  };
  const ecpTaskSelect = document.getElementById("ecpTaskSelect");
  const quickAdd = document.getElementById("ecpTaskQuickAdd");
  if (ecpTaskSelect) ecpTaskSelect.onchange = () => {
    if (quickAdd) quickAdd.style.display = ecpTaskSelect.value === "__add__" ? "grid" : "none";
  };
  const addEcpTaskBtn = document.querySelector("[data-add-capture-ecp-task]");
  if (addEcpTaskBtn) addEcpTaskBtn.onclick = async () => {
    const input = document.getElementById("newEcpTaskCapture");
    const name = input.value.trim();
    if (!name) return toast("請輸入 ECP 任務名稱");
    const tasks = ecpTasks();
    setEcpTasks(tasks.includes(name) ? tasks : [...tasks, name]);
    saveAll();
    await DataService.saveEcpTasksOnly();
    ecpTaskSelect.innerHTML = ecpTaskOptions(name);
    ecpTaskSelect.value = name;
    input.value = "";
    if (quickAdd) quickAdd.style.display = "none";
    toast("已新增 ECP 任務");
  };
  const dateTimeInput = document.getElementById("dt");
  document.querySelectorAll(".hour").forEach(b => b.onclick = () => {
    selectedH = Number(b.dataset.h);
    document.querySelectorAll(".hour").forEach(x => x.classList.remove("selected"));
    b.classList.add("selected");
  });
  document.getElementById("saveEntry").onclick = async () => {
    const at = document.getElementById("dt").value;
    const description = document.getElementById("title").value.trim();
    const entryType = editingEntry ? normalizeEntryType(editingEntry.entryType || editingEntry.type || entryTypeFromDescription(description)) : entryTypeFromDescription(description);
    const selectedEcpTask = isLeaveType(entryType) ? "" : (document.getElementById("ecpTaskSelect").value === "__add__" ? "" : document.getElementById("ecpTaskSelect").value.trim());
    const item = createEntry({ id: editingEntry ? editingEntry.id : undefined, date: at.slice(0, 10), at, title: description, ecpTask: selectedEcpTask, hours: selectedH, entryType, note: document.getElementById("note").value.trim(), source: editingEntry ? editingEntry.source : "manual", cloudId: editingEntry?.cloudId });
    const error = validateEntry(item); if (error) return toast(error);
    if (monthKey(item.date) !== selectedMonth && !confirm(`此筆工時日期為 ${monthKey(item.date)}，目前畫面月份為 ${selectedMonth}。是否仍要儲存？`)) return;
    if (!confirmOvertimeEntry(item)) return;
    const saved = await persistEntry(item);
    if (!saved) return;
    view = "center"; editingEntryId = null; captureSeed = null; toast("已儲存工時"); render();
  };
}

async function runLegacyKnowledgeMigrationPreview() {
  const legacy = legacyKnowledgeItems().map(normalizedLibraryItem);
  if (!legacy.length) return toast("沒有可搬移的舊版藏書資料");
  const message = `即將搬移舊版 wl_library：${legacy.length} 筆。\n\n注意：舊版 LocalStorage 通常只保留 metadata / 檔名，不一定有原始檔案。此次會先建立 Cloud Knowledge Metadata；原始檔可後續編輯補上傳。\n\nLegacy backup 不會刪除。是否繼續？`;
  if (!confirm(message)) return;
  try {
    for (const item of legacy) {
      await DataService.saveKnowledgeSource({
        ...item,
        knowledgeId: "",
        sourceType: item.storagePath ? inferKnowledgeSourceType(item.storagePath) : "legacy_metadata",
        sourceName: item.filename || item.sourceName || item.title,
        processingStatus: "uploaded"
      }, { requireCloud: true });
    }
    localStorage.setItem(scopedLocalKey(LEGACY_KNOWLEDGE_MIGRATION_KEY), "1");
    toast("Legacy 藏書 Metadata Migration 完成");
    await DataService.loadAll();
    render();
  } catch (error) {
    console.error("Legacy knowledge migration failed", { error, supabase: error.supabase || null });
    toast(error.message || "Legacy Migration 失敗，舊資料已保留");
  }
}

function bindLibrary() {
  const add = document.querySelector("[data-add-library]"); if (add) add.onclick = () => { editingLibraryId = null; activeWorkspace = "library"; view = "libraryForm"; saveAll(); render(); };
  document.querySelectorAll("[data-edit-library]").forEach(b => b.onclick = () => { editingLibraryId = b.dataset.editLibrary; activeWorkspace = "library"; view = "libraryForm"; saveAll(); render(); });
  document.querySelectorAll("[data-preview-library],[data-download-library]").forEach(b => b.onclick = async () => {
    const id = b.dataset.previewLibrary || b.dataset.downloadLibrary;
    const item = normalizedLibraryItem(library.find(x => x.id === id));
    if (!item.storagePath) return toast("此 Knowledge Source 尚無正式檔案");
    try {
      const url = await KnowledgeRepository.signedSourceUrl(item.storagePath, 300);
      window.open(url, "_blank", "noopener");
    } catch (error) {
      console.error("Knowledge file preview failed", { error, supabase: error.supabase || null, item });
      toast("原始檔預覽失敗，請確認 Storage 已初始化");
    }
  });
  document.querySelectorAll("[data-archive-library]").forEach(b => b.onclick = async () => {
    const item = library.find(x => x.id === b.dataset.archiveLibrary);
    if (!item) return;
    const archived = await DataService.saveKnowledgeSource({ ...normalizedLibraryItem(item), processingStatus: "archived" });
    if (!archived) return toast("封存同步失敗");
    toast("已封存 Knowledge Source");
    render();
  });
  document.querySelectorAll("[data-del-library]").forEach(b => b.onclick = async () => {
    const item = library.find(x => x.id === b.dataset.delLibrary);
    if (!item) return;
    if (!confirm("確認刪除此 Knowledge Source？本階段採 soft delete，Storage 原始檔會先保留作稽核。")) return;
    const deleted = await DataService.deleteKnowledgeSource(item);
    if (!deleted) return toast("知識刪除同步失敗，請稍後再試");
    saveAll();
    toast("已刪除知識");
    render();
  });
  const legacy = document.querySelector("[data-preview-legacy-knowledge]");
  if (legacy) legacy.onclick = () => runLegacyKnowledgeMigrationPreview();
}

function bindLibraryForm(id = null) {
  document.querySelectorAll("[data-library-back],[data-library-cancel]").forEach(b => b.onclick = () => { editingLibraryId = null; view = "library"; saveAll(); render(); });
  document.getElementById("saveLibrary").onclick = async () => {
    const existing = id ? normalizedLibraryItem(library.find(x => x.id === id)) : {};
    const file = document.getElementById("libFile")?.files?.[0] || null;
    const fileName = file?.name || existing.filename || "";
    const item = normalizedLibraryItem({
      ...existing,
      id: id || existing.id || uid("kb"),
      knowledgeId: existing.knowledgeId || "",
      title: document.getElementById("libTitle").value.trim(),
      description: document.getElementById("libDesc").value.trim(),
      category: document.getElementById("libCategory").value,
      scope: document.getElementById("libScope").value,
      applicableAgents: [...document.querySelectorAll("input[name=libAgents]:checked")].map(x => x.value),
      relatedRoles: [...document.querySelectorAll("input[name=libRoles]:checked")].map(x => x.value),
      relatedWorkModels: [...document.querySelectorAll("input[name=libWorkModels]:checked")].map(x => x.value),
      tags: arrayFromInput(document.getElementById("libTags").value),
      triggers: arrayFromInput(document.getElementById("libTriggers").value),
      processingStatus: existing.processingStatus || "uploaded",
      version: document.getElementById("libVersion").value.trim() || "v1.0",
      sourceVersion: document.getElementById("libSourceVersion").value.trim() || document.getElementById("libVersion").value.trim() || "v1.0",
      filename: fileName,
      storagePath: existing.storagePath || "",
      sourceType: inferKnowledgeSourceType(fileName || existing.sourceName || existing.sourceUrl),
      sourceName: fileName || existing.sourceName || "",
      mimeType: file?.type || existing.mimeType || "",
      fileSize: file?.size || existing.fileSize || 0,
      createdAt: existing.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    if (!item.title) return toast("請輸入 Knowledge Title");
    if (!id && !file) return toast("新增 Knowledge Source 必須選擇正式檔案");
    try {
      await DataService.saveKnowledgeSource(item, { file, requireCloud: true });
      editingLibraryId = null; view = "library"; saveAll(); toast("Knowledge Source 已儲存"); render();
    } catch (error) {
      console.error("Knowledge Source save failed", { error, supabase: error.supabase || null });
      toast(error.message || "Knowledge Source 儲存失敗");
    }
  };
}

function bindSettings() {
  const queueSettingsAutoSave = scopes => DataService.queueAutoSave(scopes);
  const renderModelChecks = (models, selectedModels = models) => {
    const list = document.getElementById("workModelList");
    if (list) list.innerHTML = workModelChecks(models, selectedModels);
    bindWorkModelOptions();
  };
  const currentSelectedWorkModels = () => [...document.querySelectorAll(".work-model-option:checked")].map(x => x.value.trim()).filter(Boolean);
  const syncSelectedWorkModels = () => {
    setWorkModels(currentSelectedWorkModels());
    queueSettingsAutoSave("workModels");
  };
  const bindWorkModelOptions = () => {
    document.querySelectorAll(".work-model-option").forEach(input => input.onchange = () => syncSelectedWorkModels());
  };
  const renderEcpTasks = tasks => {
    const list = document.getElementById("ecpTaskList");
    if (list) {
      list.outerHTML = ecpTaskList(tasks);
      bindEcpTaskRemove();
    }
  };
  const currentEcpTasks = () => [...document.querySelectorAll("#ecpTaskList .ecp-task-item span")].map(x => x.textContent.trim()).filter(Boolean);
  const bindEcpTaskRemove = () => {
    document.querySelectorAll("[data-remove-ecp-task]").forEach(b => b.onclick = () => {
      const next = currentEcpTasks().filter(task => task !== b.dataset.removeEcpTask);
      renderEcpTasks(next);
      setEcpTasks(next);
      workProfile = normalizeWorkProfile({ ...(workProfile || {}), defaultTask: next[0] || "" }, profile);
      queueSettingsAutoSave(["profile", "ecpTasks"]);
    });
  };
  bindEcpTaskRemove();
  const roleSet = document.getElementById("roleSet");
  bindWorkModelOptions();
  if (roleSet) roleSet.onchange = e => {
    profile.role = e.target.value;
    const models = tagsForRole(e.target.value);
    setWorkModels(models);
    renderModelChecks(models, models);
    queueSettingsAutoSave(["profile", "workModels"]);
  };
  const add = document.getElementById("addWorkModel");
  if (add) add.onclick = () => {
    const input = document.getElementById("newWorkModel");
    const name = input.value.trim();
    if (!name) return toast("請輸入工作模型名稱");
    const current = [...document.querySelectorAll(".work-model-option")].map(x => x.value);
    const selected = [...document.querySelectorAll(".work-model-option:checked")].map(x => x.value);
    const models = current.includes(name) ? current : [...current, name];
    renderModelChecks(models, [...new Set([...selected, name])]);
    syncSelectedWorkModels();
    input.value = "";
    toast("已新增工作模型，將自動同步");
  };
  const addEcp = document.getElementById("addEcpTask");
  if (addEcp) addEcp.onclick = () => {
    const input = document.getElementById("newEcpTask");
    const name = input.value.trim();
    if (!name) return toast("請輸入 ECP 任務名稱");
    const tasks = currentEcpTasks();
    const nextTasks = tasks.includes(name) ? tasks : [...tasks, name];
    renderEcpTasks(nextTasks);
    setEcpTasks(nextTasks);
    workProfile = normalizeWorkProfile({ ...(workProfile || {}), defaultTask: name, taskEffectiveMonth: monthKey(), taskVerifiedAt: new Date().toISOString() }, profile);
    queueSettingsAutoSave(["profile", "ecpTasks"]);
    input.value = "";
    toast("已新增 ECP 任務，將自動同步");
  };
  const ecpOwner = document.getElementById("ecpOwner");
  const ecpDepartment = document.getElementById("ecpDepartment");
  [ecpOwner, ecpDepartment].filter(Boolean).forEach(input => input.oninput = () => {
    profile.ecpOwner = ecpOwner?.value.trim() || "";
    profile.ecpDepartment = ecpDepartment?.value.trim() || "";
    workProfile = normalizeWorkProfile({ ...(workProfile || {}), ecpResponsiblePerson: profile.ecpOwner, ecpDepartment: profile.ecpDepartment }, profile);
    queueSettingsAutoSave("profile");
  });
  document.getElementById("resetProfile").onclick = () => { profile = null; saveAll(); render(); };
  document.getElementById("logoutBtn").onclick = () => doLogout();
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function u16(view, offset) { return view.getUint16(offset, true); }
function u32(view, offset) { return view.getUint32(offset, true); }
function setU16(view, offset, value) { view.setUint16(offset, value, true); }
function setU32(view, offset, value) { view.setUint32(offset, value, true); }

function parseZip(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  const view = new DataView(arrayBuffer);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= 0; i--) {
    if (u32(view, i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("找不到 XLSX ZIP 結尾資料");
  const total = u16(view, eocd + 10);
  let ptr = u32(view, eocd + 16);
  const decoder = new TextDecoder();
  const entries = [];
  for (let i = 0; i < total; i++) {
    if (u32(view, ptr) !== 0x02014b50) throw new Error("XLSX ZIP 中央目錄格式錯誤");
    const method = u16(view, ptr + 10);
    const compressedSize = u32(view, ptr + 20);
    const uncompressedSize = u32(view, ptr + 24);
    const nameLen = u16(view, ptr + 28);
    const extraLen = u16(view, ptr + 30);
    const commentLen = u16(view, ptr + 32);
    const localOffset = u32(view, ptr + 42);
    const name = decoder.decode(bytes.slice(ptr + 46, ptr + 46 + nameLen));
    if (u32(view, localOffset) !== 0x04034b50) throw new Error(`XLSX ZIP local header 錯誤：${name}`);
    const localNameLen = u16(view, localOffset + 26);
    const localExtraLen = u16(view, localOffset + 28);
    const dataStart = localOffset + 30 + localNameLen + localExtraLen;
    if (method !== 0) throw new Error(`Template 必須使用未壓縮 ZIP entry：${name}`);
    const data = bytes.slice(dataStart, dataStart + compressedSize);
    if (data.length !== uncompressedSize) throw new Error(`Template entry 長度不一致：${name}`);
    entries.push({ name, data });
    ptr += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

function writeZip(entries) {
  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const data = entry.data instanceof Uint8Array ? entry.data : encoder.encode(String(entry.data));
    const crc = crc32(data);
    const local = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(local.buffer);
    setU32(localView, 0, 0x04034b50);
    setU16(localView, 4, 20);
    setU16(localView, 6, 0x0800);
    setU16(localView, 8, 0);
    setU32(localView, 14, crc);
    setU32(localView, 18, data.length);
    setU32(localView, 22, data.length);
    setU16(localView, 26, nameBytes.length);
    local.set(nameBytes, 30);
    localParts.push(local, data);

    const central = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(central.buffer);
    setU32(centralView, 0, 0x02014b50);
    setU16(centralView, 4, 20);
    setU16(centralView, 6, 20);
    setU16(centralView, 8, 0x0800);
    setU16(centralView, 10, 0);
    setU32(centralView, 16, crc);
    setU32(centralView, 20, data.length);
    setU32(centralView, 24, data.length);
    setU16(centralView, 28, nameBytes.length);
    setU32(centralView, 42, offset);
    central.set(nameBytes, 46);
    centralParts.push(central);
    offset += local.length + data.length;
  }
  const centralOffset = offset;
  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  setU32(eocdView, 0, 0x06054b50);
  setU16(eocdView, 8, entries.length);
  setU16(eocdView, 10, entries.length);
  setU32(eocdView, 12, centralSize);
  setU32(eocdView, 16, centralOffset);
  return new Blob([...localParts, ...centralParts, eocd], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

async function fetchResource(path) {
  const candidates = [path, `../${path}`, `../../${path}`, `/${path}`];
  for (const url of candidates) {
    try {
      const res = await fetch(url);
      if (res.ok) return res;
    } catch {}
  }
  throw new Error(`找不到資源：${path}`);
}

async function loadExportProfile(path) {
  const res = await fetchResource(path);
  return res.json();
}

async function loadTemplateEntries(path) {
  const res = await fetchResource(path);
  return parseZip(await res.arrayBuffer());
}

function findZipEntry(entries, name) {
  const entry = entries.find(e => e.name === name);
  if (!entry) throw new Error(`Template 缺少檔案：${name}`);
  return entry;
}

function xmlText(entries, name) {
  return new TextDecoder().decode(findZipEntry(entries, name).data);
}

function updateZipText(entries, name, text) {
  findZipEntry(entries, name).data = new TextEncoder().encode(text);
}

function parseXml(text) {
  const doc = new DOMParser().parseFromString(text, "application/xml");
  if (doc.querySelector("parsererror")) throw new Error("Template XML 解析失敗");
  return doc;
}

function spreadsheetNs(doc, tag) {
  return doc.createElementNS("http://schemas.openxmlformats.org/spreadsheetml/2006/main", tag);
}

function columnName(index) {
  let name = "";
  while (index > 0) {
    const mod = (index - 1) % 26;
    name = String.fromCharCode(65 + mod) + name;
    index = Math.floor((index - mod) / 26);
  }
  return name;
}

function columnIndexFromRef(ref) {
  return ref.replace(/[0-9]/g, "").split("").reduce((sum, ch) => sum * 26 + ch.charCodeAt(0) - 64, 0);
}

function cellText(cell) {
  const inlineText = cell.getElementsByTagNameNS("http://schemas.openxmlformats.org/spreadsheetml/2006/main", "t")[0];
  const v = cell.getElementsByTagNameNS("http://schemas.openxmlformats.org/spreadsheetml/2006/main", "v")[0];
  return (inlineText?.textContent ?? v?.textContent ?? "").trim();
}

function resolveSheetPath(entries, sheetName) {
  const workbook = parseXml(xmlText(entries, "xl/workbook.xml"));
  const sheets = [...workbook.getElementsByTagNameNS("http://schemas.openxmlformats.org/spreadsheetml/2006/main", "sheet")];
  const sheet = sheets.find(s => s.getAttribute("name") === sheetName);
  if (!sheet) throw new Error(`Template 找不到 Sheet：${sheetName}`);
  const relId = sheet.getAttribute("r:id") || sheet.getAttribute("id");
  const rels = parseXml(xmlText(entries, "xl/_rels/workbook.xml.rels"));
  const relationships = [...rels.getElementsByTagName("Relationship")];
  const rel = relationships.find(r => r.getAttribute("Id") === relId);
  if (!rel) throw new Error(`Template 找不到 Sheet 關聯：${sheetName}`);
  return `xl/${rel.getAttribute("Target").replace(new RegExp("^/"), "")}`.replace("xl/xl/", "xl/");
}

function buildHeaderMap(sheetDoc, headerRow) {
  const rows = [...sheetDoc.getElementsByTagNameNS("http://schemas.openxmlformats.org/spreadsheetml/2006/main", "row")];
  const row = rows.find(r => Number(r.getAttribute("r")) === headerRow);
  if (!row) throw new Error(`Template 找不到 Header Row：${headerRow}`);
  const map = {};
  [...row.getElementsByTagNameNS("http://schemas.openxmlformats.org/spreadsheetml/2006/main", "c")].forEach(cell => {
    const header = cellText(cell);
    if (header) map[header] = columnIndexFromRef(cell.getAttribute("r"));
  });
  return map;
}

function makeInlineStringCell(doc, ref, value) {
  const cell = spreadsheetNs(doc, "c");
  cell.setAttribute("r", ref);
  cell.setAttribute("t", "inlineStr");
  if (value !== "") {
    const is = spreadsheetNs(doc, "is");
    const t = spreadsheetNs(doc, "t");
    t.textContent = String(value);
    is.appendChild(t);
    cell.appendChild(is);
  }
  return cell;
}

function makeNumberCell(doc, ref, value) {
  const cell = spreadsheetNs(doc, "c");
  cell.setAttribute("r", ref);
  cell.setAttribute("t", "n");
  const v = spreadsheetNs(doc, "v");
  v.textContent = String(Number(value || 0));
  cell.appendChild(v);
  return cell;
}

function exportFieldValue(rule, row) {
  if (!rule || rule.type === "blank") return "";
  if (rule.type === "literal") return rule.value || "";
  if (rule.type === "field") return row[rule.field] ?? "";
  return "";
}

function clearDataRows(sheetDoc, dataStartRow) {
  const sheetData = sheetDoc.getElementsByTagNameNS("http://schemas.openxmlformats.org/spreadsheetml/2006/main", "sheetData")[0];
  [...sheetData.getElementsByTagNameNS("http://schemas.openxmlformats.org/spreadsheetml/2006/main", "row")]
    .filter(row => Number(row.getAttribute("r")) >= dataStartRow)
    .forEach(row => sheetData.removeChild(row));
  return sheetData;
}

function writeRowsByHeaderName(sheetDoc, profile, rows) {
  const headerMap = buildHeaderMap(sheetDoc, profile.headerRow);
  const missing = Object.keys(profile.fieldMapping).filter(header => !(header in headerMap));
  if (missing.length) throw new Error(`Template 缺少欄位：${missing.join("、")}`);
  const sheetData = clearDataRows(sheetDoc, profile.dataStartRow);
  rows.forEach((data, i) => {
    const rowNumber = profile.dataStartRow + i;
    const row = spreadsheetNs(sheetDoc, "row");
    row.setAttribute("r", rowNumber);
    Object.entries(profile.fieldMapping).forEach(([header, rule]) => {
      const col = headerMap[header];
      const ref = `${columnName(col)}${rowNumber}`;
      const value = exportFieldValue(rule, data);
      row.appendChild(header === "時數" ? makeNumberCell(sheetDoc, ref, value) : makeInlineStringCell(sheetDoc, ref, value));
    });
    sheetData.appendChild(row);
  });
  const dimension = sheetDoc.getElementsByTagNameNS("http://schemas.openxmlformats.org/spreadsheetml/2006/main", "dimension")[0];
  if (dimension) {
    const maxCol = Math.max(...Object.values(headerMap));
    const lastRow = Math.max(profile.headerRow, profile.dataStartRow + rows.length - 1);
    dimension.setAttribute("ref", `A1:${columnName(maxCol)}${lastRow}`);
  }
}

function formatEcpDateTime(value) {
  const p = taipeiDateTimeParts(value);
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
}

function addHoursToDate(value, h) {
  const d = safeDate(value);
  d.setMinutes(d.getMinutes() + Math.round(Number(h || 0) * 60));
  return d;
}

function workLogRowsForEcp() {
  return monthEntries().map(entry => ({
    title: entry.title || "",
    ecpTask: entry.ecpTask || "",
    startAt: formatEcpDateTime(entry.at),
    endAt: formatEcpDateTime(addHoursToDate(entry.at, entry.hours)),
    hours: Number(entry.hours || 0),
    ecpOwner: profile?.ecpOwner || "",
    ecpDepartment: profile?.ecpDepartment || ""
  }));
}

function profileFileName(profileConfig, month = selectedMonth) {
  return profileConfig.filename.replace("{YYYYMM}", monthKey(month).replace("-", ""));
}

async function exportByProfile(rows, profileConfig, month = selectedMonth) {
  const entries = await loadTemplateEntries(profileConfig.template);
  const sheetPath = resolveSheetPath(entries, profileConfig.sheet);
  const sheetDoc = parseXml(xmlText(entries, sheetPath));
  writeRowsByHeaderName(sheetDoc, profileConfig, rows);
  updateZipText(entries, sheetPath, new XMLSerializer().serializeToString(sheetDoc));
  const blob = writeZip(entries);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = profileFileName(profileConfig, month);
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

async function exportEcpImportFile() {
  try {
    const missing = workProfileMissingFields(workProfile);
    if (missing.length) return toast(`尚未完成工作身分。還缺少：${missing.join("、")}。完成後即可匯出 ECP。`);
    const rows = workLogRowsForEcp();
    if (!rows.length) return toast("本月份尚無工時資料可匯出。");
    const profileConfig = await loadExportProfile(ECP_EXPORT_PROFILE_PATH);
    await exportByProfile(rows, profileConfig, selectedMonth);
    toast("已下載 ECP 匯入檔");
  } catch (error) {
    console.error(error);
    toast(`ECP 匯出失敗：${error.message || "請稍後再試"}`);
  }
}

async function boot() {
  try {
    const googleAuth = await getGoogleAuthUser();
    if (googleAuth) {
      session = googleSessionFromUser(googleAuth.user, googleAuth.authSession);
      if (authCallbackCaptured) { activeModule = "dashboard"; activeWorkspace = "worklog"; openTabs = ["worklog"]; recentWorkspaces = ["worklog"]; view = "center"; hasOsShellState = true; }
      saveAll();
      await DataService.init();
    } else if (hasGoogleOAuthSession()) {
      await DataService.init();
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

window.addEventListener("focus", () => refreshConversationFromCloud(true));
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") refreshConversationFromCloud(true);
});
window.addEventListener("pageshow", () => refreshConversationFromCloud(true));

window.addEventListener("beforeunload", event => {
  if (autoSaveInFlight || autoSaveDirtyScopes.size || cloudSync.status === "syncing" || cloudSync.status === "pending") {
    event.preventDefault();
    event.returnValue = "資料仍在同步中，請稍候...";
    return event.returnValue;
  }
});
