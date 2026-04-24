const EXCHANGE_RATES = {
    GBP: 1,
    USD: 1.27,
    EUR: 1.18,
    AUD: 1.96,
    JPY: 192,
};

//list of exchange rates cmp to the pound

const DEFAULT_CURRENCY = "GBP";
const STORAGE_KEY = "currency";
// defult currecy if user doesnt chooose a currency

function getSelectedCurrency() {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_CURRENCY;
}
//get the currency the user choose and if fail then gbp

function setSelectedCurrency(currencyCode) {
    localStorage.setItem(STORAGE_KEY, currencyCode);
}
//allows the user to change and set the currency

function formatAmount(amountInGBP) {
    const currency = getSelectedCurrency();
    const rate = EXCHANGE_RATES[currency];
    const convertedAmount = amountInGBP * rate;

    //converts price into new currency

    //Used AI GPT 5 FOR HELP WITH BELOW
    const formatter = new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: currency,
    });
    return formatter.format(convertedAmount);
    // Formats the currency
}