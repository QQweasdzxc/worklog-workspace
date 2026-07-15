const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "worklog-app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "worklog.css"), "utf8");

function functionSource(name) {
  const start = app.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`Missing function: ${name}`);
  const open = app.indexOf("{", start);
  let depth = 0;
  for (let index = open; index < app.length; index += 1) {
    if (app[index] === "{") depth += 1;
    if (app[index] === "}") depth -= 1;
    if (depth === 0) return app.slice(start, index + 1);
  }
  throw new Error(`Unclosed function: ${name}`);
}

const context = { window: { innerWidth: 1366 }, Math, Number };
vm.createContext(context);
vm.runInContext(`${functionSource("suggestionBatchSize")}\n${functionSource("suggestionBatchState")}`, context);

function assert(value, message) {
  if (!value) throw new Error(message);
}

assert(context.suggestionBatchSize(1366) === 8, "Desktop batch must contain 8 suggestions");
assert(context.suggestionBatchSize(900) === 8, "Tablet batch must contain 8 suggestions");
assert(context.suggestionBatchSize(390) === 6, "Mobile batch must contain 6 suggestions");

const first = context.suggestionBatchState(17, 0, 1366);
const second = context.suggestionBatchState(17, 8, 1366);
const third = context.suggestionBatchState(17, 16, 1366);
assert(first.start === 0 && first.end === 8 && first.remaining === 9, "Desktop first batch must be 8 + 9 remaining");
assert(second.start === 8 && second.end === 16 && second.remaining === 1, "Desktop second batch must be 8 + 1 remaining");
assert(third.start === 16 && third.end === 17 && third.remaining === 0, "Desktop third batch must contain the final suggestion");
assert(first.batchCount === 3 && third.batchIndex === 2, "17 suggestions must produce 3 finite batches");

assert(app.includes("function renderSuggestionBatchOnly()"), "Missing partial suggestion renderer");
assert(app.includes("list.innerHTML = suggestions.slice(state.start, state.end)"), "Batch switch must only replace suggestion list items");
assert(app.includes("panel.scrollTop = panelScrollTop"), "Panel scroll position must be preserved");
assert(app.includes("list.scrollTop = listScrollTop"), "Suggestion list scroll position must be preserved");

const moveSource = functionSource("moveSuggestionBatch");
assert(!moveSource.includes("render();"), "Batch navigation must not trigger the full app renderer");
assert(app.includes("recentUsage * 7"), "Suggestion ranking must include recent usage");
assert(app.includes("weekdayUsage * 8"), "Suggestion ranking must include same-weekday work context");
assert(app.includes("model.familiarity"), "Suggestion ranking must include Work Memory familiarity");
assert(app.includes("knowledgeReferences.length * 3"), "Suggestion ranking must include learned knowledge sources");

assert(css.includes("--daily-workspace-panel-height:clamp(560px"), "Desktop adaptive panel height missing");
assert(css.includes("--daily-workspace-panel-height:clamp(540px"), "Tablet adaptive panel height missing");
assert(css.includes(".workbench-grid>.calendar-module,.workbench-grid>.today-module,.workbench-grid>.suggestion-module{height:var(--daily-workspace-panel-height)"), "Shared equal-height panel rule missing");
assert(css.includes("grid-template-rows:repeat(4,minmax(96px,1fr))"), "Desktop 2x4 suggestion tile grid missing");
assert(css.includes("grid-template-rows:repeat(3,minmax(0,1fr))"), "Mobile 2x3 suggestion tile grid missing");
assert(css.includes(".panel-scroll-content{flex:1 1 auto;min-height:0;overflow-y:auto"), "Scrollable panel content missing");
assert(css.includes(".panel-fixed-header,.panel-fixed-footer{flex:0 0 auto}"), "Fixed panel header/footer missing");

console.log("P5.7 Suggestion Experience tests: PASS");
