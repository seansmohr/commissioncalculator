/* Commission Calculator - UI wiring. */
(function () {
  'use strict';

  var engine = window.CommissionEngine;

  var carrierEl = document.getElementById('carrier');
  var stateEl = document.getElementById('state');
  var productEl = document.getElementById('product');
  var ageEl = document.getElementById('age');
  var premiumEl = document.getElementById('premium');
  var formEl = document.getElementById('calc-form');
  var resultsEl = document.getElementById('results');
  var coverageNoteEl = document.getElementById('coverage-note');

  var money = new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2
  });

  function formatRate(rate) {
    var pct = rate * 100;
    var rounded = Math.round(pct * 100) / 100;
    return (rounded % 1 === 0 ? rounded.toFixed(0) : String(rounded)) + '%';
  }

  function setOptions(select, options, placeholder) {
    select.innerHTML = '';
    var first = document.createElement('option');
    first.value = '';
    first.textContent = placeholder;
    select.appendChild(first);
    options.forEach(function (opt) {
      var el = document.createElement('option');
      el.value = opt.value;
      el.textContent = opt.label;
      select.appendChild(el);
    });
  }

  function resetState(placeholder) {
    setOptions(stateEl, [], placeholder);
    stateEl.disabled = true;
  }

  function resetProduct(placeholder) {
    setOptions(productEl, [], placeholder);
    productEl.disabled = true;
  }

  // --- Dependent dropdowns ---------------------------------------------------

  setOptions(carrierEl, engine.getCarriers().map(function (c) {
    return { value: c, label: c };
  }), 'Select a carrier');

  carrierEl.addEventListener('change', function () {
    clearResults();
    var carrier = carrierEl.value;
    if (!carrier) {
      resetState('Select a carrier first');
      resetProduct('Select a state first');
      return;
    }
    var states = engine.getStates(carrier).map(function (s) {
      return { value: s.code, label: s.name };
    });
    setOptions(stateEl, states, 'Select a state');
    stateEl.disabled = false;
    resetProduct('Select a state first');
  });

  stateEl.addEventListener('change', function () {
    clearResults();
    var carrier = carrierEl.value;
    var state = stateEl.value;
    if (!carrier || !state) {
      resetProduct('Select a state first');
      return;
    }
    var products = engine.getProducts(carrier, state).map(function (p) {
      return { value: p, label: p };
    });
    setOptions(productEl, products, 'Select a product');
    productEl.disabled = false;
  });

  productEl.addEventListener('change', clearResults);

  // Recalculate live once every field has a value.
  [ageEl, premiumEl, productEl].forEach(function (el) {
    el.addEventListener('input', maybeAutoCalculate);
    el.addEventListener('change', maybeAutoCalculate);
  });

  function maybeAutoCalculate() {
    if (carrierEl.value && stateEl.value && productEl.value && ageEl.value !== '' && premiumEl.value !== '') {
      render(runCalculation());
    }
  }

  formEl.addEventListener('submit', function (event) {
    event.preventDefault();
    render(runCalculation());
  });

  function runCalculation() {
    return engine.calculate({
      carrier: carrierEl.value,
      state: stateEl.value,
      product: productEl.value,
      age: ageEl.value,
      monthlyPremium: premiumEl.value
    });
  }

  function clearResults() {
    resultsEl.innerHTML = '';
  }

  // --- Results card ----------------------------------------------------------

  function row(label, value, opts) {
    opts = opts || {};
    var el = document.createElement('div');
    el.className = 'result-row' + (opts.strong ? ' result-row--strong' : '');
    var l = document.createElement('span');
    l.className = 'result-row__label';
    l.textContent = label;
    var v = document.createElement('span');
    v.className = 'result-row__value';
    v.textContent = value;
    el.appendChild(l);
    el.appendChild(v);
    return el;
  }

  function render(result) {
    clearResults();

    if (!result.found) {
      var warn = document.createElement('div');
      warn.className = 'card card--warning';
      warn.textContent = result.message;
      resultsEl.appendChild(warn);
      return;
    }

    var card = document.createElement('div');
    card.className = 'card card--result';

    var h = document.createElement('h2');
    h.textContent = 'Expected Commission';
    card.appendChild(h);

    var top = document.createElement('div');
    top.className = 'result-group';
    top.appendChild(row('Carrier', result.carrier));
    top.appendChild(row('State', result.stateName));
    top.appendChild(row('Product', result.product));
    top.appendChild(row('Client Age', String(result.age)));
    top.appendChild(row('Monthly Premium', money.format(result.monthlyPremium)));
    card.appendChild(top);

    var mid = document.createElement('div');
    mid.className = 'result-group';
    mid.appendChild(row('Commission Rate', formatRate(result.rate)));
    mid.appendChild(row('Annualized Premium', money.format(result.annualizedPremium)));
    mid.appendChild(row('Total First-Year Commission', money.format(result.totalFirstYearCommission), { strong: true }));
    card.appendChild(mid);

    var bottom = document.createElement('div');
    bottom.className = 'result-group';

    if (result.paymentMethod === 'advance') {
      bottom.appendChild(row('Advance', result.advanceMonths + ' Months'));
      bottom.appendChild(row('Expected Upfront Commission', money.format(result.upfrontCommission), { strong: true }));
      if (result.remainingAsEarned > 0.005) {
        bottom.appendChild(row(
          'Remaining As-Earned Commission',
          money.format(result.remainingAsEarned) + ' (' + result.remainingMonths + ' months)'
        ));
      }
    } else {
      bottom.appendChild(row('Advance', 'None'));
      bottom.appendChild(row('Payment Method', 'As-Earned'));
      bottom.appendChild(row('Expected Monthly Commission', money.format(result.monthlyCommission), { strong: true }));
    }
    card.appendChild(bottom);

    if (result.rate === 0) {
      card.appendChild(noteEl('This schedule pays 0% on this combination. That is the contracted rate, not a missing lookup.'));
    }
    if (result.note) {
      card.appendChild(noteEl(result.note));
    }
    if (result.verify) {
      card.appendChild(noteEl('Double-check this rate against the carrier schedule before quoting a large case.', 'warn'));
    }
    if (result.advanceSource) {
      card.appendChild(noteEl('Advance: ' + result.advanceSource, 'muted'));
    }

    resultsEl.appendChild(card);
  }

  function noteEl(text, kind) {
    var el = document.createElement('p');
    el.className = 'result-note' + (kind ? ' result-note--' + kind : '');
    el.textContent = text;
    return el;
  }

  // --- Coverage footnote -----------------------------------------------------

  var missing = engine.data.carriersWithoutData || [];
  if (missing.length) {
    coverageNoteEl.textContent = 'Not yet loaded: ' +
      missing.map(function (c) { return c.name; }).join(', ') +
      '. See data/SOURCES.md.';
  }
}());
