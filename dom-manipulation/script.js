/**********************
 * CONFIG & CONSTANTS *
 **********************/
const LS_QUOTES_KEY = "dqg_quotes_v2";
const LS_FILTER_KEY = "dqg_last_filter";
const LS_AUTO_SYNC_KEY = "dqg_auto_sync_on";
const LS_LAST_SYNC_KEY = "dqg_last_sync";
const SERVER_BASE = "https://jsonplaceholder.typicode.com";
const SERVER_ENDPOINT = `${SERVER_BASE}/posts`; // Simulated quotes
const AUTO_SYNC_INTERVAL_MS = 30000; // 30s

/**********************
 * STATE              *
 **********************/
// A quote now includes: { id, text, category, updatedAt, dirty (bool), source: 'local'|'server' }
let quotes = [
  { id: genId(), text: "The best way to get started is to quit talking and begin doing.", category: "Motivation", updatedAt: nowISO(), dirty: false, source: "local" },
  { id: genId(), text: "Success is not final, failure is not fatal: It is the courage to continue that counts.", category: "Motivation", updatedAt: nowISO(), dirty: false, source: "local" },
  { id: genId(), text: "In the middle of every difficulty lies opportunity.", category: "Inspiration", updatedAt: nowISO(), dirty: false, source: "local" },
  { id: genId(), text: "Life is what happens when you're busy making other plans.", category: "Life", updatedAt: nowISO(), dirty: false, source: "local" },
  { id: genId(), text: "Your coffee won’t fix the problem, but it might help you survive fixing it.", category: "Humor", updatedAt: nowISO(), dirty: false, source: "local" }
];

let autoSyncOn = true;
let syncTimer = null;
let pendingConflicts = []; // Array of { id, local, server }

/**********************
 * DOM                *
 **********************/
const quoteDisplay     = document.getElementById("quoteDisplay");
const categoryFilter   = document.getElementById("categoryFilter");
const newQuoteBtn      = document.getElementById("newQuote");
const addQuoteBtn      = document.getElementById("addQuoteBtn");
const newQuoteText     = document.getElementById("newQuoteText");
const newQuoteCategory = document.getElementById("newQuoteCategory");
const exportBtn        = document.getElementById("exportBtn");
const syncNowBtn       = document.getElementById("syncNowBtn");
const toggleAutoBtn    = document.getElementById("toggleAutoBtn");
const syncStatus       = document.getElementById("syncStatus");
const lastSyncPill     = document.getElementById("lastSyncPill");
const conflictPanel    = document.getElementById("conflictPanel");
const conflictList     = document.getElementById("conflictList");
const applyServerWins  = document.getElementById("applyServerWins");
const applyLocalWins   = document.getElementById("applyLocalWins");
const closeConflicts   = document.getElementById("closeConflicts");

/**********************
 * UTILITIES          *
 **********************/
function nowISO() { return new Date().toISOString(); }
function genId() { return `q_${Date.now()}_${Math.random().toString(36).slice(2,8)}`; }
function isValidQuote(q) {
  return q && typeof q.text === "string" && q.text.trim() &&
         typeof q.category === "string" && q.category.trim();
}
function setStatus(msg, type="info") {
  syncStatus.textContent = msg;
  syncStatus.className = "status";
  if (type === "ok") syncStatus.classList.add("ok");
  else if (type === "warn") syncStatus.classList.add("warn");
  else if (type === "err") syncStatus.classList.add("err");
}
function setLastSync(ts) {
  localStorage.setItem(LS_LAST_SYNC_KEY, ts);
  lastSyncPill.textContent = `Last sync: ${ts ? new Date(ts).toLocaleString() : "—"}`;
}

/**********************
 * STORAGE            *
 **********************/
function saveQuotes() {
  localStorage.setItem(LS_QUOTES_KEY, JSON.stringify(quotes));
}
function loadQuotes() {
  const raw = localStorage.getItem(LS_QUOTES_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Migrate missing fields if old data
      quotes = parsed.map(q => ({
        id: q.id || genId(),
        text: q.text,
        category: q.category,
        updatedAt: q.updatedAt || nowISO(),
        dirty: !!q.dirty,
        source: q.source || "local"
      })).filter(isValidQuote);
    }
  } catch { /* ignore */ }
}
function saveAutoSyncState(on) {
  localStorage.setItem(LS_AUTO_SYNC_KEY, on ? "1" : "0");
}
function loadAutoSyncState() {
  autoSyncOn = localStorage.getItem(LS_AUTO_SYNC_KEY) !== "0";
  toggleAutoBtn.textContent = `Auto Sync: ${autoSyncOn ? "On" : "Off"}`;
}

/**********************
 * CATEGORIES & FILTER
 **********************/
function populateCategories() {
  const categories = [...new Set(quotes.map(q => q.category.trim()))].sort((a,b)=>a.localeCompare(b));
  categoryFilter.innerHTML = `<option value="all">All Categories</option>`;
  for (const c of categories) {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    categoryFilter.appendChild(opt);
  }
  // Restore last filter
  const last = localStorage.getItem(LS_FILTER_KEY);
  if (last && [...categoryFilter.options].some(o => o.value === last)) categoryFilter.value = last;
}
function filterQuotes() {
  localStorage.setItem(LS_FILTER_KEY, categoryFilter.value);
  showRandomQuote();
}

/**********************
 * QUOTE UI           *
 **********************/
function showRandomQuote() {
  const cat = categoryFilter.value;
  const pool = cat === "all" ? quotes : quotes.filter(q => q.category === cat);
  if (pool.length === 0) {
    quoteDisplay.textContent = "No quotes in this category.";
    return;
  }
  const q = pool[Math.floor(Math.random() * pool.length)];
  quoteDisplay.textContent = `"${q.text}" — [${q.category}]`;
}
function addQuote() {
  const text = newQuoteText.value.trim();
  const category = newQuoteCategory.value.trim();
  if (!text || !category) { alert("Please enter both a quote and a category."); return; }
  const q = { id: genId(), text, category, updatedAt: nowISO(), dirty: true, source: "local" };
  quotes.push(q);
  saveQuotes();
  populateCategories();
  newQuoteText.value = "";
  newQuoteCategory.value = "";
  alert("Quote added (pending sync).");
}

/**********************
 * IMPORT / EXPORT    *
 **********************/
function exportQuotes() {
  const json = JSON.stringify(quotes, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `quotes-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(url), 10000);
}
function importFromJsonFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (!Array.isArray(data)) { alert("Invalid JSON format."); return; }
      let added = 0;
      const existing = new Set(quotes.map(q => q.text.toLowerCase()+"|"+q.category.toLowerCase()));
      for (const item of data) {
        if (isValidQuote(item)) {
          const key = item.text.toLowerCase()+"|"+item.category.toLowerCase();
          if (!existing.has(key)) {
            quotes.push({
              id: item.id || genId(),
              text: item.text.trim(),
              category: item.category.trim(),
              updatedAt: item.updatedAt || nowISO(),
              dirty: true, // mark to push
              source: "local"
            });
            existing.add(key);
            added++;
          }
        }
      }
      saveQuotes();
      populateCategories();
      alert(`Imported ${added} quotes. They will sync on next run.`);
    } catch {
      alert("Failed to parse JSON.");
    } finally {
      event.target.value = "";
    }
  };
  reader.readAsText(file);
}
window.importFromJsonFile = importFromJsonFile; // for inline onchange

/**********************
 * SERVER SYNC        *
 * (Simulated via JSONPlaceholder)
 **********************/
// Map server post -> quote
function mapServerToQuote(post) {
  // JSONPlaceholder posts don’t have updatedAt; we simulate it with current time.
  return {
    id: String(post.id), // ensure string
    text: (post.body || "").trim().slice(0, 280) || "(empty)",
    category: (post.title || "General").trim().slice(0, 50) || "General",
    updatedAt: nowISO(),
    dirty: false,
    source: "server"
  };
}
// Map quote -> server payload
function mapQuoteToServerPayload(q) {
  return {
    id: q.id.replace(/^q_/, ""), // server expects numeric-ish; but JSONPlaceholder ignores anyway
    title: q.category,
    body: q.text,
    userId: 1
  };
}

async function fetchServerQuotes(limit = 10) {
  const res = await fetch(`${SERVER_ENDPOINT}?_limit=${limit}`);
  if (!res.ok) throw new Error("Server fetch failed");
  const data = await res.json();
  return data.map(mapServerToQuote);
}

async function pushLocalChanges(dirtyList) {
  // JSONPlaceholder won’t persist, but we simulate successful posts/puts.
  const results = [];
  for (const q of dirtyList) {
    const payload = mapQuoteToServerPayload(q);
    const method = q.source === "server" ? "PUT" : "POST";
    const url = method === "PUT" ? `${SERVER_ENDPOINT}/${payload.id || 1}` : SERVER_ENDPOINT;
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      results.push({ ok: res.ok, data, localId: q.id });
    } catch {
      results.push({ ok: false, data: null, localId: q.id });
    }
  }
  return results;
}

/**********************
 * MERGE & CONFLICTS  *
 **********************/
function detectConflicts(localList, serverList) {
  const byIdLocal = new Map(localList.map(q => [String(q.id), q]));
  const conflicts = [];
  for (const s of serverList) {
    const l = byIdLocal.get(String(s.id));
    if (!l) continue;
    // Conflict: local is dirty and contents differ from server
    const changedText = l.text !== s.text;
    const changedCat  = l.category !== s.category;
    if (l.dirty && (changedText || changedCat)) {
      conflicts.push({ id: s.id, local: l, server: s });
    }
  }
  return conflicts;
}

function applyServerWins(conflicts) {
  const map = new Map(conflicts.map(c => [String(c.id), c]));
  quotes = quotes.map(q => {
    const c = map.get(String(q.id));
    if (!c) return q;
    return { ...c.server, dirty: false, source: "server", updatedAt: nowISO() };
  });
}
function applyLocalWins(conflicts) {
  // Local replaces server: we simply mark them clean as if server accepted local
  quotes = quotes.map(q => {
    const c = conflicts.find(x => String(x.id) === String(q.id));
    if (!c) return q;
    return { ...q, dirty: false, source: "server", updatedAt: nowISO() };
  });
}

function mergeServerData(serverList, options = { serverWinsByDefault: true }) {
  const byId = new Map(quotes.map(q => [String(q.id), q]));
  const conflicts = detectConflicts(quotes, serverList);

  if (conflicts.length > 0) {
    pendingConflicts = conflicts;
    showConflictPanel(conflicts);
  } else {
    hideConflictPanel();
  }

  // Merge server items
  for (const s of serverList) {
    const id = String(s.id);
    const local = byId.get(id);
    if (!local) {
      quotes.push(s); // new from server
    } else {
      const different = local.text !== s.text || local.category !== s.category;
      if (different) {
        if (local.dirty) {
          // conflict already handled above; apply default here if chosen
          if (options.serverWinsByDefault) {
            Object.assign(local, { ...s, dirty: false, source: "server", updatedAt: nowISO() });
          } else {
            // keep local; do nothing
          }
        } else {
          // local clean; accept server changes
          Object.assign(local, { ...s, dirty: false, source: "server", updatedAt: nowISO() });
        }
      } else {
        // Same content; mark clean
        local.dirty = false;
        local.source = "server";
      }
    }
  }
}

/**********************
 * CONFLICT UI        *
 **********************/
function showConflictPanel(conflicts) {
  conflictList.innerHTML = "";
  for (const c of conflicts) {
    const el = document.createElement("div");
    el.className = "conflict-item";
    el.innerHTML = `
      <div><b>ID:</b> ${c.id}</div>
      <div><b>Local:</b> "${escapeHtml(c.local.text)}" [${escapeHtml(c.local.category)}]</div>
      <div><b>Server:</b> "${escapeHtml(c.server.text)}" [${escapeHtml(c.server.category)}]</div>
      <div class="choice">
        <button data-id="${c.id}" data-choice="server">Use Server</button>
        <button class="btn-ghost" data-id="${c.id}" data-choice="local">Keep Local</button>
      </div>
    `;
    conflictList.appendChild(el);
  }
  conflictPanel.style.display = "block";

  // Per-item handlers
  conflictList.querySelectorAll("button[data-id]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = String(btn.dataset.id);
      const choice = btn.dataset.choice;
      const idx = pendingConflicts.findIndex(c => String(c.id) === id);
      if (idx === -1) return;
      const c = pendingConflicts[idx];
      if (choice === "server") applyServerWins([c]);
      else applyLocalWins([c]);
      pendingConflicts.splice(idx, 1);
      // Refresh UI
      populateCategories();
      saveQuotes();
      showRandomQuote();
      // Remove item from panel
      btn.closest(".conflict-item").remove();
      if (pendingConflicts.length === 0) hideConflictPanel();
    });
  });
}
function hideConflictPanel() {
  pendingConflicts = [];
  conflictPanel.style.display = "none";
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

/**********************
 * SYNC ORCHESTRATION *
 **********************/
async function syncNow() {
  try {
    setStatus("Syncing…");
    // 1) Push local dirty changes
    const dirty = quotes.filter(q => q.dirty);
    if (dirty.length) {
      const pushRes = await pushLocalChanges(dirty);
      // Mark successfully pushed as clean (simulation)
      const okIds = new Set(pushRes.filter(r => r.ok).map(r => r.localId));
      for (const q of quotes) if (okIds.has(q.id)) { q.dirty = false; q.source = "server"; }
    }

    // 2) Pull server updates
    const serverQuotes = await fetchServerQuotes(10);
    mergeServerData(serverQuotes, { serverWinsByDefault: true });

    // 3) Save & update UI
    saveQuotes();
    populateCategories();
    setStatus("Sync complete.", "ok");
    const t = Date.now();
    setLastSync(t);
  } catch (e) {
    setStatus("Sync failed. Check connection and try again.", "err");
  }
}

function startAutoSync() {
  if (syncTimer) clearInterval(syncTimer);
  if (!autoSyncOn) return;
  syncTimer = setInterval(syncNow, AUTO_SYNC_INTERVAL_MS);
}

/**********************
 * EVENT LISTENERS    *
 **********************/
newQuoteBtn.addEventListener("click", showRandomQuote);
addQuoteBtn.addEventListener("click", addQuote);
exportBtn.addEventListener("click", exportQuotes);
syncNowBtn.addEventListener("click", syncNow);
toggleAutoBtn.addEventListener("click", () => {
  autoSyncOn = !autoSyncOn;
  toggleAutoBtn.textContent = `Auto Sync: ${autoSyncOn ? "On" : "Off"}`;
  saveAutoSyncState(autoSyncOn);
  startAutoSync();
});
applyServerWins.addEventListener("click", () => {
  applyServerWins(pendingConflicts);
  saveQuotes(); populateCategories(); showRandomQuote(); hideConflictPanel();
  setStatus("Conflicts resolved: server version applied.", "warn");
});
applyLocalWins.addEventListener("click", () => {
  applyLocalWins(pendingConflicts);
  saveQuotes(); populateCategories(); showRandomQuote(); hideConflictPanel();
  setStatus("Conflicts resolved: local version kept.", "warn");
});
closeConflicts.addEventListener("click", hideConflictPanel);
categoryFilter.addEventListener("change", filterQuotes);

/**********************
 * INIT               *
 **********************/
(function init() {
  loadQuotes();
  loadAutoSyncState();
  const lastSync = localStorage.getItem(LS_LAST_SYNC_KEY) || "";
  setLastSync(lastSync);
  populateCategories();
  showRandomQuote();
  setStatus("Ready.", "ok");
  startAutoSync();
})();
