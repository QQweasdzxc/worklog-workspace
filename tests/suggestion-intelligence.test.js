const fs = require("fs");
const path = require("path");
const vm = require("vm");

const source = fs.readFileSync(path.join(__dirname, "..", "suggestion-intelligence.js"), "utf8");
const context = {};
vm.createContext(context);
vm.runInContext(`${source}\nglobalThis.__SuggestionIntelligence = SuggestionIntelligence;`, context);
const engine = context.__SuggestionIntelligence;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const duplicateResult = engine.prepareCandidates([
  { title: "檢查請款文件", source: "採購 SOP", content: "確認請款附件" },
  { title: "檢查請款文件", source: "請款規範", content: "確認請款附件" }
], []);
assert(duplicateResult.items.length === 1, "相同建議應去重為一項");
assert(duplicateResult.items[0].sources.length === 2, "去重後應保留全部來源");

const generalizedResult = engine.prepareCandidates([
  { title: "檢查請款文件", source: "採購 SOP" },
  { title: "追蹤驗收", source: "驗收規範" },
  { title: "確認交貨", source: "交貨清單" }
], []);
assert(generalizedResult.items.length === 1, "零散採購動作應凝聚為一項工作");
assert(generalizedResult.items[0].title === "採購案件管理", "零散採購動作應泛化為採購案件管理");

const referencedResult = engine.prepareCandidates([
  { title: "檢查請款文件", source: "採購 SOP" },
  { title: "追蹤驗收", source: "驗收規範" }
], ["採購案件管理"]);
assert(referencedResult.items.length === 0, "高相似度候選不應建立新的 AI 建議");
assert(referencedResult.diagnostics.referencedExistingCount === 2, "高相似度候選應引用既有 Work Memory");

const similarNameResult = engine.prepareCandidates([
  { title: "採購案件處理", source: "歷史工時" }
], ["採購案件管理"]);
assert(similarNameResult.items.length === 0, "同義的處理／管理名稱應直接引用既有 Work Memory");

const distinctResult = engine.prepareCandidates([
  { title: "供應商年度評鑑", source: "供應商 SOP" },
  { title: "整理月報", source: "行政手冊" }
], []);
assert(distinctResult.items.length === 2, "不同工作不應被錯誤合併");

console.log("Suggestion Intelligence tests: PASS");
