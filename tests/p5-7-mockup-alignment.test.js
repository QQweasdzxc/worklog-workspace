const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "worklog-app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "worklog.css"), "utf8");

function expect(source, value, label) {
  if (!source.includes(value)) throw new Error(`Missing ${label}: ${value}`);
}

expect(app, 'readScopedUiFlag(MOBILE_SUMMARY_OPEN_KEY, true)', "first-open expanded Summary state");
expect(app, 'class="summary-heading-toggle"', "shared Summary collapse control");
expect(app, 'aria-expanded="${summaryOpen}"', "accessible Summary state");
expect(app, 'return 4;', "four-card suggestion batch");
expect(app, '<h2>我的工時</h2>', "My WorkLog heading");
expect(app, '今天的工時會出現在這裡。', "empty WorkLog copy");
expect(app, 'data-mobile-week-nav="-1"', "previous-week control");
expect(app, 'data-mobile-week-nav="0"', "current-week control");
expect(app, 'data-mobile-week-nav="1"', "next-week control");
expect(app, 'data-mobile-month-nav="-1"', "previous-month control");
expect(app, 'data-mobile-month-nav="1"', "next-month control");
expect(app, '>展開月曆</button>', "expand-calendar control");
expect(app, '>收合月曆</button>', "collapse-calendar control");
expect(app, 'return `<div class="workbench-grid">${todaySummaryPanel()}', "Summary-first three-area shell");

expect(css, '.summary-dashboard.summary-collapsed .summary-grid{display:none}', "Summary collapsed styling");
expect(css, '.summary-dashboard.summary-open .summary-grid{display:grid}', "Summary expanded styling");
expect(css, '.suggestion-module .ai-suggestion-scan-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:repeat(2,minmax(0,1fr))', "2x2 suggestion tile styling");
expect(css, '.mobile-week-grid,.mobile-month-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr))', "mobile week/month calendar grids");

console.log("P5.7 PM mockup alignment tests: PASS");
