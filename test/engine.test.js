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

console.log('\nHeartland (advance term not on file)');

test('Heartland reports the rate but refuses to invent an upfront figure', function () {
  var r = engine.calculate({
    carrier: 'Heartland', state: 'OH',
    product: 'Medicare Supplement - Plan N', age: 70, monthlyPremium: 100
  });
  assert.strictEqual(r.found, true);
  close(r.rate, 0.21, 'rate');
  close(r.totalFirstYearCommission, 252, 'total first-year commission');
  assert.strictEqual(r.advanceMonths, null);
  assert.strictEqual(r.paymentMethod, 'advance-unknown');
  assert.strictEqual(r.upfrontCommission, undefined, 'must not produce an upfront figure');
  assert.strictEqual(r.monthlyCommission, undefined, 'must not imply as-earned either');
});

test('unknown advance is distinct from a genuine no-advance carrier', function () {
  assert.strictEqual(engine.getAdvanceMonths('Heartland', 'ancillary'), null);
  assert.strictEqual(engine.getAdvanceMonths('Manhattan Life', 'ancillary'), 0);
  assert.strictEqual(engine.getAdvanceMonths('Nonexistent Carrier', 'ancillary'), undefined);
});

test('Heartland Medicare Supplement age bands and plan splits', function () {
  close(engine.findRule('Heartland', 'PA', 'Medicare Supplement - Plans A, B, C, G', 70).rate, 0.18, 'PA A/B/C/G 65-80');
  close(engine.findRule('Heartland', 'PA', 'Medicare Supplement - Plans A, B, C, G', 82).rate, 0.04, 'PA A/B/C/G 81+');
  close(engine.findRule('Heartland', 'PA', 'Medicare Supplement - Plan N', 70).rate, 0.20, 'PA Plan N 65-80');
  close(engine.findRule('Heartland', 'PA', 'Medicare Supplement - Plan N', 82).rate, 0.0925, 'PA Plan N 81+');
  close(engine.findRule('Heartland', 'PA', 'Medicare Supplement - Plan N', 60).rate, 0.016, 'PA Plan N under 65');
  close(engine.findRule('Heartland', 'NC', 'Medicare Supplement - Plan G', 70).rate, 0.18, 'NC Plan G 65-80');
  close(engine.findRule('Heartland', 'OH', 'Medicare Supplement - Plans C & G', 70).rate, 0.19, 'OH C&G 65-80');
});

test('Heartland Medicare Supplement is only offered in NC, OH and PA', function () {
  ['NC', 'OH', 'PA'].forEach(function (st) {
    var products = engine.getProducts('Heartland', st);
    assert.ok(products.some(function (p) { return p.indexOf('Medicare Supplement') === 0; }),
      st + ' should offer Heartland Medicare Supplement');
  });
  ['AZ', 'IL', 'LA', 'NV', 'TX', 'VA', 'FL'].forEach(function (st) {
    var products = engine.getProducts('Heartland', st);
    assert.ok(!products.some(function (p) { return p.indexOf('Medicare Supplement') === 0; }),
      st + ' should not offer Heartland Medicare Supplement');
  });
});

test('Heartland ancillary rates split by state group', function () {
  var p = 'Simply Secure Cancer, Heart Attack & Stroke';
  close(engine.findRule('Heartland', 'TX', p, 50).rate, 0.80, 'generic states 18-84');
  close(engine.findRule('Heartland', 'TX', p, 86).rate, 0.60, 'generic states 85-90');
  close(engine.findRule('Heartland', 'FL', p, 50).rate, 0.65, 'FL 18-84');
  close(engine.findRule('Heartland', 'FL', p, 86).rate, 0.45, 'FL 85-90');
});

console.log('\nAetna schedule (full document, 07/23/2026)');

test('Florida Medicare Supplement pays a different rate under 65', function () {
  var p = 'Medicare Supplement - All marketed plans (incl. Plan N)';
  close(engine.findRule('Aetna Senior Supplemental', 'FL', p, 70).rate, 0.24, 'FL age 70');
  close(engine.findRule('Aetna Senior Supplemental', 'FL', p, 60).rate, 0.065, 'FL age 60');
});

test('Illinois Medicare Supplement has three age bands per plan', function () {
  var other = 'Medicare Supplement - All plans except Plan N';
  var planN = 'Medicare Supplement - Plan N';
  close(engine.findRule('Aetna Senior Supplemental', 'IL', other, 60).rate, 0.125, 'IL non-N under 65');
  close(engine.findRule('Aetna Senior Supplemental', 'IL', other, 70).rate, 0.25, 'IL non-N 65-79');
  close(engine.findRule('Aetna Senior Supplemental', 'IL', other, 82).rate, 0.125, 'IL non-N 80+');
  close(engine.findRule('Aetna Senior Supplemental', 'IL', planN, 60).rate, 0.15, 'IL Plan N under 65');
  close(engine.findRule('Aetna Senior Supplemental', 'IL', planN, 70).rate, 0.30, 'IL Plan N 65-79');
  close(engine.findRule('Aetna Senior Supplemental', 'IL', planN, 82).rate, 0.15, 'IL Plan N 80+');
});

test('Dental Vision and Hearing Flex is distinct from the other two DVH products', function () {
  var products = engine.getProducts('Aetna Senior Supplemental', 'TX');
  ['Dental, Vision and Hearing', 'Dental, Vision and Hearing Plus', 'Dental Vision and Hearing Flex']
    .forEach(function (p) {
      assert.ok(products.indexOf(p) !== -1, 'TX should offer ' + p);
    });
  close(engine.findRule('Aetna Senior Supplemental', 'TX', 'Dental Vision and Hearing Flex', 60).rate, 0.57, 'DVH Flex 18-70');
  close(engine.findRule('Aetna Senior Supplemental', 'TX', 'Dental Vision and Hearing Flex', 75).rate, 0.52, 'DVH Flex 71-89');
  close(engine.findRule('Aetna Senior Supplemental', 'FL', 'Dental Vision and Hearing Flex', 60).rate, 0.47, 'FL DVH Flex 18-70');
});

test('Nevada splits DVH Flex into Dental Only and full plans', function () {
  var products = engine.getProducts('Aetna Senior Supplemental', 'NV');
  assert.ok(products.indexOf('Dental Vision and Hearing Flex - Dental Only') !== -1);
  assert.ok(products.indexOf('Dental Vision and Hearing Flex - Dental, Vision and Hearing') !== -1);
  assert.ok(products.indexOf('Dental Vision and Hearing Flex') === -1, 'NV should not offer the generic DVH Flex');
  close(engine.findRule('Aetna Senior Supplemental', 'NV', 'Dental Vision and Hearing Flex - Dental Only', 60).rate, 0.17, 'NV dental only');
  close(engine.findRule('Aetna Senior Supplemental', 'NV', 'Dental Vision and Hearing Flex - Dental, Vision and Hearing', 60).rate, 0.26, 'NV full plan');
});

test('DVH Flex is not offered in Virginia', function () {
  var products = engine.getProducts('Aetna Senior Supplemental', 'VA');
  assert.ok(!products.some(function (p) { return p.indexOf('Dental Vision and Hearing Flex') === 0; }),
    'VA is not on the DVH Flex schedule');
});

test('Protection Series products split by state group', function () {
  close(engine.findRule('Aetna Senior Supplemental', 'TX', 'Home Care Plus', 60).rate, 0.625, 'TX Home Care Plus');
  close(engine.findRule('Aetna Senior Supplemental', 'AZ', 'Home Care Plus', 60).rate, 0.58, 'AZ Home Care Plus');
  close(engine.findRule('Aetna Senior Supplemental', 'CA', 'Hospital Indemnity Flex', 60).rate, 0.625, 'CA Hospital Indemnity Flex');
  close(engine.findRule('Aetna Senior Supplemental', 'NJ', 'Hospital Indemnity Flex', 60).rate, 0.58, 'NJ Hospital Indemnity Flex');
  close(engine.findRule('Aetna Senior Supplemental', 'VA', 'Recovery Care', 60).rate, 0.625, 'VA Recovery Care');
  close(engine.findRule('Aetna Senior Supplemental', 'AZ', 'Recovery Care', 60).rate, 0.58, 'AZ Recovery Care');
});

test('single-state Protection Series products are offered only in that state', function () {
  assert.ok(engine.getProducts('Aetna Senior Supplemental', 'TX').indexOf('Home Recovery Care') !== -1,
    'Home Recovery Care is a Texas-only table');
  assert.ok(engine.getProducts('Aetna Senior Supplemental', 'PA').indexOf('Home Recovery Care') === -1);
  assert.ok(engine.getProducts('Aetna Senior Supplemental', 'PA').indexOf('Nursing Facility Care (HFN-97)') !== -1,
    'Nursing Facility Care is a Pennsylvania-only table');
  assert.ok(engine.getProducts('Aetna Senior Supplemental', 'TX').indexOf('Nursing Facility Care (HFN-97)') === -1);
});

test('Recovery Care Choice covers only its listed states', function () {
  close(engine.findRule('Aetna Senior Supplemental', 'TX', 'Recovery Care Choice', 60).rate, 0.625, 'TX');
  ['CA', 'FL', 'ID', 'NJ', 'PA', 'VA'].forEach(function (st) {
    assert.ok(engine.getProducts('Aetna Senior Supplemental', st).indexOf('Recovery Care Choice') === -1,
      st + ' is not on the Recovery Care Choice schedule');
  });
});

test('Protection Series age floors are enforced', function () {
  // Home Care Plus / Recovery Care are issue ages 50-89; Recovery Care Choice 40-89.
  assert.strictEqual(engine.findRule('Aetna Senior Supplemental', 'TX', 'Home Care Plus', 45), null);
  assert.strictEqual(engine.findRule('Aetna Senior Supplemental', 'TX', 'Recovery Care Choice', 35), null);
  assert.ok(engine.findRule('Aetna Senior Supplemental', 'TX', 'Recovery Care Choice', 45));
});

test('every Aetna complementary health product uses the 12 month advance', function () {
  ['Home Care Plus', 'Hospital Indemnity Flex', 'Recovery Care', 'Recovery Care Choice',
   'Dental Vision and Hearing Flex'].forEach(function (product) {
    var r = engine.calculate({
      carrier: 'Aetna Senior Supplemental', state: 'TX',
      product: product, age: 60, monthlyPremium: 100
    });
    assert.ok(r.found, product + ' should resolve in TX');
    assert.strictEqual(r.advanceMonths, 12, product + ' should use the 12 month advance');
    close(r.upfrontCommission, r.totalFirstYearCommission, product + ' upfront equals full first year');
  });
});

console.log('\nMutual of Omaha, Healthspring, Physicians Mutual (full PDFs)');

test('Mutual of Omaha Long Term Care age bands, CA and VA', function () {
  var p = 'Long Term Care - Individual (new business)';
  ['CA', 'VA'].forEach(function (st) {
    close(engine.findRule('Mutual of Omaha', st, p, 65).rate, 0.60, st + ' under 70');
    close(engine.findRule('Mutual of Omaha', st, p, 72).rate, 0.40, st + ' 70-74');
    close(engine.findRule('Mutual of Omaha', st, p, 77).rate, 0.35, st + ' 75-79');
    assert.strictEqual(engine.findRule('Mutual of Omaha', st, p, 82), null, st + ' has no rate above 79');
  });
});

test('Pennsylvania Long Term Care keeps both downline variants distinct', function () {
  var withD = 'Long Term Care - Individual (new business, with downline General Agents)';
  var noD = 'Long Term Care - Individual (new business, no downline General Agents)';
  var products = engine.getProducts('Mutual of Omaha', 'PA');
  assert.ok(products.indexOf(withD) !== -1);
  assert.ok(products.indexOf(noD) !== -1);
  close(engine.findRule('Mutual of Omaha', 'PA', withD, 65).rate, 0.60, 'PA with downline');
  close(engine.findRule('Mutual of Omaha', 'PA', noD, 65).rate, 0.50, 'PA no downline');
  // The undifferentiated product must not exist in PA - it would hide the choice.
  assert.ok(products.indexOf('Long Term Care - Individual (new business)') === -1);
});

test('Mutual of Omaha is only offered where we hold an appointment', function () {
  var states = engine.getStates('Mutual of Omaha').map(function (s) { return s.code; }).sort();
  assert.deepStrictEqual(states, ['CA', 'PA', 'VA']);
});

test('Healthspring Dental Vision Hearing has both Heaped and Level variants', function () {
  var products = engine.getProducts('Healthspring', 'TX');
  assert.ok(products.indexOf('Dental, Vision, Hearing (Heaped)') !== -1);
  assert.ok(products.indexOf('Dental, Vision, Hearing (Level)') !== -1);
  close(engine.findRule('Healthspring', 'TX', 'Dental, Vision, Hearing (Heaped)', 60).rate, 0.55, 'TX heaped');
  close(engine.findRule('Healthspring', 'TX', 'Dental, Vision, Hearing (Level)', 60).rate, 0.15, 'TX level');
  close(engine.findRule('Healthspring', 'CA', 'Dental, Vision, Hearing (Level)', 60).rate, 0.08, 'CA level');
  close(engine.findRule('Healthspring', 'NV', 'Dental, Vision, Hearing (Level)', 60).rate, 0.05, 'NV level');
});

test('Healthspring Flexible Choice HI riders are excluded where the schedule says so', function () {
  var rider = 'Flexible Choice Hospital Indemnity - Accident Rider';
  assert.ok(engine.getProducts('Healthspring', 'TX').indexOf(rider) !== -1, 'TX offers the riders');
  ['CA', 'ID', 'NJ'].forEach(function (st) {
    assert.ok(engine.getProducts('Healthspring', st).indexOf(rider) === -1,
      st + ' is on the not-available list for these riders');
  });
  close(engine.findRule('Healthspring', 'TX', 'Flexible Choice Hospital Indemnity - Lump Sum Cancer Recurrence Rider', 60).rate, 0.60, 'TX LSCR');
  close(engine.findRule('Healthspring', 'FL', 'Flexible Choice Hospital Indemnity - Lump Sum Cancer Recurrence Rider', 60).rate, 0.55, 'FL LSCR');
});

test('Healthspring California Medicare Supplement rates match the schedule', function () {
  close(engine.findRule('Healthspring', 'CA', 'Medicare Supplement - Plan A', 70).rate, 0.05, 'Plan A');
  close(engine.findRule('Healthspring', 'CA', 'Medicare Supplement - Plans F & G', 70).rate, 0.15, 'F&G 65-79');
  close(engine.findRule('Healthspring', 'CA', 'Medicare Supplement - Plans F & G', 82).rate, 0.065, 'F&G 80+');
  close(engine.findRule('Healthspring', 'CA', 'Medicare Supplement - Plan N', 70).rate, 0.18, 'Plan N 65-79');
  close(engine.findRule('Healthspring', 'CA', 'Medicare Supplement - Plan N', 82).rate, 0.09, 'Plan N 80+');
});

test('Healthspring Return of Premium rider is available everywhere we write', function () {
  engine.getStates('Healthspring').forEach(function (st) {
    close(engine.findRule('Healthspring', st.code, 'Return of Premium Rider (on selected products)', 60).rate,
      0.50, st.code + ' ROP');
  });
});

test('Physicians Mutual internal replacements pay less than new business', function () {
  var oe = engine.findRule('Physicians Mutual', 'TX', 'Medicare Supplement (Medigap) - Open Enrollment', 70);
  var ir = engine.findRule('Physicians Mutual', 'TX', 'Medicare Supplement (Medigap) - Internal Replacement', 70);
  close(oe.rate, 0.21, 'open enrollment');
  close(ir.rate, 0.125, 'internal replacement');

  close(engine.findRule('Physicians Mutual', 'TX', 'Dental (P154 / C254) - Standard', 60).rate, 0.25, 'dental standard');
  close(engine.findRule('Physicians Mutual', 'TX', 'Dental (P154 / C254) - Internal Replacement', 60).rate, 0.05, 'dental replacement');
});

test('Physicians Mutual life rates match the Level 5 street column', function () {
  var cases = [
    ['L780 Whole Life', 1.00],
    ['LR175 5-Year Term Rider', 0.70],
    ['LR175 10-Year Term Rider', 0.85],
    ['LR175 15-Year Term Rider', 0.95],
    ['LR175 20-Year Term Rider', 1.00]
  ];
  cases.forEach(function (c) {
    close(engine.findRule('Physicians Mutual', 'TX', c[0], 60).rate, c[1], c[0]);
  });
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
