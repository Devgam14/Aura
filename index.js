// factory function to select a single element
const selcFun = (select) => document.querySelector(select);
// factory function to select multiple elements
const selcFun1 = (select) => document.querySelectorAll(select);

// dom grabbing
const currList = selcFun(".currList");
const buttons = selcFun1('button[type="submit"]');
const cancelButton = selcFun(".mainc");
const radioInput = selcFun1("input[name='tradingOption']");
const priceDisplay = selcFun1(".price");
const options = selcFun1(".groupSelect");
const searchInput = selcFun("#currListSearch");
const currShow = selcFun("#showcurr");
const convertBtn = selcFun("#cta");
const inputFields = selcFun1('input[type="number"]');

// data stores
let forexDataStore = null;
let cryptoDataStore = null;
let selectedButton = null;
let activeDataSource = [];
let activeMode = 'forex'; // default mode

// helper function to create and append list items
const createListItems = (data, mode) => {
    currShow.innerHTML = "";
    activeDataSource = data;
    data.forEach(item => {
        const lists = document.createElement("li");
        // note: display symbol for crypto, code for forex
        lists.textContent = mode === 'crypto' ? item.symbol : item.Code;
        lists.addEventListener("click", () => handleCurrencySelection(item, mode));
        currShow.appendChild(lists);
    });
};

// handle a currency list item being clicked
const handleCurrencySelection = (item, mode) => {
    if (selectedButton) {
        selectedButton.textContent = mode === 'crypto' ? item.symbol.toUpperCase() : item.Code;
        updatePriceDisplay(item, selectedButton, mode);
        currList.classList.remove("show");
        inputFields.forEach(input => input.value = ''); // clear inputs on selection change
    }
};

// update the price display for the selected currency
const updatePriceDisplay = (item, button, mode) => {
    let price;
    if (mode === 'crypto') {
        price = item.price;
    } else {
        price = item.Rates;
    }
    // note: determine which price display to update based on the button
    const priceIndex = Array.from(buttons).indexOf(button);
    if (priceIndex !== -1) {
        priceDisplay[priceIndex].textContent = `= ${price.toFixed(4)}`;
    }
};

// --- API Calls ---

const cryptoFetch = async () => {
    if (cryptoDataStore) {
        createListItems(cryptoDataStore, 'crypto');
        return;
    }
    const apikey = keys.crypto
    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&x_cg_demo_api_key=${apikey}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error("HTTP error: " + response.status);
        }
        const data = await response.json();
        cryptoDataStore = data.map(coin => ({
            symbol: coin.symbol,
            price: coin.current_price
        }));
        createListItems(cryptoDataStore, 'crypto');
        console.log(data)
    } catch (e) {
        console.error("Could not fetch crypto data:", e);
    }
};

const forexFetch = async () => {
    if (forexDataStore) {
        createListItems(forexDataStore, 'forex');
        return;
    }
    const fxkey = keys.forex
    const url = `https://v6.exchangerate-api.com/v6/${fxkey}/latest/USD`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error("Forex fetch problem: " + response.status);
        }
        const results = await response.json();
        const { conversion_rates } = results;
        forexDataStore = Object.entries(conversion_rates).map(([code, rates]) => ({
            Code: code,
            Rates: rates
        }));
        createListItems(forexDataStore, 'forex');
    } catch (e) {
        console.error("Could not fetch forex data:", e);
    }
};

// --- Event Listeners ---

// button to open the currency list
buttons.forEach(button => {
    button.addEventListener("click", () => {
        currList.classList.add("show");
        selectedButton = button;
        // note: dynamically fetch data based on the active mode when the list is opened
        if (activeMode === 'forex') {
            forexFetch();
        } else {
            cryptoFetch();
        }
    });
});

// adding cancel listener
cancelButton.addEventListener("click", () => {
    currList.classList.remove("show");
});

// custom selectbox logic
options.forEach(option => {
    option.addEventListener("click", () => {
        // note: handle the visual slider and set the active mode
        if (option.textContent === "Forex") {
            activeMode = 'forex';
        } else {
            activeMode = 'crypto';
        }
        // note: reset and fetch new data when the mode changes
        currShow.innerHTML = "";
        inputFields.forEach(input => input.value = '');
        priceDisplay.forEach(display => display.textContent = '= 0.0000');
        buttons[0].textContent = 'Curr';
        buttons[1].textContent = 'Curr';
        // note: fetching happens when a button is clicked, not on mode change
    });
});

// search functionality
searchInput.addEventListener("input", (e) => {
    const searchText = e.target.value.toLowerCase();
    const filteredData = activeDataSource.filter(item => {
        const name = activeMode === 'crypto' ? item.symbol.toLowerCase() : item.Code.toLowerCase();
        return name.includes(searchText);
    });
    // note: only show filtered results
    createListItems(filteredData, activeMode);
});

// conversion logic
inputFields.addEventListener("input", () => {
    const fromInput = inputFields[0].value;
    const fromCurrency = buttons[0].textContent;
    const toCurrency = buttons[1].textContent;

    if (!fromInput || !fromCurrency || fromCurrency === 'Curr' || toCurrency === 'Curr') {
        alert('Please select currencies and enter an amount.');
        return;
    }

    const fromAmount = parseFloat(fromInput);
    if (isNaN(fromAmount)) {
        alert('Please enter a valid number.');
        return;
    }

    let rateFrom, rateTo;

    // note: find the rates based on the active data source
    if (activeMode === 'crypto') {
        rateFrom = cryptoDataStore.find(c => c.symbol.toUpperCase() === fromCurrency).price;
        rateTo = cryptoDataStore.find(c => c.symbol.toUpperCase() === toCurrency).price;
    } else { // forex
        rateFrom = forexDataStore.find(f => f.Code === fromCurrency).Rates;
        rateTo = forexDataStore.find(f => f.Code === toCurrency).Rates;
    }

    if (rateFrom && rateTo) {
        const usdValue = fromAmount / rateFrom;
        const convertedValue = usdValue * rateTo;
        inputFields[1].value = convertedValue.toFixed(4);
    } else {
        alert('Could not find conversion rates for the selected currencies.');
    }
});

// initial call to load forex data by default
forexFetch();
