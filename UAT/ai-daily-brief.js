/* Sprint 6.1: Product Layer projection for Mr. KM's Daily Brief.
 * This module is deliberately read-only. It derives a compact daily view from
 * the existing WorkLog, Task, Knowledge and Work Memory state without changing
 * Core Architecture, AppState, Router, Session or WorkLog business rules.
 */
(function (global) {
  const TIME_ZONE = "Asia/Taipei";
  const WORKDAY_HOURS = 8;

  function briefParts(value = new Date()) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: TIME_ZONE,
      year: "numeric", month: "2-digit", day: "2-digit",
      weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false
    }).formatToParts(value);
    return Object.fromEntries(parts.filter(part => part.type !== "literal").map(part => [part.type, part.value]));
  }

  function briefDateKey(value = new Date()) {
    const parts = briefParts(value);
    return `${parts.year}-${parts.month}-${parts.day}`;
  }

  function briefDateLabel(value = new Date()) {
    const parts = briefParts(value);
    const weekdayMap = { Sun: "日", Mon: "一", Tue: "二", Wed: "三", Thu: "四", Fri: "五", Sat: "六" };
    return `${parts.year}/${parts.month}/${parts.day}（${weekdayMap[parts.weekday] || parts.weekday}）`;
  }

  function briefDuration(value = 0) {
    if (typeof formatHumanDuration === "function") return formatHumanDuration(value);
    const minutes = Math.max(0, Math.round(Number(value || 0) * 60));
    const h = Math.floor(minutes / 60), m = minutes % 60;
    return h && m ? `${h}h ${m}m` : h ? `${h}h` : `${m}m`;
  }

  function briefTodayEntries(today = new Date()) {
    const dateKey = briefDateKey(today);
    return typeof entries !== "undefined" && Array.isArray(entries)
      ? entries.filter(item => String(item.date || "") === dateKey).sort((a, b) => new Date(a.at) - new Date(b.at))
      : [];
  }

  function briefTodayHours(today = new Date()) {
    const items = briefTodayEntries(today);
    if (typeof hours === "function") return Number(hours(items) || 0);
    return items.reduce((sum, item) => sum + Number(item.hours || 0), 0);
  }

  function briefPendingTasks() {
    return (typeof tasks !== "undefined" && Array.isArray(tasks) ? tasks : [])
      .filter(task => task && task.status !== "completed" && task.done !== true && task.completed !== true)
      .slice(0, 3);
  }

  function briefSuggestionCount() {
    try {
      return typeof workMemoryAiSuggestionItems === "function"
        ? (workMemoryAiSuggestionItems() || []).length
        : 0;
    } catch (error) {
      console.warn("AI Daily Brief suggestion projection unavailable", error);
      return 0;
    }
  }

  function briefRecentKnowledgeCount(today = new Date()) {
    const todayKey = briefDateKey(today);
    return (typeof library !== "undefined" && Array.isArray(library) ? library : []).filter(item => {
      const stamp = item?.updatedAt || item?.updated_at || item?.createdAt || item?.created_at || item?.sourceModifiedAt || "";
      const parsed = stamp ? new Date(stamp) : null;
      return parsed && !Number.isNaN(parsed.getTime()) && briefDateKey(parsed) === todayKey;
    }).length;
  }

  function briefMode(today = new Date(), todayHours = briefTodayHours(today)) {
    const hour = Number(briefParts(today).hour || 0);
    if (todayHours >= 7.5 || hour >= 17) return "closing";
    if (todayHours === 0 && hour < 12) return "morning";
    return "day";
  }

  function briefMetric(label, value, detail = "") {
    return `<div class="ai-daily-brief-metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong>${detail ? `<small>${escapeHtml(detail)}</small>` : ""}</div>`;
  }

  function aiDailyBriefMarkup(today = new Date()) {
    const todayHours = briefTodayHours(today);
    const missingHours = Math.max(0, Math.round((WORKDAY_HOURS - todayHours) * 10) / 10);
    const pending = briefPendingTasks();
    const suggestionCount = briefSuggestionCount();
    const recentKnowledge = briefRecentKnowledgeCount(today);
    const mode = briefMode(today, todayHours);
    const displayName = String((typeof session !== "undefined" && session?.name) || (typeof session !== "undefined" && session?.email) || "夥伴").split(" ")[0];
    const title = mode === "morning" ? `👋 早安，${displayName}！` : mode === "closing" ? "🌙 今天即將結束" : "🪶 Mr. KM 今日簡報";
    const lead = mode === "closing"
      ? `今天已記錄 ${briefDuration(todayHours)}，我已整理好收尾資訊。`
      : mode === "morning"
        ? "今天的工作狀態已整理好，從一個最重要的工作開始。"
        : "這是目前今天最值得注意的工作資訊。";
    const cta = mode === "closing" && missingHours > 0 ? "立即完成今天工時" : "開始今天的工作";
    const taskList = pending.length
      ? `<ul class="ai-daily-brief-task-list">${pending.map(task => `<li>${escapeHtml(task.title || task.name || "未命名任務")}</li>`).join("")}</ul>`
      : `<p class="ai-daily-brief-empty">目前沒有待完成任務</p>`;
    return `<section class="ai-daily-brief" data-ai-daily-brief data-ai-brief-mode="${mode}" aria-labelledby="ai-daily-brief-title">
      <div class="ai-daily-brief-head"><div><span class="ai-daily-brief-kicker">Mr. KM · AI Daily Brief</span><h2 id="ai-daily-brief-title">${escapeHtml(title)}</h2><p>${escapeHtml(lead)}</p></div><time datetime="${briefDateKey(today)}">${escapeHtml(briefDateLabel(today))}</time></div>
      <div class="ai-daily-brief-metrics">
        ${briefMetric("今日工時", `${briefDuration(todayHours)} / 8h`, missingHours > 0 ? `尚缺 ${briefDuration(missingHours)}` : "今日已完成 ✅")}
        ${briefMetric("待完成工作", `${pending.length} 項`, pending.length ? "先處理最重要的一項" : "目前沒有待辦")}
        ${briefMetric("Mr. KM 建議", `${suggestionCount} 項`, "依目前工作模型整理")}
        ${briefMetric("新 Knowledge", `${recentKnowledge} 份`, "今天更新或加入")}
      </div>
      <div class="ai-daily-brief-bottom"><div><span class="ai-daily-brief-section-label">今天先看</span>${taskList}</div><button class="btn ai-daily-brief-cta" type="button" data-ai-brief-start-work="1" data-open-workspace="worklog">${escapeHtml(cta)} <span aria-hidden="true">→</span></button></div>
    </section>`;
  }

  global.aiDailyBriefMarkup = aiDailyBriefMarkup;
  global.AIDailyBrief = Object.freeze({ briefDateKey, briefDateLabel, briefTodayHours, briefPendingTasks, briefSuggestionCount, briefRecentKnowledgeCount, briefMode });
})(window);
