// P5.2A-1 Foundation Split: shared runtime state.
let activeModule = localStorage.getItem(ACTIVE_MODULE_KEY) || "dashboard";
let authCallbackCaptured = false;
let view = localStorage.getItem("wl_view") || "center";
if (view === "warroom") view = "library";
if (view === "capture") view = "center";
let hasOsShellState = localStorage.getItem(OS_OPEN_TABS_KEY) !== null;
let openTabs = readJson(OS_OPEN_TABS_KEY, []);
let activeWorkspace = localStorage.getItem(OS_ACTIVE_WORKSPACE_KEY) || "dashboard";
let recentWorkspaces = readJson(OS_RECENT_WORKSPACES_KEY, []);
let selected = new Date();
let selectedMonth = monthKey(selected);
let entries = [];
let tasks = [];
let editingTaskId = null;
let taskFilter = "all";
let taskSearch = "";
let profile = readJson("wl_profile", null);
let workProfile = readJson("wl_work_profile", null);
let feedback = readJson("wl_feedback", {});
let session = readJson(AI_OS_SESSION_KEY, null);
let library = [];
let knowledgeUnits = [];
let knowledgeRecommendationCandidates = [];
let viewingKnowledgeId = null;
let editingLibraryId = null;
let editingWorkMemoryName = null;
let workMemoryFoundationNotInitialized = false;
let learningKnowledgeDraft = null;
let knowledgeDriveSelectionDraft = null;
let knowledgeLibraryQuery = "";
let knowledgeLibrarySort = "updated_desc";
let knowledgeLibraryCategory = "all";
let knowledgeLibrarySearchComposing = false;
let knowledgeLibrarySearchRenderTimer = null;
let knowledgeLearningStep = "idle";
let knowledgeLearningError = "";
let workMemoryQuery = "";
let workMemoryCategoryFilter = "all";
let workMemorySort = "name";
let workMemoryMergeMode = false;
let workMemoryMergeSelection = [];
let workMemoryManualMergeSuggestion = null;
const WORK_MEMORY_MERGE_NOTICE_SESSION_KEY = "zhuge_work_memory_merge_notice_session_v1";
let workMemoryMergeCompletedNotice = (() => {
  try { return sessionStorage.getItem(WORK_MEMORY_MERGE_NOTICE_SESSION_KEY) || ""; }
  catch { return ""; }
})();
let workMemorySuggestionItemsCache = null;
let workMemorySearchComposing = false;
let workMemorySearchRenderTimer = null;
let editingEntryId = null;
let captureSeed = null;
let sidebarOpen = false;
let mobileCalendarOpen = false;
let mobileWorklogTab = "time";
let aiTodaySuggestionIndex = Number(localStorage.getItem(AI_TODAY_SUGGESTION_INDEX_KEY) || 0);
let suggestionBatchResizeTimer = null;
let lastSuggestionBatchSize = 0;
let conversationMessagesState = null;
let conversationPendingState = undefined;
let conversationRefreshTimer = null;
// Render coordination keeps async callbacks from replacing the application root
// while a render is already in progress. A queued follow-up render is coalesced
// into a single microtask so the WorkLog home cannot visibly flash or duplicate DOM.
let renderInProgress = false;
let renderQueued = false;
let renderDiagnostics = { count: 0, reasons: {}, startedAt: Date.now() };
const AI_REASON_QUEUE_SIZE = 5;
