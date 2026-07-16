const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "worklog-app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "worklog.css"), "utf8");

function functionSource(name) {
  const start = app.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`Missing function: ${name}`);
  const signatureEnd = app.indexOf(") {", start);
  const open = signatureEnd + 2;
  if (signatureEnd < 0) throw new Error(`Missing function body: ${name}`);
  let depth = 0;
  for (let index = open; index < app.length; index += 1) {
    if (app[index] === "{") depth += 1;
    if (app[index] === "}") depth -= 1;
    if (depth === 0) return app.slice(start, index + 1);
  }
  throw new Error(`Unclosed function: ${name}`);
}

function assert(value, message) {
  if (!value) throw new Error(message);
}

const context = {
  profile: { workHours: "09:00~18:00", lunch: "12:00~13:00" },
  entries: [],
  Math,
  Number,
  Date,
  String,
  key(date = new Date(2026, 6, 16)) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  },
  parseWorkTimeRange(value = "") {
    const [start, end] = String(value).split("~");
    return { start, end };
  }
};
vm.createContext(context);
[
  "formatHumanDuration",
  "minutesFromTime",
  "timeFromMinutes",
  "profileWorkSchedule",
  "entryStartMinutes",
  "entryEndMinutes",
  "mergeTimeIntervals",
  "availableStartMinutes",
  "dateFromWorkKey",
  "nextWorkdayKey",
  "earliestAvailableWorkTime",
  "assistantRelativeTimeSignal",
  "roundedCurrentMinutes",
  "resolveWorklogTime"
].forEach(name => vm.runInContext(functionSource(name), context));

assert(context.formatHumanDuration(0.5) === "30m", "30 minutes must be readable");
assert(context.formatHumanDuration(1) === "1h", "Whole hours must be readable");
assert(context.formatHumanDuration(1.5) === "1h 30m", "Half hours must not be decimal");
assert(context.formatHumanDuration(1.67) === "1h 40m", "Decimal averages must be converted to minutes");

const explicit = context.resolveWorklogTime({ dateKey: "2026-07-16", hours: 1, explicitAt: "2026-07-16T17:30" });
assert(explicit.at === "2026-07-16T17:30" && explicit.reason === "explicit", "Explicit time must win");

const now = context.resolveWorklogTime({ raw: "現在開始處理", dateKey: "2026-07-16", hours: 1, now: new Date(2026, 6, 16, 14, 13) });
assert(now.at === "2026-07-16T14:10" && now.reason === "now", "Now must resolve to current rounded time");

const completed = context.resolveWorklogTime({ raw: "才完成教育訓練", dateKey: "2026-07-16", hours: 1.5, now: new Date(2026, 6, 16, 15, 40) });
assert(completed.at === "2026-07-16T14:10" && completed.reason === "just_completed", "Just-completed work must resolve backwards");

context.entries = [];
assert(context.resolveWorklogTime({ dateKey: "2026-07-16", hours: 1 }).at === "2026-07-16T09:00", "No-time work must use earliest gap");

context.entries = [{ id: "morning", date: "2026-07-16", at: "2026-07-16T09:00", hours: 3, status: "completed" }];
assert(context.availableStartMinutes("2026-07-16", 1) === 780, "Automatic placement must skip lunch to 13:00");

context.entries = [{ id: "before-lunch", date: "2026-07-16", at: "2026-07-16T09:00", hours: 2, status: "completed" }];
assert(context.availableStartMinutes("2026-07-16", 2) === 660, "A WorkLog may cross lunch without splitting");

context.entries = [{ id: "overtime", date: "2026-07-16", at: "2026-07-16T17:30", hours: 1, status: "completed" }];
assert(context.resolveWorklogTime({ dateKey: "2026-07-16", hours: 1 }).at === "2026-07-17T09:00", "After overtime, next automatic WorkLog must use next workday 09:00");

assert(app.includes("⏱ 建議：${formatHumanDuration(item.hours || 1)}"), "Suggestion duration must be human readable");
assert(app.includes("showCreatedWorklogToast(saved)"), "Direct create must show actionable toast");
assert(app.includes("data-toast-undo") && app.includes("data-toast-edit"), "Created toast must offer undo and edit");
assert(app.includes("worklogTimeConflicts(item)"), "Fast path must fall back on time conflict");
assert(app.includes("recent7Days") && app.includes("recent30Days"), "Learning metrics must include recent windows");
assert(!functionSource("makeSuggestions").includes("done.some"), "Using a suggestion must not hide it");

assert(css.includes(".today-module .today-entry-list>.entry{position:relative;display:flex;flex:0 0 auto;flex-shrink:0;height:auto"), "Desktop cards must not overlap");
assert(css.includes(".today-module .today-entry-list>.entry{display:block;width:100%;height:auto;min-height:0;position:relative;flex-shrink:0}"), "Mobile cards must flow naturally");
assert(css.includes(".workbench-grid>.today-module{height:auto!important;min-height:0!important;max-height:none!important"), "Mobile panel must not inherit desktop fixed height");

console.log("P5.7.1 Final Stabilization tests: PASS");
