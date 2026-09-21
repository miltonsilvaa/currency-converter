(() => {
  "use strict";

  const amountInput = document.getElementById("amount");
  const fromSelect = document.getElementById("fromCurrency");
  const toSelect = document.getElementById("toCurrency");
  const swapBtn = document.getElementById("swapBtn");
  const loadingState = document.getElementById("loadingState");
  const errorState = document.getElementById("errorState");
  const resultValue = document.getElementById("resultValue");
  const rateInfo = document.getElementById("rateInfo");
  const historyList = document.getElementById("historyList");
  const historyEmpty = document.getElementById("historyEmpty");

  const DEFAULT_FROM = "USD";
  const DEFAULT_TO = "BRL";
  const history = [];
  let debounceTimer = null;
  let requestId = 0;

  function formatNumber(value, currency) {
    try {
      return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(value);
    } catch {
      return value.toFixed(2);
    }
  }

  function showLoading() {
    loadingState.hidden = false;
    errorState.hidden = true;
    resultValue.hidden = true;
    rateInfo.hidden = true;
  }

  function showError(message) {
    loadingState.hidden = true;
    errorState.hidden = false;
    errorState.textContent = message;
    resultValue.hidden = true;
    rateInfo.hidden = true;
  }

  function showResult({ amount, from, to, rate, converted }) {
    loadingState.hidden = true;
    errorState.hidden = true;
    resultValue.hidden = false;
    rateInfo.hidden = false;
    resultValue.textContent = `${formatNumber(amount, from)} = ${formatNumber(converted, to)}`;
    rateInfo.textContent = `1 ${from} = ${rate.toFixed(4)} ${to}`;
  }

  async function loadCurrencies() {
    try {
      const res = await fetch("https://api.frankfurter.dev/v1/currencies");
      if (!res.ok) throw new Error("Falha ao carregar lista de moedas.");
      const data = await res.json();
      const entries = Object.entries(data).sort((a, b) => a[0].localeCompare(b[0]));

      [fromSelect, toSelect].forEach((select) => {
        select.innerHTML = "";
        entries.forEach(([code, name]) => {
          const option = document.createElement("option");
          option.value = code;
          option.textContent = `${code} — ${name}`;
          select.appendChild(option);
        });
      });

      fromSelect.value = DEFAULT_FROM;
      toSelect.value = DEFAULT_TO;
      convert();
    } catch (err) {
      showError("Não foi possível carregar a lista de moedas. Verifique sua conexão e recarregue a página.");
    }
  }

  async function convert() {
    const amount = parseFloat(amountInput.value);
    const from = fromSelect.value;
    const to = toSelect.value;

    if (!amount || amount <= 0) {
      showError("Digite um valor maior que zero.");
      return;
    }
    if (from === to) {
      showResult({ amount, from, to, rate: 1, converted: amount });
      return;
    }

    const currentRequest = ++requestId;
    showLoading();
    try {
      const res = await fetch(`https://api.frankfurter.dev/v1/latest?amount=${amount}&from=${from}&to=${to}`);
      if (!res.ok) throw new Error("network");
      const data = await res.json();
      const converted = data.rates[to];
      const rate = converted / amount;

      // Ignora respostas de requisições antigas que chegaram fora de ordem
      if (currentRequest !== requestId) return;

      showResult({ amount, from, to, rate, converted });
      addToHistory({ amount, from, to, converted });
    } catch (err) {
      if (currentRequest !== requestId) return;
      showError("Não foi possível obter a cotação agora. Tente novamente em instantes.");
    }
  }

  function addToHistory(entry) {
    history.unshift({ ...entry, time: new Date() });
    if (history.length > 5) history.pop();
    renderHistory();
  }

  function renderHistory() {
    if (history.length === 0) {
      historyList.innerHTML = "";
      historyList.appendChild(historyEmpty);
      return;
    }
    historyList.innerHTML = history
      .map(
        (item) => `
      <li class="history__item">
        <span>${formatNumber(item.amount, item.from)} → ${formatNumber(item.converted, item.to)}</span>
        <time>${item.time.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</time>
      </li>`
      )
      .join("");
  }

  function debounceConvert() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(convert, 400);
  }

  amountInput.addEventListener("input", debounceConvert);
  fromSelect.addEventListener("change", convert);
  toSelect.addEventListener("change", convert);

  swapBtn.addEventListener("click", () => {
    swapBtn.classList.add("is-spinning");
    setTimeout(() => swapBtn.classList.remove("is-spinning"), 300);
    const temp = fromSelect.value;
    fromSelect.value = toSelect.value;
    toSelect.value = temp;
    convert();
  });

  loadCurrencies();
})();
