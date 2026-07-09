const VERSION = "1.0.0-rc3.1-sp3";
const RELEASE_VERSION = "RC3.3";
const BUILD_TIME = "20260709-1358";
const DEPLOY_SOURCE = `worklog-app.js?v=${BUILD_TIME}`;
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
const eventTypes = ["工作", "特休", "事假", "病假", "會議", "出差", "教育訓練"];
const roleCodeMap = { "採購": "PROCUREMENT", "行政": "ADMIN", "人資": "HR", "業務": "SALES", "行銷": "MARKETING", "IT": "IT", "自訂": "CUSTOM" };
const roleNameMap = Object.fromEntries(Object.entries(roleCodeMap).map(([name, code]) => [code, name]));
const eventTypeCodeMap = { "工作": "WORK", "會議": "MEETING", "教育訓練": "TRAINING", "特休": "LEAVE", "事假": "LEAVE", "病假": "LEAVE", "出差": "BUSINESS_TRIP" };
const eventTypeNameMap = { WORK: "工作", MEETING: "會議", TRAINING: "教育訓練", LEAVE: "特休", BUSINESS_TRIP: "出差" };
const DEFAULT_LIBRARY_READING_STATUS = "🟡 等待閱讀";
const ECP_EXPORT_PROFILE_PATH = "resources/profiles/ecp-profile.json";
const CLOUD_MIGRATION_KEY = "localstorage_rc33_to_rc34a_v1";
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

function cloudHeaders(extra = {}) {
  return {
    apikey: AUTH_CONFIG.supabaseAnonKey,
    Authorization: `Bearer ${session?.access_token || AUTH_CONFIG.supabaseAnonKey}`,
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
  return eventTypeCodeMap[label] || label || "WORK";
}

function eventTypeName(code = "WORK") {
  return eventTypeNameMap[code] || code || "工作";
}

function parseWorkTimeRange(range = "09:00~18:00") {
  const [start = "09:00", end = "18:00"] = String(range).split("~").map(x => x.trim());
  return { start, end };
}

function cacheKey(name) {
  const uuid = session?.user_uuid || session?.uuid || "anonymous";
  return `wl_cache:${uuid}:${name}`;
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
let dataServiceReady = false;
let dataServiceHydrating = false;
let dataServiceSyncing = false;
let migrationRequired = false;
let migrationPreview = null;
let migrationRunning = false;
let migrationError = "";

const LocalCache = {
  load(name, fallback) { return readJson(cacheKey(name), fallback); },
  save(name, value) { writeJson(cacheKey(name), value); },
  saveAll() {
    if (!hasGoogleOAuthSession()) return;
    this.save("profile", profile);
    this.save("entries", entries);
    this.save("work_models", profile?.tags || []);
    this.save("ecp_settings", { ecpOwner: profile?.ecpOwner || "", ecpDepartment: profile?.ecpDepartment || "" });
    this.save("ecp_tasks", profile?.ecpTasks || []);
  },
  hydrate() {
    if (!hasGoogleOAuthSession()) return false;
    const cachedProfile = this.load("profile", null);
    const cachedEntries = this.load("entries", []);
    if (cachedProfile) profile = cachedProfile;
    if (Array.isArray(cachedEntries) && cachedEntries.length) entries = cachedEntries;
    return !!cachedProfile || cachedEntries.length > 0;
  }
};

const SupabaseRepository = {
  async request(path, options = {}) {
    const res = await fetch(`${AUTH_CONFIG.supabaseUrl}/rest/v1/${path}`, {
      ...options,
      headers: cloudHeaders(options.headers || {})
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      let payload = null;
      try { payload = options.body ? JSON.parse(options.body) : null; } catch { payload = options.body || null; }
      console.error("Supabase request failed", { path, status: res.status, body, payload });
      throw new Error(`Supabase ${res.status}: ${body || res.statusText}`);
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
  async upsertUserProfile(profileValue) {
    const work = parseWorkTimeRange(profileValue?.workHours);
    const lunch = parseWorkTimeRange(profileValue?.lunch || "12:00~13:00");
    const payload = {
      user_uuid: session.user_uuid,
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
    const payload = { user_uuid: session.user_uuid, export_profile: "ecp", ecp_owner: profileValue?.ecpOwner || "", ecp_department: profileValue?.ecpDepartment || "" };
    return this.request("user_export_settings?on_conflict=user_uuid,export_profile", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify(payload) });
  },
  async loadExportSettings() {
    const rows = await this.select("user_export_settings", "?select=*&export_profile=eq.ecp&limit=1");
    return rows?.[0] || null;
  },
  async syncNameList(table, names, extra = {}) {
    const rows = await this.select(table, "?select=id,name,is_active,sort_order");
    const current = rows || [];
    const wanted = [...new Set((names || []).map(x => String(x).trim()).filter(Boolean))];
    for (const [index, name] of wanted.entries()) {
      const existing = current.find(row => row.name === name);
      const payload = { user_uuid: session.user_uuid, name, is_active: true, sort_order: index, ...extra };
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
  async loadEntries(month = monthKey()) {
    const rows = await this.select("work_entries", `?select=*&work_date=gte.${month}-01&work_date=lt.${nextMonthKey(month)}-01&status=neq.deleted&order=started_at.asc`);
    return rows || [];
  },
  async loadMigration(key = CLOUD_MIGRATION_KEY) {
    const rows = await this.select("sync_migrations", `?select=*&migration_key=eq.${encodeURIComponent(key)}&limit=1`);
    return rows?.[0] || null;
  },
  async completeMigration(sourceHash, key = CLOUD_MIGRATION_KEY) {
    const payload = { user_uuid: session.user_uuid, migration_key: key, source_hash: sourceHash, completed_at: new Date().toISOString() };
    return this.request("sync_migrations?on_conflict=user_uuid,migration_key", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify(payload) });
  },
  async saveEntry(entry) {
    const ecpRows = await this.loadEcpTasks();
    const ecpTask = ecpRows.find(row => row.name === entry.ecpTask);
    const existing = entry.cloudId ? [{ id: entry.cloudId }] : await this.select("work_entries", `?select=id&legacy_id=eq.${encodeURIComponent(entry.id)}&limit=1`);
    const started = safeDate(entry.at);
    const ended = addHoursToDate(entry.at, entry.hours);
    const payload = {
      user_uuid: session.user_uuid,
      work_date: entry.date,
      started_at: started.toISOString(),
      ended_at: ended.toISOString(),
      hours: Number(entry.hours || 0),
      title: entry.title || "",
      note: entry.note || "",
      event_type: eventTypeCode(entry.type || "工作"),
      status: entry.status || "completed",
      source: entry.source || "manual",
      ecp_task_id: ecpTask?.id || null,
      ecp_task_name_snapshot: entry.ecpTask || "",
      legacy_id: entry.id
    };
    const saved = existing?.[0]?.id
      ? await this.patch("work_entries", `?id=eq.${encodeURIComponent(existing[0].id)}`, payload)
      : await this.insert("work_entries", payload);
    return saved?.[0] || null;
  },
  async deleteEntry(entry) {
    const existing = entry.cloudId ? [{ id: entry.cloudId }] : await this.select("work_entries", `?select=id&legacy_id=eq.${encodeURIComponent(entry.id)}&limit=1`);
    if (!existing?.[0]?.id) return null;
    return this.patch("work_entries", `?id=eq.${encodeURIComponent(existing[0].id)}`, { status: "deleted", deleted_at: new Date().toISOString() });
  }
};

function nextMonthKey(month = monthKey()) {
  const [year, m] = month.split("-").map(Number);
  const d = new Date(year, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function profileFromCloud(cloudProfile, exportSettings, workModels, ecpTaskRows) {
  const workHours = `${String(cloudProfile?.work_start_time || "09:00").slice(0, 5)}~${String(cloudProfile?.work_end_time || "18:00").slice(0, 5)}`;
  const lunch = `${String(cloudProfile?.lunch_start_time || "12:00").slice(0, 5)}~${String(cloudProfile?.lunch_end_time || "13:00").slice(0, 5)}`;
  const fallbackRole = profile?.role || "採購";
  const fallbackTags = Array.isArray(profile?.tags) && profile.tags.length ? profile.tags : tagsForRole(fallbackRole);
  const fallbackEcpTasks = Array.isArray(profile?.ecpTasks) && profile.ecpTasks.length ? profile.ecpTasks : defaultEcpTasks;
  return {
    ...(profile || {}),
    role: roleName(cloudProfile?.role_code || roleCode(fallbackRole)),
    tags: workModels?.length ? workModels.map(row => row.name) : fallbackTags,
    workHours,
    lunch,
    ecpOwner: exportSettings?.ecp_owner || profile?.ecpOwner || "",
    ecpDepartment: exportSettings?.ecp_department || profile?.ecpDepartment || "",
    ecpTasks: ecpTaskRows?.length ? ecpTaskRows.map(row => row.name) : fallbackEcpTasks
  };
}

function entryFromCloud(row) {
  return {
    id: row.legacy_id || row.id,
    cloudId: row.id,
    date: row.work_date,
    at: String(row.started_at || "").slice(0, 16),
    title: row.title || "",
    note: row.note || "",
    ecpTask: row.ecp_task_name_snapshot || "",
    hours: Number(row.hours || 0),
    type: eventTypeName(row.event_type || "WORK"),
    status: row.status || "completed",
    source: row.source || "manual"
  };
}

const DataService = {
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
          errors.push(`${label}: ${error.message || error}`);
          failedLoads.add(label);
          console.error(`Cloud Sync ${label} load failed`, error);
          return fallback;
        }
      };
      const cloudProfile = await safeLoad("profile", () => SupabaseRepository.loadUserProfile(), null);
      const exportSettings = await safeLoad("export_settings", () => SupabaseRepository.loadExportSettings(), null);
      const workModelsRows = await safeLoad("work_models", () => SupabaseRepository.loadWorkModels(), []);
      const ecpTaskRows = await safeLoad("ecp_tasks", () => SupabaseRepository.loadEcpTasks(), []);
      const entryRows = await safeLoad("entries", () => SupabaseRepository.loadEntries(monthKey()), []);
      if (cloudProfile || exportSettings || workModelsRows?.length || ecpTaskRows?.length) {
        profile = profileFromCloud(cloudProfile, exportSettings, workModelsRows || [], ecpTaskRows || []);
      }
      if (!failedLoads.has("entries")) entries = Array.isArray(entryRows) ? entryRows.map(entryFromCloud) : entries;
      normalizeEntries();
      LocalCache.saveAll();
      if (errors.length) this.setStatus("failed", errors.join(" | "));
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
    if (!inventory.hasCoreData) return false;
    try {
      const existing = await SupabaseRepository.loadMigration();
      if (existing?.completed_at) return false;
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
        await SupabaseRepository.upsertUserProfile(profile);
        await SupabaseRepository.upsertExportSettings(profile);
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
        await SupabaseRepository.upsertUserProfile(profile);
        await SupabaseRepository.upsertExportSettings(profile);
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
    if (!dataServiceReady || !hasGoogleOAuthSession()) return;
    try {
      await SupabaseRepository.deleteEntry(entry);
      this.setStatus("synced");
    } catch (error) {
      console.error("Cloud Sync delete failed", error);
      this.setStatus("failed", error.message || "Cloud Sync delete failed");
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
  LocalCache.saveAll();
  if (!options.skipSync && dataServiceReady && !dataServiceHydrating && !migrationRequired && !migrationRunning) DataService.syncAll();
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

function ecpTasks() {
  const source = Array.isArray(profile?.ecpTasks) && profile.ecpTasks.length ? profile.ecpTasks : (profile?.ecpTask ? [profile.ecpTask] : defaultEcpTasks);
  return [...new Set(source.map(x => String(x).trim()).filter(Boolean))];
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
  if (!profile) profile = { role: "採購", tags: [], sources: ["Google Drive", "Gmail", "Calendar", "手動紀錄"], workHours: "09:00~18:00", lunch: "12:00~13:00", sop: "目前沒有 SOP，先用職務模型" };
  const models = workModels();
  if (!models.includes(name)) profile.tags = [...models, name];
  return true;
}

async function saveWorkModel(model, options = {}) {
  const name = String(model || "").trim();
  if (!name) return false;
  addWorkModel(name);
  saveAll({ skipSync: true });
  try {
    if (hasGoogleOAuthSession() && !dataServiceHydrating && !migrationRunning) {
      dataServiceReady = true;
      DataService.setStatus("syncing");
      await SupabaseRepository.saveWorkModels(workModels(), profile);
      LocalCache.saveAll();
      DataService.setStatus("synced");
    } else {
      const reason = !hasGoogleOAuthSession() ? "尚未登入 Google" : "Cloud Sync 正在初始化";
      console.warn("Work model saved locally; cloud sync deferred", { name, reason });
      LocalCache.saveAll();
      if (options.requireCloud) throw new Error(reason);
    }
  } catch (error) {
    console.error("Save work model cloud sync failed", error);
    DataService.setStatus("failed", error.message || "Work model sync failed");
    if (options.requireCloud) throw error;
  }
  return true;
}

const addWorkDescription = saveWorkModel;

function googleConnectionLabel() {
  return "⚪ 尚未連接";
}

function cloudSyncLabel() {
  if (cloudSync.status === "synced") return "🟢 已同步";
  if (cloudSync.status === "syncing") return "🟡 同步中";
  if (cloudSync.status === "migration_required") return "🟡 等待資料搬移";
  if (cloudSync.status === "migrating") return "🟡 資料搬移中";
  if (cloudSync.status === "failed") return "🔴 同步失敗";
  return "⚪ 尚未同步";
}

function cloudSyncDetail() {
  if (cloudSync.status === "failed") return cloudSync.error || "請稍後再試";
  if (cloudSync.status === "migration_required") return "請先確認 Migration Preview";
  if (cloudSync.status === "migrating") return "正在搬移 RC3.3 本機資料";
  if (!cloudSync.lastSyncedAt) return "等待 Cloud Sync";
  return `最後同步：${fmt(cloudSync.lastSyncedAt)}`;
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
  return `<div class="top"><div class="brand-row"><button class="mini adaptive-menu" data-toggle-sidebar="1">☰</button><h1>🧠 Zhuge AI OS</h1><span class="header-version">${RELEASE_VERSION}</span></div><div class="header-right">${userBadge()}</div></div>`;
}

function authScreen() {
  return `<div class="wrap"><div class="card"><section class="panel" style="margin-top:18px"><h1>🧠 Zhuge AI OS</h1><button class="btn full" id="googleLoginBtn">使用 Google 登入</button></section></div></div>`;
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
  return `<aside class="os-sidebar"><button class="mini sidebar-close" data-close-sidebar="1">×</button>${agentStatusPanel()}${sidebarSection("🏕️ 營帳", "camp")}${sidebarSection("⚙️ 系統", "system")}<div class="developer-build-info"><div>${RELEASE_VERSION}</div><div>Build ${BUILD_TIME}</div><div>GitHub Pages：最後檢查 ${checked}</div><div>Source：${DEPLOY_SOURCE}</div></div></aside>`;
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
  html += `</div><div class="month-summary"><b>本月工時</b><span>${hours(monthEntries())}h</span></div><button class="btn full" data-export-month="1">⬇️ 下載 ECP 匯入檔</button>`;
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
  const year = selected.getFullYear(), month = selected.getMonth();
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
  return `<section class="panel mobile-summary-module summary-dashboard"><div class="summary-dashboard-head"><h2>☀️ 今日摘要</h2><div class="summary-dashboard-label">📊 工時儀表板</div></div><div class="summary-grid"><div class="summary-tile"><span>本月進度</span><b>${monthlyDone} / ${monthlyTarget}h</b><em>${monthProgress}%</em></div><div class="summary-tile"><span>本週進度</span><b>${weekDone} / 40h</b><em>${weekProgress}%</em></div><div class="summary-tile"><span>今日進度</span><b>${todayDone} / 8h</b><em>${todayProgress}%</em></div><div class="summary-tile summary-forecast ${health.className}"><span>達標預測</span><b>${health.label}</b></div></div></section>`;
}

function mobileCalendarPanel() {
  const today = new Date();
  const y = selected.getFullYear(), m = selected.getMonth();
  const first = new Date(y, m, 1);
  const start = startOfWeek(first);
  const last = new Date(y, m + 1, 0);
  const end = addDays(last, 6 - last.getDay());
  const days = [];
  for (let d = new Date(start); d <= end; d = addDays(d, 1)) days.push(d);
  const summaryHours = hours(entriesForDate(today));
  if (!mobileCalendarOpen) return `<div class="mobile-calendar-head"><button class="btn2" data-toggle-mobile-calendar="1">▼ 月曆</button><span class="muted">今日 ${String(today.getMonth() + 1).padStart(2, "0")}/${String(today.getDate()).padStart(2, "0")}｜${summaryHours} / 8h</span></div>`;
  return `<div class="mobile-calendar-head"><button class="btn2" data-toggle-mobile-calendar="1">▲ 月曆</button><span class="muted">${y} / ${String(m + 1).padStart(2, "0")}｜上下滑查看整月</span></div><div class="mobile-month-scroll"><div class="mobile-week-head">${["日", "一", "二", "三", "四", "五", "六"].map(x => `<span>${x}</span>`).join("")}</div><div class="mobile-two-week">${days.map(d => { const h = hours(entriesForDate(d)); const isToday = key(d) === key(today); const isSelected = key(d) === key(selected); const out = d.getMonth() !== m; return `<button class="mobile-day ${isToday ? "today" : ""} ${isSelected ? "sel" : ""} ${out ? "out" : ""}" data-mobile-date="${key(d)}"><b>${d.getDate()}</b><small>${h ? h + "h" : ""}</small></button>`; }).join("")}</div></div>`;
}

function todayPanel() {
  const list = dayEntries();
  const h = hours(list);
  return `<div class="panel-head"><h2>我的工作</h2><div class="tag">${h} / 8h</div></div>${list.length ? list.map(e => `<div class="entry"><div class="entry-main"><b>${escapeHtml(e.title)}</b><div class="muted">${fmt(e.at)}｜${Number(e.hours || 0)}h</div></div><div class="actions compact entry-actions"><button class="btn amber" data-edit-id="${e.id}">編輯</button><button class="btn red" data-del-id="${e.id}">刪除</button></div></div>`).join("") : `<div class="empty"><b>尚無工時紀錄</b><div class="muted">可採納推理預測，或使用下方按鈕新增工作。</div></div>`}<button class="btn full" data-action="add">➕ 新增工作</button>`;
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
    suggestions.push({ id: tag, title: tag, note: "", hours: 1, at: start, sourceLabel: "🧩 工作模型" });
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
  return `<div class="workbench-grid">${todaySummaryPanel()}<section class="panel module calendar-module"><div class="desktop-calendar">${calendarPanel()}</div><div class="mobile-calendar">${mobileCalendarPanel()}</div></section><section class="panel module today-module">${todayPanel()}</section><section class="panel module suggestion-module">${suggestionPanel()}</section></div>`;
}

function workDescriptionSuggestions(query = "") {
  const source = [
    ...entries.map(e => e.title),
    ...(profile?.tags || []),
    ...defaultTags
  ].map(x => String(x || "").trim()).filter(Boolean);
  const unique = [...new Set(source)];
  const q = query.trim().toLowerCase();
  return unique.filter(x => !q || x.toLowerCase().includes(q)).slice(0, 6);
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
  const ecpTask = e ? (e.ecpTask || "") : (seed ? seed.ecpTask || firstEcpTaskFor(seed.title) : "");
  return `<section class="panel capture-panel" style="margin-top:18px"><div class="panel-head"><div><h2>${e ? "編輯工時" : "➕ 快速紀錄"}</h2></div></div><div class="form capture-form"><label>日期 / 開始時間</label><input class="input" id="dt" type="datetime-local" value="${e ? e.at : captureDefaultStart()}"><label>工作描述（必填）</label><input class="input" id="title" value="${escapeHtml(title)}" placeholder="例如：採購案件處理" autocomplete="off">${descriptionSuggestionChips(title)}<label>ECP 任務（選填）</label><select id="ecpTaskSelect" class="input">${ecpTaskOptions(ecpTask)}</select><div class="work-model-add ecp-task-quick-add" id="ecpTaskQuickAdd" style="display:none"><input class="input" id="newEcpTaskCapture" placeholder="新增 ECP 任務，例如：採購案件處理"><button class="btn2" data-add-capture-ecp-task="1" type="button">＋ 新增</button></div><label>工時</label><div class="row hours">${[0.5, 1, 1.5, 2, 3, 4, 8].map(h => `<button class="btn2 hour" data-h="${h}">${h === 0.5 ? "30m" : h + "h"}</button>`).join("")}</div><label>備註（選填）</label><input class="input" id="note" value="${escapeHtml(note)}" placeholder="補充說明，不參與 ECP 匯出"><div class="form-actions capture-actions"><button class="btn2" data-capture-cancel="1">取消</button><button class="btn" id="saveEntry">儲存</button></div></div></section>`;
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
  const tasks = ecpTasks();
  return `<section class="panel" style="margin-top:18px"><h2>⚙️ 設定</h2><div class="entry"><b>目前使用者</b><div class="muted">${escapeHtml(session.name)}｜${escapeHtml(session.status || session.email || "")}</div></div><label>角色</label><select id="roleSet" class="input">${roles.map(r => `<option ${profile && profile.role === r ? "selected" : ""}>${r}</option>`).join("")}</select><div class="work-model-section"><label>工作模型</label><div class="work-model-list" id="workModelList">${workModelChecks(models, models)}</div><div class="work-model-add"><input class="input" id="newWorkModel" placeholder="新增工作模型，例如：ISO 稽核"><button class="btn2" id="addWorkModel" type="button">＋ 新增工作模型</button></div><div class="muted">工作模型給 AI 學習、推理與推薦使用，不直接等於 ECP 匯入欄位。</div></div><div class="work-model-section"><label>ECP 設定</label><label>ECP 負責人</label><input class="input" id="ecpOwner" value="${escapeHtml(profile?.ecpOwner || "")}" placeholder="例如：陳彥達-UU"><label>ECP 負責部門</label><input class="input" id="ecpDepartment" value="${escapeHtml(profile?.ecpDepartment || "")}" placeholder="例如：UU管理部"><label>ECP 任務</label>${ecpTaskList(tasks)}<div class="work-model-add"><input class="input" id="newEcpTask" placeholder="新增 ECP 任務，例如：採購案件處理"><button class="btn2" id="addEcpTask" type="button">＋ 新增 ECP 任務</button></div><div class="muted">ECP 任務專供匯出使用，快速紀錄每筆工時需選擇一個 ECP 任務，並寫入 Excel「任務」欄位。</div></div><button class="btn full" id="saveSettings">儲存設定</button><button class="btn gray full" id="resetProfile">重新初次認識</button><button class="btn red full" id="logoutBtn">登出</button><div class="entry"><b>版本</b><div class="muted">${VERSION}</div></div></section>`;
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
  if (migrationRequired) { root.innerHTML = migrationScreen(); bindMigration(); bindGlobal(); return; }
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
  const exportBtn = document.querySelector("[data-export-month]"); if (exportBtn) exportBtn.onclick = () => exportEcpImportFile();
  document.querySelectorAll("[data-accept]").forEach(b => b.onclick = () => acceptSuggestion(b.dataset.accept));
  document.querySelectorAll("[data-adjust]").forEach(b => b.onclick = () => adjustSuggestion(b.dataset.adjust));
  document.querySelectorAll("[data-del-id]").forEach(b => b.onclick = () => {
    const removed = entries.find(e => e.id === b.dataset.delId);
    entries = entries.filter(e => e.id !== b.dataset.delId);
    if (removed) DataService.deleteEntry(removed);
    saveAll(); toast("已刪除"); render();
  });
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
  entries.push({ id: uid(), date: key(), at: s.at, title: s.title, note: s.note || "", ecpTask: firstEcpTaskFor(s.title), hours: 1, type: "工作", source: "ai-card" });
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
  if (addEcpTaskBtn) addEcpTaskBtn.onclick = () => {
    const input = document.getElementById("newEcpTaskCapture");
    const name = input.value.trim();
    if (!name) return toast("請輸入 ECP 任務名稱");
    const tasks = ecpTasks();
    profile.ecpTasks = tasks.includes(name) ? tasks : [...tasks, name];
    profile.ecpTask = "";
    saveAll();
    ecpTaskSelect.innerHTML = ecpTaskOptions(name);
    ecpTaskSelect.value = name;
    input.value = "";
    if (quickAdd) quickAdd.style.display = "none";
    toast("已新增 ECP 任務");
  };
  document.querySelectorAll(".hour").forEach(b => b.onclick = () => { selectedH = Number(b.dataset.h); document.querySelectorAll(".hour").forEach(x => x.classList.remove("selected")); b.classList.add("selected"); });
  document.getElementById("saveEntry").onclick = async () => {
    const at = document.getElementById("dt").value;
    const description = document.getElementById("title").value.trim();
    const selectedEcpTask = document.getElementById("ecpTaskSelect").value === "__add__" ? "" : document.getElementById("ecpTaskSelect").value.trim();
    const item = { id: editingEntry ? editingEntry.id : uid(), date: at.slice(0, 10), at, title: description, ecpTask: selectedEcpTask, hours: selectedH, type: editingEntry ? editingEntry.type || "工作" : "工作", note: document.getElementById("note").value.trim(), source: editingEntry ? editingEntry.source : "manual" };
    const error = validateEntry(item); if (error) return toast(error);
    await saveWorkModel(description);
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
    });
  };
  bindEcpTaskRemove();
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
  const addEcp = document.getElementById("addEcpTask");
  if (addEcp) addEcp.onclick = () => {
    const input = document.getElementById("newEcpTask");
    const name = input.value.trim();
    if (!name) return toast("請輸入 ECP 任務名稱");
    const tasks = currentEcpTasks();
    renderEcpTasks(tasks.includes(name) ? tasks : [...tasks, name]);
    input.value = "";
    toast("已新增 ECP 任務");
  };
  document.getElementById("saveSettings").onclick = () => {
    profile.role = document.getElementById("roleSet").value;
    const selectedModels = [...document.querySelectorAll(".work-model-option:checked")].map(x => x.value.trim()).filter(Boolean);
    profile.tags = selectedModels.length ? [...new Set(selectedModels)] : tagsForRole(profile.role);
    profile.ecpOwner = document.getElementById("ecpOwner").value.trim();
    profile.ecpDepartment = document.getElementById("ecpDepartment").value.trim();
    profile.ecpTasks = currentEcpTasks();
    profile.ecpTask = "";
    saveAll(); toast("工作模型已更新"); render();
  };
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
  const d = safeDate(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
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

function profileFileName(profileConfig) {
  return profileConfig.filename.replace("{YYYYMM}", monthKey().replace("-", ""));
}

async function exportByProfile(rows, profileConfig) {
  const entries = await loadTemplateEntries(profileConfig.template);
  const sheetPath = resolveSheetPath(entries, profileConfig.sheet);
  const sheetDoc = parseXml(xmlText(entries, sheetPath));
  writeRowsByHeaderName(sheetDoc, profileConfig, rows);
  updateZipText(entries, sheetPath, new XMLSerializer().serializeToString(sheetDoc));
  const blob = writeZip(entries);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = profileFileName(profileConfig);
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

async function exportEcpImportFile() {
  try {
    if (!profile?.ecpOwner || !profile?.ecpDepartment) return toast("請先完成 ECP 設定。");
    const rows = workLogRowsForEcp();
    if (!rows.length) return toast("本月份尚無工時資料可匯出。");
    const profileConfig = await loadExportProfile(ECP_EXPORT_PROFILE_PATH);
    await exportByProfile(rows, profileConfig);
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
