const fs = require("fs");
const path = require("path");
const vm = require("vm");

const source = fs.readFileSync(path.join(__dirname, "..", "work-intelligence.js"), "utf8");
const context = {};
vm.createContext(context);
vm.runInContext(`${source}\nglobalThis.__WorkIntelligence = WorkIntelligence;`, context);
const engine = context.__WorkIntelligence;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const procurementText = [
  "採購案件收到請購後進行詢價與比價。",
  "議價完成後建立採購單並追蹤交貨。",
  "交貨後辦理驗收與請款文件確認。",
  "相關資料需更新至 ECP 與 ERP。"
].join("\n");
const procurement = engine.discover({
  text: procurementText,
  lines: procurementText.split("\n").map((text, index) => ({ text, pageReference: "第 1 頁", sectionReference: `段落 ${index + 1}` })),
  source: { knowledgeId: "KB-TEST-001", relatedRoles: ["採購部"] }
});
const procurementWork = procurement.works.find(work => work.name === "採購案件管理");
assert(procurementWork, "應辨識採購案件管理，而不是輸出零散動作");
assert(procurementWork.processes.length >= 2, "Work DNA 應保留主要流程");
assert(procurementWork.systems.includes("ECP") && procurementWork.systems.includes("ERP"), "Work DNA 應辨識使用系統");
assert(procurementWork.outputs.length > 0, "Work DNA 應包含輸出成果");
assert(procurementWork.evidence[0].pageReference === "第 1 頁", "Work DNA 應保留證據來源");

const supplierText = "每半年進行供應商績效評鑑，寄送評鑑表、回收整理、簽核後上傳 ECP，產出供應商評鑑報告。";
const supplier = engine.discover({ text: supplierText, lines: [{ text: supplierText, pageReference: "第 3 頁" }] });
const supplierWork = supplier.works.find(work => work.name === "供應商績效評鑑");
assert(supplierWork, "應辨識供應商績效評鑑");
assert(supplierWork.frequency === "每半年", "應辨識工作頻率");
assert(supplierWork.triggers.includes("每半年"), "Work DNA 應建立 Trigger");

const actionOnly = engine.discover({ text: "確認文件。檢查內容。追蹤進度。", lines: [] });
assert(actionOnly.works.length === 0, "只有動詞且缺少工作脈絡時，不應產生假工作");

console.log("Work Intelligence tests: PASS");
