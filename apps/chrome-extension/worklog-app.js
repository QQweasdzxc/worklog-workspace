const VERSION = "1.0.0-rc3.1-sp2";
const root = document.getElementById("app");

let view = localStorage.getItem("wl_view") || "center";
let selected = new Date(localStorage.getItem("wl_selected") || Date.now());
let entries = JSON.parse(localStorage.getItem("wl_entries") || "[]");
let profile = JSON.parse(localStorage.getItem("wl_profile") || "null");
let feedback = JSON.parse(localStorage.getItem("wl_feedback") || "{}");
let session = JSON.parse(localStorage.getItem("wl_session") || "null");

const roles = ["採購", "行政", "人資", "業務", "行銷", "IT", "自訂"];
const defaultTags = ["採購案件處理", "發票請款", "驗收請款", "供應商聯繫", "Mail處理", "資料整理", "會議", "專案追蹤"];
const eventTypes = ["工作", "特休", "事假", "病假", "會議", "出差", "教育訓練"];

function uid() {
  return `wl-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeEntries() {
  let changed = false;
  entries = entries.map(e => {
    if (!e.id) { changed = true; return { ...e, id: uid(), type: e.type || "工作" }; }
    if (!e.type) { changed = true; return { ...e, type: "工作" }; }
    return e;
  });
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
  localStorage.setItem("wl_session", JSON.stringify(session));
  localStorage.setItem("wl_view", view);
  localStorage.setItem("wl_selected", selected.toISOString());
}

function toast(t) {
  const e = document.createElement("div");
  e.className = "toast";
  e.textContent = t;
  document.body.appendChild(e);
  setTimeout(() => e.classList.add("show"), 10);
  setTimeout(() => {
    e.classList.remove("show");
    setTimeout(() => e.remove(), 200);
  }, 1800);
}

function safeDate(value, fallback = new Date()) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

function key(d = selected) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmt(dt) {
  const d = safeDate(dt);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function dayEntries() {
  return entries.filter(e => e.date === key()).sort((a, b) => new Date(a.at) - new Date(b.at));
}

function hours() {
  return dayEntries().reduce((s, e) => s + Number(e.hours || 0), 0);
}

function nextStart() {
  let h = 9 + Math.floor(hours());
  if (h >= 12) h += 1;
  if (h >= 18) h = 17;
  return `${key()}T${String(h).padStart(2, "0")}:00`;
}

function tabs() {
  return `<div class="tabs">${[["center", "📅", "中心"], ["capture", "➕", "紀錄"], ["sync", "📦", "同步"], ["settings", "⚙️", "設定"]]
    .map(t => `<button class="tab ${view === t[0] ? "on" : ""}" data-view="${t[0]}">${t[1]}<br>${t[2]}</button>`).join("")}</div>`;
}

function userBadge() {
  if (!session) return "";
  return `<div class="identity-badge"><span>👤 ${session.name}</span><small>${session.email}</small><button class="mini" data-logout="1">登出</button></div>`;
}

function header() {
  return `<div class="top"><div><div class="muted">🟢 WorkLog AI・Web / Extension 版本一致</div><h1>🪶 WorkLog RC3</h1><div class="muted">AI 先理解工作，再提出今日建議卡。</div></div><div class="header-right">${userBadge()}<div class="tag">${VERSION}</div></div></div>${tabs()}`;
}

function authScreen() {
  return `<div class="wrap"><div class="card"><div class="top"><div><div class="muted">🔐 Identity Module</div><h1>WorkLog 登入</h1><div class="muted">RC3.1 先建立可驗收的登入生命週期：Login / Session / Logout。正式 Google OAuth 將於接上 Supabase Auth 後啟用。</div></div><div class="tag">${VERSION}</div></div><section class="panel" style="margin-top:18px"><label>顯示名稱</label><input id="loginName" class="input" value="叮噹"><label>Email</label><input id="loginEmail" class="input" value="qq.1025@gmail.com"><button class="btn full" id="mockGoogleLogin">使用 Google 登入（本機驗收）</button><div class="entry"><b>驗收重點</b><div class="muted">登入後重新整理頁面，應維持登入；按登出後應回到登入畫面。</div></div></section></div></div>`;
}

function onboarding() {
  return `<div class="wrap"><div class="card"><div class="top"><div><div class="muted">🪶 初次認識</div><h1>你好，我是諸葛先生</h1><div class="muted">我想先了解你的工作，之後才能產生更準的每日工作建議卡。</div></div><div class="header-right">${userBadge()}<div class="tag">${VERSION}</div></div></div><section class="panel" style="margin-top:18px"><div class="profile-grid"><div><label>你的職務</label><select id="role" class="input">${roles.map(r => `<option>${r}</option>`).join("")}</select></div><div><label>每日工時</label><select class="input"><option>09:00~18:00，午休 12:00~13:00</option></select></div></div><label>常見工作內容（可複選）</label><div class="row" style="grid-template-columns:repeat(2,1fr)">${defaultTags.map(t => `<button class="btn2 tag-btn" data-tag="${t}">${t}</button>`).join("")}</div><label>SOP 狀態</label><select id="sop" class="input"><option>目前沒有 SOP，先用職務模型</option><option>有 SOP，之後上傳</option></select><label>工作來源</label><div class="row" style="grid-template-columns:repeat(2,1fr)">${["Google Drive", "Gmail", "Calendar", "手動紀錄"].map(s => `<button class="btn2 src-btn" data-src="${s}">${s}</button>`).join("")}</div><button class="btn full" id="saveProfile">建立我的工作模型</button></section></div></div>`;
}

function cal() {
  const y = selected.getFullYear(), m = selected.getMonth(), first = new Date(y, m, 1), last = new Date(y, m + 1, 0);
  let html = `<h2>${y}/${String(m + 1).padStart(2, "0")}</h2><div class="cal">${["日", "一", "二", "三", "四", "五", "六"].map(x => `<div class="muted">${x}</div>`).join("")}`;
  for (let i = 0; i < first.getDay(); i++) html += "<div></div>";
  for (let d = 1; d <= last.getDate(); d++) {
    const dk = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const h = entries.filter(e => e.date === dk).reduce((s, e) => s + Number(e.hours || 0), 0);
    html += `<div class="day ${d === selected.getDate() ? "sel" : ""}" data-day="${d}"><b>${d}</b><div class="bar"><div class="fill" style="width:${Math.min(100, h / 8 * 100)}%"></div></div><small>${h ? h + "h" : ""}</small></div>`;
  }
  return html + "</div>";
}

function makeSuggestions() {
  if (!profile) return [];
  const done = dayEntries().map(e => e.title);
  let tags = [...profile.tags];
  tags.sort((a, b) => (feedback[b] || 0) - (feedback[a] || 0));
  let suggestions = [];
  let start = nextStart();
  for (const tag of tags) {
    if (suggestions.length >= Math.max(0, 8 - hours())) break;
    if (done.some(d => d.includes(tag))) continue;
    let confidence = 80 + (feedback[tag] || 0) * 5;
    if (tag.includes("發票")) confidence += 8;
    if (tag.includes("採購")) confidence += 10;
    suggestions.push({
      id: tag,
      title: tag,
      task: tag,
      hours: 1,
      at: start,
      confidence: Math.max(45, Math.min(98, confidence)),
      evidence: [`職務：${profile.role}`, `工作標籤：${tag}`, `上班時間：09:00~18:00`, `回饋權重：${feedback[tag] || 0}`]
    });
    let d = new Date(start);
    d.setHours(d.getHours() + 1);
    if (d.getHours() === 12) d.setHours(13);
    start = `${key()}T${String(d.getHours()).padStart(2, "0")}:00`;
  }
  return suggestions;
}

function suggestionCards() {
  const s = makeSuggestions();
  if (!s.length) return `<div class="entry"><b>目前沒有可建議卡片</b><div class="muted">可能今天已滿 8 小時，或工作模型尚未建立。</div></div>`;
  return s.map(x => `<div class="suggestion"><div class="tag">信心 ${x.confidence}%</div><h3>${x.title}</h3><div class="muted">預設 1h</div><div class="evidence">${x.evidence.map(e => `✔ ${e}`).join("<br>")}</div><div class="actions"><button class="btn green" data-accept="${x.id}">✔ 採納</button><button class="btn amber" data-adjust="${x.id}">✎ 修改</button><button class="btn red" data-reject="${x.id}">✖ 略過</button></div></div>`).join("");
}

function center() {
  const h = hours(), miss = Math.max(0, 8 - h);
  return `<div class="grid"><section class="panel module" data-module="calendar">${cal()}</section><section class="panel module" data-module="today"><h2>🪶 今日建議卡</h2><div class="tag">${h} / 8h・${miss ? `尚缺 ${miss}h` : "已滿 8h"}</div>${suggestionCards()}<h2 style="margin-top:18px">今日紀錄</h2>${dayEntries().length ? dayEntries().map((e) => `<div class="entry"><b>${e.title}</b><div class="muted">${fmt(e.at)}｜${e.hours}h｜${e.type || "工作"}｜${e.task}</div><div class="actions"><button class="btn2" data-edit-id="${e.id}">編輯</button><button class="btn2" data-del-id="${e.id}">刪除</button></div></div>`).join("") : `<div class="entry"><b>尚無工時紀錄</b><div class="muted">可採納建議卡，或右下角 + 新增。</div></div>`}</section></div><button class="fab" data-action="add">+</button>`;
}

function capture(editId = null, seed = null) {
  const e = editId ? entries.find(x => x.id === editId) : null;
  const title = e ? e.title : (seed ? seed.title : "");
  const task = e ? e.task : (seed ? seed.task : "採購案件處理");
  const type = e ? (e.type || "工作") : "工作";
  return `<section class="panel" style="margin-top:18px"><h2>${e ? "編輯工時" : "➕ 快速紀錄"}</h2><div class="form"><input class="input" id="dt" type="datetime-local" value="${e ? e.at : nextStart()}"><textarea id="title" placeholder="今天做了什麼？">${title}</textarea><label>事件類型</label><select id="eventType" class="input">${eventTypes.map(t => `<option ${type === t ? "selected" : ""}>${t}</option>`).join("")}</select><div class="row">${[0.5, 1, 1.5, 2, 3, 4, 8].map(h => `<button class="btn2 hour" data-h="${h}">${h === 0.5 ? "30m" : h + "h"}</button>`).join("")}</div><input class="input" id="task" value="${task}"><button class="btn full" id="saveEntry">儲存</button></div></section>`;
}

function sync() {
  return `<section class="panel" style="margin-top:18px"><h2>📦 同步中心</h2><p class="muted">這裡只顯示真實狀態；未完成串接不放假按鈕。</p><div class="status"><span>Identity</span><b>${session ? "🟢 已登入" : "⚪ 未登入"}</b></div><div class="status"><span>AI 建議卡</span><b>🟢 已依 Work Profile 啟用</b></div><div class="status"><span>Google Drive</span><b>⚪ 尚未連接</b></div><div class="status"><span>Supabase</span><b>⚪ 尚未連接</b></div></section>`;
}

function settings() {
  return `<section class="panel" style="margin-top:18px"><h2>⚙️ 設定</h2><div class="entry"><b>目前使用者</b><div class="muted">${session.name}｜${session.email}</div></div><label>角色</label><select id="roleSet" class="input">${roles.map(r => `<option ${profile && profile.role === r ? "selected" : ""}>${r}</option>`).join("")}</select><label>工作標籤</label><textarea id="tagsSet">${profile ? profile.tags.join("\n") : ""}</textarea><button class="btn full" id="saveSettings">儲存工作模型</button><button class="btn gray full" id="resetProfile">重新初次認識</button><button class="btn red full" id="logoutBtn">登出</button><div class="entry"><b>版本</b><div class="muted">${VERSION}</div></div></section>`;
}

function render() {
  normalizeEntries();
  if (!session) {
    root.innerHTML = authScreen();
    bindAuth();
    return;
  }
  if (!profile) {
    root.innerHTML = onboarding();
    bindOnboarding();
    bindGlobal();
    return;
  }
  root.innerHTML = `<div class="wrap"><div class="card">${header()}${view === "center" ? center() : view === "capture" ? capture() : view === "sync" ? sync() : settings()}</div></div>`;
  bind();
  bindGlobal();
}

function bindAuth() {
  document.getElementById("mockGoogleLogin").onclick = () => {
    const name = document.getElementById("loginName").value.trim() || "WorkLog User";
    const email = document.getElementById("loginEmail").value.trim() || "user@example.com";
    session = { provider: "google-local", name, email, uuid: `local-${btoa(email).replace(/=/g, "")}`, loginAt: new Date().toISOString() };
    saveAll();
    toast("登入成功");
    render();
  };
}

function bindGlobal() {
  document.querySelectorAll("[data-logout]").forEach(b => b.onclick = () => doLogout());
}

function doLogout() {
  session = null;
  view = "center";
  saveAll();
  toast("已登出");
  render();
}

function bindOnboarding() {
  let tags = [], src = [];
  document.querySelectorAll(".tag-btn").forEach(b => b.onclick = () => {
    tags.includes(b.dataset.tag) ? tags = tags.filter(x => x !== b.dataset.tag) : tags.push(b.dataset.tag);
    b.style.borderColor = tags.includes(b.dataset.tag) ? "#60a5fa" : "#334155";
  });
  document.querySelectorAll(".src-btn").forEach(b => b.onclick = () => {
    src.includes(b.dataset.src) ? src = src.filter(x => x !== b.dataset.src) : src.push(b.dataset.src);
    b.style.borderColor = src.includes(b.dataset.src) ? "#60a5fa" : "#334155";
  });
  document.getElementById("saveProfile").onclick = () => {
    profile = { role: document.getElementById("role").value, tags: tags.length ? tags : ["採購案件處理", "發票請款", "驗收請款"], sources: src.length ? src : ["手動紀錄"], workHours: "09:00~18:00", lunch: "12:00~13:00", sop: document.getElementById("sop").value };
    saveAll();
    toast("已建立工作模型");
    render();
  };
}

function bind() {
  document.querySelectorAll("[data-view]").forEach(b => b.onclick = () => { view = b.dataset.view; saveAll(); render(); });
  document.querySelectorAll("[data-day]").forEach(b => b.onclick = () => { selected.setDate(Number(b.dataset.day)); saveAll(); render(); });
  const add = document.querySelector("[data-action=add]");
  if (add) add.onclick = () => { view = "capture"; saveAll(); render(); };
  document.querySelectorAll("[data-accept]").forEach(b => b.onclick = () => {
    const s = makeSuggestions().find(x => x.id === b.dataset.accept);
    if (!s) return;
    entries.push({ id: uid(), date: key(), at: s.at, title: s.title, task: s.task, hours: 1, type: "工作", source: "ai-card" });
    feedback[s.id] = (feedback[s.id] || 0) + 1;
    saveAll();
    toast("已加入今日工時");
    render();
  });
  document.querySelectorAll("[data-adjust]").forEach(b => b.onclick = () => {
    const s = makeSuggestions().find(x => x.id === b.dataset.adjust);
    view = "capture";
    root.innerHTML = `<div class="wrap"><div class="card">${header()}${capture(null, s)}</div></div>`;
    bindCapture();
    bindGlobal();
  });
  document.querySelectorAll("[data-reject]").forEach(b => b.onclick = () => { feedback[b.dataset.reject] = (feedback[b.dataset.reject] || 0) - 1; saveAll(); toast("已略過，權重降低"); render(); });
  document.querySelectorAll("[data-del-id]").forEach(b => b.onclick = () => { entries = entries.filter(e => e.id !== b.dataset.delId); saveAll(); toast("已刪除"); render(); });
  document.querySelectorAll("[data-edit-id]").forEach(b => b.onclick = () => { view = "capture"; root.innerHTML = `<div class="wrap"><div class="card">${header()}${capture(b.dataset.editId)}</div></div>`; bindCapture(b.dataset.editId); bindGlobal(); });
  if (view === "capture") bindCapture();
  if (view === "settings") {
    document.getElementById("saveSettings").onclick = () => { profile.role = document.getElementById("roleSet").value; profile.tags = document.getElementById("tagsSet").value.split("\n").map(x => x.trim()).filter(Boolean); saveAll(); toast("工作模型已更新"); render(); };
    document.getElementById("resetProfile").onclick = () => { profile = null; saveAll(); render(); };
    document.getElementById("logoutBtn").onclick = () => doLogout();
  }
}

function bindCapture(editId = null) {
  const editingEntry = editId ? entries.find(e => e.id === editId) : null;
  let selectedH = editingEntry ? Number(editingEntry.hours) : 1;
  document.querySelectorAll(".hour").forEach(b => b.onclick = () => {
    selectedH = Number(b.dataset.h);
    document.querySelectorAll(".hour").forEach(x => x.style.borderColor = "#334155");
    b.style.borderColor = "#60a5fa";
  });
  document.getElementById("saveEntry").onclick = () => {
    const title = document.getElementById("title").value.trim();
    if (!title) return toast("請輸入工作內容");
    const at = document.getElementById("dt").value;
    const item = { id: editingEntry ? editingEntry.id : uid(), date: at.slice(0, 10), at, title, hours: selectedH, type: document.getElementById("eventType").value, task: document.getElementById("task").value || "採購案件處理", source: editingEntry ? editingEntry.source : "manual" };
    const error = validateEntry(item);
    if (error) return toast(error);
    if (editingEntry) {
      const idx = entries.findIndex(e => e.id === editingEntry.id);
      entries[idx] = item;
    } else entries.push(item);
    selected = new Date(at);
    view = "center";
    saveAll();
    toast("已儲存工時");
    render();
  };
}

render();
