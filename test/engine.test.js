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

test('advance lookup distinguishes a real term, no advance, and unknown carrier', function () {
  assert.strictEqual(engine.getAdvanceMonths('Manhattan Life', 'ancillary'), 0, 'a genuine no-advance carrier');
  assert.strictEqual(engine.getAdvanceMonths('Heartland', 'ancillary'), 9, 'a real term');
  assert.strictEqual(engine.getAdvanceMonths('Nonexistent Carrier', 'ancillary'), undefined, 'unknown carrier');
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

console.log('\nHeartland (full 10-page schedule, 9 month advance)');

test('Heartland advance is 9 months', function () {
  assert.strictEqual(engine.getAdvanceMonths('Heartland', 'ancillary'), 9);
  assert.strictEqual(engine.getAdvanceMonths('Heartland', 'medicare_supplement'), 9);
  var r = engine.calculate({
    carrier: 'Heartland', state: 'TX',
    product: 'Secure Advantage Flex (Hospital Coverage)', age: 70, monthlyPremium: 100
  });
  assert.ok(r.found);
  assert.strictEqual(r.advanceMonths, 9);
  assert.strictEqual(r.paymentMethod, 'advance');
  close(r.upfrontCommission, 100 * 9 * 0.60, 'upfront');
  close(r.remainingAsEarned, 100 * 3 * 0.60, 'remaining');
});

test('Medicare Supplement is not advanced under 65 or at 81+', function () {
  var mid = engine.calculate({
    carrier: 'Heartland', state: 'PA',
    product: 'Medicare Supplement - Plan N', age: 70, monthlyPremium: 100
  });
  assert.strictEqual(mid.advanceMonths, 9, 'ages 65-80 are advanced');
  assert.strictEqual(mid.paymentMethod, 'advance');

  [['PA', 'Medicare Supplement - Plan N', 60], ['PA', 'Medicare Supplement - Plan N', 83]].forEach(function (c) {
    var r = engine.calculate({
      carrier: 'Heartland', state: c[0], product: c[1], age: c[2], monthlyPremium: 100
    });
    assert.ok(r.found, 'age ' + c[2] + ' should resolve');
    assert.strictEqual(r.advanceMonths, 0, 'age ' + c[2] + ' must not be advanced');
    assert.strictEqual(r.paymentMethod, 'as-earned', 'age ' + c[2] + ' pays as-earned');
    assert.strictEqual(r.upfrontCommission, undefined, 'age ' + c[2] + ' has no upfront figure');
  });
});

test('a per-rule advance override beats the carrier default', function () {
  // Ancillary at 81+ still uses the carrier's 9 months; only Med Supp overrides.
  var anc = engine.calculate({
    carrier: 'Heartland', state: 'TX',
    product: 'Secure Advantage Flex (Hospital Coverage)', age: 83, monthlyPremium: 100
  });
  assert.strictEqual(anc.advanceMonths, 9, 'ancillary at 81-85 is still advanced');
  close(anc.rate, 0.40, 'ancillary 81-85 rate');
});

test('Secure Advantage Flex is loaded with its real name and state bands', function () {
  var p = 'Secure Advantage Flex (Hospital Coverage)';
  ['IL', 'LA', 'NC', 'NV', 'PA', 'TX'].forEach(function (st) {
    close(engine.findRule('Heartland', st, p, 70).rate, 0.60, st + ' ages 0-80');
    close(engine.findRule('Heartland', st, p, 83).rate, 0.40, st + ' ages 81-85');
  });
  ['AZ', 'FL', 'OH', 'VA'].forEach(function (st) {
    close(engine.findRule('Heartland', st, p, 70).rate, 0.55, st + ' ages 0-80');
    close(engine.findRule('Heartland', st, p, 83).rate, 0.35, st + ' ages 81-85');
  });
  ['CA', 'ID', 'NJ'].forEach(function (st) {
    assert.ok(engine.getProducts('Heartland', st).indexOf(p) === -1, st + ' is not on this schedule');
  });
  assert.strictEqual(engine.findRule('Heartland', 'TX', p, 90), null, 'no rate above 85');
});

test('North Carolina under-65 applies to Plan A only', function () {
  close(engine.findRule('Heartland', 'NC', 'Medicare Supplement - Plan A', 60).rate, 0.009, 'Plan A under 65');
  assert.strictEqual(engine.findRule('Heartland', 'NC', 'Medicare Supplement - Plan G', 60), null,
    'NC Plan G has no under-65 rate');
  assert.strictEqual(engine.findRule('Heartland', 'NC', 'Medicare Supplement - Plan N', 60), null,
    'NC Plan N has no under-65 rate');
});

test('Heartland Medicare Supplement rates and plan splits', function () {
  close(engine.findRule('Heartland', 'NC', 'Medicare Supplement - Plan G', 70).rate, 0.18, 'NC Plan G 65-80');
  close(engine.findRule('Heartland', 'NC', 'Medicare Supplement - Plan N', 83).rate, 0.0925, 'NC Plan N 81+');
  close(engine.findRule('Heartland', 'OH', 'Medicare Supplement - Plans C & G', 70).rate, 0.19, 'OH C&G 65-80');
  close(engine.findRule('Heartland', 'OH', 'Medicare Supplement - Plan N', 70).rate, 0.21, 'OH Plan N 65-80');
  assert.strictEqual(engine.findRule('Heartland', 'OH', 'Medicare Supplement - Plan A', 60), null,
    'OH has no under-65 rates');
  close(engine.findRule('Heartland', 'PA', 'Medicare Supplement - Plans A, B, C, G', 70).rate, 0.18, 'PA 65-80');
});

test('Heartland Medicare Supplement is only offered in NC, OH and PA', function () {
  ['NC', 'OH', 'PA'].forEach(function (st) {
    assert.ok(engine.getProducts('Heartland', st).some(function (p) { return p.indexOf('Medicare Supplement') === 0; }), st);
  });
  ['AZ', 'FL', 'IL', 'LA', 'NV', 'TX', 'VA'].forEach(function (st) {
    assert.ok(!engine.getProducts('Heartland', st).some(function (p) { return p.indexOf('Medicare Supplement') === 0; }), st);
  });
});

test('Heartland ancillary products keep their state bands', function () {
  var c = 'Simply Secure Cancer, Heart Attack & Stroke';
  close(engine.findRule('Heartland', 'TX', c, 50).rate, 0.80, 'generic 18-84');
  close(engine.findRule('Heartland', 'FL', c, 50).rate, 0.65, 'FL 18-84');
  var h = 'Secure Choice Short-Term Home Health Care';
  close(engine.findRule('Heartland', 'TX', h, 60).rate, 0.55, 'HHC 40-75');
  close(engine.findRule('Heartland', 'TX', h, 80).rate, 0.50, 'HHC 76+');
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

console.log('\nManhattan Life (scanned schedule, read visually)');

test('Short Term Care state bands match the schedule', function () {
  var p = 'Short Term Care';
  // Top band: AK, AL, AR, DC, DE, GA, HI, IA, ID, IL, KS, LA, MA, MD, ME, MO,
  // MS, NC, NH, NM, NV, OR, PA, TX, UT, WI, WV, WY
  ['ID', 'IL', 'LA', 'NC', 'NV', 'PA', 'TX'].forEach(function (st) {
    close(engine.findRule('Manhattan Life', st, p, 60).rate, 0.60, st + ' ages 45-79');
    close(engine.findRule('Manhattan Life', st, p, 82).rate, 0.50, st + ' ages 80+');
  });
  // Second band: AZ, FL, IN, MT, NE, OH, SC, TN, VA
  ['AZ', 'FL', 'OH', 'VA'].forEach(function (st) {
    close(engine.findRule('Manhattan Life', st, p, 60).rate, 0.525, st + ' ages 45-79');
    close(engine.findRule('Manhattan Life', st, p, 82).rate, 0.35, st + ' ages 80+');
  });
  // MN, NJ, RI band
  close(engine.findRule('Manhattan Life', 'NJ', p, 60).rate, 0.30, 'NJ ages 45-79');
  close(engine.findRule('Manhattan Life', 'NJ', p, 82).rate, 0.22, 'NJ ages 80+');
  // California is on no Short Term Care band.
  assert.ok(engine.getProducts('Manhattan Life', 'CA').indexOf(p) === -1,
    'CA is not on any Short Term Care band');
});

test('Short Term Care has an age floor of 45', function () {
  assert.strictEqual(engine.findRule('Manhattan Life', 'TX', 'Short Term Care', 40), null);
  assert.ok(engine.findRule('Manhattan Life', 'TX', 'Short Term Care', 45));
});

test('Florida-only rates override the general rate', function () {
  close(engine.findRule('Manhattan Life', 'TX', 'Affordable Choice', 60).rate, 0.32, 'TX Affordable Choice');
  close(engine.findRule('Manhattan Life', 'FL', 'Affordable Choice', 60).rate, 0.28, 'FL Affordable Choice');
  close(engine.findRule('Manhattan Life', 'TX', 'Out-Of-Pocket Protection Plan', 60).rate, 0.35, 'TX OOP');
  close(engine.findRule('Manhattan Life', 'FL', 'Out-Of-Pocket Protection Plan', 60).rate, 0.275, 'FL OOP');
  var cancer = 'CP4000 CancerCare / Cancer Express / FOB First Diagnosis and Riders';
  close(engine.findRule('Manhattan Life', 'TX', cancer, 60).rate, 0.55, 'TX cancer');
  close(engine.findRule('Manhattan Life', 'FL', cancer, 60).rate, 0.475, 'FL cancer');
});

test('24 Hour Accident excludes Arizona from the general rate', function () {
  close(engine.findRule('Manhattan Life', 'TX', '24 Hour Accident', 60).rate, 0.35, 'TX');
  close(engine.findRule('Manhattan Life', 'AZ', '24 Hour Accident', 60).rate, 0.325, 'AZ has its own rate');
});

test('Hospital Indemnity Select is all states with two age bands', function () {
  engine.getStates('Manhattan Life').forEach(function (st) {
    close(engine.findRule('Manhattan Life', st.code, 'Hospital Indemnity Select', 60).rate, 0.63, st.code + ' 18-79');
    close(engine.findRule('Manhattan Life', st.code, 'Hospital Indemnity Select', 82).rate, 0.475, st.code + ' 80+');
  });
});

test('every Manhattan Life product is as-earned with no advance', function () {
  var r = engine.calculate({
    carrier: 'Manhattan Life', state: 'NV',
    product: 'Short Term Care', age: 60, monthlyPremium: 120
  });
  assert.ok(r.found);
  assert.strictEqual(r.advanceMonths, 0);
  assert.strictEqual(r.paymentMethod, 'as-earned');
  close(r.monthlyCommission, 72, 'monthly commission');
  close(r.totalFirstYearCommission, 864, 'total first year');
});

console.log('\nAflac / Tier One (all 4 pages)');

test('Aflac Final Expense is loaded with both plan types', function () {
  var lvl = engine.findRule('Aflac', 'TX', 'Final Expense - Level Benefit', 60);
  var mod = engine.findRule('Aflac', 'TX', 'Final Expense - Modified', 60);
  close(lvl.rate, 1.08, 'Level Benefit');
  close(mod.rate, 0.95, 'Modified');
  // Issue-age windows differ between the two plans.
  assert.strictEqual(engine.findRule('Aflac', 'TX', 'Final Expense - Level Benefit', 42), null, 'Level starts at 45');
  assert.ok(engine.findRule('Aflac', 'TX', 'Final Expense - Modified', 42), 'Modified starts at 40');
  assert.strictEqual(engine.findRule('Aflac', 'TX', 'Final Expense - Modified', 78), null, 'Modified ends at 75');
  assert.ok(engine.findRule('Aflac', 'TX', 'Final Expense - Level Benefit', 78), 'Level runs to 80');
});

test('Aflac Final Expense uses the 12 month advance', function () {
  var r = engine.calculate({
    carrier: 'Aflac', state: 'TX',
    product: 'Final Expense - Level Benefit', age: 60, monthlyPremium: 100
  });
  assert.ok(r.found);
  assert.strictEqual(r.advanceMonths, 12);
  close(r.totalFirstYearCommission, 1296, 'total first year');
  close(r.upfrontCommission, 1296, 'upfront');
});

test('Aflac Medicare Supplement state blocks match the schedule', function () {
  var afg = 'Medicare Supplement - Plans A, F, G';
  var n = 'Medicare Supplement - Plan N';
  // Group 1 states plus Texas, which has its own block at the same rates.
  ['LA', 'NC', 'TX'].forEach(function (st) {
    close(engine.findRule('Aflac', st, afg, 60).rate, 0.008, st + ' under 65');
    close(engine.findRule('Aflac', st, afg, 70).rate, 0.22, st + ' 65-79');
    close(engine.findRule('Aflac', st, afg, 82).rate, 0.11, st + ' 80+');
    close(engine.findRule('Aflac', st, n, 70).rate, 0.26, st + ' Plan N 65-79');
  });
  // Arizona is group 1 but has no under-65 availability.
  assert.strictEqual(engine.findRule('Aflac', 'AZ', afg, 60), null, 'AZ has no under-65 plans');
  close(engine.findRule('Aflac', 'AZ', afg, 70).rate, 0.22, 'AZ 65-79');
  // Flat 7% states.
  ['CA', 'ID', 'NV'].forEach(function (st) {
    close(engine.findRule('Aflac', st, afg, 70).rate, 0.07, st + ' flat 7%');
    close(engine.findRule('Aflac', st, n, 82).rate, 0.07, st + ' Plan N flat 7%');
  });
  close(engine.findRule('Aflac', 'VA', 'Medicare Supplement - All marketed plans (incl. Plan N)', 70).rate, 0.07, 'VA');
  // Ohio has no under-65 row.
  assert.strictEqual(engine.findRule('Aflac', 'OH', afg, 60), null, 'OH has no under-65 plans');
  close(engine.findRule('Aflac', 'OH', afg, 70).rate, 0.21, 'OH 65-79');
  close(engine.findRule('Aflac', 'OH', n, 82).rate, 0.125, 'OH Plan N 80+');
});

test('New Jersey Plan N has no under-65 rate but A/F/G/C/D does', function () {
  close(engine.findRule('Aflac', 'NJ', 'Medicare Supplement - Plans A, F, G, C, D', 60).rate, 0.008, 'NJ C/D under 65');
  assert.strictEqual(engine.findRule('Aflac', 'NJ', 'Medicare Supplement - Plan N', 60), null, 'NJ Plan N under 65');
});

console.log('\nAmerican Benefit Life (previously ambiguous state blocks)');

test('New Jersey, Ohio and Nevada are now loaded', function () {
  ['NJ', 'OH', 'NV'].forEach(function (st) {
    var products = engine.getProducts('American Benefit Life', st);
    ['Medicare Supplement - Plan A', 'Medicare Supplement - Plans F & G', 'Medicare Supplement - Plan N']
      .forEach(function (p) {
        assert.ok(products.indexOf(p) !== -1, st + ' should offer ' + p);
      });
  });
});

test('Nevada pays materially less than the other American Benefit Life states', function () {
  var fg = 'Medicare Supplement - Plans F & G';
  close(engine.findRule('American Benefit Life', 'NV', fg, 70).rate, 0.145, 'NV 65-79');
  close(engine.findRule('American Benefit Life', 'NV', fg, 82).rate, 0.0225, 'NV 80+');
  close(engine.findRule('American Benefit Life', 'NV', 'Medicare Supplement - Plan N', 70).rate, 0.20, 'NV Plan N 65-79');
  close(engine.findRule('American Benefit Life', 'NV', 'Medicare Supplement - Plan N', 82).rate, 0.0475, 'NV Plan N 80+');
  // Most states pay 24.50% / 12.25% on F&G.
  close(engine.findRule('American Benefit Life', 'NJ', fg, 70).rate, 0.245, 'NJ 65-79');
  close(engine.findRule('American Benefit Life', 'OH', fg, 70).rate, 0.245, 'OH 65-79');
});

test('Ohio has no under-65 rates, New Jersey has them only on Plan A', function () {
  ['Medicare Supplement - Plan A', 'Medicare Supplement - Plans F & G', 'Medicare Supplement - Plan N']
    .forEach(function (p) {
      assert.strictEqual(engine.findRule('American Benefit Life', 'OH', p, 60), null, 'OH ' + p + ' under 65');
    });
  close(engine.findRule('American Benefit Life', 'NJ', 'Medicare Supplement - Plan A', 60).rate, 0.005, 'NJ Plan A under 65');
  assert.strictEqual(engine.findRule('American Benefit Life', 'NJ', 'Medicare Supplement - Plans F & G', 60), null,
    'NJ F&G has no under-65 rate');
  assert.strictEqual(engine.findRule('American Benefit Life', 'NJ', 'Medicare Supplement - Plan N', 60), null,
    'NJ Plan N has no under-65 rate');
});

test('New Jersey Plan A pays 0% at 80+, which is a rate not a missing lookup', function () {
  var r = engine.calculate({
    carrier: 'American Benefit Life', state: 'NJ',
    product: 'Medicare Supplement - Plan A', age: 82, monthlyPremium: 100
  });
  assert.strictEqual(r.found, true);
  assert.strictEqual(r.rate, 0);
  assert.strictEqual(r.totalFirstYearCommission, 0);
});

test('previously loaded American Benefit Life states are unchanged', function () {
  var fg = 'Medicare Supplement - Plans F & G';
  close(engine.findRule('American Benefit Life', 'LA', fg, 70).rate, 0.245, 'LA group 1');
  close(engine.findRule('American Benefit Life', 'VA', fg, 60).rate, 0.009, 'VA under 65');
  assert.strictEqual(engine.findRule('American Benefit Life', 'AZ', fg, 60), null, 'AZ has no under-65 plans');
  close(engine.findRule('American Benefit Life', 'FL', fg, 60).rate, 0.055, 'FL under 65');
  close(engine.findRule('American Benefit Life', 'IL', fg, 60).rate, 0.0613, 'IL under 65');
  close(engine.findRule('American Benefit Life', 'PA', 'Medicare Supplement - Plan A', 70).rate, 0.089, 'PA Plan A 65-79');
  close(engine.findRule('American Benefit Life', 'NC', fg, 60).rate, 0.009, 'NC under 65');
  close(engine.findRule('American Benefit Life', 'TX', fg, 70).rate, 0.245, 'TX 65-79');
});

console.log('\nGTL (portal rates panel)');

test('GTL rates load with the 9 month advance', function () {
  var cases = [
    ['24HR', 0.45], ['ADV+', 0.50], ['Cancer 2.0', 0.45], ['CP+', 0.55],
    ['Heritage', 0.80], ['HHC', 0.60], ['MedSup', 0.23], ['PCare', 0.45],
    ['RecoverCash', 0.60]
  ];
  cases.forEach(function (c) {
    var r = engine.calculate({
      carrier: 'GTL', state: 'TX', product: c[0], age: 70, monthlyPremium: 100
    });
    assert.ok(r.found, c[0] + ' should resolve');
    close(r.rate, c[1], c[0]);
    assert.strictEqual(r.advanceMonths, 9, c[0] + ' advance');
    close(r.upfrontCommission, 100 * 9 * c[1], c[0] + ' upfront');
    close(r.remainingAsEarned, 100 * 3 * c[1], c[0] + ' remaining as-earned');
  });
});

test('every GTL rule is flagged for verification', function () {
  DATA.rules.filter(function (r) { return r.carrier === 'GTL'; }).forEach(function (r) {
    assert.strictEqual(r.verify, true, r.product + ' should be flagged');
    assert.ok(r.note && r.note.indexOf('no state or age breakdown') !== -1,
      r.product + ' should say the source has no state or age breakdown');
  });
});

test('GTL products with no rate on the panel are not loaded', function () {
  var products = engine.getProducts('GTL', 'TX');
  ['CCash', 'CHS Pro+', 'CI', 'DVH', 'LifeSelect', 'Indemnity Plus', 'IndGap'].forEach(function (p) {
    assert.ok(products.indexOf(p) === -1, p + ' has no rate on the panel and must not be loaded');
  });
});

test('GTL is no longer listed as a carrier without data', function () {
  var names = (DATA.carriersWithoutData || []).map(function (c) { return c.name; });
  assert.ok(names.indexOf('GTL') === -1);
  assert.ok(engine.getCarriers().indexOf('GTL') !== -1, 'GTL should appear in the carrier dropdown');
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

console.log('\nManhattan Life (scanned schedule, read visually)');

test('Short Term Care state bands match the schedule', function () {
  var p = 'Short Term Care';
  // Top band: AK, AL, AR, DC, DE, GA, HI, IA, ID, IL, KS, LA, MA, MD, ME, MO,
  // MS, NC, NH, NM, NV, OR, PA, TX, UT, WI, WV, WY
  ['ID', 'IL', 'LA', 'NC', 'NV', 'PA', 'TX'].forEach(function (st) {
    close(engine.findRule('Manhattan Life', st, p, 60).rate, 0.60, st + ' ages 45-79');
    close(engine.findRule('Manhattan Life', st, p, 82).rate, 0.50, st + ' ages 80+');
  });
  // Second band: AZ, FL, IN, MT, NE, OH, SC, TN, VA
  ['AZ', 'FL', 'OH', 'VA'].forEach(function (st) {
    close(engine.findRule('Manhattan Life', st, p, 60).rate, 0.525, st + ' ages 45-79');
    close(engine.findRule('Manhattan Life', st, p, 82).rate, 0.35, st + ' ages 80+');
  });
  // MN, NJ, RI band
  close(engine.findRule('Manhattan Life', 'NJ', p, 60).rate, 0.30, 'NJ ages 45-79');
  close(engine.findRule('Manhattan Life', 'NJ', p, 82).rate, 0.22, 'NJ ages 80+');
  // California is on no Short Term Care band.
  assert.ok(engine.getProducts('Manhattan Life', 'CA').indexOf(p) === -1,
    'CA is not on any Short Term Care band');
});

test('Short Term Care has an age floor of 45', function () {
  assert.strictEqual(engine.findRule('Manhattan Life', 'TX', 'Short Term Care', 40), null);
  assert.ok(engine.findRule('Manhattan Life', 'TX', 'Short Term Care', 45));
});

test('Florida-only rates override the general rate', function () {
  close(engine.findRule('Manhattan Life', 'TX', 'Affordable Choice', 60).rate, 0.32, 'TX Affordable Choice');
  close(engine.findRule('Manhattan Life', 'FL', 'Affordable Choice', 60).rate, 0.28, 'FL Affordable Choice');
  close(engine.findRule('Manhattan Life', 'TX', 'Out-Of-Pocket Protection Plan', 60).rate, 0.35, 'TX OOP');
  close(engine.findRule('Manhattan Life', 'FL', 'Out-Of-Pocket Protection Plan', 60).rate, 0.275, 'FL OOP');
  var cancer = 'CP4000 CancerCare / Cancer Express / FOB First Diagnosis and Riders';
  close(engine.findRule('Manhattan Life', 'TX', cancer, 60).rate, 0.55, 'TX cancer');
  close(engine.findRule('Manhattan Life', 'FL', cancer, 60).rate, 0.475, 'FL cancer');
});

test('24 Hour Accident excludes Arizona from the general rate', function () {
  close(engine.findRule('Manhattan Life', 'TX', '24 Hour Accident', 60).rate, 0.35, 'TX');
  close(engine.findRule('Manhattan Life', 'AZ', '24 Hour Accident', 60).rate, 0.325, 'AZ has its own rate');
});

test('Hospital Indemnity Select is all states with two age bands', function () {
  engine.getStates('Manhattan Life').forEach(function (st) {
    close(engine.findRule('Manhattan Life', st.code, 'Hospital Indemnity Select', 60).rate, 0.63, st.code + ' 18-79');
    close(engine.findRule('Manhattan Life', st.code, 'Hospital Indemnity Select', 82).rate, 0.475, st.code + ' 80+');
  });
});

test('every Manhattan Life product is as-earned with no advance', function () {
  var r = engine.calculate({
    carrier: 'Manhattan Life', state: 'NV',
    product: 'Short Term Care', age: 60, monthlyPremium: 120
  });
  assert.ok(r.found);
  assert.strictEqual(r.advanceMonths, 0);
  assert.strictEqual(r.paymentMethod, 'as-earned');
  close(r.monthlyCommission, 72, 'monthly commission');
  close(r.totalFirstYearCommission, 864, 'total first year');
});

console.log('\nAflac / Tier One (all 4 pages)');

test('Aflac Final Expense is loaded with both plan types', function () {
  var lvl = engine.findRule('Aflac', 'TX', 'Final Expense - Level Benefit', 60);
  var mod = engine.findRule('Aflac', 'TX', 'Final Expense - Modified', 60);
  close(lvl.rate, 1.08, 'Level Benefit');
  close(mod.rate, 0.95, 'Modified');
  // Issue-age windows differ between the two plans.
  assert.strictEqual(engine.findRule('Aflac', 'TX', 'Final Expense - Level Benefit', 42), null, 'Level starts at 45');
  assert.ok(engine.findRule('Aflac', 'TX', 'Final Expense - Modified', 42), 'Modified starts at 40');
  assert.strictEqual(engine.findRule('Aflac', 'TX', 'Final Expense - Modified', 78), null, 'Modified ends at 75');
  assert.ok(engine.findRule('Aflac', 'TX', 'Final Expense - Level Benefit', 78), 'Level runs to 80');
});

test('Aflac Final Expense uses the 12 month advance', function () {
  var r = engine.calculate({
    carrier: 'Aflac', state: 'TX',
    product: 'Final Expense - Level Benefit', age: 60, monthlyPremium: 100
  });
  assert.ok(r.found);
  assert.strictEqual(r.advanceMonths, 12);
  close(r.totalFirstYearCommission, 1296, 'total first year');
  close(r.upfrontCommission, 1296, 'upfront');
});

test('Aflac Medicare Supplement state blocks match the schedule', function () {
  var afg = 'Medicare Supplement - Plans A, F, G';
  var n = 'Medicare Supplement - Plan N';
  // Group 1 states plus Texas, which has its own block at the same rates.
  ['LA', 'NC', 'TX'].forEach(function (st) {
    close(engine.findRule('Aflac', st, afg, 60).rate, 0.008, st + ' under 65');
    close(engine.findRule('Aflac', st, afg, 70).rate, 0.22, st + ' 65-79');
    close(engine.findRule('Aflac', st, afg, 82).rate, 0.11, st + ' 80+');
    close(engine.findRule('Aflac', st, n, 70).rate, 0.26, st + ' Plan N 65-79');
  });
  // Arizona is group 1 but has no under-65 availability.
  assert.strictEqual(engine.findRule('Aflac', 'AZ', afg, 60), null, 'AZ has no under-65 plans');
  close(engine.findRule('Aflac', 'AZ', afg, 70).rate, 0.22, 'AZ 65-79');
  // Flat 7% states.
  ['CA', 'ID', 'NV'].forEach(function (st) {
    close(engine.findRule('Aflac', st, afg, 70).rate, 0.07, st + ' flat 7%');
    close(engine.findRule('Aflac', st, n, 82).rate, 0.07, st + ' Plan N flat 7%');
  });
  close(engine.findRule('Aflac', 'VA', 'Medicare Supplement - All marketed plans (incl. Plan N)', 70).rate, 0.07, 'VA');
  // Ohio has no under-65 row.
  assert.strictEqual(engine.findRule('Aflac', 'OH', afg, 60), null, 'OH has no under-65 plans');
  close(engine.findRule('Aflac', 'OH', afg, 70).rate, 0.21, 'OH 65-79');
  close(engine.findRule('Aflac', 'OH', n, 82).rate, 0.125, 'OH Plan N 80+');
});

test('New Jersey Plan N has no under-65 rate but A/F/G/C/D does', function () {
  close(engine.findRule('Aflac', 'NJ', 'Medicare Supplement - Plans A, F, G, C, D', 60).rate, 0.008, 'NJ C/D under 65');
  assert.strictEqual(engine.findRule('Aflac', 'NJ', 'Medicare Supplement - Plan N', 60), null, 'NJ Plan N under 65');
});

console.log('\nAmerican Benefit Life (previously ambiguous state blocks)');

test('New Jersey, Ohio and Nevada are now loaded', function () {
  ['NJ', 'OH', 'NV'].forEach(function (st) {
    var products = engine.getProducts('American Benefit Life', st);
    ['Medicare Supplement - Plan A', 'Medicare Supplement - Plans F & G', 'Medicare Supplement - Plan N']
      .forEach(function (p) {
        assert.ok(products.indexOf(p) !== -1, st + ' should offer ' + p);
      });
  });
});

test('Nevada pays materially less than the other American Benefit Life states', function () {
  var fg = 'Medicare Supplement - Plans F & G';
  close(engine.findRule('American Benefit Life', 'NV', fg, 70).rate, 0.145, 'NV 65-79');
  close(engine.findRule('American Benefit Life', 'NV', fg, 82).rate, 0.0225, 'NV 80+');
  close(engine.findRule('American Benefit Life', 'NV', 'Medicare Supplement - Plan N', 70).rate, 0.20, 'NV Plan N 65-79');
  close(engine.findRule('American Benefit Life', 'NV', 'Medicare Supplement - Plan N', 82).rate, 0.0475, 'NV Plan N 80+');
  // Most states pay 24.50% / 12.25% on F&G.
  close(engine.findRule('American Benefit Life', 'NJ', fg, 70).rate, 0.245, 'NJ 65-79');
  close(engine.findRule('American Benefit Life', 'OH', fg, 70).rate, 0.245, 'OH 65-79');
});

test('Ohio has no under-65 rates, New Jersey has them only on Plan A', function () {
  ['Medicare Supplement - Plan A', 'Medicare Supplement - Plans F & G', 'Medicare Supplement - Plan N']
    .forEach(function (p) {
      assert.strictEqual(engine.findRule('American Benefit Life', 'OH', p, 60), null, 'OH ' + p + ' under 65');
    });
  close(engine.findRule('American Benefit Life', 'NJ', 'Medicare Supplement - Plan A', 60).rate, 0.005, 'NJ Plan A under 65');
  assert.strictEqual(engine.findRule('American Benefit Life', 'NJ', 'Medicare Supplement - Plans F & G', 60), null,
    'NJ F&G has no under-65 rate');
  assert.strictEqual(engine.findRule('American Benefit Life', 'NJ', 'Medicare Supplement - Plan N', 60), null,
    'NJ Plan N has no under-65 rate');
});

test('New Jersey Plan A pays 0% at 80+, which is a rate not a missing lookup', function () {
  var r = engine.calculate({
    carrier: 'American Benefit Life', state: 'NJ',
    product: 'Medicare Supplement - Plan A', age: 82, monthlyPremium: 100
  });
  assert.strictEqual(r.found, true);
  assert.strictEqual(r.rate, 0);
  assert.strictEqual(r.totalFirstYearCommission, 0);
});

test('previously loaded American Benefit Life states are unchanged', function () {
  var fg = 'Medicare Supplement - Plans F & G';
  close(engine.findRule('American Benefit Life', 'LA', fg, 70).rate, 0.245, 'LA group 1');
  close(engine.findRule('American Benefit Life', 'VA', fg, 60).rate, 0.009, 'VA under 65');
  assert.strictEqual(engine.findRule('American Benefit Life', 'AZ', fg, 60), null, 'AZ has no under-65 plans');
  close(engine.findRule('American Benefit Life', 'FL', fg, 60).rate, 0.055, 'FL under 65');
  close(engine.findRule('American Benefit Life', 'IL', fg, 60).rate, 0.0613, 'IL under 65');
  close(engine.findRule('American Benefit Life', 'PA', 'Medicare Supplement - Plan A', 70).rate, 0.089, 'PA Plan A 65-79');
  close(engine.findRule('American Benefit Life', 'NC', fg, 60).rate, 0.009, 'NC under 65');
  close(engine.findRule('American Benefit Life', 'TX', fg, 70).rate, 0.245, 'TX 65-79');
});

console.log('\nGTL (portal rates panel)');

test('GTL rates load with the 9 month advance', function () {
  var cases = [
    ['24HR', 0.45], ['ADV+', 0.50], ['Cancer 2.0', 0.45], ['CP+', 0.55],
    ['Heritage', 0.80], ['HHC', 0.60], ['MedSup', 0.23], ['PCare', 0.45],
    ['RecoverCash', 0.60]
  ];
  cases.forEach(function (c) {
    var r = engine.calculate({
      carrier: 'GTL', state: 'TX', product: c[0], age: 70, monthlyPremium: 100
    });
    assert.ok(r.found, c[0] + ' should resolve');
    close(r.rate, c[1], c[0]);
    assert.strictEqual(r.advanceMonths, 9, c[0] + ' advance');
    close(r.upfrontCommission, 100 * 9 * c[1], c[0] + ' upfront');
    close(r.remainingAsEarned, 100 * 3 * c[1], c[0] + ' remaining as-earned');
  });
});

test('every GTL rule is flagged for verification', function () {
  DATA.rules.filter(function (r) { return r.carrier === 'GTL'; }).forEach(function (r) {
    assert.strictEqual(r.verify, true, r.product + ' should be flagged');
    assert.ok(r.note && r.note.indexOf('no state or age breakdown') !== -1,
      r.product + ' should say the source has no state or age breakdown');
  });
});

test('GTL products with no rate on the panel are not loaded', function () {
  var products = engine.getProducts('GTL', 'TX');
  ['CCash', 'CHS Pro+', 'CI', 'DVH', 'LifeSelect', 'Indemnity Plus', 'IndGap'].forEach(function (p) {
    assert.ok(products.indexOf(p) === -1, p + ' has no rate on the panel and must not be loaded');
  });
});

test('GTL is no longer listed as a carrier without data', function () {
  var names = (DATA.carriersWithoutData || []).map(function (c) { return c.name; });
  assert.ok(names.indexOf('GTL') === -1);
  assert.ok(engine.getCarriers().indexOf('GTL') !== -1, 'GTL should appear in the carrier dropdown');
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
