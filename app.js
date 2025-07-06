// app.js – logika kalkulatora materiału siewnego z poprawioną logiką zaokrągleń
(() => {
  const crops = window.CROPS_DATA.crops;

  // ---------- Referencje DOM ----------
  const cropSelect   = document.getElementById('cropSelect');
  const unitField    = document.getElementById('unitField');
  const unitRadios   = document.querySelectorAll('input[name="unit"]');
  const modeRadios   = document.querySelectorAll('input[name="mode"]');
  const valueLabel   = document.getElementById('valueLabel');
  const valueInput   = document.getElementById('valueInput');
  const form         = document.getElementById('calcForm');
  const resetBtn     = document.getElementById('resetBtn');
  const resultCard   = document.getElementById('resultCard');
  const resultBox    = document.getElementById('resultContent');
  const historyList  = document.getElementById('history');
  const themeToggle  = document.getElementById('themeToggle');
  // quick calc
  const quickA       = document.getElementById('quickA');
  const quickB       = document.getElementById('quickB');
  const btnAdd       = document.getElementById('btnAdd');
  const btnSub       = document.getElementById('btnSub');
  const quickResult  = document.getElementById('quickResult');

  // ---------- State ----------
  const history = []; // przechowuje maks. 5 wyników (ostatni na górze)

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    populateCropSelect();
    bindEvents();
    updateUnitVisibility();
    updateValueLabel();
    renderHistory();
    // Initialize theme
    initTheme();
  }

  // --------- Inicjalizacja selecta ---------
  function populateCropSelect() {
    const frag = document.createDocumentFragment();
    crops.forEach(crop => {
      const opt = document.createElement('option');
      opt.value = crop.id;
      opt.textContent = crop.label_pl;
      frag.appendChild(opt);
    });
    cropSelect.appendChild(frag);
  }

  // ---------- Eventy ----------
  function bindEvents() {
    cropSelect.addEventListener('change', () => {
      updateUnitVisibility();
      updateValueLabel();
      hideResult();
    });

    unitRadios.forEach(r => r.addEventListener('change', () => {
      updateValueLabel();
      hideResult();
    }));

    modeRadios.forEach(r => r.addEventListener('change', () => {
      updateValueLabel();
      hideResult();
    }));

    form.addEventListener('submit', onFormSubmit);
    resetBtn.addEventListener('click', resetForm);

    // quick calc
    btnAdd.addEventListener('click', () => quickCalc('+'));
    btnSub.addEventListener('click', () => quickCalc('-'));

    // theme
    themeToggle.addEventListener('click', toggleTheme);
  }

  // ---------- UI helpers ----------
  function getSelectedCrop() {
    return crops.find(c => c.id === cropSelect.value) || null;
  }

  function updateUnitVisibility() {
    const crop = getSelectedCrop();
    if (crop && crop.has_seed_units) {
      unitField.classList.remove('hidden');
    } else {
      unitField.classList.add('hidden');
      document.querySelector('input[name="unit"][value="kg"]').checked = true;
    }
  }

  function updateValueLabel() {
    const mode = document.querySelector('input[name="mode"]:checked').value;
    const unit = document.querySelector('input[name="unit"]:checked').value;
    if (mode === 'materialToArea') {
      valueLabel.textContent = `Podaj ilość materiału (${unit})`;
      valueInput.placeholder = unit === 'kg' ? 'np. 1000' : 'np. 10';
    } else {
      valueLabel.textContent = 'Podaj powierzchnię (ha)';
      valueInput.placeholder = 'np. 5';
    }
  }

  function resetForm() {
    form.reset();
    cropSelect.value = '';
    updateUnitVisibility();
    updateValueLabel();
    hideResult();
    valueInput.focus();
  }

  function hideResult() {
    resultCard.classList.add('hidden');
    resultBox.innerHTML = '';
  }

  // ---------- Main calculation with corrected rounding logic ----------
  function onFormSubmit(e) {
    e.preventDefault();

    const crop = getSelectedCrop();
    if (!crop) {
      showError('Wybierz gatunek / typ.');
      return;
    }

    const mode = document.querySelector('input[name="mode"]:checked').value;
    const unit = document.querySelector('input[name="unit"]:checked').value;

    const rawVal = valueInput.value.trim().replace(',', '.');
    const numericVal = parseFloat(rawVal);
    if (!numericVal || numericVal <= 0) {
      showError('Podaj dodatnią liczbę.');
      return;
    }

    const norm = unit === 'kg' ? crop.norm_kg_per_ha : crop.norm_js_per_ha;
    if (unit === 'js' && (norm === undefined || norm === null)) {
      showError('Dla wybranego gatunku brak normy w jednostkach siewnych.');
      return;
    }

    let resultVal, resultUnit;

    if (mode === 'materialToArea') {
      // Materiał → Powierzchnia: ZAOKRĄGLENIE NORMALNE (Math.round)
      const areaRaw = numericVal / norm;
      resultVal = Math.round(areaRaw * 100) / 100; // 2 d.p. round
      resultUnit = 'ha';
    } else { 
      // Powierzchnia → Materiał: ZAOKRĄGLENIE W DÓŁ (Math.floor)
      const materialRaw = numericVal * norm;
      if (unit === 'kg') {
        resultVal = Math.floor(materialRaw); // floor to integer kg
        resultUnit = 'kg';
      } else {
        resultVal = Math.floor(materialRaw * 100) / 100; // floor to 2 d.p.
        resultUnit = 'j.s.';
      }
    }

    const normText = unit === 'kg' 
      ? `${formatNumber(norm, 0)} kg/ha` 
      : `${formatNumber(norm, 2)} j.s./ha`;

    const resultHTML = `
      <h2>Wynik</h2>
      <p class="result-value">${formatNumber(resultVal, resultUnit === 'ha' ? 2 : (resultUnit === 'j.s.' ? 2 : 0))} ${resultUnit}</p>
      <p>Zastosowana norma: ${normText}</p>
    `;

    showSuccess(resultHTML);

    // Update history
    const cropLabel = crop.label_pl;
    const inputText = `${numericVal} ${mode === 'materialToArea' ? unit : 'ha'}`;
    const outputText = `${formatNumber(resultVal, resultUnit === 'ha' ? 2 : (resultUnit === 'j.s.' ? 2 : 0))} ${resultUnit}`;
    const timestamp = new Date().toLocaleTimeString('pl-PL', {hour: '2-digit', minute: '2-digit'});
    const historyLine = `${timestamp}: ${cropLabel.split(' – ')[0]} | ${inputText} → ${outputText}`;
    
    history.unshift(historyLine);
    if (history.length > 5) history.pop();
    renderHistory();
  }

  function formatNumber(num, dec) {
    return num.toLocaleString('pl-PL', {
      minimumFractionDigits: dec,
      maximumFractionDigits: dec,
    });
  }

  function showError(msg) {
    resultBox.innerHTML = `<div class="status status--error">${msg}</div>`;
    resultCard.classList.remove('hidden');
  }

  function showSuccess(html) {
    resultBox.innerHTML = html;
    resultCard.classList.remove('hidden');
    resultCard.scrollIntoView({ behavior: 'smooth' });
  }

  // ---------- Historia ----------
  function renderHistory() {
    historyList.innerHTML = '';
    if (history.length === 0) {
      const li = document.createElement('li');
      li.textContent = 'Brak obliczeń';
      li.style.fontStyle = 'italic';
      li.style.color = 'var(--color-text-secondary)';
      historyList.appendChild(li);
    } else {
      history.forEach(line => {
        const li = document.createElement('li');
        li.textContent = line;
        historyList.appendChild(li);
      });
    }
  }

  // ---------- Mini kalkulator ----------
  function quickCalc(op) {
    const aVal = parseFloat(quickA.value.replace(',', '.')) || 0;
    const bVal = parseFloat(quickB.value.replace(',', '.')) || 0;

    const res = op === '+' ? aVal + bVal : aVal - bVal;
    quickResult.textContent = `Wynik: ${res.toFixed(2).replace('.', ',')}`;
  }

  // ---------- Theme toggle ----------
  function initTheme() {
    // Check if user prefers dark mode
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      themeToggle.textContent = '☀️';
      themeToggle.setAttribute('aria-label', 'Wyłącz tryb ciemny');
    } else {
      themeToggle.textContent = '🌙';
      themeToggle.setAttribute('aria-label', 'Włącz tryb ciemny');
    }
  }

  function toggleTheme() {
    const root = document.documentElement;
    const currentTheme = root.getAttribute('data-color-scheme');
    
    if (currentTheme === 'dark') {
      root.setAttribute('data-color-scheme', 'light');
      themeToggle.textContent = '🌙';
      themeToggle.setAttribute('aria-label', 'Włącz tryb ciemny');
    } else {
      root.setAttribute('data-color-scheme', 'dark');
      themeToggle.textContent = '☀️';
      themeToggle.setAttribute('aria-label', 'Wyłącz tryb ciemny');
    }
  }
})();