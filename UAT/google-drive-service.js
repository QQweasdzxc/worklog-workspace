// P6.1 AI Core: the single Google Drive gateway used by future knowledge sources.
// This module only lists, downloads, exports, parses, and normalizes documents.
(function initializeGoogleDriveService(global) {
  "use strict";

  const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";
  const FOLDER_MIME = "application/vnd.google-apps.folder";
  const GOOGLE_DOC_MIME = "application/vnd.google-apps.document";
  const GOOGLE_SHEET_MIME = "application/vnd.google-apps.spreadsheet";
  const PDF_MIME = "application/pdf";
  const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  const SUPPORTED_SOURCE_MIMES = new Set([GOOGLE_DOC_MIME, GOOGLE_SHEET_MIME, PDF_MIME, DOCX_MIME, XLSX_MIME]);

  class GoogleDriveServiceError extends Error {
    constructor(message, options = {}) {
      super(message);
      this.name = "GoogleDriveServiceError";
      this.code = options.code || "GOOGLE_DRIVE_ERROR";
      this.status = Number(options.status || 0);
      this.details = options.details || null;
    }
  }

  function driveQueryEscape(value = "") {
    return String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  }

  function normalizeDriveFile(file = {}, folder = {}) {
    return {
      id: String(file.id || ""),
      name: file.name || "未命名文件",
      mimeType: file.mimeType || "",
      modifiedTime: file.modifiedTime || "",
      size: file.size == null ? null : Number(file.size),
      md5Checksum: file.md5Checksum || "",
      parents: Array.isArray(file.parents) ? file.parents : [],
      webViewLink: file.webViewLink || "",
      driveId: file.driveId || "",
      folder: {
        id: folder.id || "",
        name: folder.name || "",
        path: folder.path || folder.name || ""
      },
      source: "Google Drive",
      sourceProvider: "google-drive"
    };
  }

  function responseErrorBody(response) {
    return response.text().then(text => {
      try { return text ? JSON.parse(text) : null; }
      catch { return text || null; }
    }).catch(() => null);
  }

  class DriveService {
    constructor(options = {}) {
      this.fetchImpl = options.fetchImpl || global.fetch?.bind(global);
      this.tokenProvider = options.tokenProvider || (() => {
        if (typeof global.currentGoogleProviderToken === "function") return global.currentGoogleProviderToken();
        const stored = typeof global.getStoredAuthSession === "function" ? global.getStoredAuthSession() : null;
        return stored?.provider_token || "";
      });
      this.knowledgeEngine = options.knowledgeEngine || global.KnowledgeEngine;
      if (typeof this.fetchImpl !== "function") throw new Error("Google Drive Service 需要 Fetch API");
    }

    accessToken() {
      return String(this.tokenProvider?.() || "");
    }

    isAuthorized() {
      return Boolean(this.accessToken());
    }

    async request(path, options = {}) {
      const token = this.accessToken();
      if (!token) {
        throw new GoogleDriveServiceError("Google Drive 尚未授權，請重新使用 Google 登入以授予唯讀權限", {
          code: "GOOGLE_DRIVE_REAUTHORIZE_REQUIRED"
        });
      }
      const url = new URL(path.startsWith("http") ? path : `${DRIVE_API_BASE}${path}`);
      Object.entries(options.query || {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
      });
      const response = await this.fetchImpl(url.toString(), {
        method: options.method || "GET",
        headers: { Authorization: `Bearer ${token}`, ...(options.headers || {}) },
        signal: options.signal
      });
      if (!response.ok) {
        const details = await responseErrorBody(response);
        const needsAuth = response.status === 401 || response.status === 403;
        throw new GoogleDriveServiceError(
          needsAuth ? "Google Drive 授權已失效或權限不足，請重新授權" : `Google Drive API 失敗：HTTP ${response.status}`,
          { code: needsAuth ? "GOOGLE_DRIVE_REAUTHORIZE_REQUIRED" : "GOOGLE_DRIVE_API_ERROR", status: response.status, details }
        );
      }
      if (options.responseType === "arrayBuffer") return response.arrayBuffer();
      if (options.responseType === "blob") return response.blob();
      if (options.responseType === "text") return response.text();
      if (response.status === 204) return null;
      return response.json();
    }

    async getFolder(folderId, options = {}) {
      if (!folderId) throw new GoogleDriveServiceError("請提供 Google Drive Folder ID", { code: "FOLDER_ID_REQUIRED" });
      const folder = await this.request(`/files/${encodeURIComponent(folderId)}`, {
        query: {
          fields: "id,name,mimeType,modifiedTime,parents,webViewLink,driveId",
          supportsAllDrives: true
        },
        signal: options.signal
      });
      if (folder.mimeType !== FOLDER_MIME) {
        throw new GoogleDriveServiceError("指定的 Google Drive ID 不是資料夾", { code: "NOT_A_FOLDER" });
      }
      return normalizeDriveFile(folder, { id: folder.id, name: folder.name, path: folder.name });
    }

    async listFolder(folderId, options = {}) {
      const recursive = Boolean(options.recursive);
      const includeFolders = Boolean(options.includeFolders);
      const pageSize = Math.min(1000, Math.max(1, Number(options.pageSize || 1000)));
      const root = options.folder || await this.getFolder(folderId, options);
      const queue = [{ id: root.id, name: root.name, path: root.name }];
      const files = [];
      while (queue.length) {
        const current = queue.shift();
        let pageToken = "";
        do {
          const result = await this.request("/files", {
            query: {
              q: `'${driveQueryEscape(current.id)}' in parents and trashed = false`,
              fields: "nextPageToken,incompleteSearch,files(id,name,mimeType,modifiedTime,size,md5Checksum,parents,webViewLink,driveId)",
              orderBy: "name_natural",
              pageSize,
              pageToken,
              spaces: "drive",
              supportsAllDrives: true,
              includeItemsFromAllDrives: true
            },
            signal: options.signal
          });
          for (const item of result.files || []) {
            const normalized = normalizeDriveFile(item, current);
            if (item.mimeType === FOLDER_MIME) {
              if (includeFolders) files.push(normalized);
              if (recursive) queue.push({ id: item.id, name: item.name, path: `${current.path}/${item.name}` });
            } else {
              files.push(normalized);
            }
          }
          pageToken = result.nextPageToken || "";
        } while (pageToken);
      }
      return files;
    }

    isSupported(file = {}) {
      if (SUPPORTED_SOURCE_MIMES.has(file.mimeType)) return true;
      return /\.(pdf|docx|xlsx)$/i.test(file.name || "");
    }

    downloadDescriptor(file = {}) {
      if (file.mimeType === GOOGLE_DOC_MIME) {
        return { mode: "export", mimeType: "text/plain", name: `${file.name}.txt` };
      }
      if (file.mimeType === GOOGLE_SHEET_MIME) {
        return { mode: "export", mimeType: XLSX_MIME, name: `${file.name}.xlsx` };
      }
      return { mode: "download", mimeType: file.mimeType || "application/octet-stream", name: file.name || file.id };
    }

    async readFile(file = {}, options = {}) {
      if (!file.id) throw new GoogleDriveServiceError("Google Drive File ID 不可為空", { code: "FILE_ID_REQUIRED" });
      if (!this.isSupported(file)) {
        throw new GoogleDriveServiceError(`${file.name || file.id} 的格式目前尚未支援`, { code: "UNSUPPORTED_FILE_TYPE" });
      }
      const descriptor = this.downloadDescriptor(file);
      const path = descriptor.mode === "export"
        ? `/files/${encodeURIComponent(file.id)}/export`
        : `/files/${encodeURIComponent(file.id)}`;
      const data = await this.request(path, {
        query: descriptor.mode === "export"
          ? { mimeType: descriptor.mimeType }
          : { alt: "media", supportsAllDrives: true },
        responseType: "arrayBuffer",
        signal: options.signal
      });
      return { data, mimeType: descriptor.mimeType, name: descriptor.name, folder: file.folder };
    }

    async indexFolder(folderId, options = {}) {
      const folder = await this.getFolder(folderId, options);
      const documents = await this.listFolder(folderId, {
        ...options,
        folder,
        recursive: options.recursive !== false
      });
      const supported = documents.filter(file => this.isSupported(file));
      const skipped = documents.filter(file => !this.isSupported(file)).map(file => ({
        id: file.id,
        title: file.name,
        mimeType: file.mimeType,
        reason: "unsupported"
      }));
      const items = [];
      const errors = [];
      for (const document of supported) {
        try {
          const payload = await this.readFile(document, options);
          items.push(await this.knowledgeEngine.ingest(document, payload));
        } catch (error) {
          errors.push({ id: document.id, title: document.name, code: error.code || "PARSE_FAILED", message: error.message });
          if (options.continueOnError === false) throw error;
        }
      }
      const result = { folder, files: documents, knowledge: items, skipped, errors };
      if (options.debug === true || global.DRIVE_DEBUG_MODE === true) this.logIndexResult(result, options);
      return result;
    }

    logIndexResult(result = {}, options = {}) {
      console.groupCollapsed(`Google Drive Knowledge Index：${result.folder?.name || result.folder?.id || "Folder"}`);
      console.info("Drive Folder", result.folder);
      console.table((result.files || []).map(file => ({
        name: file.name,
        fileId: file.id,
        mimeType: file.mimeType,
        modifiedTime: file.modifiedTime,
        folder: file.folder?.path || ""
      })));
      for (const item of result.knowledge || []) {
        console.groupCollapsed(`Knowledge Object：${item.title}`);
        console.info(options.includeContent === false ? { ...item, content: `[${item.content.length} characters]` } : item);
        console.groupEnd();
      }
      if (result.skipped?.length) console.info("Skipped Drive Files", result.skipped);
      if (result.errors?.length) console.warn("Drive Knowledge Errors", result.errors);
      console.groupEnd();
    }
  }

  const GoogleDriveService = new DriveService();
  global.GoogleDriveServiceError = GoogleDriveServiceError;
  global.GoogleDriveServiceClass = DriveService;
  global.GoogleDriveService = GoogleDriveService;
  global.indexGoogleDriveFolder = (folderId, options = {}) => GoogleDriveService.indexFolder(folderId, options);
})(globalThis);
