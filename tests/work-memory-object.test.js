const fs = require("fs");
const path = require("path");
const vm = require("vm");

const source = fs.readFileSync(path.resolve(__dirname, "..", "worklog-app.js"), "utf8");
const match = source.match(/function normalizeWorkMemoryObject[\s\S]*?\n}\n\nfunction workMemoryObjects/);
if (!match) throw new Error("normalizeWorkMemoryObject not found");
const functionSource = match[0].replace(/\n\nfunction workMemoryObjects$/, "");
const context = {
  arrayFromInput(value) {
    if (Array.isArray(value)) return value.map(item => String(item).trim()).filter(Boolean);
    return String(value || "").split(/[,\n，]/).map(item => item.trim()).filter(Boolean);
  },
  currentUserUuid: () => "00000000-0000-0000-0000-000000000001"
};
vm.createContext(context);
vm.runInContext(`${functionSource}; result = normalizeWorkMemoryObject({
  id: "work-1",
  user_uuid: "user-1",
  name: " 採購案件管理 ",
  description: "案件追蹤",
  category: "採購",
  aliases: ["採購案件處理", "採購案件處理"],
  source: "knowledge",
  source_references: [{ type: "knowledge", label: "採購 SOP" }],
  keywords: ["採購", "驗收"],
  is_active: false,
  familiarity: 9,
  last_used_at: "2026-07-14T08:00:00Z"
}, 3);`, context);

const result = context.result;
if (result.name !== "採購案件管理") throw new Error("name normalization failed");
if (result.userUuid !== "user-1") throw new Error("snake_case user UUID mapping failed");
if (result.aliases.length !== 1) throw new Error("aliases deduplication failed");
if (result.sourceReferences[0].label !== "採購 SOP") throw new Error("source reference mapping failed");
if (result.isActive !== false) throw new Error("inactive state mapping failed");
if (result.familiarity !== 5) throw new Error("familiarity bound failed");
if (result.sortOrder !== 3) throw new Error("sort order fallback failed");

console.log("Work Memory Object tests: PASS");
