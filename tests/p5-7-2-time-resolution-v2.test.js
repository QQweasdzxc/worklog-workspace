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
  LUNCH_STATES: { NORMAL: "NORMAL", COVERED: "COVERED", DELAYED: "DELAYED", UNKNOWN: "UNKNOWN" },
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

assert(context.determineLunchState([], { lunchStart: NaN, lunchEnd: NaN }).state === "UNKNOWN", "Invalid lunch configuration must remain UNKNOWN");

// Case 1: a normal lunch remains after 09:00-12:00, so automatic work starts at 13:00.
context.entries = [{ id: "morning", date: "2026-07-16", at: "2026-07-16T09:00", hours: 3, status: "completed" }];
assert(context.timeResolutionContext("2026-07-16").lunchState === "NORMAL", "09:00-12:00 must retain NORMAL lunch state");
assert(context.resolveWorklogTime({ dateKey: "2026-07-16", hours: 1 }).at === "2026-07-16T13:00", "NORMAL lunch must skip 12:00-13:00");

// Case 2: work already spans the nominal lunch, so no second lunch is inserted.
context.entries = [{ id: "covered", date: "2026-07-16", at: "2026-07-16T09:00", hours: 5, status: "completed" }];
assert(context.timeResolutionContext("2026-07-16").lunchState === "COVERED", "09:00-14:00 must cover lunch");
const coveredNext = context.resolveWorklogTime({ dateKey: "2026-07-16", hours: 1 });
assert(coveredNext.at === "2026-07-16T14:00", "COVERED lunch must continue at 14:00");
assert(coveredNext.previousLunchState === "COVERED", "Resolution must expose the current covered state");

// Case 3: an explicit two-hour entry may cross lunch and makes the resulting state covered.
context.entries = [];
const crossLunch = context.resolveWorklogTime({ dateKey: "2026-07-16", hours: 2, explicitAt: "2026-07-16T11:30" });
assert(crossLunch.at === "2026-07-16T11:30", "Explicit cross-lunch start must remain unchanged");
assert(crossLunch.lunchState === "COVERED", "11:30-13:30 must result in COVERED lunch state");

// DELAYED: partial lunch overlap reserves a full delayed lunch after the overlapping work.
context.entries = [{ id: "delayed", date: "2026-07-16", at: "2026-07-16T09:00", hours: 3.5, status: "completed" }];
assert(context.timeResolutionContext("2026-07-16").lunchState === "DELAYED", "09:00-12:30 must delay lunch");
assert(context.resolveWorklogTime({ dateKey: "2026-07-16", hours: 1 }).at === "2026-07-16T13:30", "Delayed lunch must move the next automatic start to 13:30");

// Case 4: explicit overtime is allowed; the following automatic entry starts next workday at 09:00.
context.entries = [];
const overtime = context.resolveWorklogTime({ dateKey: "2026-07-16", hours: 1, explicitAt: "2026-07-16T17:30" });
assert(overtime.at === "2026-07-16T17:30", "17:30-18:30 overtime must remain valid");
context.entries = [{ id: "overtime", date: "2026-07-16", at: overtime.at, hours: 1, status: "completed" }];
assert(context.resolveWorklogTime({ dateKey: "2026-07-16", hours: 1 }).at === "2026-07-17T09:00", "After overtime, the next automatic work must start next workday at 09:00");

// Completing eight hours also advances future automatic work without blocking explicit overtime.
context.entries = [{ id: "full-day", date: "2026-07-16", at: "2026-07-16T09:00", hours: 8, status: "completed" }];
assert(context.timeResolutionContext("2026-07-16").completedEightHours === true, "Eight-hour completion must be part of engine context");
assert(context.resolveWorklogTime({ dateKey: "2026-07-16", hours: 1 }).at === "2026-07-17T09:00", "Automatic work after eight hours must move to next workday");

const createEntry = functionSource("createEntry");
assert(createEntry.includes("resolveWorklogTime"), "Every WorkLog creation path must enter the shared Time Resolution Engine");
assert(functionSource("resolveAssistantCommandTime").includes("resolveWorklogTime"), "Chat must share the Time Resolution Engine");
assert(functionSource("acceptSuggestion").includes("resolveWorklogTime"), "Suggestion cards must share the Time Resolution Engine");
assert(functionSource("captureDefaultStart").includes("nextAvailableStart"), "Manual capture defaults must share the Time Resolution Engine");

console.log("P5.7.2 Time Resolution Engine v2 tests: PASS");
