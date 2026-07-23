const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const app = read("worklog-app.js");
const data = read("data-service.js");
const repo = read("repositories.js");
const schema = read("docs/supabase/20260714_p5_6_work_memory_cloud_foundation_schema.sql");

function expect(source, value, label) {
  if (!source.includes(value)) throw new Error(`Missing ${label}: ${value}`);
}

for (const column of ["description", "category", "aliases", "source_references", "keywords", "familiarity", "last_used_at"]) {
  expect(schema, column, `schema column ${column}`);
}
expect(schema, "enable row level security", "RLS enablement");
expect(schema, "using ((select auth.uid()) = user_uuid)", "own-user RLS predicate");
expect(schema, "with check ((select auth.uid()) = user_uuid)", "UPDATE/INSERT ownership check");

for (const field of ["description:", "category:", "aliases:", "source_references:", "keywords:", "is_active:", "familiarity:", "last_used_at:"]) {
  expect(repo, field, `repository Work Object field ${field}`);
}
expect(repo, "return this.loadWorkModels()", "Cloud reload after save");
expect(repo, 'remove("user_work_models"', "Cloud delete");
expect(data, "migrateLegacyWorkMemoryMetadata", "legacy metadata migration");
expect(data, "localStorage.removeItem(legacyKey)", "legacy formal source retirement");
expect(data, "this.workModelsState = (workModelsRows || []).map", "Cloud-authoritative state");
expect(app, "function workMemoryObjects()", "formal Work Object selector");
expect(app, "sourceLabel: `📂 來源：${model.name}`", "suggestion source UX");
expect(app, "ℹ︎ 為什麼推薦？", "explainable detail disclosure");
expect(app, "suggestionBatchState", "responsive suggestion batches");
expect(app, "data-suggestion-prev-batch", "finite previous-batch action");
expect(app, "data-suggestion-next-batch", "finite next-batch action");

if (app.includes('scopedLocalKey("zhuge_work_memory_merge_notes_v1")')) {
  throw new Error("Runtime UI still treats legacy Work Memory metadata as a formal source");
}

console.log("P5.6 Work Memory Cloud tests: PASS");
