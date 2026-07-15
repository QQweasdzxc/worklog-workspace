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
expect(app, '📊 工時摘要', "canonical WorkLog Summary heading");
expect(app, 'return 6;', "six-card suggestion batch");
expect(app, '<h2>我的工時</h2>', "My WorkLog heading");
expect(app, '尚未建立工時</b>', "empty WorkLog copy");
expect(app, '🪶 Mr. KM 建議', "canonical suggestion heading");
expect(app, '<span class="brand-mark" aria-hidden="true">🪶</span> Zhuge AI OS', "canonical feather brand");
expect(app, '<details class="developer-version-details">', "progressive developer information");
expect(app, '<div class="sidebar-build-summary">Build：${BUILD_TIME}</div>', "compact Build summary");
expect(app, 'const title = "🪶 Mr. KM";', "standalone and extension persona branding");
expect(app, '<h2>🪶 Zhuge AI OS</h2><div class="muted">by Mr. KM</div>', "standalone and extension product branding");
expect(app, '<div class="entry"><b>目前使用者</b>', "account information retained in Settings");
expect(app, '<button class="btn red full" id="logoutBtn">登出</button>', "logout retained in Settings");
const headerStart = app.indexOf("function header()");
const headerEnd = app.indexOf("function authScreen()", headerStart);
if (app.slice(headerStart, headerEnd).includes("userBadge()")) throw new Error("Desktop Header must not render the user badge");
expect(app, 'mobile-worklog-badge', "mobile suggestion count badge");
expect(app, 'data-mobile-week-nav="-1"', "previous-week control");
expect(app, 'data-mobile-week-nav="0"', "current-week control");
expect(app, 'data-mobile-week-nav="1"', "next-week control");
expect(app, 'data-mobile-month-nav="-1"', "previous-month control");
expect(app, 'data-mobile-month-nav="1"', "next-month control");
expect(app, '>⌄ 點擊展開月曆</button>', "expand-calendar control");
expect(app, '>收合月曆</button>', "collapse-calendar control");
expect(app, 'return `<div class="daily-workspace"><div class="workbench-grid">${todaySummaryPanel()}', "Summary-first three-area shell");
expect(app, '<section class="ai-status-bar" aria-label="AI Status">', "compact AI Status Bar");
expect(app, '<div class="ai-workspace-reserve" aria-hidden="true"></div>', "reserved future AI workspace");

expect(css, '.summary-dashboard.summary-collapsed .summary-grid{display:none}', "Summary collapsed styling");
expect(css, '.summary-dashboard.summary-open .summary-grid{display:grid}', "Summary expanded styling");
expect(css, 'grid-template-rows:repeat(3,minmax(0,1fr))', "2x3 suggestion tile styling");
expect(css, '.mobile-week-grid,.mobile-month-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr))', "mobile week/month calendar grids");
expect(css, '.workspace-worklog .os-topbar{display:none}', "desktop brand moved to sidebar");
expect(css, 'grid-template-columns:minmax(0,33.5fr) minmax(0,33fr) minmax(0,33.5fr)', "33.5/33/33.5 dashboard balance");
expect(css, '.ai-status-bar{display:flex', "AI Status Bar styling");
expect(css, ':root{--font-xs:.75rem;--font-sm:.875rem;--font-md:1rem;--font-lg:1.125rem;--font-xl:1.25rem', "Typography tokens");
expect(css, '.workspace-worklog .suggestion-scan-item h3{font-size:var(--font-sm)', "tokenized card title hierarchy");
expect(css, '.os-topbar .header-right{display:none}', "desktop account controls removed from Header");
expect(css, '.workspace-worklog .calendar-module{padding:12px}', "compact calendar spacing");
expect(css, '.ecp-task-item span{white-space:normal', "long Current Active Task wrapping");

console.log("P5.7 PM mockup alignment tests: PASS");
