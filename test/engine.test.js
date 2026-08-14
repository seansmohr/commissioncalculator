/* Plain-Node test suite: `node test/engine.test.js` */
'use strict';

var assert = require('assert');
var engine = require('../engine.js');
var DATA = engine.data;

var passed = 0;
var failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('  ok   ' + name);
  } catch (err) {
    failed++;
    console.log('  FAIL ' + name);
    console.log('       ' + err.message);
  }
}

function close(actual, expected, label) {
  assert.ok(
    Math.abs(actual - expected) < 0.005,
    (label || 'value') + ': expected ' + expected + ', got ' + actual
  );
}

console.log('\nData integrity');

test('every rule has a carrier with a known advance arrangement', function () {
  DATA.rules.forEach(function (r) {
    assert.ok(DATA.advances[r.carrier], 'no advance entry for ' + r.carrier);
  });
});

test('every rule state is an appointed state', function () {
  DATA.rules.forEach(function (r) {
    r.states.forEach(function (s) {
      assert.ok(DATA.appointedStates[s], 'unknown state ' + s + ' on ' + r.carrier + ' / ' + r.product);
    });
  });
});

test('every rule has a numeric rate between 0 and 2', function () {
  DATA.rules.forEach(function (r) {
    assert.ok(typeof r.rate === 'number' && isFinite(r.rate), 'bad rate on ' + r.carrier + ' / ' + r.product);
    assert.ok(r.rate >= 0 && r.rate <= 2, 'out-of-range rate ' + r.rate + ' on ' + r.carrier + ' / ' + r.product);
  });
});

test('every rule has a known product category', function () {
  var known = ['medicare_supplement', 'ancillary', 'life', 'final_expense', 'long_term_care'];
  DATA.rules.forEach(function (r) {
    assert.ok(known.indexOf(r.category) !== -1, 'unknown category ' + r.category + ' on ' + r.carrier);
  });
});

test('age bands within a carrier/state/product do not overlap', function () {
  var buckets = {};
  DATA.rules.forEach(function (r) {
    r.states.forEach(function (s) {
      var key = r.carrier + '|' + s + '|' + r.product;
      (buckets[key] = buckets[key] || []).push(r);
    });
  });
  Object.keys(buckets).forEach(function (key) {
    var bands = buckets[key].map(function (r) {
      return [r.minAge == null ? 0 : r.minAge, r.maxAge == null ? 120 : r.maxAge];
    }).sort(function (a, b) { return a[0] - b[0]; });
    for (var i = 1; i < bands.length; i++) {
      assert.ok(bands[i][0] > bands[i - 1][1], 'overlapping age bands for ' + key);
    }
  });
});

test('every product listed in a dropdown resolves for at least one age', function () {
  engine.getCarriers().forEach(function (carrier) {
    engine.getStates(carrier).forEach(function (state) {
      engine.getProducts(carrier, state.code).forEach(function (product) {
        var hit = false;
        for (var age = 0; age <= 100 && !hit; age++) {
          if (engine.findRule(carrier, state.code, product, age)) { hit = true; }
        }
        assert.ok(hit, 'no age resolves ' + carrier + ' / ' + state.code + ' / ' + product);
      });
    });
  });
});

console.log('\nAdvance arrangements (spreadsheet is source of truth)');

test('Bankers Fidelity advances differ by product category', function () {
  assert.strictEqual(engine.getAdvanceMonths('Bankers Fidelity', 'medicare_supplement'), 9);
  assert.strictEqual(engine.getAdvanceMonths('Bankers Fidelity', 'ancillary'), 6);
  assert.strictEqual(engine.getAdvanceMonths('Bankers Fidelity', 'final_expense'), 6);
});

test('Liberty Bankers advances differ by product category', function () {
  assert.strictEqual(engine.getAdvanceMonths('Liberty Bankers', 'medicare_supplement'), 0);
  assert.strictEqual(engine.getAdvanceMonths('Liberty Bankers', 'ancillary'), 9);
});

test('flat-advance carriers apply the same advance to every category', function () {
  assert.strictEqual(engine.getAdvanceMonths('Aetna Senior Supplemental', 'medicare_supplement'), 12);
  assert.strictEqual(engine.getAdvanceMonths('Aetna Senior Supplemental', 'final_expense'), 12);
  assert.strictEqual(engine.getAdvanceMonths('Manhattan Life', 'ancillary'), 0);
  assert.strictEqual(engine.getAdvanceMonths('Physicians Mutual', 'life'), 9);
});

console.log('\nCalculations');

test('12-month advance: Aetna CA Med Supp, age 68, $100/mo', function () {
  var r = engine.calculate({
    carrier: 'Aetna Senior Supplemental',
    state: 'CA',
    product: 'Medicare Supplement - All marketed plans (incl. Plan N)',
    age: 68,
    monthlyPremium: 100
  });
  assert.ok(r.found);
  close(r.rate, 0.25, 'rate');
  close(r.annualizedPremium, 1200, 'annualized premium');
  close(r.totalFirstYearCommission, 300, 'total first-year commission');
  assert.strictEqual(r.advanceMonths, 12);
  close(r.upfrontCommission, 300, 'upfront');
  close(r.remainingAsEarned, 0, 'remaining as-earned');
});

test('9-month advance leaves 3 months as-earned', function () {
  var r = engine.calculate({
    carrier: 'Physicians Mutual',
    state: 'CA',
    product: 'Medicare Supplement (Medigap) - Open Enrollment',
    age: 70,
    monthlyPremium: 200
  });
  assert.ok(r.found);
  close(r.rate, 0.21, 'rate');
  close(r.totalFirstYearCommission, 200 * 12 * 0.21, 'total');
  assert.strictEqual(r.advanceMonths, 9);
  close(r.upfrontCommission, 200 * 9 * 0.21, 'upfront');
  close(r.remainingAsEarned, 200 * 3 * 0.21, 'remaining');
  assert.strictEqual(r.remainingMonths, 3);
});

test('6-month advance on Bankers Fidelity ancillary leaves 6 months as-earned', function () {
  var r = engine.calculate({
    carrier: 'Bankers Fidelity',
    state: 'TX',
    product: 'Vantage Flex Plus (Hospital Indemnity)',
    age: 60,
    monthlyPremium: 150
  });
  assert.ok(r.found);
  assert.strictEqual(r.advanceMonths, 6);
  close(r.upfrontCommission, 150 * 6 * 0.67, 'upfront');
  close(r.remainingAsEarned, 150 * 6 * 0.67, 'remaining');
  assert.strictEqual(r.remainingMonths, 6);
});

test('same Bankers Fidelity state uses a 9-month advance for Medicare Supplement', function () {
  var r = engine.calculate({
    carrier: 'Bankers Fidelity',
    state: 'TX',
    product: 'Medicare Supplement - Preferred / Standard',
    age: 70,
    monthlyPremium: 150
  });
  assert.ok(r.found);
  assert.strictEqual(r.advanceMonths, 9);
  close(r.rate, 0.22, 'rate');
});

test('no advance: Manhattan Life pays as-earned monthly', function () {
  var r = engine.calculate({
    carrier: 'Manhattan Life',
    state: 'TX',
    product: 'Home Health Care',
    age: 60,
    monthlyPremium: 100
  });
  assert.ok(r.found);
  assert.strictEqual(r.advanceMonths, 0);
  assert.strictEqual(r.paymentMethod, 'as-earned');
  close(r.monthlyCommission, 70, 'monthly commission');
  assert.strictEqual(r.upfrontCommission, undefined);
});

test('Liberty Bankers Medicare Supplement is as-earned, ancillary is advanced', function () {
  var ms = engine.calculate({
    carrier: 'Liberty Bankers', state: 'PA',
    product: 'Medicare Supplement - Plan N', age: 70, monthlyPremium: 100
  });
  assert.ok(ms.found);
  assert.strictEqual(ms.paymentMethod, 'as-earned');
  close(ms.monthlyCommission, 27.80, 'monthly');

  var anc = engine.calculate({
    carrier: 'Liberty Bankers', state: 'PA',
    product: 'Hospital Indemnity Policy', age: 70, monthlyPremium: 100
  });
  assert.ok(anc.found);
  assert.strictEqual(anc.paymentMethod, 'advance');
  assert.strictEqual(anc.advanceMonths, 9);
});

console.log('\nAge-based and plan-based rules');

test('Plan N pays a different rate than other Medicare Supplement plans', function () {
  var other = engine.findRule('Aetna Senior Supplemental', 'PA', 'Medicare Supplement - All plans except Plan N', 70);
  var planN = engine.findRule('Aetna Senior Supplemental', 'PA', 'Medicare Supplement - Plan N', 70);
  close(other.rate, 0.25, 'non-N rate');
  close(planN.rate, 0.30, 'Plan N rate');
});

test('age selects the right band automatically (Medico Ohio)', function () {
  var p = 'Medicare Supplement - All plans except Plan N';
  close(engine.findRule('Medico', 'OH', p, 70).rate, 0.23, 'age 70');
  close(engine.findRule('Medico', 'OH', p, 82).rate, 0.185, 'age 82');
  close(engine.findRule('Medico', 'OH', p, 90).rate, 0.115, 'age 90');
});

test('under-65 rate applies below age 65 (Aetna Texas)', function () {
  var p = 'Medicare Supplement - All plans except Plan N';
  close(engine.findRule('Aetna Senior Supplemental', 'TX', p, 62).rate, 0.015, 'age 62');
  close(engine.findRule('Aetna Senior Supplemental', 'TX', p, 66).rate, 0.25, 'age 66');
});

test('Physicians Mutual drops to the underage/80+ rate at both ends', function () {
  var p = 'Medicare Supplement (Medigap) - Open Enrollment';
  close(engine.findRule('Physicians Mutual', 'TX', p, 60).rate, 0.01, 'age 60');
  close(engine.findRule('Physicians Mutual', 'TX', p, 72).rate, 0.21, 'age 72');
  close(engine.findRule('Physicians Mutual', 'TX', p, 81).rate, 0.01, 'age 81');
});

console.log('\nNever guess');

test('unavailable age band returns the not-found message', function () {
  // Plan N is not available under age 65 in Texas on the Aetna schedule.
  var r = engine.calculate({
    carrier: 'Aetna Senior Supplemental', state: 'TX',
    product: 'Medicare Supplement - Plan N', age: 60, monthlyPremium: 100
  });
  assert.strictEqual(r.found, false);
  assert.strictEqual(r.message, engine.NOT_FOUND);
});

test('carrier/state combination with no schedule returns the not-found message', function () {
  var r = engine.calculate({
    carrier: 'American Benefit Life', state: 'CA',
    product: 'Medicare Supplement - Plans F & G', age: 70, monthlyPremium: 100
  });
  assert.strictEqual(r.found, false);
  assert.strictEqual(r.message, engine.NOT_FOUND);
});

test('unknown product returns the not-found message', function () {
  var r = engine.calculate({
    carrier: 'Aflac', state: 'CA', product: 'Whole Life Deluxe', age: 70, monthlyPremium: 100
  });
  assert.strictEqual(r.found, false);
  assert.strictEqual(r.message, engine.NOT_FOUND);
});

test('a contracted 0% rate is reported, not treated as missing', function () {
  var r = engine.calculate({
    carrier: 'Liberty Bankers', state: 'AZ',
    product: 'Medicare Supplement - Plans F & G', age: 70, monthlyPremium: 100
  });
  assert.strictEqual(r.found, true);
  assert.strictEqual(r.rate, 0);
  assert.strictEqual(r.totalFirstYearCommission, 0);
});

test('invalid age and premium are rejected before any lookup', function () {
  var badAge = engine.calculate({
    carrier: 'Aflac', state: 'CA',
    product: 'Medicare Supplement - Plan N', age: '', monthlyPremium: 100
  });
  assert.strictEqual(badAge.found, false);

  var badPremium = engine.calculate({
    carrier: 'Aflac', state: 'CA',
    product: 'Medicare Supplement - Plan N', age: 70, monthlyPremium: 0
  });
  assert.strictEqual(badPremium.found, false);
});

console.log('\nDropdown dependency');

test('states are limited to states the carrier has rules for', function () {
  var ablStates = engine.getStates('American Benefit Life').map(function (s) { return s.code; });
  assert.ok(ablStates.indexOf('CA') === -1, 'ABL should not offer California');
  assert.ok(ablStates.indexOf('TX') !== -1, 'ABL should offer Texas');
});

test('products are limited to products available in the selected state', function () {
  var caProducts = engine.getProducts('Healthspring', 'CA');
  var txProducts = engine.getProducts('Healthspring', 'TX');
  assert.ok(caProducts.indexOf('Medicare Supplement - Plan N') !== -1, 'CA should offer Med Supp Plan N');
  assert.ok(txProducts.indexOf('Medicare Supplement - Plan N') === -1, 'TX should not offer Med Supp on this schedule');
  assert.ok(txProducts.indexOf('Choice Accident') !== -1, 'TX should offer Choice Accident');
});

console.log('\n' + passed + ' passed, ' + failed + ' failed\n');
process.exit(failed === 0 ? 0 : 1);
