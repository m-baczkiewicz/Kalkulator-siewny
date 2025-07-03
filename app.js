// app.js – logika kalkulatora materiału siewnego + historia + mini-kalkulator
(() => {
  const crops = window.APP_DATA.crops;

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
  }

  // --------- Inicjalizacja selecta ---------
  function populateCropSelect() {
    const frag = document.createDocumentFragment();
    crops.forEach((crop, idx) => {
      const opt = document.createElement('option');
      opt.value = idx.toString();
      opt.textContent = crop.label;
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
    const idx = parseInt(cropSelect.value, 10);
    if (isNaN(idx)) return null;
    return crops[idx];
  }

  function updateUnitVisibility() {
    const crop = getSelectedCrop();
    if (crop && crop.units === true) {
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

  // ---------- Main calculation ----------
  function onFormSubmit(e) {
    e.preventDefault();

    const crop = getSelectedCrop();
    if (!crop) {
      alert('Wybierz gatunek / typ.');
      return;
    }

    const mode = document.querySelector('input[name="mode"]:checked').value;
    const unit = document.querySelector('input[name="unit"]:checked').value;

    const rawVal = valueInput.value.trim().replace(',', '.');
    const numericVal = parseFloat(rawVal);
    if (!numericVal || numericVal <= 0) {
      alert('Podaj dodatnią liczbę.');
      return;
    }

    const norm = unit === 'kg' ? crop.kg_per_ha : crop.js_per_ha;
    if (unit === 'js' && (norm === undefined || norm === null)) {
      alert('Dla wybranego gatunku brak normy w jednostkach siewnych.');
      return;
    }

    let resultVal, resultUnit;

    if (mode === 'materialToArea') {
      const areaRaw = numericVal / norm;
      resultVal = Math.floor(areaRaw * 100) / 100; // 2 dp floor
      resultUnit = 'ha';
    } else { // areaToMaterial
      const materialRaw = numericVal * norm;
      if (unit === 'kg') {
        resultVal = Math.floor(materialRaw); // pełne kg
        resultUnit = 'kg';
      } else {
        resultVal = Math.floor(materialRaw * 100) / 100; // 2 dp
        resultUnit = 'j.s.';
      }
    }

    const normText = unit === 'kg' ? `${formatNumber(norm, 0)} kg/ha` : `${formatNumber(norm, 2)} j.s./ha`;

    const html = `
      <h2>Wynik</h2>
      <p class="result-value">${formatNumber(resultVal, resultUnit === 'ha' ? 2 : (resultUnit === 'j.s.' ? 2 : 0))} ${resultUnit}</p>
      <p>Zastosowana norma: ${normText}</p>
      <p class="text-sm mt-8">Wartości zaokrąglone w dół zgodnie z rozporządzeniem.</p>
    `;

    resultBox.innerHTML = html;
    resultCard.classList.remove('hidden');
    resultCard.scrollIntoView({ behavior: 'smooth' });

    // Update history
    const cropLabel = crop.label;
    const historyLine = `${cropLabel}: ${formatNumber(resultVal, resultUnit === 'ha' ? 2 : (resultUnit === 'j.s.' ? 2 : 0))} ${resultUnit}`;
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

  // ---------- Historia ----------
  function renderHistory() {
    historyList.innerHTML = '';
    history.forEach(line => {
      const li = document.createElement('li');
      li.textContent = line;
      historyList.appendChild(li);
    });
  }

  // ---------- Mini kalkulator ----------
  function quickCalc(op) {
    const aVal = parseFloat(quickA.value.replace(',', '.')) || 0;
    const bVal = parseFloat(quickB.value.replace(',', '.')) || 0;

    const res = op === '+' ? aVal + bVal : aVal - bVal;
    quickResult.textContent = `Wynik: ${res.toFixed(2)}`;
  }

  // ---------- Theme toggle ----------
  function toggleTheme() {
    const root = document.documentElement;
    const isDark = root.getAttribute('data-color-scheme') === 'dark';
    if (isDark) {
      root.removeAttribute('data-color-scheme');
      themeToggle.textContent = '🌙';
      themeToggle.setAttribute('aria-label', 'Włącz tryb ciemny');
    } else {
      root.setAttribute('data-color-scheme', 'dark');
      themeToggle.textContent = '☀️';
      themeToggle.setAttribute('aria-label', 'Wyłącz tryb ciemny');
    }
  }
})();