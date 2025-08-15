// ===== Keys for storage =====
const LS_QUOTES_KEY = "dqg_quotes_v1";
const SS_LAST_QUOTE_KEY = "dqg_last_quote_v1";
const SS_SELECTED_CATEGORY_KEY = "dqg_selected_category_v1";

// ===== Default quotes (used if nothing in Local Storage) =====
let quotes = [
  { text: "The best way to get started is to quit talking and begin doing.", category: "Motivation" },
  { text: "Success is not final, failure is not fatal: It is the courage to continue that counts.", category: "Motivation" },
  { text: "In the middle of every difficulty lies opportunity.", category: "Inspiration" },
  { text: "Life is what happens when you're busy making other plans.", category: "Life" },
  // Unique human-style quote
  { text: "Your coffee won’t fix the problem, but it might help you survive fixing it.", category: "Humor" }
];

// ===== DOM elements =====
const quoteDisplay = document.getElementById("quoteDisplay");
const sessionInfo = document.getElementById("sessionInfo");
const newQuoteBtn = document.getElementById("newQuote");
const categorySelect = document.getElementById("categorySelect");
const addQuoteBtn = document.getElementById("addQuoteBtn");
const newQuoteText = document.getElementById("newQuoteText");
const newQuoteCategory = document.getElementById("newQuoteCategory");
const exportBtn = document.getElementById("exportBtn");
const downloadLink = document.getElementById("downloadLink");
const clearAllBtn = document.getElementById("clearAllBtn");

// ===== Storage helpers =====
function saveQuotes() {
  try {
    localStorage.setItem(LS_QUOTES_KEY, JSON.stringify(quotes));
  } catch (e) {
    alert("Could not save quotes to Local Storage.");
  }
}

function loadQuotes() {
  try {
    const raw = localStorage.getItem(LS_QUOTES_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    // Validate minimal structure
    if (Array.isArray(parsed)) {
      quotes = parsed.filter(isValidQuote);
    }
  } catch {
    // If parsing fails, ignore and keep defaults
  }
}

function saveSessionLastQuote(q) {
  try {
    sessionStorage.setItem(
      SS_LAST_QUOTE_KEY,
      JSON.stringify({ ...q, timestamp: Date.now() })
    );
  } catch { /* ignore */ }
}

function getSessionLastQuote() {
  try {
    const raw = sessionStorage.getItem(SS_LAST_QUOTE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveSelectedCategoryToSession() {
  try {
    sessionStorage.setItem(SS_SELECTED_CATEGORY_KEY, categorySelect.value);
  } catch { /* ignore */ }
}

function getSelectedCategoryFromSession() {
  try {
    return sessionStorage.getItem(SS_SELECTED_CATEGORY_KEY);
  } catch {
    return null;
  }
}

// ===== Utilities =====
function isValidQuote(q) {
  return q && typeof q.text === "string" && q.text.trim() !== "" &&
         typeof q.category === "string" && q.category.trim() !== "";
}

function uniqueKeyForQuote(q) {
  return `${q.text.trim().toLowerCase()}|||${q.category.trim().toLowerCase()}`;
}

function populateCategories() {
  const categories = [...new Set(quotes.map(q => q.category.trim()))].sort((a, b) =>
    a.localeCompare(b)
  );
  categorySelect.innerHTML = `<option value="all">All Categories</option>`;
  for (const cat of categories) {
    const option = document.createElement("option");
    option.value = cat;
    option.textContent = cat;
    categorySelect.appendChild(option);
  }

  // Restore session category preference if available
  const pref = getSelectedCategoryFromSession();
  if (pref && [...categorySelect.options].some(o => o.value === pref)) {
    categorySelect.value = pref;
  }
}

function showRandomQuote() {
  const currentCategory = categorySelect.value;
  const pool = currentCategory === "all"
    ? quotes
    : quotes.filter(q => q.category === currentCategory);

  if (pool.length === 0) {
    quoteDisplay.textContent = "No quotes available for this category.";
    return;
  }

  const randomIndex = Math.floor(Math.random() * pool.length);
  const q = pool[randomIndex];
  quoteDisplay.textContent = `"${q.text}" — [${q.category}]`;
  saveSessionLastQuote(q);
  sessionInfo.textContent = "Shown: last quote saved for this session.";
}

function addQuote() {
  const text = newQuoteText.value.trim();
  const category = newQuoteCategory.value.trim();
  if (!text || !category) {
    alert("⚠️ Please enter both a quote and a category.");
    return;
  }

  const newQ = { text, category };
  if (!isValidQuote(newQ)) {
    alert("Invalid quote format.");
    return;
  }

  // Optional dedupe: avoid exact duplicates (text + category)
  const existingKeys = new Set(quotes.map(uniqueKeyForQuote));
  if (existingKeys.has(uniqueKeyForQuote(newQ))) {
    alert("That quote already exists in this category.");
    return;
  }

  quotes.push(newQ);
  saveQuotes();
  populateCategories();
  newQuoteText.value = "";
  newQuoteCategory.value = "";
  alert("✅ Quote added and saved!");
}

function exportToJson() {
  const json = JSON.stringify(quotes, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const fileName = `quotes-${new Date().toISOString().slice(0,10)}.json`;

  downloadLink.href = url;
  downloadLink.download = fileName;
  downloadLink.style.display = "inline";
  downloadLink.textContent = `Download ${fileName}`;
  // Optionally auto-click:
  downloadLink.click();

  // Revoke URL later to free memory
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

// Accepts either a plain array of quotes or an object with {quotes: [...]}
function normalizeImported(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.quotes)) return data.quotes;
  return [];
}

function mergeQuotes(importedList) {
  const valid = importedList.filter(isValidQuote);
  if (valid.length === 0) return { added: 0, skipped: importedList.length };

  const before = quotes.length;
  const existing = new Set(quotes.map(uniqueKeyForQuote));
  for (const q of valid) {
    const key = uniqueKeyForQuote(q);
    if (!existing.has(key)) {
      quotes.push({ text: q.text.trim(), category: q.category.trim() });
      existing.add(key);
    }
  }
  const added = quotes.length - before;
  return { added, skipped: importedList.length - added };
}

// Exposed for inline onchange in HTML
window.importFromJsonFile = function importFromJsonFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      const list = normalizeImported(data);
      const { added, skipped } = mergeQuotes(list);
      saveQuotes();
      populateCategories();
      alert(`Quotes imported successfully! ✅ Added: ${added}, Skipped: ${skipped}`);
    } catch (err) {
      alert("Failed to import: Invalid JSON.");
    } finally {
      // reset the input so the same file can be chosen again if needed
      event.target.value = "";
    }
  };
  reader.readAsText(file);
};

function clearSavedData() {
  localStorage.removeItem(LS_QUOTES_KEY);
  alert("Saved quotes cleared from Local Storage. Current session still has quotes in memory.");
}

// ===== Event listeners =====
newQuoteBtn.addEventListener("click", showRandomQuote);
addQuoteBtn.addEventListener("click", addQuote);
exportBtn.addEventListener("click", exportToJson);
clearAllBtn.addEventListener("click", clearSavedData);
categorySelect.addEventListener("change", saveSelectedCategoryToSession);

// ===== Init =====
(function init() {
  loadQuotes();
  populateCategories();

  // Restore last viewed quote (session storage)
  const last = getSessionLastQuote();
  if (last && isValidQuote(last)) {
    quoteDisplay.textContent = `"${last.text}" — [${last.category}]`;
    sessionInfo.textContent = "Restored: last viewed quote (this session).";
  } else {
    sessionInfo.textContent = "";
  }

  // If we stored category pref, ensure it's synced to session on init
  saveSelectedCategoryToSession();
})();
