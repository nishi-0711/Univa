// Unit Definitions
const units = {
    length: {
        base: 'm',
        rates: {
            m: 1,
            km: 0.001,
            cm: 100,
            mm: 1000,
            in: 39.3701,
            ft: 3.28084,
            yd: 1.09361,
            mi: 0.000621371
        },
        labels: {
            m: 'Meters',
            km: 'Kilometers',
            cm: 'Centimeters',
            mm: 'Millimeters',
            in: 'Inches',
            ft: 'Feet',
            yd: 'Yards',
            mi: 'Miles'
        }
    },
    weight: {
        base: 'kg',
        rates: {
            kg: 1,
            g: 1000,
            mg: 1000000,
            lb: 2.20462,
            oz: 35.274,
            st: 0.157473
        },
        labels: {
            kg: 'Kilograms',
            g: 'Grams',
            mg: 'Milligrams',
            lb: 'Pounds',
            oz: 'Ounces',
            st: 'Stone'
        }
    },
    temperature: {
        // Temperature is special, handled separately
        types: ['c', 'f', 'k'],
        labels: {
            c: 'Celsius',
            f: 'Fahrenheit',
            k: 'Kelvin'
        }
    },
    area: {
        base: 'sqm',
        rates: {
            sqm: 1,
            sqkm: 0.000001,
            sqft: 10.7639,
            sqin: 1550,
            ac: 0.000247105,
            ha: 0.0001
        },
        labels: {
            sqm: 'Square Meters',
            sqkm: 'Square Kilometers',
            sqft: 'Square Feet',
            sqin: 'Square Inches',
            ac: 'Acres',
            ha: 'Hectares'
        }
    },
    time: {
        base: 's',
        rates: {
            s: 1,
            min: 60,
            h: 3600,
            d: 86400,
            wk: 604800,
            mo: 2628000, // Approx
            y: 31536000
        },
        labels: {
            s: 'Seconds',
            min: 'Minutes',
            h: 'Hours',
            d: 'Days',
            wk: 'Weeks',
            mo: 'Months',
            y: 'Years'
        }
    },
    currency: {
        base: 'usd',
        rates: {
            usd: 1,
            eur: 0.92,
            gbp: 0.79,
            jpy: 151.5,
            inr: 83.5,
            cad: 1.36,
            aud: 1.52,
            cny: 7.23
        },
        labels: {
            usd: 'US Dollar ($)',
            eur: 'Euro (€)',
            gbp: 'British Pound (£)',
            jpy: 'Japanese Yen (¥)',
            inr: 'Indian Rupee (₹)',
            cad: 'Canadian Dollar (C$)',
            aud: 'Australian Dollar (A$)',
            cny: 'Chinese Yuan (¥)'
        }
    }
};

// State
let currentCategory = 'length';
let history = JSON.parse(localStorage.getItem('conversionHistory')) || [];
let isMultiView = false;

// DOM Elements
const themeToggle = document.getElementById('theme-toggle');
const navBtns = document.querySelectorAll('.nav-btn');
const currentCategoryTitle = document.getElementById('current-category-title');
const fromInput = document.getElementById('from-value');
const toInput = document.getElementById('to-value');
const fromUnitSelect = document.getElementById('from-unit');
const toUnitSelect = document.getElementById('to-unit');
const swapBtn = document.getElementById('swap-btn');
const historyList = document.getElementById('history-list');
const clearHistoryBtn = document.getElementById('clear-history');
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const sidebar = document.querySelector('.sidebar');

// Multi-View Elements
const toggleBtns = document.querySelectorAll('.toggle-btn');
const singleViewContainer = document.getElementById('single-view-container');
const multiViewContainer = document.getElementById('multi-view-container');
const multiResultsGrid = document.getElementById('multi-results-grid');
const rateInfo = document.getElementById('rate-last-updated');

// Create overlay element dynamically
const overlay = document.createElement('div');
overlay.className = 'sidebar-overlay';
document.body.appendChild(overlay);

// Initialization
function init() {
    loadTheme();
    fetchCurrencyRates(); // Fetch rates on startup
    populateUnits(currentCategory);
    renderHistory();
    updateCategoryTitle(currentCategory);

    // Event Listeners
    if (themeToggle) themeToggle.addEventListener('click', toggleTheme);

    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            switchCategory(btn.dataset.category);
            // Close sidebar on mobile/tablet when item clicked
            if (window.innerWidth <= 1024) {
                closeSidebar();
            }
        });
    });

    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', toggleSidebar);
    }

    overlay.addEventListener('click', closeSidebar);

    if (fromInput) fromInput.addEventListener('input', handleConversion);
    if (fromUnitSelect) fromUnitSelect.addEventListener('change', handleConversion);
    if (toUnitSelect) toUnitSelect.addEventListener('change', handleConversion);

    if (swapBtn) swapBtn.addEventListener('click', swapUnits);
    if (clearHistoryBtn) clearHistoryBtn.addEventListener('click', clearHistory);

    // View Toggle Listeners
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.view;
            switchView(view);
        });
    });

    // Initial conversion
    handleConversion();
}

function toggleSidebar() {
    if (!sidebar) return;
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
}

function closeSidebar() {
    if (!sidebar) return;
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
}

// Theme Logic
function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    if (!themeToggle) return;
    const icon = themeToggle.querySelector('i');
    const text = themeToggle.querySelector('span');

    if (theme === 'dark') {
        if (icon) icon.className = 'fa-solid fa-sun';
        if (text) text.textContent = 'Light Mode';
    } else {
        if (icon) icon.className = 'fa-solid fa-moon';
        if (text) text.textContent = 'Dark Mode';
    }
}

// Category Logic
function switchCategory(category) {
    currentCategory = category;
    updateCategoryTitle(category);

    // Update input constraints
    if (category === 'temperature') {
        fromInput.removeAttribute('min');
    } else {
        fromInput.setAttribute('min', '0');
    }

    // Update tabs
    navBtns.forEach(btn => {
        if (btn.dataset.category === category) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    populateUnits(category);
    handleConversion();
}

function updateCategoryTitle(category) {
    if (currentCategoryTitle) {
        currentCategoryTitle.textContent = category.charAt(0).toUpperCase() + category.slice(1) + ' Converter';
    }

    // Show/Hide rate info
    if (category === 'currency' && rateInfo) {
        rateInfo.classList.remove('hidden');
    } else if (rateInfo) {
        rateInfo.classList.add('hidden');
    }
}

function populateUnits(category) {
    const unitData = units[category];
    const keys = category === 'temperature' ? unitData.types : Object.keys(unitData.rates);

    // Save current selections if possible, otherwise default
    const currentFrom = fromUnitSelect ? fromUnitSelect.value : null;
    const currentTo = toUnitSelect ? toUnitSelect.value : null;

    if (fromUnitSelect) fromUnitSelect.innerHTML = '';
    if (toUnitSelect) toUnitSelect.innerHTML = '';

    keys.forEach(key => {
        const label = unitData.labels[key];
        if (fromUnitSelect) fromUnitSelect.add(new Option(label, key));
        if (toUnitSelect) toUnitSelect.add(new Option(label, key));
    });

    // Set defaults (first and second item usually)
    if (fromUnitSelect) fromUnitSelect.selectedIndex = 0;
    if (toUnitSelect) toUnitSelect.selectedIndex = 1;

    // If in multi-view, re-render results
    if (isMultiView) {
        handleConversion();
    }
}

// Conversion Logic

function handleConversion() {
    let val = parseFloat(fromInput.value);
    if (isNaN(val)) {
        if (isMultiView) {
            renderMultiResults(null);
        } else if (toInput) {
            toInput.value = '';
        }
        return;
    }

    // Prevent negative values for non-temperature categories
    if (currentCategory !== 'temperature' && val < 0) {
        val = Math.abs(val);
        fromInput.value = val;
    }

    const fromUnit = fromUnitSelect.value;

    if (isMultiView) {
        renderMultiResults(val, fromUnit);
        return;
    }

    const toUnit = toUnitSelect.value;
    let result;

    if (currentCategory === 'temperature') {
        result = convertTemperature(val, fromUnit, toUnit);
    } else if (currentCategory === 'time') {
        result = convertTime(val, fromUnit, toUnit);
    } else {
        result = convertStandard(val, fromUnit, toUnit, currentCategory);
    }

    // Format result to avoid long decimals but keep precision
    const formattedResult = parseFloat(result.toFixed(6));
    if (toInput) toInput.value = formattedResult;

    // Debounce history save
    addToHistory(val, fromUnit, formattedResult, toUnit);
}

function convertStandard(value, from, to, category) {
    const rates = units[category].rates;
    const baseValue = value / rates[from];
    return baseValue * rates[to];
}

function convertTime(value, from, to) {
    const rates = units.time.rates;
    // Time rates are defined as "Seconds per Unit" (e.g., min: 60)
    // Standard logic expects "Units per Base" (e.g., cm: 100)
    // So we use different logic here:
    const baseValue = value * rates[from]; // Convert to seconds
    return baseValue / rates[to]; // Convert to target
}

function convertTemperature(value, from, to) {
    if (from === to) return value;

    // Convert to Celsius first
    let celsius;
    if (from === 'c') celsius = value;
    else if (from === 'f') celsius = (value - 32) * 5 / 9;
    else if (from === 'k') celsius = value - 273.15;

    // Convert from Celsius to target
    if (to === 'c') return celsius;
    if (to === 'f') return (celsius * 9 / 5) + 32;
    if (to === 'k') return celsius + 273.15;
}

function swapUnits() {
    const temp = fromUnitSelect.value;
    fromUnitSelect.value = toUnitSelect.value;
    toUnitSelect.value = temp;
    handleConversion();
}

function switchView(view) {
    isMultiView = view === 'multi';

    // Update buttons
    toggleBtns.forEach(btn => {
        if (btn.dataset.view === view) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Toggle containers
    if (isMultiView) {
        singleViewContainer.classList.add('hidden');
        multiViewContainer.classList.remove('hidden');
    } else {
        singleViewContainer.classList.remove('hidden');
        multiViewContainer.classList.add('hidden');
    }

    handleConversion();
}

function renderMultiResults(val, fromUnit) {
    multiResultsGrid.innerHTML = '';

    if (val === null) return;

    const unitData = units[currentCategory];
    const keys = currentCategory === 'temperature' ? unitData.types : Object.keys(unitData.rates);

    keys.forEach(toUnit => {
        let result;
        if (currentCategory === 'temperature') {
            result = convertTemperature(val, fromUnit, toUnit);
        } else if (currentCategory === 'time') {
            result = convertTime(val, fromUnit, toUnit);
        } else {
            result = convertStandard(val, fromUnit, toUnit, currentCategory);
        }

        const formattedResult = parseFloat(result.toFixed(6));
        const label = unitData.labels[toUnit];
        const isSource = fromUnit === toUnit;

        const card = document.createElement('div');
        card.className = `result-card ${isSource ? 'highlighted' : ''}`;
        card.innerHTML = `
            <span class="unit-label">${label}</span>
            <span class="result-value">${formattedResult}</span>
        `;

        multiResultsGrid.appendChild(card);
    });
}

// History Logic
let historyTimeout;
function addToHistory(valIn, unitIn, valOut, unitOut) {
    clearTimeout(historyTimeout);
    historyTimeout = setTimeout(() => {
        const item = {
            valIn,
            // store readable unit labels (keep compatibility with existing saved items)
            unitIn: units[currentCategory].labels[unitIn] || unitIn,
            valOut,
            unitOut: units[currentCategory].labels[unitOut] || unitOut,
            date: new Date().toLocaleString(),
            // Save category metadata so history item shows which category it came from
            category: currentCategory,
            categoryLabel: currentCategory.charAt(0).toUpperCase() + currentCategory.slice(1)
        };

        // Add to beginning, limit to 20 items
        history.unshift(item);
        if (history.length > 20) history.pop();

        localStorage.setItem('conversionHistory', JSON.stringify(history));
        renderHistory();
    }, 1500); // Wait 1.5s after typing stops to save history
}

function renderHistory() {
    if (!historyList) return;
    historyList.innerHTML = '';

    if (history.length === 0) {
        historyList.innerHTML = '<li class="empty-state">No conversion history yet</li>';
        return;
    }

    history.forEach(item => {
        const li = document.createElement('li');
        li.className = 'history-item';

        // Backwards compatibility: compute a label if older items don't have category/categoryLabel
        const categoryLabel = item.categoryLabel || (item.category ? (item.category.charAt(0).toUpperCase() + item.category.slice(1)) : '');

        // Keep layout same as before, add a small category label on the top-right
        li.innerHTML = `
            <div class="history-details" style="position:relative; padding-right:6rem;">
                <span class="history-conversion">${item.valIn} ${item.unitIn} = ${item.valOut} ${item.unitOut}</span>
                <span class="history-date">${item.date}</span>
                <span class="history-category" style="position:absolute; right:8px; top:8px; font-size:0.85rem; opacity:0.85;">${categoryLabel}</span>
            </div>
        `;
        historyList.appendChild(li);
    });
}

function clearHistory() {
    history = [];
    localStorage.removeItem('conversionHistory');
    renderHistory();
}

// Currency API Logic
async function fetchCurrencyRates() {
    const CACHE_KEY = 'currencyRates';
    const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

    // Check cache
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
        try {
            const { rates, timestamp } = JSON.parse(cached);
            const age = Date.now() - timestamp;

            if (age < CACHE_DURATION) {
                updateCurrencyRates(rates, timestamp);
                return;
            }
        } catch (e) {
            // ignore parse errors and fetch fresh
        }
    }

    // Fetch new rates
    try {
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        if (!response.ok) throw new Error('Network response was not ok');

        const data = await response.json();
        const timestamp = Date.now();

        // Save to cache
        localStorage.setItem(CACHE_KEY, JSON.stringify({
            rates: data.rates,
            timestamp: timestamp
        }));

        updateCurrencyRates(data.rates, timestamp);

    } catch (error) {
        console.error('Failed to fetch currency rates:', error);
        // Fallback to hardcoded rates (already in units object)
        if (rateInfo) {
            rateInfo.textContent = 'Using offline rates';
            rateInfo.classList.remove('hidden');
        }
    }
}

function updateCurrencyRates(apiRates, timestamp) {
    // Map API keys to our internal keys (lowercase)
    // The API returns uppercase keys (USD, EUR), we use lowercase (usd, eur)

    const newRates = {};
    const availableKeys = Object.keys(units.currency.rates); // Keep only supported currencies

    availableKeys.forEach(key => {
        const upperKey = key.toUpperCase();
        if (apiRates[upperKey]) {
            newRates[key] = apiRates[upperKey];
        } else {
            // Keep hardcoded if missing from API
            newRates[key] = units.currency.rates[key];
        }
    });

    // Update the global units object
    units.currency.rates = newRates;

    // Update UI timestamp
    if (rateInfo) {
        const date = new Date(timestamp);
        rateInfo.textContent = `Rates updated: ${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }

    // Refresh if currently on currency tab
    if (currentCategory === 'currency') {
        handleConversion();
    }
}

// Start
init();
