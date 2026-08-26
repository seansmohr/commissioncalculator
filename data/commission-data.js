/*
 * Commission lookup data for the Mohr Insurance Services commission calculator.
 *
 * SOURCE OF TRUTH
 * ---------------
 *   - "Carrier Advances_Commission schedules.xlsx"  -> carriers, advance arrangements, appointed states
 *   - The carrier commission schedules linked from that spreadsheet -> commission percentages
 *
 * Every rate below is transcribed from our own contracted schedules at our own
 * contract level (Aetna GA level 12, Healthspring/Loyal GA-60, Physicians Mutual
 * General Agent street, ManhattanLife MGA Level 5, Aflac/Tier One GA 8, American
 * Benefit Life GA 10, Liberty Bankers GA10 / Level 10, Medico MGA Level 4,
 * Bankers Fidelity General Agent). No street-level or publicly published rates
 * are used anywhere in this file.
 *
 * Rates are FIRST-YEAR (policy year 1) rates, which is what the calculator needs.
 * Renewal-year rates are intentionally not modeled in Version 1.
 *
 * See data/SOURCES.md for provenance notes and known gaps.
 */

(function (root) {
  'use strict';

  // ---------------------------------------------------------------------------
  // Appointed states (spreadsheet, column F)
  // ---------------------------------------------------------------------------
  var APPOINTED_STATES = {
    AZ: 'Arizona',
    CA: 'California',
    FL: 'Florida',
    ID: 'Idaho',
    IL: 'Illinois',
    LA: 'Louisiana',
    NC: 'North Carolina',
    NJ: 'New Jersey',
    NV: 'Nevada',
    OH: 'Ohio',
    PA: 'Pennsylvania',
    TX: 'Texas',
    VA: 'Virginia'
  };

  // ---------------------------------------------------------------------------
  // Advance arrangements (spreadsheet, column B - authoritative)
  //
  // `default` applies to every product category unless the category is listed
  // explicitly. Categories: medicare_supplement | ancillary | life |
  // final_expense | long_term_care
  // ---------------------------------------------------------------------------
  var ADVANCES = {
    'Aetna Senior Supplemental': {
      default: 12,
      source: 'Spreadsheet: "12 month advance"'
    },
    'Mutual of Omaha': {
      default: 12,
      source: 'Spreadsheet: "12 month advance". Contract summary also notes a 9 month advance on the Accidental Death product only.'
    },
    'Healthspring': {
      default: 12,
      source: 'Spreadsheet: "12 month advance"'
    },
    'Physicians Mutual': {
      default: 9,
      source: 'Spreadsheet: "9 month advance"'
    },
    'Manhattan Life': {
      default: 0,
      source: 'Spreadsheet: "No advance"'
    },
    'Aflac': {
      default: 12,
      source: 'Spreadsheet: "12 month advance"'
    },
    'American Benefit Life': {
      default: 12,
      source: 'Spreadsheet: "12 month advance"'
    },
    'GTL': {
      default: 9,
      source: 'Spreadsheet: "9 month advance"'
    },
    'Liberty Bankers': {
      default: 9,
      byCategory: { medicare_supplement: 0 },
      source: 'Spreadsheet: "9 month advance for ancillary ; No advance for Medicare supplement"'
    },
    'Medico': {
      default: 9,
      source: 'Spreadsheet: "9 month advance"'
    },
    'Bankers Fidelity': {
      default: 6,
      byCategory: { medicare_supplement: 9 },
      source: 'Spreadsheet: "9 month advance for Medicare Supplement ; 6 month advance for ancillary"'
    },
    'Heartland': {
      // The spreadsheet leaves the advance column blank for Heartland, and the
      // schedule confirms advances exist ("chargebacks on unearned advanced
      // premiums") without stating a term. null = known carrier, unknown term:
      // the calculator shows the rate and total first-year commission but will
      // not invent an upfront figure.
      default: null,
      source: 'Advance term not stated in the spreadsheet or the schedule. The Medicare Supplement schedule adds: "Commissions are not advanced on policies for Under 65 or 81+ policyholders."'
    }
  };

  // ---------------------------------------------------------------------------
  // Commission rules
  //
  //   carrier   - carrier name (must match ADVANCES key)
  //   states    - array of appointed-state codes this rule covers
  //   category  - drives which advance applies
  //   product   - the label shown in the Product dropdown
  //   minAge    - inclusive lower bound of the age band (omit for no lower bound)
  //   maxAge    - inclusive upper bound of the age band (omit for no upper bound)
  //   rate      - first-year commission rate as a decimal
  //   note      - optional rule/exception text shown on the results card
  //   verify    - optional: rate transcribed from a multi-column PDF table whose
  //               column-to-state mapping should be spot-checked before relying on it
  // ---------------------------------------------------------------------------

  // Shorthand state groups used repeatedly below.
  var ALL = ['AZ', 'CA', 'FL', 'ID', 'IL', 'LA', 'NC', 'NJ', 'NV', 'OH', 'PA', 'TX', 'VA'];

  var RULES = [];

  function add(rules) {
    RULES = RULES.concat(rules);
  }

  // ===========================================================================
  // AETNA SENIOR SUPPLEMENTAL  (GA level 12) - 12 month advance
  // ===========================================================================
  add([
    // --- Medicare Supplement -------------------------------------------------
    {
      carrier: 'Aetna Senior Supplemental', states: ['CA'], category: 'medicare_supplement',
      product: 'Medicare Supplement - All marketed plans (incl. Plan N)',
      minAge: 65, rate: 0.25
    },
    {
      carrier: 'Aetna Senior Supplemental', states: ['CA'], category: 'medicare_supplement',
      product: 'Medicare Supplement - All marketed plans (incl. Plan N)',
      maxAge: 64, rate: 0.015, note: 'Under age 65 rate.'
    },

    {
      carrier: 'Aetna Senior Supplemental', states: ['AZ', 'LA', 'NC', 'NJ', 'NV', 'VA'], category: 'medicare_supplement',
      product: 'Medicare Supplement - All plans except Plan N',
      minAge: 65, rate: 0.25
    },
    {
      carrier: 'Aetna Senior Supplemental', states: ['LA', 'NC', 'NJ', 'NV', 'VA'], category: 'medicare_supplement',
      product: 'Medicare Supplement - All plans except Plan N',
      maxAge: 64, rate: 0.015, note: 'Under age 65 rate.'
    },
    {
      carrier: 'Aetna Senior Supplemental', states: ['AZ', 'LA', 'NC', 'NJ', 'NV', 'VA'], category: 'medicare_supplement',
      product: 'Medicare Supplement - Plan N',
      minAge: 65, rate: 0.30
    },
    {
      carrier: 'Aetna Senior Supplemental', states: ['LA', 'NV'], category: 'medicare_supplement',
      product: 'Medicare Supplement - Plan N',
      maxAge: 64, rate: 0.015,
      note: 'Under age 65 rate. Plan N is not available to Medicare beneficiaries under age 65 in AZ, NC, NJ or VA.'
    },

    {
      carrier: 'Aetna Senior Supplemental', states: ['FL'], category: 'medicare_supplement',
      product: 'Medicare Supplement - All marketed plans (incl. Plan N)',
      minAge: 65, rate: 0.24
    },
    {
      carrier: 'Aetna Senior Supplemental', states: ['FL'], category: 'medicare_supplement',
      product: 'Medicare Supplement - All marketed plans (incl. Plan N)',
      maxAge: 64, rate: 0.065, note: 'Under age 65 rate.'
    },

    {
      carrier: 'Aetna Senior Supplemental', states: ['ID'], category: 'medicare_supplement',
      product: 'Medicare Supplement - All plans except Plan N', rate: 0.25
    },
    {
      carrier: 'Aetna Senior Supplemental', states: ['ID'], category: 'medicare_supplement',
      product: 'Medicare Supplement - Plan N', rate: 0.30
    },

    {
      carrier: 'Aetna Senior Supplemental', states: ['IL'], category: 'medicare_supplement',
      product: 'Medicare Supplement - All plans except Plan N',
      maxAge: 64, rate: 0.125, note: 'Under age 65 rate.'
    },
    {
      carrier: 'Aetna Senior Supplemental', states: ['IL'], category: 'medicare_supplement',
      product: 'Medicare Supplement - All plans except Plan N',
      minAge: 65, maxAge: 79, rate: 0.25
    },
    {
      carrier: 'Aetna Senior Supplemental', states: ['IL'], category: 'medicare_supplement',
      product: 'Medicare Supplement - All plans except Plan N',
      minAge: 80, rate: 0.125, note: 'Illinois pays a reduced rate at ages 80+.'
    },
    {
      carrier: 'Aetna Senior Supplemental', states: ['IL'], category: 'medicare_supplement',
      product: 'Medicare Supplement - Plan N',
      maxAge: 64, rate: 0.15, note: 'Under age 65 rate.'
    },
    {
      carrier: 'Aetna Senior Supplemental', states: ['IL'], category: 'medicare_supplement',
      product: 'Medicare Supplement - Plan N',
      minAge: 65, maxAge: 79, rate: 0.30
    },
    {
      carrier: 'Aetna Senior Supplemental', states: ['IL'], category: 'medicare_supplement',
      product: 'Medicare Supplement - Plan N',
      minAge: 80, rate: 0.15, note: 'Illinois pays a reduced rate at ages 80+.'
    },

    {
      carrier: 'Aetna Senior Supplemental', states: ['OH'], category: 'medicare_supplement',
      product: 'Medicare Supplement - All plans except Plan N',
      minAge: 65, rate: 0.24,
      note: 'Plans are not available to Medicare beneficiaries under age 65 in OH.'
    },
    {
      carrier: 'Aetna Senior Supplemental', states: ['OH'], category: 'medicare_supplement',
      product: 'Medicare Supplement - Plan N',
      minAge: 65, rate: 0.29,
      note: 'Plans are not available to Medicare beneficiaries under age 65 in OH.'
    },

    {
      carrier: 'Aetna Senior Supplemental', states: ['PA'], category: 'medicare_supplement',
      product: 'Medicare Supplement - All plans except Plan N', minAge: 65, rate: 0.25
    },
    {
      carrier: 'Aetna Senior Supplemental', states: ['PA'], category: 'medicare_supplement',
      product: 'Medicare Supplement - All plans except Plan N', maxAge: 64, rate: 0.0325,
      note: 'Under age 65 rate.'
    },
    {
      carrier: 'Aetna Senior Supplemental', states: ['PA'], category: 'medicare_supplement',
      product: 'Medicare Supplement - Plan N', minAge: 65, rate: 0.30
    },
    {
      carrier: 'Aetna Senior Supplemental', states: ['PA'], category: 'medicare_supplement',
      product: 'Medicare Supplement - Plan N', maxAge: 64, rate: 0.0325,
      note: 'Under age 65 rate.'
    },

    {
      carrier: 'Aetna Senior Supplemental', states: ['TX'], category: 'medicare_supplement',
      product: 'Medicare Supplement - All plans except Plan N', minAge: 65, rate: 0.25
    },
    {
      carrier: 'Aetna Senior Supplemental', states: ['TX'], category: 'medicare_supplement',
      product: 'Medicare Supplement - All plans except Plan N', maxAge: 64, rate: 0.015,
      note: 'Under age 65 rate.'
    },
    {
      carrier: 'Aetna Senior Supplemental', states: ['TX'], category: 'medicare_supplement',
      product: 'Medicare Supplement - Plan N', minAge: 65, rate: 0.30,
      note: 'Plan N is not available to Medicare beneficiaries under age 65 in TX.'
    },

    // --- Complementary Health (ancillary) -----------------------------------
    {
      carrier: 'Aetna Senior Supplemental', states: ['CA'], category: 'ancillary',
      product: 'Cancer and Heart Attack or Stroke Plus',
      minAge: 18, maxAge: 64, rate: 1.00,
      note: 'In California issue ages are 18 to 64.'
    },
    {
      carrier: 'Aetna Senior Supplemental', states: ['ID', 'IL', 'LA', 'NC', 'NV', 'PA', 'TX', 'VA'], category: 'ancillary',
      product: 'Cancer and Heart Attack or Stroke Plus', minAge: 18, maxAge: 84, rate: 1.00
    },
    {
      carrier: 'Aetna Senior Supplemental', states: ['ID', 'IL', 'LA', 'NC', 'NV', 'PA', 'TX', 'VA'], category: 'ancillary',
      product: 'Cancer and Heart Attack or Stroke Plus', minAge: 85, maxAge: 89, rate: 0.80
    },
    {
      carrier: 'Aetna Senior Supplemental', states: ['AZ', 'FL', 'OH'], category: 'ancillary',
      product: 'Cancer and Heart Attack or Stroke Plus', minAge: 18, maxAge: 84, rate: 0.95
    },
    {
      carrier: 'Aetna Senior Supplemental', states: ['AZ', 'FL', 'OH'], category: 'ancillary',
      product: 'Cancer and Heart Attack or Stroke Plus', minAge: 85, maxAge: 89, rate: 0.75
    },
    {
      carrier: 'Aetna Senior Supplemental', states: ['NJ'], category: 'ancillary',
      product: 'Cancer and Heart Attack or Stroke Plus', minAge: 18, maxAge: 84, rate: 0.91
    },
    {
      carrier: 'Aetna Senior Supplemental', states: ['NJ'], category: 'ancillary',
      product: 'Cancer and Heart Attack or Stroke Plus', minAge: 85, maxAge: 89, rate: 0.60
    },

    {
      carrier: 'Aetna Senior Supplemental', states: ['AZ', 'CA', 'FL', 'ID', 'IL', 'LA', 'NV', 'OH', 'PA', 'TX'], category: 'ancillary',
      product: 'Dental, Vision and Hearing', minAge: 18, maxAge: 70, rate: 0.57
    },
    {
      carrier: 'Aetna Senior Supplemental', states: ['AZ', 'CA', 'FL', 'ID', 'IL', 'LA', 'NV', 'OH', 'PA', 'TX'], category: 'ancillary',
      product: 'Dental, Vision and Hearing', minAge: 71, maxAge: 89, rate: 0.52
    },
    {
      carrier: 'Aetna Senior Supplemental', states: ['NJ'], category: 'ancillary',
      product: 'Dental, Vision and Hearing', maxAge: 64, rate: 0.57
    },
    {
      carrier: 'Aetna Senior Supplemental', states: ['NJ'], category: 'ancillary',
      product: 'Dental, Vision and Hearing', minAge: 65, maxAge: 89, rate: 0.42
    },

    {
      carrier: 'Aetna Senior Supplemental', states: ['AZ', 'CA', 'FL', 'ID', 'IL', 'LA', 'NJ', 'OH', 'PA', 'TX'], category: 'ancillary',
      product: 'Dental, Vision and Hearing Plus', minAge: 18, maxAge: 70, rate: 0.57
    },
    {
      carrier: 'Aetna Senior Supplemental', states: ['AZ', 'CA', 'FL', 'ID', 'IL', 'LA', 'NJ', 'OH', 'PA', 'TX'], category: 'ancillary',
      product: 'Dental, Vision and Hearing Plus', minAge: 71, maxAge: 89, rate: 0.52
    },
    {
      carrier: 'Aetna Senior Supplemental', states: ['NV'], category: 'ancillary',
      product: 'Dental, Vision and Hearing Plus', minAge: 18, maxAge: 70, rate: 0.22
    },
    {
      carrier: 'Aetna Senior Supplemental', states: ['NV'], category: 'ancillary',
      product: 'Dental, Vision and Hearing Plus', minAge: 71, maxAge: 89, rate: 0.17
    },

    // --- Final Expense -------------------------------------------------------
    {
      carrier: 'Aetna Senior Supplemental', states: ALL, category: 'final_expense',
      product: 'ACC Final Expense - Level Benefit (Standard / Preferred / Super Preferred)',
      minAge: 40, maxAge: 89, rate: 1.37,
      note: 'No commission on policy fee or policy conversions. An additional 18% Super Preferred rate may apply if the client also places a qualifying underwritten Aetna Medicare Supplement policy within 6 months.'
    },
    {
      carrier: 'Aetna Senior Supplemental', states: ALL, category: 'final_expense',
      product: 'ACC Final Expense - Modified Benefit (Standard)',
      minAge: 40, maxAge: 75, rate: 1.27,
      note: 'No commission on policy fee or policy conversions.'
    }
  ]);

  // --- Aetna Complementary Health, remaining products ------------------------
  // Transcribed from pages 6-8 of the schedule (Dental Vision and Hearing Flex
  // and Recovery Care Choice are scanned pages, read visually; the Protection
  // Series / Legacy tables on page 7 were read from the PDF text layer with
  // column coordinates and confirmed against a render of the page).
  (function aetnaComplementaryHealth() {
    function ah(states, product, bands, note) {
      bands.forEach(function (b) {
        add([{
          carrier: 'Aetna Senior Supplemental', states: states, category: 'ancillary',
          product: product, minAge: b[0], maxAge: b[1], rate: b[2], note: note
        }]);
      });
    }

    // Dental Vision and Hearing Flex (page 6). Not available in VA.
    ah(['AZ', 'CA', 'ID', 'IL', 'LA', 'NC', 'NJ', 'OH', 'PA', 'TX'],
      'Dental Vision and Hearing Flex', [[18, 70, 0.57], [71, 89, 0.52]]);
    ah(['FL'], 'Dental Vision and Hearing Flex', [[18, 70, 0.47], [71, 89, 0.42]]);
    ah(['NV'], 'Dental Vision and Hearing Flex - Dental Only',
      [[18, 70, 0.17], [71, 89, 0.12]], 'Nevada has separate rates for the Dental Only plan.');
    ah(['NV'], 'Dental Vision and Hearing Flex - Dental, Vision and Hearing',
      [[18, 70, 0.26], [71, 89, 0.21]], 'Nevada has separate rates for the full Dental, Vision and Hearing plan.');

    // Protection Series - Home Care Plus (page 7)
    ah(['ID', 'IL', 'LA', 'NC', 'NV', 'OH', 'PA', 'TX'], 'Home Care Plus', [[50, 89, 0.625]]);
    ah(['AZ', 'VA'], 'Home Care Plus', [[50, 89, 0.58]]);

    // Protection Series - Home Recovery Care (page 7). Texas only.
    ah(['TX'], 'Home Recovery Care', [[50, 89, 0.625]]);

    // Protection Series - Hospital Indemnity Flex (page 7)
    ah(['CA', 'ID', 'IL', 'LA', 'NC', 'NV', 'OH', 'PA', 'TX'], 'Hospital Indemnity Flex', [[18, 89, 0.625]]);
    ah(['AZ', 'FL', 'VA'], 'Hospital Indemnity Flex', [[18, 89, 0.58]]);
    ah(['NJ'], 'Hospital Indemnity Flex', [[18, 89, 0.58]]);

    // Protection Series - Recovery Care (page 7)
    ah(['ID', 'IL', 'LA', 'NC', 'NV', 'OH', 'PA', 'TX', 'VA'], 'Recovery Care', [[50, 89, 0.625]]);
    ah(['AZ'], 'Recovery Care', [[50, 89, 0.58]]);

    // Legacy - Nursing Facility Care (HFN-97) (page 7). Pennsylvania only.
    ah(['PA'], 'Nursing Facility Care (HFN-97)', [[50, 89, 0.625]]);

    // Recovery Care Choice (page 8). Not available in CA, FL, ID, NJ, PA or VA.
    ah(['AZ', 'IL', 'LA', 'NC', 'NV', 'OH', 'TX'], 'Recovery Care Choice', [[40, 89, 0.625]]);
  }());

  // ===========================================================================
  // MUTUAL OF OMAHA - 12 month advance (health products)
  //
  // The schedule PDF contains only the Long Term Care compensation schedule
  // (MT0044_0526, MUTUAL LONG TERM CARE MC8). Our Mutual of Omaha appointments
  // are CA, PA and VA. California has its own policy form (LTC09M-CA);
  // Pennsylvania has its own table with two variants; Virginia falls under the
  // National table.
  // ===========================================================================
  (function mutualOfOmaha() {
    function ltc(states, product, bands, note) {
      bands.forEach(function (b) {
        add([{
          carrier: 'Mutual of Omaha', states: states, category: 'long_term_care',
          product: product, minAge: b[0], maxAge: b[1], rate: b[2], note: note
        }]);
      });
    }

    // California (policy form LTC09M-CA) and Virginia (National) pay the same
    // new-business rates.
    ltc(['CA', 'VA'], 'Long Term Care - Individual (new business)',
      [[null, 69, 0.60], [70, 74, 0.40], [75, 79, 0.35]]);
    ltc(['CA', 'VA'], 'Long Term Care - Association / Sponsored Group / Common Employer (new business)',
      [[null, 69, 0.55], [70, 74, 0.35], [75, 79, 0.30]]);

    // Pennsylvania pays two different new-business scales depending on whether
    // the writing General Agent has other General Agents in their downline.
    // Both are listed so the correct one can be chosen rather than assumed.
    var withDownline = 'Pennsylvania rate for a writing General Agent who HAS other General Agents reporting to them in their downline distribution.';
    var noDownline = 'Pennsylvania rate for a writing General Agent who does NOT have other General Agents reporting to them in their downline distribution.';

    ltc(['PA'], 'Long Term Care - Individual (new business, with downline General Agents)',
      [[null, 69, 0.60], [70, 74, 0.40], [75, 79, 0.35]], withDownline);
    ltc(['PA'], 'Long Term Care - Association / Sponsored Group / Common Employer (new business, with downline General Agents)',
      [[null, 69, 0.55], [70, 74, 0.35], [75, 79, 0.30]], withDownline);
    ltc(['PA'], 'Long Term Care - Individual (new business, no downline General Agents)',
      [[null, 69, 0.50], [70, 74, 0.30], [75, 79, 0.25]], noDownline);
    ltc(['PA'], 'Long Term Care - Association / Sponsored Group / Common Employer (new business, no downline General Agents)',
      [[null, 69, 0.45], [70, 74, 0.25], [75, 79, 0.20]], noDownline);
  }());

  // ===========================================================================
  // HEALTHSPRING (Loyal American Life) - GA-60 - 12 month advance
  // ===========================================================================
  add([
    // --- Medicare Supplement (California is our only appointed state on this schedule)
    {
      carrier: 'Healthspring', states: ['CA'], category: 'medicare_supplement',
      product: 'Medicare Supplement - Plan A', rate: 0.05
    },
    {
      carrier: 'Healthspring', states: ['CA'], category: 'medicare_supplement',
      product: 'Medicare Supplement - Plans F & G', minAge: 65, maxAge: 79, rate: 0.15
    },
    {
      carrier: 'Healthspring', states: ['CA'], category: 'medicare_supplement',
      product: 'Medicare Supplement - Plans F & G', minAge: 80, rate: 0.065
    },
    {
      carrier: 'Healthspring', states: ['CA'], category: 'medicare_supplement',
      product: 'Medicare Supplement - Plans F & G', maxAge: 64, rate: 0.05,
      note: 'California issue age 64 rate (Plan F).'
    },
    {
      carrier: 'Healthspring', states: ['CA'], category: 'medicare_supplement',
      product: 'Medicare Supplement - Plan N', minAge: 65, maxAge: 79, rate: 0.18
    },
    {
      carrier: 'Healthspring', states: ['CA'], category: 'medicare_supplement',
      product: 'Medicare Supplement - Plan N', minAge: 80, rate: 0.09
    },
    {
      carrier: 'Healthspring', states: ['CA'], category: 'medicare_supplement',
      product: 'Medicare Supplement - Plan N', maxAge: 64, rate: 0.05,
      note: 'California issue age 64 rate.'
    },

    // --- Ancillary -----------------------------------------------------------
    {
      carrier: 'Healthspring', states: ['AZ', 'FL', 'ID', 'IL', 'LA', 'NC', 'NJ', 'OH', 'PA', 'TX', 'VA'], category: 'ancillary',
      product: 'Dental, Vision, Hearing (Heaped)', minAge: 18, maxAge: 89, rate: 0.55
    },
    {
      carrier: 'Healthspring', states: ['CA'], category: 'ancillary',
      product: 'Dental, Vision, Hearing (Heaped)', minAge: 18, maxAge: 89, rate: 0.375
    },
    {
      carrier: 'Healthspring', states: ['NV'], category: 'ancillary',
      product: 'Dental, Vision, Hearing (Heaped)', minAge: 18, maxAge: 89, rate: 0.15
    },

    {
      carrier: 'Healthspring', states: ALL, category: 'ancillary',
      product: 'Choice Short Term Care', maxAge: 79, rate: 0.61,
      note: 'Rate is based on the issue age of the primary insured (and spouse, if applicable).'
    },
    {
      carrier: 'Healthspring', states: ALL, category: 'ancillary',
      product: 'Choice Short Term Care', minAge: 80, rate: 0.50,
      note: 'Rate is based on the issue age of the primary insured (and spouse, if applicable).'
    },

    {
      carrier: 'Healthspring', states: ['AZ', 'CA', 'FL', 'ID', 'IL', 'LA', 'NC', 'NV', 'OH', 'PA', 'TX', 'VA'], category: 'ancillary',
      product: 'Choice Hospital Indemnity', rate: 0.55
    },
    {
      carrier: 'Healthspring', states: ['NJ'], category: 'ancillary',
      product: 'Choice Hospital Indemnity', rate: 0.35
    },

    {
      carrier: 'Healthspring', states: ['AZ', 'FL', 'ID', 'IL', 'LA', 'NC', 'NJ', 'NV', 'OH', 'PA', 'TX', 'VA'], category: 'ancillary',
      product: 'Flexible Choice Hospital Indemnity Senior', minAge: 50, maxAge: 85, rate: 0.55,
      note: 'Not available in CA, CT, NH, NY or UT.'
    },

    {
      carrier: 'Healthspring', states: ['AZ', 'CA', 'FL', 'ID', 'IL', 'LA', 'NC', 'NJ', 'NV', 'PA', 'TX', 'VA'], category: 'ancillary',
      product: 'Choice Accident', rate: 0.60
    },
    {
      carrier: 'Healthspring', states: ['OH'], category: 'ancillary',
      product: 'Choice Accident', rate: 0.55
    },

    {
      carrier: 'Healthspring', states: ['AZ', 'CA', 'ID', 'IL', 'LA', 'NC', 'NJ', 'NV', 'OH', 'PA', 'TX', 'VA'], category: 'ancillary',
      product: 'Accident Treatment', rate: 0.60
    },
    {
      carrier: 'Healthspring', states: ['FL'], category: 'ancillary',
      product: 'Accident Treatment', rate: 0.50
    },

    {
      carrier: 'Healthspring', states: ['AZ', 'CA', 'ID', 'IL', 'LA', 'NC', 'NJ', 'NV', 'OH', 'PA', 'TX', 'VA'], category: 'ancillary',
      product: 'Accident Expense', rate: 0.45
    },
    {
      carrier: 'Healthspring', states: ['FL'], category: 'ancillary',
      product: 'Accident Expense', rate: 0.20
    },

    {
      carrier: 'Healthspring', states: ['AZ', 'CA', 'ID', 'IL', 'LA', 'NC', 'NV', 'OH', 'PA', 'TX', 'VA'], category: 'ancillary',
      product: 'Flexible Choice Cancer / Heart Attack & Stroke / Cancer Treatment', rate: 0.60
    },
    {
      carrier: 'Healthspring', states: ['FL', 'NJ'], category: 'ancillary',
      product: 'Flexible Choice Cancer / Heart Attack & Stroke / Cancer Treatment', rate: 0.50
    },

    // --- Dental, Vision, Hearing: Level variant (all years, no heaping) ------
    {
      carrier: 'Healthspring', states: ['AZ', 'FL', 'ID', 'IL', 'LA', 'NC', 'NJ', 'OH', 'PA', 'TX', 'VA'], category: 'ancillary',
      product: 'Dental, Vision, Hearing (Level)', minAge: 18, maxAge: 89, rate: 0.15,
      note: 'Level plan pays the same rate in all policy years.'
    },
    {
      carrier: 'Healthspring', states: ['CA'], category: 'ancillary',
      product: 'Dental, Vision, Hearing (Level)', minAge: 18, maxAge: 89, rate: 0.08,
      note: 'Level plan pays the same rate in all policy years.'
    },
    {
      carrier: 'Healthspring', states: ['NV'], category: 'ancillary',
      product: 'Dental, Vision, Hearing (Level)', minAge: 18, maxAge: 89, rate: 0.05,
      note: 'Level plan pays the same rate in all policy years.'
    },

    // --- Flexible Choice Hospital Indemnity Riders ---------------------------
    // Not available in CA, CT, DC, ID, MA, NH, NJ, NY or UT.
    {
      carrier: 'Healthspring', states: ['AZ', 'IL', 'LA', 'NC', 'NV', 'OH', 'PA', 'TX', 'VA'], category: 'ancillary',
      product: 'Flexible Choice Hospital Indemnity - Accident Rider', rate: 0.45
    },
    {
      carrier: 'Healthspring', states: ['FL'], category: 'ancillary',
      product: 'Flexible Choice Hospital Indemnity - Accident Rider', rate: 0.45
    },
    {
      carrier: 'Healthspring', states: ['AZ', 'IL', 'LA', 'NC', 'NV', 'OH', 'PA', 'TX', 'VA'], category: 'ancillary',
      product: 'Flexible Choice Hospital Indemnity - Lump Sum Heart, Stroke and Restoration Rider', rate: 0.60
    },
    {
      carrier: 'Healthspring', states: ['FL'], category: 'ancillary',
      product: 'Flexible Choice Hospital Indemnity - Lump Sum Heart, Stroke and Restoration Rider', rate: 0.55
    },
    {
      carrier: 'Healthspring', states: ['AZ', 'IL', 'LA', 'NC', 'NV', 'OH', 'PA', 'TX', 'VA'], category: 'ancillary',
      product: 'Flexible Choice Hospital Indemnity - Lump Sum Cancer Recurrence Rider', rate: 0.60
    },
    {
      carrier: 'Healthspring', states: ['FL'], category: 'ancillary',
      product: 'Flexible Choice Hospital Indemnity - Lump Sum Cancer Recurrence Rider', rate: 0.55
    },
    {
      carrier: 'Healthspring', states: ['AZ', 'IL', 'LA', 'NC', 'NV', 'OH', 'PA', 'TX', 'VA'], category: 'ancillary',
      product: 'Flexible Choice Hospital Indemnity - Specified Disease Rider', rate: 0.55
    },
    {
      carrier: 'Healthspring', states: ['FL'], category: 'ancillary',
      product: 'Flexible Choice Hospital Indemnity - Specified Disease Rider', rate: 0.55
    },

    // --- Return of Premium Rider ---------------------------------------------
    {
      carrier: 'Healthspring', states: ALL, category: 'ancillary',
      product: 'Return of Premium Rider (on selected products)', rate: 0.50,
      note: 'Pays first year only; renewal years are 0%.'
    },

    // --- Whole Life ----------------------------------------------------------
    {
      carrier: 'Healthspring', states: ALL, category: 'life',
      product: 'Individual Whole Life - Level Plan', minAge: 50, maxAge: 79, rate: 1.10,
      note: 'Maximum advance for all Whole Life production is $1,500 for the writing agent.'
    },
    {
      carrier: 'Healthspring', states: ALL, category: 'life',
      product: 'Individual Whole Life - Level Plan', minAge: 80, maxAge: 85, rate: 0.875,
      note: 'Maximum advance for all Whole Life production is $1,500 for the writing agent.'
    },
    {
      carrier: 'Healthspring', states: ALL, category: 'life',
      product: 'Individual Whole Life - Modified Plan', minAge: 50, maxAge: 79, rate: 0.875,
      note: 'Maximum advance for all Whole Life production is $1,500 for the writing agent.'
    },
    {
      carrier: 'Healthspring', states: ALL, category: 'life',
      product: 'Individual Whole Life - Modified Plan', minAge: 80, maxAge: 85, rate: 0.675,
      note: 'Maximum advance for all Whole Life production is $1,500 for the writing agent.'
    },
    {
      carrier: 'Healthspring', states: ALL, category: 'life',
      product: 'Companion Whole Life', minAge: 64, maxAge: 79, rate: 1.00,
      note: 'Maximum advance for all Whole Life production is $1,500 for the writing agent.'
    },
    {
      carrier: 'Healthspring', states: ALL, category: 'life',
      product: 'Companion Whole Life', minAge: 80, maxAge: 85, rate: 0.75,
      note: 'Maximum advance for all Whole Life production is $1,500 for the writing agent.'
    }
  ]);

  // ===========================================================================
  // PHYSICIANS MUTUAL - General Agent (street) - 9 month advance
  // ===========================================================================
  add([
    {
      carrier: 'Physicians Mutual', states: ALL, category: 'medicare_supplement',
      product: 'Medicare Supplement (Medigap) - Open Enrollment',
      minAge: 65, maxAge: 79, rate: 0.21
    },
    {
      carrier: 'Physicians Mutual', states: ALL, category: 'medicare_supplement',
      product: 'Medicare Supplement (Medigap) - Open Enrollment',
      minAge: 80, rate: 0.01,
      note: 'Issue ages 80+ pay the reduced "All Other Guaranteed Issue, Underage & Issue Ages 80+" rate.'
    },
    {
      carrier: 'Physicians Mutual', states: ALL, category: 'medicare_supplement',
      product: 'Medicare Supplement (Medigap) - Open Enrollment',
      maxAge: 64, rate: 0.01,
      note: 'Underage business pays the reduced "All Other Guaranteed Issue, Underage & Issue Ages 80+" rate.'
    },
    {
      carrier: 'Physicians Mutual', states: ALL, category: 'medicare_supplement',
      product: 'Medicare Supplement (Medigap) - Underwritten',
      minAge: 65, maxAge: 79, rate: 0.21
    },
    {
      carrier: 'Physicians Mutual', states: ALL, category: 'medicare_supplement',
      product: 'Medicare Supplement (Medigap) - Underwritten',
      minAge: 80, rate: 0.01,
      note: 'Issue ages 80+ pay the reduced "All Other Guaranteed Issue, Underage & Issue Ages 80+" rate.'
    },
    {
      carrier: 'Physicians Mutual', states: ALL, category: 'medicare_supplement',
      product: 'Medicare Supplement (Medigap) - Underwritten',
      maxAge: 64, rate: 0.01,
      note: 'Underage business pays the reduced "All Other Guaranteed Issue, Underage & Issue Ages 80+" rate.'
    },

    {
      carrier: 'Physicians Mutual', states: ALL, category: 'medicare_supplement',
      product: 'Medicare Supplement (Medigap) - Internal Replacement', rate: 0.125,
      note: 'Internal replacements pay a reduced rate at every age.'
    },

    {
      carrier: 'Physicians Mutual', states: ALL, category: 'ancillary',
      product: 'Dental (P154 / C254) - Standard', rate: 0.25
    },
    {
      carrier: 'Physicians Mutual', states: ALL, category: 'ancillary',
      product: 'Dental (P154 / C254) - Internal Replacement', rate: 0.05
    },

    {
      carrier: 'Physicians Mutual', states: ALL, category: 'life',
      product: 'L780 Whole Life', rate: 1.00,
      note: 'Whole Life and term riders are commissioned, advanced and charged back separately.'
    },
    {
      carrier: 'Physicians Mutual', states: ALL, category: 'life',
      product: 'LR175 5-Year Term Rider', rate: 0.70,
      note: 'Term riders may be added to the Whole Life policy at issue only.'
    },
    {
      carrier: 'Physicians Mutual', states: ALL, category: 'life',
      product: 'LR175 10-Year Term Rider', rate: 0.85,
      note: 'Term riders may be added to the Whole Life policy at issue only.'
    },
    {
      carrier: 'Physicians Mutual', states: ALL, category: 'life',
      product: 'LR175 15-Year Term Rider', rate: 0.95,
      note: 'Term riders may be added to the Whole Life policy at issue only.'
    },
    {
      carrier: 'Physicians Mutual', states: ALL, category: 'life',
      product: 'LR175 20-Year Term Rider', rate: 1.00,
      note: 'Term riders may be added to the Whole Life policy at issue only.'
    }
  ]);

  // ===========================================================================
  // MANHATTAN LIFE - MGA Level 5 - NO ADVANCE (as-earned)
  // ===========================================================================
  (function manhattanLife() {
    var flat = [
      ['Voluntary Group Accident', 0.47],
      ['Critical Protection CPR - Critical Illness', 0.50],
      ['Dental, Vision, Hearing & Dental, Vision, Hearing Select', 0.45],
      ['Central Income Security DI', 0.50],
      ['Disability Income - Group', 0.49],
      ['PAID Personal Accident & DI Rider / Accident Express', 0.55],
      ['GAP Express', 0.15],
      ['Home Health Care', 0.70],
      ['Cancer, Heart Attack, Stroke', 0.60],
      ['Accident Guard', 0.45]
    ];
    flat.forEach(function (row) {
      add([{
        carrier: 'Manhattan Life', states: ALL, category: 'ancillary',
        product: row[0], rate: row[1]
      }]);
    });

    add([
      // Products with a Florida-specific rate
      {
        carrier: 'Manhattan Life', states: ['AZ', 'CA', 'ID', 'IL', 'LA', 'NC', 'NJ', 'NV', 'OH', 'PA', 'TX', 'VA'], category: 'ancillary',
        product: 'Affordable Choice', rate: 0.32
      },
      {
        carrier: 'Manhattan Life', states: ['FL'], category: 'ancillary',
        product: 'Affordable Choice', rate: 0.28
      },
      {
        carrier: 'Manhattan Life', states: ['AZ', 'CA', 'ID', 'IL', 'LA', 'NC', 'NJ', 'NV', 'OH', 'PA', 'TX', 'VA'], category: 'ancillary',
        product: 'CP4000 CancerCare / Cancer Express / FOB First Diagnosis and Riders',
        maxAge: 69, rate: 0.55, note: 'FOB First Diagnosis and Riders: issue ages to 69.'
      },
      {
        carrier: 'Manhattan Life', states: ['FL'], category: 'ancillary',
        product: 'CP4000 CancerCare / Cancer Express / FOB First Diagnosis and Riders',
        maxAge: 69, rate: 0.475, note: 'Cancer FL4000 - Florida rate. Issue ages to 69.'
      },
      {
        carrier: 'Manhattan Life', states: ['AZ', 'CA', 'ID', 'IL', 'LA', 'NC', 'NJ', 'NV', 'OH', 'PA', 'TX', 'VA'], category: 'ancillary',
        product: 'Out-Of-Pocket Protection Plan', rate: 0.35
      },
      {
        carrier: 'Manhattan Life', states: ['FL'], category: 'ancillary',
        product: 'Out-Of-Pocket Protection Plan', rate: 0.275
      },

      // 24 Hour Accident excludes AZ and CO; AZ has its own rate
      {
        carrier: 'Manhattan Life', states: ['CA', 'FL', 'ID', 'IL', 'LA', 'NC', 'NJ', 'NV', 'OH', 'PA', 'TX', 'VA'], category: 'ancillary',
        product: '24 Hour Accident', rate: 0.35
      },
      {
        carrier: 'Manhattan Life', states: ['AZ'], category: 'ancillary',
        product: '24 Hour Accident', rate: 0.325
      },

      // Short Term Care - state bands
      {
        carrier: 'Manhattan Life', states: ['ID', 'IL', 'LA', 'NC', 'NV', 'PA', 'TX'], category: 'ancillary',
        product: 'Short Term Care', minAge: 45, maxAge: 79, rate: 0.60
      },
      {
        carrier: 'Manhattan Life', states: ['ID', 'IL', 'LA', 'NC', 'NV', 'PA', 'TX'], category: 'ancillary',
        product: 'Short Term Care', minAge: 80, rate: 0.50
      },
      {
        carrier: 'Manhattan Life', states: ['AZ', 'FL', 'OH', 'VA'], category: 'ancillary',
        product: 'Short Term Care', minAge: 45, maxAge: 79, rate: 0.525
      },
      {
        carrier: 'Manhattan Life', states: ['AZ', 'FL', 'OH', 'VA'], category: 'ancillary',
        product: 'Short Term Care', minAge: 80, rate: 0.35
      },
      {
        carrier: 'Manhattan Life', states: ['NJ'], category: 'ancillary',
        product: 'Short Term Care', minAge: 45, maxAge: 79, rate: 0.30
      },
      {
        carrier: 'Manhattan Life', states: ['NJ'], category: 'ancillary',
        product: 'Short Term Care', minAge: 80, rate: 0.22
      },

      // Hospital Indemnity Select - all states
      {
        carrier: 'Manhattan Life', states: ALL, category: 'ancillary',
        product: 'Hospital Indemnity Select', minAge: 18, maxAge: 79, rate: 0.63
      },
      {
        carrier: 'Manhattan Life', states: ALL, category: 'ancillary',
        product: 'Hospital Indemnity Select', minAge: 80, rate: 0.475
      }
    ]);
  }());

  // ===========================================================================
  // AFLAC (Tier One Insurance Company) - GA 8 - 12 month advance
  // Medicare Supplement only.
  // ===========================================================================
  (function aflac() {
    function medSupp(states, product, bands, note) {
      bands.forEach(function (b) {
        add([{
          carrier: 'Aflac', states: states, category: 'medicare_supplement',
          product: product, minAge: b[0], maxAge: b[1], rate: b[2], note: note
        }]);
      });
    }

    // California and Virginia, Nevada, Idaho - flat 7.0%
    medSupp(['CA'], 'Medicare Supplement - Plans A, F, G', [[null, 64, 0.07], [65, 79, 0.07], [80, null, 0.07]]);
    medSupp(['CA'], 'Medicare Supplement - Plan N', [[null, 64, 0.07], [65, 79, 0.07], [80, null, 0.07]]);
    medSupp(['VA'], 'Medicare Supplement - All marketed plans (incl. Plan N)', [[null, 64, 0.07], [65, 79, 0.07], [80, null, 0.07]]);
    medSupp(['NV'], 'Medicare Supplement - Plans A, F, G', [[null, 64, 0.07], [65, 79, 0.07], [80, null, 0.07]]);
    medSupp(['NV'], 'Medicare Supplement - Plan N', [[null, 64, 0.07], [65, 79, 0.07], [80, null, 0.07]]);
    medSupp(['ID'], 'Medicare Supplement - Plans A, F, G', [[null, 64, 0.07], [65, 79, 0.07], [80, null, 0.07]]);
    medSupp(['ID'], 'Medicare Supplement - Plan N', [[null, 64, 0.07], [65, 79, 0.07], [80, null, 0.07]]);

    // AZ / LA / NC / TX
    medSupp(['LA', 'NC', 'TX'], 'Medicare Supplement - Plans A, F, G',
      [[null, 64, 0.008], [65, 79, 0.22], [80, null, 0.11]]);
    medSupp(['AZ'], 'Medicare Supplement - Plans A, F, G',
      [[65, 79, 0.22], [80, null, 0.11]],
      'Plans are not available to Medicare beneficiaries under age 65 in AZ.');
    medSupp(['LA', 'NC', 'TX'], 'Medicare Supplement - Plan N',
      [[null, 64, 0.008], [65, 79, 0.26], [80, null, 0.13]]);
    medSupp(['AZ'], 'Medicare Supplement - Plan N',
      [[65, 79, 0.26], [80, null, 0.13]],
      'Plans are not available to Medicare beneficiaries under age 65 in AZ.');

    // Florida
    medSupp(['FL'], 'Medicare Supplement - All marketed plans (incl. Plan N)',
      [[null, 64, 0.0525], [65, 79, 0.20], [80, null, 0.10]]);

    // Illinois
    medSupp(['IL'], 'Medicare Supplement - Plans A, F, G',
      [[null, 64, 0.11], [65, 79, 0.22], [80, null, 0.11]]);
    medSupp(['IL'], 'Medicare Supplement - Plan N',
      [[null, 64, 0.13], [65, 79, 0.26], [80, null, 0.13]]);

    // New Jersey
    medSupp(['NJ'], 'Medicare Supplement - Plans A, F, G, C, D',
      [[null, 64, 0.008], [65, 79, 0.22], [80, null, 0.11]],
      'Only Plans C and D are available under age 65 in NJ.');
    medSupp(['NJ'], 'Medicare Supplement - Plan N',
      [[65, 79, 0.26], [80, null, 0.13]]);

    // Ohio
    medSupp(['OH'], 'Medicare Supplement - Plans A, F, G',
      [[65, 79, 0.21], [80, null, 0.105]]);
    medSupp(['OH'], 'Medicare Supplement - Plan N',
      [[65, 79, 0.25], [80, null, 0.125]]);

    // Pennsylvania
    medSupp(['PA'], 'Medicare Supplement - Plans A, B, F, G',
      [[null, 64, 0.028], [65, 79, 0.22], [80, null, 0.11]]);
    medSupp(['PA'], 'Medicare Supplement - Plan N',
      [[null, 64, 0.028], [65, 79, 0.26], [80, null, 0.13]]);

    // --- Final Expense (page 4 of the schedule, a scanned page) -------------
    // All states where the product is available.
    var feNote = 'No commissions on policy fee or policy conversions. Full commission on all plan riders.';
    add([
      {
        carrier: 'Aflac', states: ALL, category: 'final_expense',
        product: 'Final Expense - Level Benefit', minAge: 45, maxAge: 80, rate: 1.08, note: feNote
      },
      {
        carrier: 'Aflac', states: ALL, category: 'final_expense',
        product: 'Final Expense - Modified', minAge: 40, maxAge: 75, rate: 0.95, note: feNote
      }
    ]);
  }());

  // ===========================================================================
  // AMERICAN BENEFIT LIFE - GA 10 - 12 month advance
  // Medicare Supplement only.
  // ===========================================================================
  (function americanBenefitLife() {
    function abl(states, product, bands, note) {
      bands.forEach(function (b) {
        add([{
          carrier: 'American Benefit Life', states: states, category: 'medicare_supplement',
          product: product, minAge: b[0], maxAge: b[1], rate: b[2], note: note
        }]);
      });
    }

    // Group: AL, AZ, GA, KY, LA, MS, NH, NM, ND, RI, SD, TN, UT, VT, VA, WV, WY
    abl(['LA', 'VA'], 'Medicare Supplement - Plan A',
      [[null, 64, 0.009], [65, 79, 0.009], [80, null, 0.005]]);
    abl(['AZ'], 'Medicare Supplement - Plan A',
      [[65, 79, 0.009], [80, null, 0.005]],
      'Plans are not available to Medicare beneficiaries under age 65 in AZ.');
    abl(['LA', 'VA'], 'Medicare Supplement - Plans F & G',
      [[null, 64, 0.009], [65, 79, 0.245], [80, null, 0.1225]]);
    abl(['AZ'], 'Medicare Supplement - Plans F & G',
      [[65, 79, 0.245], [80, null, 0.1225]],
      'Plans are not available to Medicare beneficiaries under age 65 in AZ.');
    abl(['LA', 'VA'], 'Medicare Supplement - Plan N',
      [[null, 64, 0.009], [65, 79, 0.295], [80, null, 0.1475]]);
    abl(['AZ'], 'Medicare Supplement - Plan N',
      [[65, 79, 0.295], [80, null, 0.1475]],
      'Plans are not available to Medicare beneficiaries under age 65 in AZ.');

    // Florida
    abl(['FL'], 'Medicare Supplement - Plan A',
      [[null, 64, 0.0025], [65, 79, 0.009], [80, null, 0.005]]);
    abl(['FL'], 'Medicare Supplement - Plans F & G',
      [[null, 64, 0.055], [65, 79, 0.245], [80, null, 0.1225]]);
    abl(['FL'], 'Medicare Supplement - Plan N',
      [[null, 64, 0.065], [65, 79, 0.295], [80, null, 0.1475]]);

    // Illinois
    abl(['IL'], 'Medicare Supplement - Plan A',
      [[null, 64, 0.0045], [65, 79, 0.009], [80, null, 0.005]]);
    abl(['IL'], 'Medicare Supplement - Plans F & G',
      [[null, 64, 0.0613], [65, 79, 0.225], [80, null, 0.1025]]);
    abl(['IL'], 'Medicare Supplement - Plan N',
      [[null, 64, 0.0738], [65, 79, 0.275], [80, null, 0.1275]]);

    // North Carolina
    abl(['NC'], 'Medicare Supplement - Plan A',
      [[null, 64, 0.009], [65, 79, 0.009], [80, null, 0.005]]);
    abl(['NC'], 'Medicare Supplement - Plans F & G',
      [[null, 64, 0.009], [65, 79, 0.245], [80, null, 0.1225]]);
    abl(['NC'], 'Medicare Supplement - Plan N',
      [[65, 79, 0.295], [80, null, 0.1475]]);

    // Pennsylvania
    abl(['PA'], 'Medicare Supplement - Plan A',
      [[null, 64, 0.029], [65, 79, 0.089], [80, null, 0.0445]]);
    abl(['PA'], 'Medicare Supplement - Plans F & G',
      [[null, 64, 0.029], [65, 79, 0.245], [80, null, 0.1225]]);
    abl(['PA'], 'Medicare Supplement - Plan N',
      [[null, 64, 0.029], [65, 79, 0.295], [80, null, 0.1475]]);

    // New Jersey. Plans C and D are also offered here; the schedule's GI note
    // treats them separately from A/F/G/N.
    abl(['NJ'], 'Medicare Supplement - Plan A',
      [[null, 64, 0.005], [65, 79, 0.009], [80, null, 0.0]]);
    abl(['NJ'], 'Medicare Supplement - Plans F & G',
      [[65, 79, 0.245], [80, null, 0.1225]],
      'The schedule shows no under age 65 rate for Plans F and G in NJ.');
    abl(['NJ'], 'Medicare Supplement - Plan N',
      [[65, 79, 0.295], [80, null, 0.1475]],
      'The schedule shows no under age 65 rate for Plan N in NJ.');

    // Ohio. No under-65 column, and renewals are 0% from year 6.
    abl(['OH'], 'Medicare Supplement - Plan A',
      [[65, 79, 0.009], [80, null, 0.005]]);
    abl(['OH'], 'Medicare Supplement - Plans F & G',
      [[65, 79, 0.245], [80, null, 0.1225]]);
    abl(['OH'], 'Medicare Supplement - Plan N',
      [[65, 79, 0.295], [80, null, 0.1475]]);

    // Nevada pays noticeably less than the other states at 65+ and 80+.
    abl(['NV'], 'Medicare Supplement - Plan A',
      [[null, 64, 0.0045], [65, 79, 0.009], [80, null, 0.005]]);
    abl(['NV'], 'Medicare Supplement - Plans F & G',
      [[null, 64, 0.0045], [65, 79, 0.145], [80, null, 0.0225]]);
    abl(['NV'], 'Medicare Supplement - Plan N',
      [[null, 64, 0.0045], [65, 79, 0.20], [80, null, 0.0475]]);

    // Texas
    abl(['TX'], 'Medicare Supplement - Plan A',
      [[null, 64, 0.0], [65, 79, 0.009], [80, null, 0.005]]);
    abl(['TX'], 'Medicare Supplement - Plans F & G',
      [[65, 79, 0.245], [80, null, 0.1225]]);
    abl(['TX'], 'Medicare Supplement - Plan N',
      [[65, 79, 0.295], [80, null, 0.1475]]);
  }());

  // ===========================================================================
  // LIBERTY BANKERS - GA10 (Med Supp, NO advance) / Level 10 (ancillary, 9 month)
  // ===========================================================================
  (function libertyBankers() {
    function lbl(states, product, bands, note) {
      bands.forEach(function (b) {
        add([{
          carrier: 'Liberty Bankers', states: states, category: 'medicare_supplement',
          product: product, minAge: b[0], maxAge: b[1], rate: b[2], note: note
        }]);
      });
    }

    // Virginia (grouped with AL, SD, UT)
    lbl(['VA'], 'Medicare Supplement - Plan A', [[null, 64, 0.0045], [65, 79, 0.0045], [80, null, 0.0025]]);
    lbl(['VA'], 'Medicare Supplement - Plans F & G', [[null, 64, 0.008], [65, 79, 0.228], [80, null, 0.114]]);
    lbl(['VA'], 'Medicare Supplement - Plan N', [[null, 64, 0.008], [65, 79, 0.278], [80, null, 0.139]]);

    // Illinois
    lbl(['IL'], 'Medicare Supplement - Plan A', [[null, 64, 0.0025], [65, 79, 0.0045], [80, null, 0.0025]]);
    lbl(['IL'], 'Medicare Supplement - Plans F & G', [[null, 64, 0.0613], [65, 79, 0.225], [80, null, 0.1025]]);
    lbl(['IL'], 'Medicare Supplement - Plan N', [[null, 64, 0.074], [65, 79, 0.275], [80, null, 0.1275]]);

    // New Jersey
    lbl(['NJ'], 'Medicare Supplement - Plan A', [[65, 79, 0.0045], [80, null, 0.0]]);
    lbl(['NJ'], 'Medicare Supplement - Plans F & G', [[65, 79, 0.228], [80, null, 0.114]]);
    lbl(['NJ'], 'Medicare Supplement - Plan N', [[65, 79, 0.278], [80, null, 0.139]]);

    // Ohio
    lbl(['OH'], 'Medicare Supplement - Plan A', [[65, 79, 0.0045], [80, null, 0.0025]]);
    lbl(['OH'], 'Medicare Supplement - Plans F & G', [[65, 79, 0.228], [80, null, 0.114]]);
    lbl(['OH'], 'Medicare Supplement - Plan N', [[65, 79, 0.278], [80, null, 0.139]]);

    // North Carolina
    lbl(['NC'], 'Medicare Supplement - Plan A', [[null, 64, 0.0045], [65, 79, 0.0045], [80, null, 0.0025]]);
    lbl(['NC'], 'Medicare Supplement - Plans F & G', [[null, 64, 0.008], [65, 79, 0.228], [80, null, 0.114]]);
    lbl(['NC'], 'Medicare Supplement - Plan N', [[65, 79, 0.278], [80, null, 0.139]]);

    // Pennsylvania
    lbl(['PA'], 'Medicare Supplement - Plan A', [[null, 64, 0.029], [65, 79, 0.0445], [80, null, 0.0225]]);
    lbl(['PA'], 'Medicare Supplement - Plans F & G', [[null, 64, 0.029], [65, 79, 0.228], [80, null, 0.114]]);
    lbl(['PA'], 'Medicare Supplement - Plan N', [[null, 64, 0.029], [65, 79, 0.278], [80, null, 0.139]]);

    // Texas
    lbl(['TX'], 'Medicare Supplement - Plan A', [[null, 64, 0.0], [65, 79, 0.0045], [80, null, 0.0025]]);
    lbl(['TX'], 'Medicare Supplement - Plans F & G', [[65, 79, 0.228], [80, null, 0.114]]);
    lbl(['TX'], 'Medicare Supplement - Plan N', [[65, 79, 0.278], [80, null, 0.139]]);

    // AZ, FL, LA, NV - schedule pays 0% at every age and plan
    var zeroNote = 'This schedule pays 0% in every policy year for this state.';
    ['Medicare Supplement - Plan A', 'Medicare Supplement - Plans F & G', 'Medicare Supplement - Plan N'].forEach(function (p) {
      lbl(['AZ', 'FL', 'LA', 'NV'], p, [[null, 64, 0.0], [65, 79, 0.0], [80, null, 0.0]], zeroNote);
    });

    // --- Supplemental Health (ancillary), Heaped Version, Level 10 -----------
    var shNote = 'Transcribed from a two-column PDF layout - worth spot-checking against the schedule before quoting a large case.';
    var group50 = ['FL', 'ID', 'IL', 'LA', 'NC', 'NV', 'PA', 'TX'];
    var group55 = ['AZ', 'OH', 'VA'];
    var group65 = ['NJ'];

    var shRates = [
      // product,                                   50% states 18-75, 76-85,   55% states 18-75, 76-85,   NJ 18-75, 76-85
      ['Hospital Indemnity Policy',                 0.725, 0.575,   0.625, 0.475,   0.475, 0.325],
      ['Cancer Policy / CAN Rider',                 0.95,  0.65,    0.85,  0.54,    0.62,  0.37],
      ['Heart or Stroke Policy / HS Rider',         0.95,  0.65,    0.85,  0.54,    0.62,  0.37],
      ['Critical Care Policy / CC Rider',           0.95,  0.65,    0.85,  0.54,    0.62,  0.37],
      ['Return of Premium Rider(s)',                0.5438, 0.4313, 0.4688, 0.3563, 0.3563, 0.2438],
      ['All Other Riders',                          0.725, 0.575,   0.625, 0.475,   0.475, 0.325]
    ];
    shRates.forEach(function (r) {
      add([
        { carrier: 'Liberty Bankers', states: group50, category: 'ancillary', product: r[0], minAge: 18, maxAge: 75, rate: r[1], note: shNote, verify: true },
        { carrier: 'Liberty Bankers', states: group50, category: 'ancillary', product: r[0], minAge: 76, maxAge: 85, rate: r[2], note: shNote, verify: true },
        { carrier: 'Liberty Bankers', states: group55, category: 'ancillary', product: r[0], minAge: 18, maxAge: 75, rate: r[3], note: shNote, verify: true },
        { carrier: 'Liberty Bankers', states: group55, category: 'ancillary', product: r[0], minAge: 76, maxAge: 85, rate: r[4], note: shNote, verify: true },
        { carrier: 'Liberty Bankers', states: group65, category: 'ancillary', product: r[0], minAge: 18, maxAge: 75, rate: r[5], note: shNote, verify: true },
        { carrier: 'Liberty Bankers', states: group65, category: 'ancillary', product: r[0], minAge: 76, maxAge: 85, rate: r[6], note: shNote, verify: true }
      ]);
    });
    // Accident has no 76-85 band (N/A on the schedule)
    add([
      { carrier: 'Liberty Bankers', states: group50, category: 'ancillary', product: 'Accident Policy / ACC Rider', minAge: 18, maxAge: 75, rate: 0.725, note: shNote, verify: true },
      { carrier: 'Liberty Bankers', states: group55, category: 'ancillary', product: 'Accident Policy / ACC Rider', minAge: 18, maxAge: 75, rate: 0.625, note: shNote, verify: true },
      { carrier: 'Liberty Bankers', states: group65, category: 'ancillary', product: 'Accident Policy / ACC Rider', minAge: 18, maxAge: 75, rate: 0.475, note: shNote, verify: true }
    ]);
  }());

  // ===========================================================================
  // MEDICO (Wellabe) - MGA Level 4 - 9 month advance
  // ===========================================================================
  (function medico() {
    function med(states, product, bands, note) {
      bands.forEach(function (b) {
        add([{
          carrier: 'Medico', states: states, category: 'medicare_supplement',
          product: product, minAge: b[0], maxAge: b[1], rate: b[2], note: note
        }]);
      });
    }

    // Arizona
    med(['AZ'], 'Medicare Supplement - All plans except Plan N',
      [[65, 79, 0.22], [80, 85, 0.175], [86, null, 0.105]]);
    med(['AZ'], 'Medicare Supplement - Plan N',
      [[65, 79, 0.26], [80, 85, 0.195], [86, null, 0.125]]);

    // Florida
    med(['FL'], 'Medicare Supplement - All plans except Plan N',
      [[null, 64, 0.03], [65, 79, 0.20], [80, 85, 0.155], [86, null, 0.095]]);
    med(['FL'], 'Medicare Supplement - Plan N',
      [[null, 64, 0.03], [65, 79, 0.23], [80, 85, 0.185], [86, null, 0.115]]);

    // New Jersey and Texas (grouped with GA and KS)
    med(['NJ', 'TX'], 'Medicare Supplement - All plans except Plan N',
      [[null, 64, 0.01], [65, 79, 0.23], [80, 85, 0.185], [86, null, 0.115]]);
    med(['NJ', 'TX'], 'Medicare Supplement - Plan N',
      [[null, 64, 0.01], [65, 79, 0.27], [80, 85, 0.205], [86, null, 0.135]]);

    // Illinois
    med(['IL'], 'Medicare Supplement - All plans except Plan N',
      [[null, 64, 0.05], [65, 79, 0.23], [80, 85, 0.185], [86, null, 0.115]]);
    med(['IL'], 'Medicare Supplement - Plan N',
      [[null, 64, 0.05], [65, 79, 0.27], [80, 85, 0.205], [86, null, 0.135]]);

    // Louisiana
    med(['LA'], 'Medicare Supplement - All plans except Plan N',
      [[null, 64, 0.0], [65, 79, 0.23], [80, 85, 0.185], [86, null, 0.115]]);
    med(['LA'], 'Medicare Supplement - Plan N',
      [[null, 64, 0.0], [65, 79, 0.27], [80, 85, 0.205], [86, null, 0.135]]);

    // North Carolina (grouped with NH)
    med(['NC'], 'Medicare Supplement - All plans except Plan N',
      [[null, 64, 0.0], [65, 79, 0.23], [80, 85, 0.185], [86, null, 0.115]]);
    med(['NC'], 'Medicare Supplement - Plan N',
      [[null, 64, 0.0], [65, 79, 0.27], [80, 85, 0.205], [86, null, 0.135]]);

    // Ohio
    med(['OH'], 'Medicare Supplement - All plans except Plan N',
      [[65, 79, 0.23], [80, 85, 0.185], [86, null, 0.115]]);
    med(['OH'], 'Medicare Supplement - Plan N',
      [[65, 79, 0.27], [80, 85, 0.205], [86, null, 0.135]]);

    // Pennsylvania
    med(['PA'], 'Medicare Supplement - All plans except Plan N',
      [[null, 64, 0.01], [65, 79, 0.23], [80, 85, 0.185], [86, null, 0.115]]);
    med(['PA'], 'Medicare Supplement - Plan N',
      [[null, 64, 0.01], [65, 79, 0.27], [80, 85, 0.205], [86, null, 0.135]]);

    // --- Other Medico products ---------------------------------------------
    add([
      {
        carrier: 'Medico', states: ALL, category: 'ancillary',
        product: 'Short Term Care', rate: 0.65
      },
      {
        carrier: 'Medico', states: ['AZ', 'FL', 'IL', 'LA', 'NC', 'OH', 'PA', 'TX', 'VA'], category: 'ancillary',
        product: 'Medico Dental', minAge: 18, maxAge: 89, rate: 0.59
      },
      {
        carrier: 'Medico', states: ['NV'], category: 'ancillary',
        product: 'Medico Dental', minAge: 18, maxAge: 89, rate: 0.18
      },
      {
        carrier: 'Medico', states: ['IL', 'LA', 'NC', 'PA', 'TX'], category: 'ancillary',
        product: 'Hospital Indemnity', rate: 0.65
      },
      {
        carrier: 'Medico', states: ['AZ', 'FL', 'OH', 'VA'], category: 'ancillary',
        product: 'Hospital Indemnity', rate: 0.54
      },
      {
        carrier: 'Medico', states: ['ID', 'NV', 'PA'], category: 'ancillary',
        product: 'First Diagnosis Cancer - without Inflation Protection', minAge: 18, maxAge: 79, rate: 0.60
      },
      {
        carrier: 'Medico', states: ['ID', 'NV', 'PA'], category: 'ancillary',
        product: 'First Diagnosis Cancer - with Inflation Protection', minAge: 18, maxAge: 79, rate: 0.67
      },
      {
        carrier: 'Medico', states: ALL, category: 'ancillary',
        product: 'Critical Illness', rate: 0.70
      }
    ]);
  }());

  // ===========================================================================
  // BANKERS FIDELITY - General Agent
  // Medicare Supplement 9 month advance / ancillary 6 month advance
  // ===========================================================================
  (function bankersFidelity() {
    function bf(states, product, bands, note) {
      bands.forEach(function (b) {
        add([{
          carrier: 'Bankers Fidelity', states: states, category: 'medicare_supplement',
          product: product, minAge: b[0], maxAge: b[1], rate: b[2], note: note
        }]);
      });
    }

    // Illinois (ACLAC)
    bf(['IL'], 'Medicare Supplement - Preferred / Standard', [[null, 80, 0.23], [81, null, 0.115]]);
    bf(['IL'], 'Medicare Supplement - Plans HDF, HDG & K', [[65, 80, 0.28], [81, null, 0.14]]);

    // AZ, NC, NJ, OH, VA (BFAC/ACLAC group)
    bf(['AZ', 'NC', 'NJ', 'OH', 'VA'], 'Medicare Supplement - Preferred / Standard', [[null, 80, 0.23], [81, null, 0.115]]);
    bf(['AZ', 'NC', 'NJ', 'OH', 'VA'], 'Medicare Supplement - Plans HDF, HDG & K', [[65, 80, 0.28], [81, null, 0.14]]);

    // Pennsylvania (BFAC)
    bf(['PA'], 'Medicare Supplement - Preferred / Standard', [[null, 80, 0.23], [81, null, 0.115]]);
    bf(['PA'], 'Medicare Supplement - Plans HDF, HDG & K', [[65, 80, 0.28], [81, null, 0.14]]);

    // Louisiana (BFAC/ACLAC, grouped with MS)
    bf(['LA'], 'Medicare Supplement - Preferred / Standard', [[null, 80, 0.23], [81, null, 0.115]]);
    bf(['LA'], 'Medicare Supplement - Plans HDF, HDG & K', [[65, 80, 0.28], [81, null, 0.14]]);

    // Texas (ACLAC)
    bf(['TX'], 'Medicare Supplement - Preferred / Standard', [[null, 80, 0.22], [81, null, 0.11]]);
    bf(['TX'], 'Medicare Supplement - Plans HDF, HDG & K', [[65, 80, 0.26], [81, null, 0.13]]);

    // Disability plans
    bf(['AZ', 'LA', 'NC', 'NJ', 'OH', 'PA', 'TX', 'VA'], 'Medicare Supplement - Disability (under 65)', [[null, 64, 0.04]]);

    // --- Ancillary (6 month advance) ---------------------------------------
    add([
      {
        carrier: 'Bankers Fidelity', states: ['AZ', 'FL', 'ID', 'IL', 'LA', 'NC', 'NJ', 'NV', 'OH', 'PA', 'TX'], category: 'ancillary',
        product: 'Vantage Flex Plus (Hospital Indemnity)', rate: 0.67
      },
      {
        carrier: 'Bankers Fidelity', states: ['VA'], category: 'ancillary',
        product: 'Vantage Flex Plus (Hospital Indemnity)', rate: 0.52
      },

      {
        carrier: 'Bankers Fidelity', states: ['AZ', 'ID', 'IL', 'LA', 'NC', 'NV', 'PA', 'TX', 'VA'], category: 'ancillary',
        product: 'Vantage Care (Lump Sum Cancer)', minAge: 18, maxAge: 84, rate: 1.00
      },
      {
        carrier: 'Bankers Fidelity', states: ['AZ', 'ID', 'IL', 'LA', 'NC', 'NV', 'PA', 'TX', 'VA'], category: 'ancillary',
        product: 'Vantage Care (Lump Sum Cancer)', minAge: 85, rate: 0.70
      },
      {
        carrier: 'Bankers Fidelity', states: ['OH'], category: 'ancillary',
        product: 'Vantage Care (Lump Sum Cancer)', minAge: 18, maxAge: 84, rate: 0.95
      },
      {
        carrier: 'Bankers Fidelity', states: ['OH'], category: 'ancillary',
        product: 'Vantage Care (Lump Sum Cancer)', minAge: 85, rate: 0.70
      },
      {
        carrier: 'Bankers Fidelity', states: ['NJ'], category: 'ancillary',
        product: 'Vantage Care (Lump Sum Cancer)', minAge: 18, maxAge: 84, rate: 0.87
      },
      {
        carrier: 'Bankers Fidelity', states: ['NJ'], category: 'ancillary',
        product: 'Vantage Care (Lump Sum Cancer)', minAge: 85, rate: 0.62
      },

      {
        carrier: 'Bankers Fidelity', states: ['IL', 'LA', 'NC', 'NV', 'PA', 'TX'], category: 'ancillary',
        product: 'Vantage Recovery (Short-Term Care)', rate: 0.60
      },
      {
        carrier: 'Bankers Fidelity', states: ['AZ', 'OH'], category: 'ancillary',
        product: 'Vantage Recovery (Short-Term Care)', rate: 0.50
      },

      {
        carrier: 'Bankers Fidelity', states: ALL, category: 'final_expense',
        product: 'LifeVantage Secure Final Expense Whole Life', minAge: 45, maxAge: 75, rate: 1.35
      },
      {
        carrier: 'Bankers Fidelity', states: ALL, category: 'final_expense',
        product: 'LifeVantage Secure Final Expense Whole Life', minAge: 76, maxAge: 85, rate: 0.875
      }
    ]);
  }());

  // ===========================================================================
  // HEARTLAND NATIONAL - GA1 level
  // Advance term is not on file (see the ADVANCES entry above).
  // ===========================================================================
  (function heartland() {
    var noAdvanceUnder65Or81 = 'Heartland does not advance commissions on policies for under 65 or 81+ policyholders.';

    // --- Simply Secure Cancer, Heart Attack & Stroke (GA1) -------------------
    add([
      {
        carrier: 'Heartland', states: ['AZ', 'IL', 'LA', 'NC', 'NV', 'OH', 'PA', 'TX', 'VA'], category: 'ancillary',
        product: 'Simply Secure Cancer, Heart Attack & Stroke', minAge: 18, maxAge: 84, rate: 0.80
      },
      {
        carrier: 'Heartland', states: ['AZ', 'IL', 'LA', 'NC', 'NV', 'OH', 'PA', 'TX', 'VA'], category: 'ancillary',
        product: 'Simply Secure Cancer, Heart Attack & Stroke', minAge: 85, maxAge: 90, rate: 0.60
      },
      {
        carrier: 'Heartland', states: ['FL'], category: 'ancillary',
        product: 'Simply Secure Cancer, Heart Attack & Stroke', minAge: 18, maxAge: 84, rate: 0.65
      },
      {
        carrier: 'Heartland', states: ['FL'], category: 'ancillary',
        product: 'Simply Secure Cancer, Heart Attack & Stroke', minAge: 85, maxAge: 90, rate: 0.45
      }
    ]);

    // --- Secure Choice Short-Term Home Health Care (GA1) ---------------------
    add([
      {
        carrier: 'Heartland', states: ['AZ', 'IL', 'LA', 'NC', 'NV', 'OH', 'PA', 'TX', 'VA'], category: 'ancillary',
        product: 'Secure Choice Short-Term Home Health Care', minAge: 40, maxAge: 75, rate: 0.55
      },
      {
        carrier: 'Heartland', states: ['AZ', 'IL', 'LA', 'NC', 'NV', 'OH', 'PA', 'TX', 'VA'], category: 'ancillary',
        product: 'Secure Choice Short-Term Home Health Care', minAge: 76, rate: 0.50
      }
    ]);

    // --- Medicare Supplement (Heartland National, eff. 06/01/2019) -----------
    // Our appointed states appearing on this schedule: NC, OH, PA.
    function hms(states, product, bands, note) {
      bands.forEach(function (b) {
        add([{
          carrier: 'Heartland', states: states, category: 'medicare_supplement',
          product: product, minAge: b[0], maxAge: b[1], rate: b[2], note: note
        }]);
      });
    }

    var ncUnder65 = 'Under age 65 pays 0.90% on every plan in NC. ' + noAdvanceUnder65Or81;

    hms(['NC'], 'Medicare Supplement - Plan A',
      [[null, 64, 0.009], [65, 80, 0.016], [81, null, 0.016]], ncUnder65);
    hms(['NC'], 'Medicare Supplement - Plan G',
      [[null, 64, 0.009], [65, 80, 0.18], [81, null, 0.04]], ncUnder65);
    hms(['NC'], 'Medicare Supplement - Plan N',
      [[null, 64, 0.009], [65, 80, 0.20], [81, null, 0.0925]], ncUnder65);

    hms(['OH'], 'Medicare Supplement - Plan A',
      [[65, 80, 0.028], [81, null, 0.028]], noAdvanceUnder65Or81);
    hms(['OH'], 'Medicare Supplement - Plans C & G',
      [[65, 80, 0.19], [81, null, 0.05]], noAdvanceUnder65Or81);
    hms(['OH'], 'Medicare Supplement - Plan N',
      [[65, 80, 0.21], [81, null, 0.1025]], noAdvanceUnder65Or81);

    var paNote = noAdvanceUnder65Or81 + ' Guaranteed Issue business in PA pays 4% to the writing agent, years 1-6.';
    hms(['PA'], 'Medicare Supplement - Plans A, B, C, G',
      [[null, 64, 0.016], [65, 80, 0.18], [81, null, 0.04]], paNote);
    hms(['PA'], 'Medicare Supplement - Plan N',
      [[null, 64, 0.016], [65, 80, 0.20], [81, null, 0.0925]], paNote);
  }());

  // ---------------------------------------------------------------------------
  // Carriers with no usable rate data yet (kept out of the dropdown, listed in
  // SOURCES.md).
  // ---------------------------------------------------------------------------
  var CARRIERS_WITHOUT_DATA = [
    { name: 'GTL', reason: 'The linked commission schedule is a PNG image and the image data cannot be retrieved intact, so there is no rate text to transcribe.' }
  ];

  var DATA = {
    appointedStates: APPOINTED_STATES,
    advances: ADVANCES,
    rules: RULES,
    carriersWithoutData: CARRIERS_WITHOUT_DATA
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = DATA;
  } else {
    root.COMMISSION_DATA = DATA;
  }
}(typeof self !== 'undefined' ? self : this));
