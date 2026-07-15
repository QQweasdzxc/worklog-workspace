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
expect(app, '{ id: "suggestions", label: "🪶 Mr. KM 建議" }', "mobile suggestion tab");
expect(app, '<section class="panel module suggestion-module">${suggestionPanel()}</section>', "shared suggestion render");
expect(css, ".mobile-tab-time .suggestion-module,.mobile-tab-suggestions .suggestion-module{display:flex}", "mobile suggestion visibility");

if (/\.mobile-tab-time \.summary-dashboard\s*,\s*\.mobile-tab-time \.suggestion-module\s*\{\s*display\s*:\s*none/.test(css)) {
  throw new Error("Mobile default WorkLog tab still hides Mr. KM suggestions");
}

console.log("P5.6 Mobile Suggestion hotfix tests: PASS");
