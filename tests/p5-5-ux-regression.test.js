const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "worklog-app.js"), "utf8");

function expectIncludes(value, label) {
  if (!app.includes(value)) throw new Error(`Missing ${label}: ${value}`);
}

expectIncludes('document.querySelectorAll("[data-library-back]")', "Learning Review back binding");
expectIncludes('x.id === b.dataset.verifyLibrary || x.cloudId === b.dataset.verifyLibrary', "Cloud/local knowledge identity lookup");
expectIncludes('view = "library";', "Learning Review completion navigation");
expectIncludes('data-edit-work-memory=', "Work Memory edit entry");
expectIncludes('confirmWorkMemorySimilarity(name', "Work Memory similarity gate");
expectIncludes('1 使用既有工作', "Similarity existing-work option");
expectIncludes('2 合併到既有工作', "Similarity merge option");
expectIncludes('3 仍建立新工作', "Similarity create option");
expectIncludes('▼ 查看 Work DNA', "Progressive Work DNA disclosure");
expectIncludes('還有 ${remaining} 筆建議', "Suggestion remaining count");
expectIncludes('>查看更多</button>', "Suggestion load-more label");

if (app.includes('class="suggestion-scan-index"')) {
  throw new Error("Legacy rotating suggestion number is still rendered");
}

console.log("P5.5 UX regression tests: PASS");
