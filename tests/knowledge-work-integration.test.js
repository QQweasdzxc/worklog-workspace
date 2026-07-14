const fs = require("fs");
const path = require("path");
const vm = require("vm");

const read = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const context = {
  console,
  TextDecoder,
  TextEncoder,
  Uint8Array,
  DataView,
  Blob,
  URL,
  sanitizeKnowledgeString: value => String(value || "").replace(/\u0000/g, ""),
  sanitizeKnowledgeValue: value => value,
  knowledgeDebugLog: () => {},
  knowledgeSanitizationStats: () => ({}),
  normalizedLibraryItem: item => ({
    title: item.title || "測試 SOP",
    filename: item.filename || "test.pdf",
    knowledgeId: item.knowledgeId || "KB-TEST",
    sourceType: "pdf",
    relatedRoles: item.relatedRoles || ["PROCUREMENT"],
    relatedWorkModels: [],
    applicableAgents: [],
    version: "v1.0"
  }),
  knowledgeRoleLabel: () => "採購",
  knowledgeRoleCodes: () => ["PROCUREMENT"],
  roleNameMap: { PROCUREMENT: "採購" },
  roleCode: () => "PROCUREMENT",
  workModels: () => ["採購案件處理"],
  arrayFromInput: value => Array.isArray(value) ? value : (value ? [value] : []),
  uid: prefix => `${prefix}-test`,
  profile: { role: "採購" },
  PDFJS_LIB_URL: "",
  PDFJS_WORKER_URL: ""
};
vm.createContext(context);
vm.runInContext(`${read("work-intelligence.js")}\n${read("suggestion-intelligence.js")}\n${read("knowledge-intelligence.js")}\nglobalThis.__buildKnowledge = buildKnowledgeIntelligence;`, context);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const text = [
  "請購案件需先詢價、比價及議價。",
  "建立採購單後追蹤交貨、驗收與請款。",
  "每半年進行供應商績效評鑑，寄送評鑑表並回收簽核。"
].join("\n");
const result = context.__buildKnowledge({ title: "採購 SOP", knowledgeId: "KB-TEST" }, { text, supportLevel: "full", sourceType: "pdf" });

assert(result.summary.works.some(work => work.name === "採購案件管理"), "Knowledge result 應保存採購 Work DNA");
assert(result.summary.works.some(work => work.name === "供應商績效評鑑"), "Knowledge result 應保存供應商評鑑 Work DNA");
assert(!result.candidates.some(candidate => candidate.title === "採購案件管理"), "既有相似 Work Memory 不應重新建立 Candidate");
assert(result.candidates.some(candidate => candidate.title === "供應商績效評鑑"), "新的高層級 Work 應成為 Candidate");
assert(!result.candidates.some(candidate => /確認|檢查|追蹤/.test(candidate.title)), "Candidate 名稱不應是零散動作");

console.log("Knowledge -> Work Intelligence integration tests: PASS");
