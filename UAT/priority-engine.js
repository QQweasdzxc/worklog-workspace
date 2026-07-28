/* Sprint 6.1: deterministic, extensible Dashboard priority projection. */
(function (global) {
  const TIME_ZONE = "Asia/Taipei";
  const AI_SCORE_DEFAULT = 0;

  function dateKey(value = new Date()) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: TIME_ZONE,
      year: "numeric", month: "2-digit", day: "2-digit"
    }).formatToParts(value);
    const map = Object.fromEntries(parts.filter(part => part.type !== "literal").map(part => [part.type, part.value]));
    return `${map.year}-${map.month}-${map.day}`;
  }

  function normalizePriority(value = "medium") {
    const key = String(value || "medium").trim().toLowerCase();
    return ({ urgent: "high", high: "high", 高: "high", 重要: "high", medium: "medium", 中: "medium", low: "low", 低: "low" })[key] || "medium";
  }

  function score(task = {}, now = new Date()) {
    const today = dateKey(now);
    const due = String(task.dueDate || task.due_date || "").slice(0, 10);
    const priority = normalizePriority(task.priority);
    const priorityScore = { high: 300, medium: 200, low: 100 }[priority] || 200;
    const dueScore = due ? (due < today ? 500 : due === today ? 400 : due <= dateKey(new Date(now.getTime() + 7 * 86400000)) ? 150 : 25) : 0;
    const pinScore = task.userPinned === true || task.user_pinned === true ? 1000 : 0;
    const aiScore = Number(task.aiScore ?? task.ai_score ?? AI_SCORE_DEFAULT) || AI_SCORE_DEFAULT;
    return pinScore + dueScore + priorityScore + aiScore;
  }

  function rank(tasks = [], now = new Date()) {
    return (Array.isArray(tasks) ? tasks : [])
      .filter(task => task && task.status !== "completed" && task.done !== true && task.completed !== true)
      .slice()
      .sort((a, b) => {
        const scoreDelta = score(b, now) - score(a, now);
        if (scoreDelta) return scoreDelta;
        const dueA = String(a.dueDate || a.due_date || "9999-12-31");
        const dueB = String(b.dueDate || b.due_date || "9999-12-31");
        return dueA.localeCompare(dueB) || String(a.title || a.name || "").localeCompare(String(b.title || b.name || ""), "zh-Hant");
      });
  }

  function reason(task = {}, now = new Date()) {
    const today = dateKey(now);
    const due = String(task.dueDate || task.due_date || "").slice(0, 10);
    const priority = normalizePriority(task.priority);
    if (due && due < today) return "因為已逾期。";
    if (due === today) return "因為今天截止。";
    if (task.userPinned === true || task.user_pinned === true) return "因為你已將它標記為優先。";
    if (priority === "high") return "因為目前優先級較高。";
    return "依目前工作優先順序。";
  }

  global.PriorityEngine = Object.freeze({ AI_SCORE_DEFAULT, dateKey, normalizePriority, score, rank, reason });
})(window);
