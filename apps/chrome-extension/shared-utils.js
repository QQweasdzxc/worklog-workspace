// P5.2A-1 Foundation Split: shared utilities and low-level helpers.
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
