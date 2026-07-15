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

assert(context.suggestionBatchSize(1366) === 4, "Desktop batch must contain 4 suggestions");
assert(context.suggestionBatchSize(900) === 4, "Tablet batch must contain 4 suggestions");
assert(context.suggestionBatchSize(390) === 4, "Mobile batch must contain 4 suggestions");

const first = context.suggestionBatchState(17, 0, 1366);
const fourth = context.suggestionBatchState(17, 12, 1366);
const fifth = context.suggestionBatchState(17, 16, 1366);
assert(first.start === 0 && first.end === 4 && first.remaining === 13, "Desktop first batch must be 4 + 13 remaining");
assert(fourth.start === 12 && fourth.end === 16 && fourth.remaining === 1, "Desktop fourth batch must be 4 + 1 remaining");
assert(fifth.start === 16 && fifth.end === 17 && fifth.remaining === 0, "Desktop fifth batch must contain the final suggestion");
assert(first.batchCount === 5 && fifth.batchIndex === 4, "17 suggestions must produce 5 finite batches");

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

assert(css.includes("--daily-workspace-panel-height:560px"), "Desktop fixed panel height missing");
assert(css.includes("--daily-workspace-panel-height:540px"), "Tablet fixed panel height missing");
assert(css.includes(".workbench-grid>.calendar-module,.workbench-grid>.today-module,.workbench-grid>.suggestion-module{height:var(--daily-workspace-panel-height)"), "Shared equal-height panel rule missing");
assert(css.includes("grid-template-columns:repeat(2,minmax(0,1fr))"), "2x2 suggestion tile grid missing");

console.log("P5.7 Suggestion Experience tests: PASS");
