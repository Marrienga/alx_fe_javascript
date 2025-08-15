// Storage Keys
const LS_QUOTES_KEY = "dqg_quotes";
const LS_FILTER_KEY = "dqg_last_filter";

// Default quotes
let quotes = [
  { text: "The best way to get started is to quit talking and begin doing.", category: "Motivation" },
  { text: "Success is not final, failure is not fatal: It is the courage to continue that counts.", category: "Motivation" },
  { text: "In the middle of every difficulty lies opportunity.", category: "Inspiration" },
  { text: "Life is what happens when you're busy making other plans.", category: "Life" },
  { text: "Your coffee won’t fix the problem, but it might help you survive fixing it.", category: "Humor" }
];

// DOM elements
const quoteDisplay = document.getElementById("quoteDisplay");
const categoryFilter = document.getElementById("categoryFilter");
const newQuoteBtn = document.getElementById("newQuote");
const addQuoteBtn = document.getElementById("addQuoteBtn");
const newQuoteText = document.getElementById("newQuoteText");
const newQuoteCategory = document.getElementById("newQuoteCategory");
const exportBtn = document.getElementById("exportBtn");

// Load quotes from localStorage
function loadQuotes() {
  const stored = localStorage.getItem(LS_QUOTES_KEY);
  if (stored) {
    try {
      quotes = JSON.parse(stored);
    } catch { /* ignore parse errors */ }
  }
}

// Save quotes to localStorage
function saveQuotes() {
  localStorage.setItem(LS_QUOTES_KEY, JSON.stringify(quotes));
}

// Populate filter dropdown
function populateCategories() {
  const categories = [...new Set(quotes.map(q => q.category))].sort();
  categoryFilter.innerHTML = `<option value="all">All Categories</option>`;
  categories.forEach(cat => {
    let opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    categoryFilter.appendChild(opt);
  });

  // Restore last selected filter
  const lastFilter = localStorage.getItem(LS_FILTER_KEY);
  if (lastFilter && [...categoryFilter.options].some(o => o.value === lastFilter)) {
    categoryFilter.value = lastFilter;
  }
}

// Show random quote (filtered)
function showRandomQuote() {
  const filter = categoryFilter.value;
  const filteredQuotes = filter === "all"
    ? quotes
    : quotes.filter(q => q.category === filter);

  if (filteredQuotes.length === 0) {
    quoteDisplay.textContent = "No quotes in this category.";
    return;
  }
  const randomIndex = Math.floor(Math.random() * filteredQuotes.length);
  const q = filteredQuotes[randomIndex];
  quoteDisplay.textContent = `"${q.text}" — [${q.category}]`;
}

// Filter quotes instantly
function filterQuotes() {
  localStorage.setItem(LS_FILTER_KEY, categoryFilter.value);
  showRandomQuote();
}

// Add new quote
function addQuote() {
  const text = newQuoteText.value.trim();
  const category = newQuoteCategory.value.trim();
  if (!text || !category) {
    alert("Please enter both a quote and a category.");
    return;
  }
  quotes.push({ text, category });
  saveQuotes();
  populateCategories();
  newQuoteText.value = "";
  newQuoteCategory.value = "";
  alert("Quote added!");
}

// Export quotes to JSON
function exportQuotes() {
  const json = JSON.stringify(quotes, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "quotes.json";
  a.click();
  URL.revokeObjectURL(url);
}

// Import quotes from JSON file
function importFromJsonFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const imported = JSON.parse(e.target.result);
      if (Array.isArray(imported)) {
        quotes.push(...imported);
        saveQuotes();
        populateCategories();
        alert("Quotes imported!");
      } else {
        alert("Invalid JSON format.");
      }
    } catch {
      alert("Error reading file.");
    }
  };
  reader.readAsText(file);
}

// Event listeners
newQuoteBtn.addEventListener("click", showRandomQuote);
addQuoteBtn.addEventListener("click", addQuote);
exportBtn.addEventListener("click", exportQuotes);

// Init
loadQuotes();
populateCategories();
showRandomQuote();
