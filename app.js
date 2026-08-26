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

  var tabStandardEl = document.getElementById('tab-standard');
  var tabMapdEl = document.getElementById('tab-mapd');
  var carrierFieldEl = document.getElementById('carrier-field');
  var productFieldEl = document.getElementById('product-field');

  // MAPD-only fields, hidden unless the MAPD tab is active.
  var premiumFieldsEl = document.getElementById('premium-fields');
  var mapdFieldsEl = document.getElementById('mapd-fields');
  var enrollmentEl = document.getElementById('enrollment-type');
  var coverageEl = document.getElementById('current-coverage');
  var effectiveDateEl = document.getElementById('effective-date');
  var mapdData = engine.data.mapd;

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

  var mode = 'standard';

  function isMapdSelected() { return mode === 'mapd'; }

  /**
   * Switch between the two calculators. Hidden inputs are also disabled so the
   * browser cannot block submit on a required field nobody can see.
   */
  function setMode(next) {
    mode = next;
    var mapd = next === 'mapd';

    tabStandardEl.classList.toggle('tab--active', !mapd);
    tabMapdEl.classList.toggle('tab--active', mapd);
    tabStandardEl.setAttribute('aria-selected', String(!mapd));
    tabMapdEl.setAttribute('aria-selected', String(mapd));

    // MAPD needs no carrier and has only one product, so both are put away.
    carrierFieldEl.hidden = mapd;
    productFieldEl.hidden = mapd;
    carrierEl.disabled = mapd;
    productEl.disabled = mapd || !stateEl.value;

    premiumFieldsEl.hidden = mapd;
    mapdFieldsEl.hidden = !mapd;
    ageEl.disabled = mapd;
    premiumEl.disabled = mapd;
    enrollmentEl.disabled = !mapd;
    coverageEl.disabled = !mapd;
    effectiveDateEl.disabled = !mapd;

    clearResults();

    if (mapd) {
      // MAPD is written in every licensed state, so the list is fixed.
      var keep = stateEl.value;
      setOptions(stateEl, engine.getMapdStates().map(function (st) {
        return { value: st.code, label: st.name };
      }), 'Select a state');
      stateEl.disabled = false;
      if (keep) { stateEl.value = keep; }
    } else {
      var carrier = carrierEl.value;
      if (!carrier) {
        resetState('Select a carrier first');
        resetProduct('Select a state first');
        return;
      }
      var previous = stateEl.value;
      setOptions(stateEl, engine.getStates(carrier).map(function (st) {
        return { value: st.code, label: st.name };
      }), 'Select a state');
      stateEl.disabled = false;
      stateEl.value = previous;
      if (stateEl.value) { populateProducts(); } else { resetProduct('Select a state first'); }
    }
  }

  function populateProducts() {
    var products = engine.getProducts(carrierEl.value, stateEl.value).map(function (p) {
      return { value: p, label: p };
    });
    setOptions(productEl, products, 'Select a product');
    productEl.disabled = false;
  }

  tabStandardEl.addEventListener('click', function () { setMode('standard'); });
  tabMapdEl.addEventListener('click', function () { setMode('mapd'); });

  // --- Dependent dropdowns ---------------------------------------------------

  setOptions(carrierEl, engine.getCarriers().map(function (c) {
    return { value: c, label: c };
  }), 'Select a carrier');

  // MAPD dropdown contents never change, so fill them once.
  setOptions(enrollmentEl, mapdData.enrollmentTypes.map(function (t) {
    return { value: t, label: t };
  }), 'Select an enrollment type');
  setOptions(coverageEl, mapdData.currentCoverage.map(function (c) {
    return { value: c.value, label: c.value };
  }), 'Select the member\u2019s current coverage');

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
    if (isMapdSelected()) { maybeAutoCalculate(); return; }
    if (!carrierEl.value || !stateEl.value) {
      resetProduct('Select a state first');
      return;
    }
    populateProducts();
  });

  productEl.addEventListener('change', clearResults);

  // Recalculate live once every field has a value.
  [ageEl, premiumEl, productEl, enrollmentEl, coverageEl, effectiveDateEl].forEach(function (el) {
    el.addEventListener('input', maybeAutoCalculate);
    el.addEventListener('change', maybeAutoCalculate);
  });

  function maybeAutoCalculate() {
    if (isMapdSelected()) {
      if (stateEl.value && enrollmentEl.value && coverageEl.value && effectiveDateEl.value) {
        render(runCalculation());
      }
      return;
    }
    if (!carrierEl.value || !stateEl.value || !productEl.value) { return; }
    if (ageEl.value !== '' && premiumEl.value !== '') {
      render(runCalculation());
    }
  }

  formEl.addEventListener('submit', function (event) {
    event.preventDefault();
    render(runCalculation());
  });

  function runCalculation() {
    if (isMapdSelected()) {
      return engine.calculateMapd({
        state: stateEl.value,
        enrollmentType: enrollmentEl.value,
        currentCoverage: coverageEl.value,
        effectiveDate: effectiveDateEl.value
      });
    }
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

    if (result.kind === 'mapd') {
      renderMapd(card, result);
      resultsEl.appendChild(card);
      return;
    }

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

    if (result.paymentMethod === 'advance-unknown') {
      bottom.appendChild(row('Advance', 'Not on file'));
    } else if (result.paymentMethod === 'advance') {
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

    if (result.paymentMethod === 'advance-unknown') {
      card.appendChild(noteEl(
        'We do not have this carrier\u2019s advance term on file, so the upfront amount cannot be calculated. ' +
        'The rate and total first-year commission above are correct.',
        'warn'
      ));
    }
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

  /** MAPD result rows, using the same card and row structure as everything else. */
  function renderMapd(card, r) {
    var top = document.createElement('div');
    top.className = 'result-group';
    top.appendChild(row('Product', r.product));
    top.appendChild(row('State', r.stateName));
    top.appendChild(row('Enrollment Type', r.enrollmentType));
    top.appendChild(row('Current Coverage', r.currentCoverage));
    top.appendChild(row('Effective Date', formatDate(r.effectiveDate)));
    card.appendChild(top);

    var mid = document.createElement('div');
    mid.className = 'result-group';
    mid.appendChild(row('State Group', r.stateGroup));
    mid.appendChild(row('Commission Type', r.commissionTypeLabel));
    mid.appendChild(row(
      'Annual Commission Rate',
      money.format(r.annualRate) + ' (' + r.effectiveYear + ' schedule)'
    ));
    if (r.monthsActive !== null) {
      mid.appendChild(row('Months Active', String(r.monthsActive)));
    }
    card.appendChild(mid);

    var bottom = document.createElement('div');
    bottom.className = 'result-group';
    bottom.appendChild(row('Expected Commission', money.format(r.expectedCommission), { strong: true }));
    card.appendChild(bottom);

    if (r.prorated) {
      card.appendChild(noteEl(
        'Prorated: a like-plan switch pays for the ' + r.monthsActive +
        ' month' + (r.monthsActive === 1 ? '' : 's') +
        ' the member is active on the new plan this year.'
      ));
    }
    if (r.note) {
      card.appendChild(noteEl(r.note, 'muted'));
    }
  }

  /** yyyy-mm-dd as a readable date, without letting a timezone shift the day. */
  function formatDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    if (!m) { return iso || ''; }
    var months = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    return months[Number(m[2]) - 1] + ' ' + Number(m[3]) + ', ' + m[1];
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
