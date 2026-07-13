// P5.2A-1 Foundation Split: Supabase-backed repositories.
const SupabaseRepository = {
  async requestError(path, options, res) {
    const body = await res.text().catch(() => "");
    let parsedBody = null;
    try { parsedBody = body ? JSON.parse(body) : null; } catch { parsedBody = null; }
    let payload = null;
    try { payload = options.body ? JSON.parse(options.body) : null; } catch { payload = options.body || null; }
    const details = {
      path,
      method: options.method || "GET",
      status: res.status,
      statusText: res.statusText,
      code: parsedBody?.code || "",
      message: parsedBody?.message || body || res.statusText,
      details: parsedBody?.details || "",
      hint: parsedBody?.hint || "",
      body,
      payload,
      user_uuid: currentUserUuid(),
      has_access_token: !!currentAccessToken(),
      access_token_expires_at: currentAccessTokenExpiresAtMs() ? new Date(currentAccessTokenExpiresAtMs()).toISOString() : ""
    };
    console.error("Supabase request failed", details);
    const error = new Error(`Supabase ${res.status}: ${details.message}`);
    error.supabase = details;
    return error;
  },
  shouldRefreshAfter(error) {
    const text = `${error?.supabase?.code || ""} ${error?.supabase?.message || ""} ${error?.supabase?.body || ""}`;
    return error?.supabase?.status === 401 && /jwt expired|PGRST303|expired/i.test(text);
  },
  async request(path, options = {}) {
    await ensureFreshAuthSession(false);
    const run = () => fetch(`${AUTH_CONFIG.supabaseUrl}/rest/v1/${path}`, {
      ...options,
      headers: cloudHeaders(options.headers || {})
    });
    let res = await run();
    if (!res.ok) {
      const firstError = await this.requestError(path, options, res);
      if (this.shouldRefreshAfter(firstError)) {
        await refreshAuthSession(true);
        res = await run();
        if (!res.ok) throw await this.requestError(path, options, res);
      } else {
        throw firstError;
      }
    }
    if (res.status === 204) return null;
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  },
  select(table, query = "") {
    return this.request(`${table}${query}`, { method: "GET" });
  },
  insert(table, payload) {
    return this.request(`${table}`, { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(payload) });
  },
  patch(table, query, payload) {
    return this.request(`${table}${query}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(payload) });
  },
  async storageRequest(path, options = {}) {
    await ensureFreshAuthSession(false);
    const run = () => fetch(`${AUTH_CONFIG.supabaseUrl}/storage/v1/${path}`, {
      ...options,
      headers: {
        apikey: AUTH_CONFIG.supabaseAnonKey,
        Authorization: `Bearer ${currentAccessToken() || AUTH_CONFIG.supabaseAnonKey}`,
        ...(options.headers || {})
      }
    });
    let res = await run();
    if (!res.ok) {
      const firstError = await this.requestError(`storage/v1/${path}`, options, res);
      if (this.shouldRefreshAfter(firstError)) {
        await refreshAuthSession(true);
        res = await run();
        if (!res.ok) throw await this.requestError(`storage/v1/${path}`, options, res);
      } else {
        throw firstError;
      }
    }
    if (res.status === 204) return null;
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  },
  encodeStoragePath(path = "") {
    return String(path || "").split("/").map(part => encodeURIComponent(part)).join("/");
  },
  async uploadKnowledgeFile(path = "", file = null) {
    if (!file) throw new Error("請選擇要上傳的正式檔案");
    return this.storageRequest(`object/${KNOWLEDGE_BUCKET}/${this.encodeStoragePath(path)}`, {
      method: "POST",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        "x-upsert": "false"
      },
      body: file
    });
  },
  async deleteKnowledgeFile(path = "") {
    if (!path) return null;
    return this.storageRequest(`object/${KNOWLEDGE_BUCKET}/${this.encodeStoragePath(path)}`, { method: "DELETE" });
  },
  async signedKnowledgeFileUrl(path = "", expiresIn = 300) {
    if (!path) throw new Error("此知識來源尚無正式檔案");
    const data = await this.storageRequest(`object/sign/${KNOWLEDGE_BUCKET}/${this.encodeStoragePath(path)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expiresIn })
    });
    const url = data?.signedURL || data?.signedUrl || data?.signed_url || "";
    if (!url) throw new Error("Storage 未回傳預覽連結");
    return url.startsWith("http") ? url : `${AUTH_CONFIG.supabaseUrl}/storage/v1${url}`;
  },
  async allocateKnowledgeId() {
    const rows = await this.request("rpc/next_knowledge_id", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({}) });
    if (typeof rows === "string") return rows;
    if (Array.isArray(rows)) return rows?.[0]?.next_knowledge_id || rows?.[0] || "";
    return rows?.next_knowledge_id || rows || "";
  },
  async upsertUserProfile(profileValue) {
    const work = parseWorkTimeRange(profileValue?.workHours);
    const lunch = parseWorkTimeRange(profileValue?.lunch || "12:00~13:00");
    const payload = {
      user_uuid: currentUserUuid(),
      display_name: session.name || "",
      email: session.email || "",
      role_code: roleCode(profileValue?.role || "採購"),
      work_start_time: work.start,
      work_end_time: work.end,
      lunch_start_time: lunch.start,
      lunch_end_time: lunch.end,
      timezone: "Asia/Taipei"
    };
    return this.request("user_profiles?on_conflict=user_uuid", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify(payload) });
  },
  async loadUserProfile() {
    const rows = await this.select("user_profiles", "?select=*&limit=1");
    return rows?.[0] || null;
  },
  async upsertExportSettings(profileValue) {
    const payload = { user_uuid: currentUserUuid(), export_profile: "ecp", ecp_owner: profileValue?.ecpOwner || "", ecp_department: profileValue?.ecpDepartment || "" };
    return this.request("user_export_settings?on_conflict=user_uuid,export_profile", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify(payload) });
  },
  async loadExportSettings() {
    const rows = await this.select("user_export_settings", "?select=*&export_profile=eq.ecp&limit=1");
    return rows?.[0] || null;
  },
  async upsertWorkProfile(value = {}) {
    const p = normalizeWorkProfile(value);
    const payload = {
      user_uuid: currentUserUuid(),
      ecp_responsible_person: p.ecpResponsiblePerson,
      ecp_department: p.ecpDepartment,
      default_task: p.defaultTask,
      default_work_model: p.defaultWorkModel,
      profile_completed: !!p.profileCompleted,
      profile_completed_at: p.profileCompletedAt || null,
      last_profile_check_date: p.lastProfileCheckDate || null,
      last_profile_prompt_date: p.lastProfilePromptDate || null,
      task_effective_month: p.taskEffectiveMonth || null,
      task_verified_at: p.taskVerifiedAt || null,
      expires_at: p.expiresAt || null
    };
    return this.request("user_work_profiles?on_conflict=user_uuid", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify(payload) });
  },
  async loadWorkProfile() {
    const rows = await this.select("user_work_profiles", "?select=*&limit=1");
    return rows?.[0] || null;
  },
  async syncNameList(table, names, extra = {}) {
    const rows = await this.select(table, "?select=id,name,is_active,sort_order");
    const current = rows || [];
    const wanted = [...new Set((names || []).map(x => String(x).trim()).filter(Boolean))];
    for (const [index, name] of wanted.entries()) {
      const existing = current.find(row => row.name === name);
      const payload = { user_uuid: currentUserUuid(), name, is_active: true, sort_order: index, ...extra };
      if (existing) await this.patch(table, `?id=eq.${encodeURIComponent(existing.id)}`, payload);
      else await this.insert(table, payload);
    }
    for (const row of current) {
      if (row.is_active && !wanted.includes(row.name)) await this.patch(table, `?id=eq.${encodeURIComponent(row.id)}`, { is_active: false });
    }
    return this.select(table, "?select=*&is_active=eq.true&order=sort_order.asc,name.asc");
  },
  loadWorkModels() {
    return this.select("user_work_models", "?select=*&is_active=eq.true&order=sort_order.asc,name.asc");
  },
  saveWorkModels(names, profileValue = profile) {
    return this.syncNameList("user_work_models", names, { role_code: roleCode(profileValue?.role || "採購"), source: "manual" });
  },
  loadEcpTasks() {
    return this.select("user_ecp_tasks", "?select=*&is_active=eq.true&order=sort_order.asc,name.asc");
  },
  saveEcpTasks(names) {
    return this.syncNameList("user_ecp_tasks", names);
  },
  async ensureAssistantConversation() {
    if (!currentUserUuid() || !currentAccessToken()) throw new Error("Cloud Sync 尚未就緒");
    const payload = {
      user_uuid: currentUserUuid(),
      thread_key: "main",
      title: "Mr. KM",
      status: "active",
      updated_at: new Date().toISOString()
    };
    const rows = await this.request("assistant_conversations?on_conflict=user_uuid,thread_key", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify(payload) });
    return rows?.[0] || null;
  },
  async loadAssistantConversation() {
    const conversation = await this.ensureAssistantConversation();
    const conversationId = conversation?.id;
    const messages = conversationId
      ? await this.select("assistant_messages", `?select=*&conversation_id=eq.${encodeURIComponent(conversationId)}&order=created_at.desc&limit=50`)
      : [];
    const states = await this.select("assistant_conversation_states", "?select=*&state_key=eq.main&limit=1");
    return { conversation, messages: (messages || []).slice().reverse(), state: states?.[0] || null };
  },
  async saveAssistantMessage(message = {}, channel = assistantChannel()) {
    if (!message || message.transient || message.role === "system") return null;
    const conversation = await this.ensureAssistantConversation();
    if (!conversation?.id) throw new Error("Conversation 尚未就緒");
    const payload = {
      user_uuid: currentUserUuid(),
      conversation_id: conversation.id,
      client_message_id: message.id || uid("msg"),
      role: message.role || "assistant",
      content: String(message.text || ""),
      card: message.card || null,
      channel,
      created_at: message.at || new Date().toISOString()
    };
    const rows = await this.request("assistant_messages?on_conflict=user_uuid,client_message_id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify(payload) });
    return rows?.[0] || null;
  },
  async saveAssistantState(command = null, channel = assistantChannel()) {
    if (!currentUserUuid() || !currentAccessToken()) throw new Error("Cloud Sync 尚未就緒");
    const conversation = await this.ensureAssistantConversation();
    const payload = {
      user_uuid: currentUserUuid(),
      conversation_id: conversation?.id || null,
      state_key: "main",
      state_type: command ? (command.action || "pending_action") : "idle",
      pending_action: command || null,
      channel,
      updated_at: new Date().toISOString()
    };
    const rows = await this.request("assistant_conversation_states?on_conflict=user_uuid,state_key", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify(payload) });
    return rows?.[0] || null;
  },
  async hasCloudCoreData() {
    const checks = await Promise.allSettled([
      this.select("user_profiles", "?select=user_uuid&limit=1"),
      this.select("user_work_models", "?select=id&limit=1"),
      this.select("user_ecp_tasks", "?select=id&limit=1"),
      this.select("user_export_settings", "?select=id&limit=1"),
      this.select("work_entries", "?select=id&status=neq.deleted&limit=1")
    ]);
    return checks.some(result => result.status === "fulfilled" && Array.isArray(result.value) && result.value.length > 0);
  },
  async loadEntries(month = monthKey()) {
    const rows = await this.select("work_entries", `?select=*&work_date=gte.${month}-01&work_date=lt.${nextMonthKey(month)}-01&status=neq.deleted&order=started_at.asc`);
    return rows || [];
  },
  async loadMigration(key = CLOUD_MIGRATION_KEY) {
    const rows = await this.select("sync_migrations", `?select=*&migration_key=eq.${encodeURIComponent(key)}&limit=1`);
    return rows?.[0] || null;
  },
  async completeMigration(sourceHash, key = CLOUD_MIGRATION_KEY) {
    const payload = { user_uuid: currentUserUuid(), migration_key: key, source_hash: sourceHash, completed_at: new Date().toISOString() };
    return this.request("sync_migrations?on_conflict=user_uuid,migration_key", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify(payload) });
  },
  async saveEntry(entry) {
    if (!currentUserUuid() || !currentAccessToken()) throw new Error("Cloud Sync 尚未就緒");
    const ecpRows = await this.loadEcpTasks();
    const ecpTask = ecpRows.find(row => row.name === entry.ecpTask);
    const existing = entry.cloudId ? [{ id: entry.cloudId }] : await this.select("work_entries", `?select=id&legacy_id=eq.${encodeURIComponent(entry.id)}&limit=1`);
    const started = parseTaipeiBusinessDateTime(entry.at);
    const ended = new Date(started.getTime() + Math.round(Number(entry.hours || 0) * 60) * 60000);
    const payload = {
      user_uuid: currentUserUuid(),
      work_date: entry.date || String(entry.at || "").slice(0, 10),
      started_at: started.toISOString(),
      ended_at: ended.toISOString(),
      hours: Number(entry.hours || 0),
      title: entry.title || "",
      note: entry.note || "",
      event_type: eventTypeCode(entry.entryType || entry.type || "work"),
      status: entry.status || "completed",
      source: entry.source || "manual",
      ecp_task_id: ecpTask?.id || null,
      ecp_task_name_snapshot: entry.ecpTask || "",
      legacy_id: entry.id
    };
    const saved = existing?.[0]?.id
      ? await this.patch("work_entries", `?id=eq.${encodeURIComponent(existing[0].id)}`, payload)
      : await this.insert("work_entries", payload);
    if (!saved?.[0]?.id) {
      console.error("Supabase saveEntry returned empty response", { payload, saved, user_uuid: currentUserUuid(), has_access_token: !!currentAccessToken() });
      throw new Error("Supabase work_entries 未回傳儲存結果");
    }
    return saved[0];
  },
  async deleteEntry(entry) {
    if (!currentUserUuid() || !currentAccessToken()) throw new Error("Cloud Sync 尚未就緒");
    const existing = entry.cloudId ? [{ id: entry.cloudId }] : await this.select("work_entries", `?select=id&legacy_id=eq.${encodeURIComponent(entry.id)}&limit=1`);
    if (!existing?.[0]?.id) return null;
    return this.patch("work_entries", `?id=eq.${encodeURIComponent(existing[0].id)}`, { status: "deleted", deleted_at: new Date().toISOString() });
  },
  loadKnowledgeSources() {
    return this.select("knowledge_sources", "?select=*&deleted_at=is.null&order=created_at.desc");
  },
  async saveKnowledgeSource(item, file = null) {
    if (!currentUserUuid() || !currentAccessToken()) throw new Error("Cloud Sync 尚未就緒");
    const isNew = !item.cloudId;
    const knowledgeId = item.knowledgeId || (isNew ? await this.allocateKnowledgeId() : "");
    if (!knowledgeId) throw new Error("無法產生 Knowledge ID");
    const version = item.version || "v1.0";
    let storagePath = item.storagePath || "";
    let uploadedPath = "";
    if (file) {
      const safeName = sanitizeStorageFileName(file.name || item.filename || "knowledge-source");
      storagePath = `${currentUserUuid()}/${knowledgeId}/${version}/${Date.now()}-${safeName}`;
      await this.uploadKnowledgeFile(storagePath, file);
      uploadedPath = storagePath;
    }
    const payload = {
      user_uuid: currentUserUuid(),
      organization_id: item.organizationId || null,
      tenant_id: item.tenantId || null,
      knowledge_id: knowledgeId,
      title: item.title,
      description: item.description || "",
      category: item.category || "其他",
      scope: normalizeKnowledgeScope(item.scope),
      source_type: item.sourceType || inferKnowledgeSourceType(file?.name || item.filename || storagePath),
      source_name: item.sourceName || file?.name || item.filename || "",
      source_url: item.sourceUrl || "",
      storage_path: storagePath,
      mime_type: file?.type || item.mimeType || "",
      file_size: file?.size || item.fileSize || null,
      applicable_agents: item.applicableAgents || [],
      related_roles: item.relatedRoles || [],
      related_work_models: item.relatedWorkModels || [],
      tags: item.tags || [],
      triggers: item.triggers || [],
      processing_status: item.processingStatus || "uploaded",
      version,
      source_version: item.sourceVersion || version,
      filename: file?.name || item.filename || "",
      legacy_id: item.id || null,
      created_by: currentUserUuid(),
      updated_by: currentUserUuid(),
      updated_at: new Date().toISOString()
    };
    const existing = item.cloudId ? [{ id: item.cloudId }] : await this.select("knowledge_sources", `?select=id&legacy_id=eq.${encodeURIComponent(item.id)}&limit=1`);
    try {
      const saved = existing?.[0]?.id
        ? await this.patch("knowledge_sources", `?id=eq.${encodeURIComponent(existing[0].id)}`, payload)
        : await this.insert("knowledge_sources", payload);
      if (!saved?.[0]?.id) throw new Error("Supabase knowledge_sources 未回傳儲存結果");
      return saved[0];
    } catch (error) {
      if (uploadedPath) {
        await this.deleteKnowledgeFile(uploadedPath).catch(cleanupError => console.warn("Knowledge orphan upload cleanup failed", { uploadedPath, cleanupError }));
      }
      throw error;
    }
  },
  async deleteKnowledgeSource(item) {
    if (!currentUserUuid() || !currentAccessToken()) throw new Error("Cloud Sync 尚未就緒");
    const existing = item.cloudId ? [{ id: item.cloudId }] : await this.select("knowledge_sources", `?select=id&legacy_id=eq.${encodeURIComponent(item.id)}&limit=1`);
    if (!existing?.[0]?.id) return null;
    return this.patch("knowledge_sources", `?id=eq.${encodeURIComponent(existing[0].id)}`, { deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  }
};

const ConversationRepository = {
  load() {
    return SupabaseRepository.loadAssistantConversation();
  },
  saveMessage(message = {}, channel = assistantChannel()) {
    return SupabaseRepository.saveAssistantMessage(message, channel);
  },
  saveState(command = null, channel = assistantChannel()) {
    return SupabaseRepository.saveAssistantState(command, channel);
  }
};

const KnowledgeRepository = {
  loadSources() {
    return SupabaseRepository.loadKnowledgeSources();
  },
  saveSource(item = {}, file = null) {
    return SupabaseRepository.saveKnowledgeSource(item, file);
  },
  deleteSource(item = {}) {
    return SupabaseRepository.deleteKnowledgeSource(item);
  },
  signedSourceUrl(path = "", expiresIn = 300) {
    return SupabaseRepository.signedKnowledgeFileUrl(path, expiresIn);
  }
};
