const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "worklog-app.js"), "utf8");

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
  LUNCH_STATES: { NORMAL: "NORMAL", DELAYED: "DELAYED", WAIVED: "WAIVED", UNKNOWN: "UNKNOWN" },
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
  "minutesFromTime",
  "timeFromMinutes",
  "profileWorkSchedule",
  "entryStartMinutes",
  "entryEndMinutes",
  "mergeTimeIntervals",
  "workIntervalsForDate",
  "determineLunchState",
  "workScheduleContext",
  "timeResolutionContext",
  "availableStartMinutes",
  "dateFromWorkKey",
  "nextWorkdayKey",
  "earliestAvailableWorkTime",
  "assistantRelativeTimeSignal",
  "roundedCurrentMinutes",
  "finalizeTimeResolution",
  "resolveWorklogTime"
].forEach(name => vm.runInContext(functionSource(name), context));

const cases = [
  { hours: 3, next: "13:00", state: "NORMAL", lunch: [12 * 60, 13 * 60] },
  { hours: 4, next: "14:00", state: "DELAYED", lunch: [13 * 60, 14 * 60] },
  { hours: 5, next: "15:00", state: "DELAYED", lunch: [14 * 60, 15 * 60] },
  { hours: 6, next: "16:00", state: "DELAYED", lunch: [15 * 60, 16 * 60] },
  { hours: 7, next: "17:00", state: "DELAYED", lunch: [16 * 60, 17 * 60] }
];

for (const item of cases) {
  context.entries = [{ id: `morning-${item.hours}`, date: "2026-07-16", at: "2026-07-16T09:00", hours: item.hours, status: "completed" }];
  const schedule = context.workScheduleContext("2026-07-16");
  assert(schedule.lunchState === item.state, `09:00 + ${item.hours}h must be ${item.state}`);
  assert(schedule.lunchWindow.start === item.lunch[0] && schedule.lunchWindow.end === item.lunch[1], `09:00 + ${item.hours}h must preserve the expected one-hour lunch`);
  assert(context.resolveWorklogTime({ dateKey: "2026-07-16", hours: 1 }).at === `2026-07-16T${item.next}`, `09:00 + ${item.hours}h must place the next hour at ${item.next}`);
}

context.entries = [{ id: "full-day", date: "2026-07-16", at: "2026-07-16T09:00", hours: 8, status: "completed" }];
const complete = context.workScheduleContext("2026-07-16");
assert(complete.completedEightHours === true, "09:00-17:00 must complete the day");
assert(complete.lunchState === "WAIVED" && complete.lunchWindow === null, "A completed day must waive lunch instead of deferring it");
assert(context.availableStartMinutes("2026-07-16", 1) === null, "A completed day must not receive another automatic same-day slot");

// Explicit work is never moved, even when it occupies the current deferred-lunch window.
context.entries = [{ id: "five-hours", date: "2026-07-16", at: "2026-07-16T09:00", hours: 5, status: "completed" }];
const explicit = context.resolveWorklogTime({ dateKey: "2026-07-16", hours: 1, explicitAt: "2026-07-16T14:30" });
assert(explicit.at === "2026-07-16T14:30", "Explicit 14:30 work must never be moved");
assert(explicit.lunchState === "DELAYED", "Explicit work during deferred lunch must keep lunch delayed");
assert(explicit.lunchWindow.start === 15 * 60 + 30 && explicit.lunchWindow.end === 16 * 60 + 30, "Deferred lunch must move again to preserve a full hour");

assert(functionSource("timeResolutionContext").includes("workScheduleContext"), "Legacy Time Resolution context must delegate to Work Schedule Engine");
assert(functionSource("createEntry").includes("resolveWorklogTime"), "All WorkLog creation must continue through the shared engine");
assert(!functionSource("determineLunchState").includes("COVERED"), "Deferred lunch must supersede the old covered-means-disappeared rule");

console.log("P5.7.3 Work Schedule Engine v2.1 tests: PASS");
