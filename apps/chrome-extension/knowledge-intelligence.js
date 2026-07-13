// P5.2 Knowledge Intelligence v1: document extraction, summary, units, and recommendation candidates.
// This module intentionally does not implement RAG, embeddings, vector search, or automatic homepage suggestions.

function knowledgeUnitFromCloud(row = {}) {
  return {
    id: row.id || uid("ku"),
    cloudId: row.id || "",
    knowledgeSourceId: row.knowledge_source_id || row.knowledgeSourceId || "",
    unitType: row.unit_type || row.unitType || "reference",
    title: row.title || "",
    content: row.content || "",
    summary: row.summary || "",
    sectionReference: row.section_reference || row.sectionReference || "",
    pageReference: row.page_reference || row.pageReference || "",
    triggers: arrayFromInput(row.triggers),
    applicableRoles: arrayFromInput(row.applicable_roles || row.applicableRoles),
    applicableAgents: arrayFromInput(row.applicable_agents || row.applicableAgents),
    relatedWorkModels: arrayFromInput(row.related_work_models || row.relatedWorkModels),
    suggestedSkills: Array.isArray(row.suggested_skills || row.suggestedSkills) ? (row.suggested_skills || row.suggestedSkills) : [],
    priority: row.priority || "medium",
    confidence: row.confidence == null ? null : Number(row.confidence),
    version: row.version || "v1.0",
    status: row.status || "active",
    createdAt: row.created_at || row.createdAt || "",
    updatedAt: row.updated_at || row.updatedAt || ""
  };
}

function knowledgeRecommendationCandidateFromCloud(row = {}) {
  return {
    id: row.id || uid("krc"),
    cloudId: row.id || "",
    knowledgeSourceId: row.knowledge_source_id || row.knowledgeSourceId || "",
    knowledgeUnitId: row.knowledge_unit_id || row.knowledgeUnitId || "",
    type: row.type || "recommendation",
    title: row.title || "",
    content: row.content || "",
    sourceKnowledgeId: row.source_knowledge_id || row.sourceKnowledgeId || "",
    sourceUnitId: row.source_unit_id || row.sourceUnitId || "",
    defaultDuration: Number(row.default_duration || row.defaultDuration || 1),
    applicableRole: row.applicable_role || row.applicableRole || "",
    triggers: arrayFromInput(row.triggers),
    relatedWorkModels: arrayFromInput(row.related_work_models || row.relatedWorkModels),
    status: row.status || "candidate",
    priority: row.priority || "medium",
    confidence: row.confidence == null ? null : Number(row.confidence),
    version: row.version || "v1.0",
    createdAt: row.created_at || row.createdAt || "",
    updatedAt: row.updated_at || row.updatedAt || ""
  };
}

function knowledgeUnitsForSource(source = {}) {
  const sourceId = source.cloudId || source.id || "";
  return knowledgeUnits.filter(unit => unit.knowledgeSourceId === sourceId && unit.status !== "archived");
}

function knowledgeCandidatesForSource(source = {}) {
  const sourceId = source.cloudId || source.id || "";
  return knowledgeRecommendationCandidates.filter(candidate => candidate.knowledgeSourceId === sourceId && candidate.status !== "archived");
}

function knowledgeRoleLabel(source = {}) {
  const roles = arrayFromInput(source.relatedRoles);
  if (roles.length) return roles.map(code => roleNameMap[code] || code).join("、");
  if (profile?.role) return profile.role;
  return "待確認職務";
}

function knowledgeRoleCodes(source = {}) {
  const roles = arrayFromInput(source.relatedRoles);
  if (roles.length) return roles;
  return profile?.role ? [roleCode(profile.role)] : [];
}

function stripXmlText(text = "") {
  return String(text || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function inflateZipData(data, method) {
  if (method === 0) return data;
  if (method !== 8) throw new Error("此 ZIP 壓縮格式尚未支援");
  if (typeof DecompressionStream === "undefined") throw new Error("此瀏覽器尚未支援 Office 文件解壓縮，請改用最新版 Chrome 或上傳 TXT / Markdown");
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function parseOfficeZip(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  const view = new DataView(arrayBuffer);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= 0; i--) {
    if (u32(view, i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("找不到 Office ZIP 結尾資料");
  const total = u16(view, eocd + 10);
  let ptr = u32(view, eocd + 16);
  const decoder = new TextDecoder();
  const entries = [];
  for (let i = 0; i < total; i++) {
    if (u32(view, ptr) !== 0x02014b50) throw new Error("Office ZIP 中央目錄格式錯誤");
    const method = u16(view, ptr + 10);
    const compressedSize = u32(view, ptr + 20);
    const nameLen = u16(view, ptr + 28);
    const extraLen = u16(view, ptr + 30);
    const commentLen = u16(view, ptr + 32);
    const localOffset = u32(view, ptr + 42);
    const name = decoder.decode(bytes.slice(ptr + 46, ptr + 46 + nameLen));
    const localNameLen = u16(view, localOffset + 26);
    const localExtraLen = u16(view, localOffset + 28);
    const dataStart = localOffset + 30 + localNameLen + localExtraLen;
    const compressed = bytes.slice(dataStart, dataStart + compressedSize);
    entries.push({ name, data: await inflateZipData(compressed, method) });
    ptr += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

function officeEntryText(entries = [], pattern) {
  const decoder = new TextDecoder();
  return entries
    .filter(entry => pattern.test(entry.name))
    .map(entry => stripXmlText(decoder.decode(entry.data)))
    .filter(Boolean)
    .join("\n");
}

function excelSharedStrings(entries = []) {
  const entry = entries.find(x => x.name === "xl/sharedStrings.xml");
  if (!entry) return [];
  const xml = new TextDecoder().decode(entry.data);
  return [...xml.matchAll(/<si[\s\S]*?<\/si>/g)].map(match => stripXmlText(match[0]));
}

function excelText(entries = []) {
  const shared = excelSharedStrings(entries);
  const decoder = new TextDecoder();
  const values = [];
  for (const entry of entries.filter(x => /^xl\/worksheets\/sheet\d+\.xml$/.test(x.name))) {
    const xml = decoder.decode(entry.data);
    for (const match of xml.matchAll(/<c[^>]*(?:t="s")?[^>]*>[\s\S]*?<v>([\s\S]*?)<\/v>[\s\S]*?<\/c>/g)) {
      const raw = stripXmlText(match[1]);
      const index = Number(raw);
      values.push(Number.isInteger(index) && shared[index] ? shared[index] : raw);
    }
    for (const inline of xml.matchAll(/<is[\s\S]*?<\/is>/g)) values.push(stripXmlText(inline[0]));
  }
  return values.filter(Boolean).join("\n");
}

function pdfLiteralText(raw = "") {
  const output = [];
  for (const match of String(raw || "").matchAll(/\(([^()]|\\[()\\nrtbf]){2,}\)/g)) {
    const text = match[0]
      .slice(1, -1)
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\n")
      .replace(/\\t/g, "\t")
      .replace(/\\\(/g, "(")
      .replace(/\\\)/g, ")")
      .replace(/\\\\/g, "\\");
    if (/[\u4e00-\u9fffA-Za-z]/.test(text)) output.push(text);
  }
  return output.join("\n");
}

async function extractKnowledgeText(source = {}, file = null) {
  const item = normalizedLibraryItem(source);
  const name = file?.name || item.filename || item.sourceName || "";
  const type = inferKnowledgeSourceType(name || item.sourceType || item.storagePath);
  let blob = file;
  if (!blob) {
    const storageKey = item.storagePath || "";
    const debugPayload = {
      knowledgeId: item.knowledgeId || "",
      filename: item.filename || item.sourceName || "",
      storage_path: source.storage_path || source.storagePath || "",
      storagePath: item.storagePath || "",
      storageBucket: KNOWLEDGE_BUCKET,
      finalStorageKey: storageKey
    };
    console.info("Knowledge Intelligence storage download debug", debugPayload);
    if (!storageKey) {
      console.error("Knowledge Intelligence missing storage_path", debugPayload);
      throw new Error("此知識來源尚無正式檔案，請重新上傳檔案後再開始整理");
    }
    if (!storageKey.includes("/")) {
      console.error("Knowledge Intelligence invalid storage_path", debugPayload);
      throw new Error("此知識來源的 Storage 路徑不完整，請重新上傳檔案後再開始整理");
    }
    const signedUrl = await KnowledgeRepository.signedSourceUrl(storageKey, 300);
    const res = await fetch(signedUrl);
    if (!res.ok) throw new Error(`原始檔讀取失敗：HTTP ${res.status}`);
    blob = await res.blob();
  }
  if (type === "markdown" || /\.(txt|md|markdown)$/i.test(name)) {
    return { text: await blob.text(), supportLevel: "full", sourceType: type };
  }
  if (type === "word" || /\.docx$/i.test(name)) {
    const entries = await parseOfficeZip(await blob.arrayBuffer());
    return { text: officeEntryText(entries, /^word\/document\.xml$/), supportLevel: "xml-text", sourceType: "word" };
  }
  if (type === "powerpoint" || /\.pptx$/i.test(name)) {
    const entries = await parseOfficeZip(await blob.arrayBuffer());
    return { text: officeEntryText(entries, /^ppt\/slides\/slide\d+\.xml$/), supportLevel: "xml-text", sourceType: "powerpoint" };
  }
  if (type === "excel" || /\.(xlsx|csv)$/i.test(name)) {
    if (/\.csv$/i.test(name)) return { text: await blob.text(), supportLevel: "full", sourceType: "excel" };
    const entries = await parseOfficeZip(await blob.arrayBuffer());
    return { text: excelText(entries), supportLevel: "xml-text", sourceType: "excel" };
  }
  if (type === "pdf" || /\.pdf$/i.test(name)) {
    const raw = new TextDecoder("latin1").decode(new Uint8Array(await blob.arrayBuffer()));
    const text = pdfLiteralText(raw);
    if (!text || text.length < 20) throw new Error("PDF 無可擷取文字層；P5.2 v1 尚不支援掃描圖像 OCR。請改上傳含文字層 PDF、DOCX 或 TXT。");
    return { text, supportLevel: "basic-text-layer", sourceType: "pdf" };
  }
  throw new Error("此檔案格式尚未支援，請使用 PDF / DOCX / XLSX / PPTX / TXT / Markdown");
}

function splitKnowledgeLines(text = "") {
  return String(text || "")
    .replace(/\r/g, "\n")
    .split(/\n|。|；|;/)
    .map(x => x.replace(/^[\s•\-–—\d.、()（）]+/, "").trim())
    .filter(x => x.length >= 4)
    .slice(0, 180);
}

function keywordHits(text = "", keywords = []) {
  return keywords.filter(keyword => text.includes(keyword));
}

function inferUnitType(line = "") {
  if (/檢查|確認|準備|完成|填寫|提交|通知|追蹤|建立/.test(line)) return "checklist";
  if (/流程|步驟|申請|審核|核准|驗收|請款/.test(line)) return "process";
  if (/不得|必須|應|需|規定|注意|原則/.test(line)) return "rule";
  if (/表單|單據|文件|紀錄|附件/.test(line)) return "form";
  if (/建議|可|通常|每月|定期/.test(line)) return "recommendation";
  return "reference";
}

function titleFromLine(line = "", fallback = "Knowledge Unit") {
  return line.replace(/[：:，,。].*$/, "").slice(0, 28).trim() || fallback;
}

function buildKnowledgeIntelligence(source = {}, extracted = {}) {
  const text = String(extracted.text || "").replace(/\s+\n/g, "\n").trim();
  if (!text) throw new Error("文件內容為空，無法建立工作知識");
  const item = normalizedLibraryItem(source);
  const roleLabel = knowledgeRoleLabel(item);
  const roleCodes = knowledgeRoleCodes(item);
  const agents = item.applicableAgents?.length ? item.applicableAgents : [`${roleLabel} Agent`];
  const lines = splitKnowledgeLines(text);
  const topics = [...new Set([
    ...keywordHits(text, ["採購", "請購", "詢價", "比價", "議價", "驗收", "請款", "供應商", "評鑑", "合約", "發票"]),
    ...keywordHits(text, ["新人", "報到", "教育訓練", "帳號", "主管", "制度"]),
    ...keywordHits(text, ["ISO", "稽核", "改善", "缺失", "追蹤", "SOP"])
  ])].slice(0, 12);
  const unitLines = lines.filter(line => /採購|請購|詢價|比價|議價|驗收|請款|供應商|評鑑|合約|發票|新人|報到|教育訓練|ISO|稽核|改善|缺失|追蹤|流程|檢查|確認|準備|通知|建立|每月|定期/.test(line));
  const selectedLines = (unitLines.length ? unitLines : lines).slice(0, 16);
  const units = selectedLines.map((line, index) => {
    const unitType = inferUnitType(line);
    const triggers = keywordHits(line, ["採購", "請購", "詢價", "比價", "議價", "驗收", "請款", "供應商", "評鑑", "發票", "新人", "報到", "教育訓練", "ISO", "稽核", "改善", "追蹤"]).slice(0, 6);
    return {
      localId: `unit-${index + 1}`,
      unitType,
      title: titleFromLine(line, `${item.title} ${index + 1}`),
      content: line,
      summary: line.slice(0, 120),
      sectionReference: `自動擷取段落 ${index + 1}`,
      pageReference: "",
      triggers,
      applicableRoles: roleCodes,
      applicableAgents: agents,
      relatedWorkModels: item.relatedWorkModels || [],
      suggestedSkills: [],
      priority: unitType === "recommendation" || unitType === "checklist" ? "high" : "medium",
      confidence: extracted.supportLevel === "full" ? 0.78 : 0.62,
      version: item.version || "v1.0",
      status: "active"
    };
  });
  const candidateUnits = units.filter(unit => ["recommendation", "checklist", "process"].includes(unit.unitType)).slice(0, 8);
  const candidates = candidateUnits.map(unit => ({
    type: "recommendation",
    title: recommendationTitle(unit.title),
    content: unit.summary || unit.content,
    sourceUnitLocalId: unit.localId,
    sourceKnowledgeId: item.knowledgeId || "",
    defaultDuration: 1,
    applicableRole: roleLabel === "待確認職務" ? "" : roleLabel,
    triggers: unit.triggers,
    relatedWorkModels: unit.relatedWorkModels || [],
    status: "candidate",
    priority: unit.priority || "medium",
    confidence: unit.confidence || 0.6,
    version: item.version || "v1.0"
  }));
  const workItems = [...new Set(candidates.map(x => x.title).filter(Boolean))].slice(0, 10);
  return {
    extractedText: text.slice(0, 60000),
    summary: {
      documentName: item.title,
      role: roleLabel,
      sourceType: extracted.sourceType || item.sourceType,
      supportLevel: extracted.supportLevel || "basic",
      topics,
      importantWorkItems: workItems,
      processes: units.filter(x => x.unitType === "process").map(x => x.title).slice(0, 8),
      cautions: units.filter(x => x.unitType === "rule").map(x => x.title).slice(0, 8),
      recommendationCandidates: workItems,
      generatedAt: new Date().toISOString()
    },
    units,
    candidates
  };
}

function recommendationTitle(title = "") {
  const clean = String(title || "").replace(/^確認|^檢查|^建立|^進行/, "").trim();
  if (/評鑑/.test(clean)) return "進行供應商評鑑";
  if (/驗收/.test(clean)) return "追蹤驗收";
  if (/請款|發票/.test(clean)) return "檢查請款文件";
  if (/議價/.test(clean)) return "確認議價紀錄";
  if (/新人|報到/.test(clean)) return "確認新人報到 Checklist";
  return clean ? `確認${clean}` : "確認文件中的工作事項";
}

const KnowledgeIntelligence = {
  async processSource(source = {}, options = {}) {
    const item = normalizedLibraryItem(source);
    try {
      toast("藏書閣：等待整理");
      await DataService.updateKnowledgeProcessing(item, { processingStatus: "queued", intelligenceError: null });
      toast("藏書閣：整理中");
      await DataService.updateKnowledgeProcessing(item, { processingStatus: "processing", intelligenceError: null });
      const extracted = await extractKnowledgeText(item, options.file || null);
      const result = buildKnowledgeIntelligence(item, extracted);
      const saved = await DataService.saveKnowledgeIntelligenceResult(item, result);
      toast("藏書閣已整理完成");
      return saved;
    } catch (error) {
      console.error("Knowledge Intelligence processing failed", { error, source: item });
      await DataService.updateKnowledgeProcessing(item, {
        processingStatus: "failed",
        intelligenceError: error.message || "文件處理失敗"
      }).catch(syncError => console.error("Knowledge failure status sync failed", { syncError, source: item }));
      toast(error.message || "藏書閣整理失敗");
      throw error;
    }
  },
  async verifySource(source = {}) {
    const saved = await DataService.verifyKnowledgeSource(source);
    toast("Knowledge 內容已確認");
    return saved;
  }
};
