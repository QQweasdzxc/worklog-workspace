const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "worklog-app.js"), "utf8");
const state = fs.readFileSync(path.join(root, "app-state.js"), "utf8");
const css = fs.readFileSync(path.join(root, "worklog.css"), "utf8");

function expect(source, value, label) {
  if (!source.includes(value)) throw new Error(`Missing ${label}: ${value}`);
}

expect(state, 'let mobileWorklogTab = "time"', "mobile default WorkLog tab");
expect(app, '<section class="panel module suggestion-module" id="mobile-worklog-suggestions">${suggestionPanel()}</section>', "shared suggestion render");
expect(app, 'return `<div class="workbench-grid">${todaySummaryPanel()}', "unified mobile/desktop workspace");
expect(css, 'grid-template-areas:"summary" "mobiletabs" "calendar" "today" "suggestion"', "mobile suggestion visibility");
expect(app, 'target?.scrollIntoView({ behavior: "smooth", block: "start" })', "mobile tabs navigate without hiding content");

if (app.includes('${mobileWorklogTabs()}${mobileHomeActionPanel()}${todaySummaryPanel()}')) {
  throw new Error("Legacy mobile tab/action shell still controls the daily workspace");
}

console.log("P5.6 Mobile Suggestion hotfix tests: PASS");
