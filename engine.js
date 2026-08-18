/*
 * Commission engine.
 *
 * Pure lookup + arithmetic, no DOM. Shared by the browser UI (app.js) and the
 * test suite (test/engine.test.js).
 */

(function (root, factory) {
  'use strict';
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory(require('./data/commission-data.js'));
  } else {
    root.CommissionEngine = factory(root.COMMISSION_DATA);
  }
}(typeof self !== 'undefined' ? self : this, function (DATA) {
  'use strict';

  var NOT_FOUND = 'Commission information not found for this selection.';

  function unique(list) {
    var seen = {};
    var out = [];
    list.forEach(function (item) {
      if (!seen[item]) {
        seen[item] = true;
        out.push(item);
      }
    });
    return out;
  }

  /** Every carrier we hold at least one commission rule for. */
  function getCarriers() {
    return unique(DATA.rules.map(function (r) { return r.carrier; })).sort();
  }

  /** States this carrier has rules for, as [{code, name}], appointed states only. */
  function getStates(carrier) {
    var codes = [];
    DATA.rules.forEach(function (r) {
      if (r.carrier === carrier) {
        codes = codes.concat(r.states);
      }
    });
    return unique(codes)
      .filter(function (code) { return !!DATA.appointedStates[code]; })
      .map(function (code) { return { code: code, name: DATA.appointedStates[code] }; })
      .sort(function (a, b) { return a.name.localeCompare(b.name); });
  }

  /** Products available for this carrier in this state. */
  function getProducts(carrier, state) {
    return unique(
      DATA.rules
        .filter(function (r) {
          return r.carrier === carrier && r.states.indexOf(state) !== -1;
        })
        .map(function (r) { return r.product; })
    ).sort();
  }

  function ageMatches(rule, age) {
    if (rule.minAge != null && age < rule.minAge) { return false; }
    if (rule.maxAge != null && age > rule.maxAge) { return false; }
    return true;
  }

  /**
   * Find the single commission rule for carrier + state + product + age.
   * Returns null when nothing matches - the calculator never estimates.
   */
  function findRule(carrier, state, product, age) {
    var matches = DATA.rules.filter(function (r) {
      return r.carrier === carrier &&
        r.states.indexOf(state) !== -1 &&
        r.product === product &&
        ageMatches(r, age);
    });
    if (matches.length === 0) { return null; }

    // Prefer the most specific age band (narrowest range) if schedules overlap.
    matches.sort(function (a, b) { return bandWidth(a) - bandWidth(b); });
    return matches[0];
  }

  /** Number, or null when the input is blank / not a number. */
  function toNumber(value) {
    if (value == null) { return null; }
    if (typeof value === 'string' && value.trim() === '') { return null; }
    var n = Number(value);
    return isFinite(n) ? n : null;
  }

  function bandWidth(rule) {
    var lo = rule.minAge == null ? 0 : rule.minAge;
    var hi = rule.maxAge == null ? 120 : rule.maxAge;
    return hi - lo;
  }

  /**
   * Advance months for a carrier + product category, per the spreadsheet.
   *
   *   number  - the advance term in months (0 means no advance / as-earned)
   *   null    - carrier is known but its advance term is not on file
   *   undefined - carrier is not in the advance table at all
   */
  function getAdvanceMonths(carrier, category) {
    var entry = DATA.advances[carrier];
    if (!entry) { return undefined; }
    if (entry.byCategory && Object.prototype.hasOwnProperty.call(entry.byCategory, category)) {
      return entry.byCategory[category];
    }
    return entry.default;
  }

  function getAdvanceSource(carrier) {
    var entry = DATA.advances[carrier];
    return entry ? entry.source : null;
  }

  /**
   * Calculate the expected commission for a sale.
   *
   * @returns {{found: boolean, message?: string, ...}}
   */
  function calculate(input) {
    var carrier = input.carrier;
    var state = input.state;
    var product = input.product;
    var age = toNumber(input.age);
    var monthlyPremium = toNumber(input.monthlyPremium);

    if (!carrier || !state || !product) {
      return { found: false, message: NOT_FOUND };
    }
    if (age == null || age < 0 || age > 120) {
      return { found: false, message: 'Enter a valid client age.' };
    }
    if (monthlyPremium == null || monthlyPremium <= 0) {
      return { found: false, message: 'Enter a valid monthly premium.' };
    }

    var rule = findRule(carrier, state, product, age);
    if (!rule) {
      return { found: false, message: NOT_FOUND };
    }

    var advanceMonths = getAdvanceMonths(carrier, rule.category);
    if (advanceMonths === undefined) {
      return { found: false, message: NOT_FOUND };
    }

    var rate = rule.rate;
    var annualizedPremium = monthlyPremium * 12;
    var totalFirstYearCommission = annualizedPremium * rate;

    var result = {
      found: true,
      carrier: carrier,
      state: state,
      stateName: DATA.appointedStates[state] || state,
      product: product,
      category: rule.category,
      age: age,
      monthlyPremium: monthlyPremium,
      rate: rate,
      annualizedPremium: annualizedPremium,
      totalFirstYearCommission: totalFirstYearCommission,
      advanceMonths: advanceMonths,
      note: rule.note || null,
      verify: !!rule.verify,
      advanceSource: getAdvanceSource(carrier)
    };

    if (advanceMonths === null) {
      // Rate is known, advance term is not. Report the commission and say so
      // rather than inventing an upfront figure.
      result.paymentMethod = 'advance-unknown';
    } else if (advanceMonths > 0) {
      result.paymentMethod = 'advance';
      result.upfrontCommission = monthlyPremium * advanceMonths * rate;
      result.remainingAsEarned = totalFirstYearCommission - result.upfrontCommission;
      result.remainingMonths = 12 - advanceMonths;
    } else {
      result.paymentMethod = 'as-earned';
      result.monthlyCommission = monthlyPremium * rate;
    }

    return result;
  }

  return {
    NOT_FOUND: NOT_FOUND,
    data: DATA,
    getCarriers: getCarriers,
    getStates: getStates,
    getProducts: getProducts,
    findRule: findRule,
    getAdvanceMonths: getAdvanceMonths,
    calculate: calculate
  };
}));
