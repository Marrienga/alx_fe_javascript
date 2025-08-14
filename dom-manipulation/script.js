// Initial quotes array with one unique, human-style quote
let quotes = [
    { text: "The best way to get started is to quit talking and begin doing.", category: "Motivation" },
    { text: "Success is not final, failure is not fatal: It is the courage to continue that counts.", category: "Motivation" },
    { text: "In the middle of every difficulty lies opportunity.", category: "Inspiration" },
    { text: "Life is what happens when you're busy making other plans.", category: "Life" },
    { text: "Your coffee won’t fix the problem, but it might help you survive fixing it.", category: "Humor" } // Custom unique quote
];

// DOM elements
const quoteDisplay = document.getElementById("quoteDisplay");
const newQuoteBtn = document.getElementById("newQuote");
const categorySelect = document.getElementById("categorySelect");
const addQuoteBtn = document.getElementById("addQuoteBtn");
const newQuoteText = document.getElementById("newQuoteText");
const newQuoteCategory = document.getElementById("newQuoteCategory");

// Populate categories dropdown
function populateCategories() {
    let categories = [...new Set(quotes.map(q => q.category))];
    categorySelect.innerHTML = `<option value="all">All Categories</option>`;
    categories.forEach(cat => {
        let option = document.createElement("option");
        option.value = cat;
        option.textContent = cat;
        categorySelect.appendChild(option);
    });
}

// Show random quote
function showRandomQuote() {
    let filteredQuotes = categorySelect.value === "all"
        ? quotes
        : quotes.filter(q => q.category === categorySelect.value);

    if (filteredQuotes.length === 0) {
        quoteDisplay.textContent = "No quotes available for this category.";
        return;
    }

    let randomIndex = Math.floor(Math.random() * filteredQuotes.length);
    quoteDisplay.textContent = `"${filteredQuotes[randomIndex].text}" — [${filteredQuotes[randomIndex].category}]`;
}

// Add new quote
function addQuote() {
    let text = newQuoteText.value.trim();
    let category = newQuoteCategory.value.trim();

    if (text && category) {
        quotes.push({ text, category });
        newQuoteText.value = "";
        newQuoteCategory.value = "";
        populateCategories();
        alert("✅ Quote added successfully!");
    } else {
        alert("⚠️ Please enter both a quote and a category.");
    }
}

// Event listeners
newQuoteBtn.addEventListener("click", showRandomQuote);
addQuoteBtn.addEventListener("click", addQuote);

// Initialize categories
populateCategories();
