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
  selected: new Date(2026, 6, 16),
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
  },
  minutesFromTime(value = "09:00") {
    const [hour, minute] = String(value).split(":").map(Number);
    return hour * 60 + minute;
  }
};
vm.createContext(context);
[
  "timeFromMinutes",
  "profileWorkSchedule",
  "entryStartMinutes",
  "mergeTimeIntervals",
  "availableStartMinutes",
  "dateFromWorkKey",
  "nextWorkdayKey",
  "earliestAvailableWorkTime",
  "assistantRelativeTimeSignal",
  "roundedCurrentMinutes",
  "resolveWorklogTime"
].forEach(name => vm.runInContext(functionSource(name), context));

const explicit = context.resolveWorklogTime({
  raw: "今天 17:30 做一小時",
  dateKey: "2026-07-16",
  hours: 1,
  explicitAt: "2026-07-16T17:30"
});
assert(explicit.at === "2026-07-16T17:30", "Explicit overtime must be preserved");

const justCompleted = context.resolveWorklogTime({
  raw: "剛剛完成教育訓練",
  dateKey: "2026-07-16",
  hours: 1,
  now: new Date(2026, 6, 16, 15, 10)
});
assert(justCompleted.at === "2026-07-16T14:10", "Just-completed work must resolve backwards from now");

context.entries = [{ id: "morning", date: "2026-07-16", at: "2026-07-16T09:00", hours: 3, status: "completed" }];
assert(context.availableStartMinutes("2026-07-16", 1) === 13 * 60, "Automatic time must skip a 12:00 lunch start");

context.entries = [{ id: "morning", date: "2026-07-16", at: "2026-07-16T09:00", hours: 2, status: "completed" }];
assert(context.availableStartMinutes("2026-07-16", 2) === 11 * 60, "A work entry may cross lunch without being split");

context.entries = [{ id: "overtime", date: "2026-07-16", at: "2026-07-16T17:30", hours: 1, status: "completed" }];
const following = context.resolveWorklogTime({ dateKey: "2026-07-16", hours: 1 });
assert(following.at === "2026-07-17T09:00", "After an overtime-ending day, automatic placement must use next workday 09:00");

const makeSuggestions = functionSource("makeSuggestions");
assert(!makeSuggestions.includes("done.some"), "Used suggestions must remain reusable");
const acceptSuggestion = functionSource("acceptSuggestion");
assert(acceptSuggestion.includes("confirmationOnly: true"), "Suggestion CTA must open confirmation instead of directly saving");
assert(!acceptSuggestion.includes("persistEntry("), "Suggestion CTA must not persist before confirmation");
assert(app.includes("suggestionCount") && app.includes("addedCount") && app.includes("editedCount") && app.includes("deletedCount"), "Suggestion usage metrics are incomplete");
assert(app.includes("averageHours") && app.includes("commonTimes") && app.includes("usageFrequency"), "Suggestion learning signals are incomplete");
assert(app.includes("Primary Role") && app.includes("Secondary Role"), "Work DNA role hierarchy is missing");
assert(app.includes('["日", "一", "二", "三", "四", "五", "六"]'), "Calendar weekday order must remain Sunday through Saturday");
assert(css.includes(".today-module .today-entry-list{display:flex;flex-direction:column"), "WorkLog list must own remaining flex height");
assert(css.includes(".panel-fixed-header,.panel-fixed-footer{flex:0 0 auto}"), "Panel headers and footers must stay fixed");

console.log("P5.7 Final Patch tests: PASS");
