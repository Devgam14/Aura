// factory function to select a single element
const sel = (selector) => document.querySelector(selector);
// factory function to select multiple elements
const selAll = (selector) => document.querySelectorAll(selector);

// DOM elements
const currencyList = sel(".currList");
const currencyButtons = selAll('button[type="submit"]');
const cancelButton = sel(".mainc");
const priceDisplays = selAll(".price");
const modeOptions = selAll(".groupSelect");
const searchInput = sel("#currListSearch");
const currencyDisplay = sel("#showcurr");
const inputFields = selAll('input[type="number"]');

// Data stores
let forexData = null;
let cryptoData = null;
let selectedButton = null;
let activeData = [];
let activeMode = 'forex'; // default mode
let defaultCurrencies = {
  forex: { from: 'USD', to: 'EUR' },
  crypto: { from: 'btc', to: 'eth' }
};

// Initialize with default currencies
const initDefaultCurrencies = () => {
  currencyButtons[0].textContent = defaultCurrencies[activeMode].from.toUpperCase();
  currencyButtons[1].textContent = defaultCurrencies[activeMode].to.toUpperCase();
};

// Create and append list items
const renderCurrencyList = (data, mode) => {
  currencyDisplay.innerHTML = "";
  activeData = data;
  
  data.forEach(item => {
    const listItem = document.createElement("li");
    listItem.textContent = mode === 'crypto' ? item.symbol.toUpperCase() : item.Code;
    listItem.addEventListener("click", () => selectCurrency(item, mode));
    currencyDisplay.appendChild(listItem);
  });
};

// Handle currency selection
const selectCurrency = (item, mode) => {
  if (selectedButton) {
    const currencyCode = mode === 'crypto' ? item.symbol.toUpperCase() : item.Code;
    selectedButton.textContent = currencyCode;
    
    // Update default currency for the selected button
    const buttonIndex = Array.from(currencyButtons).indexOf(selectedButton);
    if (buttonIndex === 0) {
      defaultCurrencies[activeMode].from = currencyCode;
    } else {
      defaultCurrencies[activeMode].to = currencyCode;
    }
    
    currencyList.classList.remove("show");
    convert(); // Auto-convert when currency changes
  }
};

// Perform conversion automatically
const convert = () => {
  const fromCurrency = currencyButtons[0].textContent;
  const toCurrency = currencyButtons[1].textContent;
  const inputAmount = parseFloat(inputFields[0].value) || 0;

  if (fromCurrency === 'CURR' || toCurrency === 'CURR') return;

  let rateFrom, rateTo;

  if (activeMode === 'crypto') {
    const fromData = cryptoData.find(c => c.symbol.toUpperCase() === fromCurrency);
    const toData = cryptoData.find(c => c.symbol.toUpperCase() === toCurrency);
    if (!fromData || !toData) return;
    rateFrom = fromData.price;
    rateTo = toData.price;
  } else {
    const fromData = forexData.find(f => f.Code === fromCurrency);
    const toData = forexData.find(f => f.Code === toCurrency);
    if (!fromData || !toData) return;
    rateFrom = fromData.Rates;
    rateTo = toData.Rates;
  }

  if (rateFrom && rateTo) {
    // --- CORRECTED LOGIC START ---
    const usdValue = inputAmount * rateFrom;
    const convertedValue = usdValue / rateTo;
    inputFields[1].value = convertedValue.toFixed(8);
    
    // Update price displays with the correct conversion rates
    priceDisplays[0].textContent = `1 ${fromCurrency} = ${(rateFrom / rateTo).toFixed(6)} ${toCurrency}`;
    priceDisplays[1].textContent = `1 ${toCurrency} = ${(rateTo / rateFrom).toFixed(6)} ${fromCurrency}`;
    // --- CORRECTED LOGIC END ---
  }
};

// API Calls
const fetchCryptoData = async () => {
  if (cryptoData) {
    renderCurrencyList(cryptoData, 'crypto');
    return;
  }
  
  const apikey = keys.crypto;
  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&x_cg_demo_api_key=${apikey}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("HTTP error: " + response.status);
    
    const data = await response.json();
    cryptoData = data.map(coin => ({
      symbol: coin.symbol,
      price: coin.current_price
    }));
    console.log(data)
    renderCurrencyList(cryptoData, 'crypto');
    initDefaultCurrencies();
    convert(); // Initial conversion with defaults
  } catch (e) {
    console.error("Could not fetch crypto data:", e);
  }
};

const fetchForexData = async () => {
  if (forexData) {
    renderCurrencyList(forexData, 'forex');
    return;
  }
  
  const fxkey = keys.forex;
  const url = `https://v6.exchangerate-api.com/v6/${fxkey}/latest/USD`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Forex fetch problem: " + response.status);
    
    const results = await response.json();
    const { conversion_rates } = results;
    forexData = Object.entries(conversion_rates).map(([code, rates]) => ({
      Code: code,
      Rates: rates
    }));
    
    renderCurrencyList(forexData, 'forex');
    initDefaultCurrencies();
    convert(); // Initial conversion with defaults
  } catch (e) {
    console.error("Could not fetch forex data:", e);
  }
};

// Event Listeners
currencyButtons.forEach(button => {
  button.addEventListener("click", () => {
    currencyList.classList.add("show");
    selectedButton = button;
    activeMode === 'forex' ? fetchForexData() : fetchCryptoData();
  });
});

cancelButton.addEventListener("click", () => {
  currencyList.classList.remove("show");
});

modeOptions.forEach(option => {
  option.addEventListener("click", () => {
    activeMode = option.textContent === "Forex" ? 'forex' : 'crypto';
    currencyDisplay.innerHTML = "";
    inputFields[0].value = '';
    inputFields[1].value = '';
    initDefaultCurrencies();
    activeMode === 'forex' ? fetchForexData() : fetchCryptoData();
  });
});

searchInput.addEventListener("input", (e) => {
  const searchTerm = e.target.value.toLowerCase();
  const filteredData = activeData.filter(item => {
    const name = activeMode === 'crypto' 
      ? item.symbol.toLowerCase() 
      : item.Code.toLowerCase();
    return name.includes(searchTerm);
  });
  renderCurrencyList(filteredData, activeMode);
});

// Auto-convert on input change
inputFields[0].addEventListener("input", convert);

// Initialize
fetchForexData();
