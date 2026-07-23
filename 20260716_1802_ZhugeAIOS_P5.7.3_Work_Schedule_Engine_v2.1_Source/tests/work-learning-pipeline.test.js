const fs = require("fs");
const path = require("path");
const vm = require("vm");

const workSource = fs.readFileSync(path.join(__dirname, "..", "work-intelligence.js"), "utf8");
const suggestionSource = fs.readFileSync(path.join(__dirname, "..", "suggestion-intelligence.js"), "utf8");
const context = {};
vm.createContext(context);
vm.runInContext(`${workSource}\n${suggestionSource}\nglobalThis.__Work = WorkIntelligence; globalThis.__Suggestion = SuggestionIntelligence;`, context);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const text = [
  "請購後進行詢價、比價與議價，建立採購單後追蹤交貨、驗收與請款。",
  "每半年寄送供應商績效評鑑表，回收整理並簽核後上傳 ECP。"
].join("\n");
const discovery = context.__Work.discover({
  text,
  lines: text.split("\n").map((line, index) => ({ text: line, pageReference: `第 ${index + 1} 頁` })),
  source: { knowledgeId: "KB-PIPELINE", relatedRoles: ["PROCUREMENT"] }
});
const prepared = context.__Suggestion.prepareCandidates(discovery.works.map(work => ({
  title: work.name,
  content: work.purpose,
  source: "採購 SOP",
  triggers: work.triggers,
  confidence: work.confidence,
  workDna: work
})), ["採購案件處理"]);

assert(discovery.works.some(work => work.name === "採購案件管理"), "Pipeline 應先辨識高層級採購工作");
assert(discovery.works.some(work => work.name === "供應商績效評鑑"), "Pipeline 應辨識另一項獨立工作");
assert(!prepared.items.some(item => item.title === "採購案件管理"), "既有相似 Work Memory 不應再次產生建議");
assert(prepared.items.some(item => item.title === "供應商績效評鑑"), "真正的新工作應保留為建議");
assert(prepared.diagnostics.referencedExistingCount === 1, "Pipeline 應記錄既有 Work Memory 引用");

console.log("Work Learning Pipeline tests: PASS");
