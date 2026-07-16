const fs = require("fs");
const path = require("path");
const vm = require("vm");

const read = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function parserRegistryTests() {
  const context = {
    console,
    Blob,
    ArrayBuffer,
    Uint8Array,
    TextDecoder,
    TextEncoder,
    Date,
    sanitizeKnowledgeString: value => String(value || "").replace(/\u0000/g, ""),
    extractPdfTextWithPdfJs: async () => ({
      text: "第 1 頁\n採購案件管理",
      pages: [{ pageNumber: 1, text: "採購案件管理" }],
      supportLevel: "pdfjs-text-layer"
    }),
    parseOfficeZip: async () => [{ name: "mock", data: new Uint8Array() }],
    officeEntryText: () => "Word 採購流程",
    excelText: () => "Excel 供應商資料"
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(read("knowledge-engine.js"), context);

  const engine = context.KnowledgeEngine;
  assert(engine, "KnowledgeEngine 應公開至 globalThis");

  const text = await engine.ingest(
    { id: "doc-1", name: "SOP", mimeType: "application/vnd.google-apps.document", modifiedTime: "2026-07-16T00:00:00Z" },
    { data: "Google Docs 文字內容", mimeType: "text/plain", name: "SOP.txt", folder: { id: "folder-1", name: "SOP", path: "SOP" } }
  );
  assert(text.type === "google-doc", "Google Docs 應保留來源類型");
  assert(text.content === "Google Docs 文字內容", "Google Docs export 文字應建立 Knowledge Object");
  assert(text.folder === "folder-1" && text.source === "Google Drive", "Knowledge Object 應保留 Folder 與 Source");

  const pdf = await engine.ingest(
    { id: "pdf-1", name: "採購.pdf", mimeType: "application/pdf" },
    { data: new Blob(["pdf"]), mimeType: "application/pdf", name: "採購.pdf" }
  );
  assert(pdf.parser === "pdfjs-text-layer" && pdf.pages.length === 1, "PDF 應交由 PDF.js Parser 並保留頁碼");

  const word = await engine.ingest(
    { id: "word-1", name: "採購.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
    { data: new Blob(["word"]), mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", name: "採購.docx" }
  );
  assert(word.content === "Word 採購流程", "DOCX 應由可擴充 Parser 轉為文字");

  const excel = await engine.ingest(
    { id: "excel-1", name: "供應商.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
    { data: new Blob(["excel"]), mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", name: "供應商.xlsx" }
  );
  assert(excel.content === "Excel 供應商資料", "XLSX 應由可擴充 Parser 轉為文字");
}

function mockResponse(value, status = 200) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  const bytes = new TextEncoder().encode(text);
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => typeof value === "string" ? JSON.parse(value) : value,
    text: async () => text,
    arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    blob: async () => new Blob([bytes])
  };
}

async function driveServiceTests() {
  const requests = [];
  const fetchImpl = async (url, options = {}) => {
    const parsed = new URL(url);
    requests.push({ url: parsed, options });
    if (parsed.pathname.endsWith("/files/folder-1")) {
      return mockResponse({ id: "folder-1", name: "採購 SOP", mimeType: "application/vnd.google-apps.folder", modifiedTime: "2026-07-16T00:00:00Z" });
    }
    if (parsed.pathname.endsWith("/files") && !parsed.searchParams.get("pageToken")) {
      return mockResponse({
        nextPageToken: "page-2",
        files: [{ id: "doc-1", name: "採購規範", mimeType: "application/vnd.google-apps.document", modifiedTime: "2026-07-15T00:00:00Z", parents: ["folder-1"] }]
      });
    }
    if (parsed.pathname.endsWith("/files") && parsed.searchParams.get("pageToken") === "page-2") {
      return mockResponse({
        files: [{ id: "pdf-1", name: "採購.pdf", mimeType: "application/pdf", modifiedTime: "2026-07-14T00:00:00Z", parents: ["folder-1"] }]
      });
    }
    if (parsed.pathname.endsWith("/files/doc-1/export")) return mockResponse("Google Docs 內容");
    if (parsed.pathname.endsWith("/files/pdf-1")) return mockResponse("PDF bytes");
    throw new Error(`Unexpected URL: ${url}`);
  };

  const knowledgeEngine = {
    ingest: async (document, payload) => ({
      id: document.id,
      title: document.name,
      type: document.mimeType === "application/pdf" ? "pdf" : "google-doc",
      folder: document.folder.id,
      modifiedTime: document.modifiedTime,
      content: new TextDecoder().decode(payload.data),
      source: "Google Drive"
    })
  };
  const context = { console, URL, Set, Date, globalThis: null, fetch: fetchImpl, KnowledgeEngine: knowledgeEngine };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(read("google-drive-service.js"), context);

  const service = new context.GoogleDriveServiceClass({ fetchImpl, tokenProvider: () => "google-provider-token", knowledgeEngine });
  const result = await service.indexFolder("folder-1", { recursive: false });
  assert(result.folder.name === "採購 SOP", "應取得指定 Folder metadata");
  assert(result.files.length === 2, "應完成 pageToken 分頁並列出 Folder 全部檔案");
  assert(result.files[0].id && result.files[0].mimeType && result.files[0].modifiedTime, "檔案應包含 File ID、MIME Type、Modified Time");
  assert(result.knowledge.length === 2, "Google Docs 與 PDF 都應建立 Knowledge Object");
  assert(result.knowledge.every(item => item.content), "Knowledge Object 應包含純文字內容");
  assert(requests.every(request => request.options.headers.Authorization === "Bearer google-provider-token"), "Drive API 必須使用 Google provider token");
  assert(requests.some(request => request.url.pathname.endsWith("/files/doc-1/export") && request.url.searchParams.get("mimeType") === "text/plain"), "Google Docs 必須使用 files.export");
  assert(requests.some(request => request.url.pathname.endsWith("/files/pdf-1") && request.url.searchParams.get("alt") === "media"), "PDF 必須使用 files.get alt=media");

  const unauthorized = new context.GoogleDriveServiceClass({ fetchImpl, tokenProvider: () => "", knowledgeEngine });
  let authError = null;
  try { await unauthorized.getFolder("folder-1"); } catch (error) { authError = error; }
  assert(authError?.code === "GOOGLE_DRIVE_REAUTHORIZE_REQUIRED", "缺少 provider token 時應要求重新授權");
}

function oauthContractTests() {
  const auth = read("auth-service.js");
  const config = read("app-config.js");
  assert(config.includes("https://www.googleapis.com/auth/drive.readonly"), "Google OAuth 應要求 Drive 唯讀 scope");
  assert(auth.includes("provider_token") && auth.includes("provider_refresh_token"), "PKCE callback 應保存 provider tokens");
  assert(auth.includes("function currentGoogleProviderToken"), "Drive token 與 Supabase JWT 應有獨立 accessor");
}

(async () => {
  await parserRegistryTests();
  await driveServiceTests();
  oauthContractTests();
  console.log("P6.1 Google Drive Integration tests: PASS");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
