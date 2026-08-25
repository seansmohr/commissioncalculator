# Where the numbers come from

Every rate in `data/commission-data.js` was transcribed from our own carrier
commission schedules at our own contracted levels. No street-level or publicly
published rates are used anywhere.

## Source documents

| Carrier | Schedule read | Our contract level |
|---|---|---|
| Aetna Senior Supplemental | `aetna senior supplemental commission schedule.pdf` (rev. 07/23/2026, BRKPRDXX2_12) — **all 9 pages** | General Agent, Level 12 |
| Mutual of Omaha | `Mutual of Omaha Commission Schedule.pdf` (MT0044_0526, eff. 05/01/2026) — **all 16 pages** | General Agent (BMO151) |
| Healthspring | Loyal American Life commission schedule (eff. 04/07/2025) — **all 5 pages** | GA-60 |
| Physicians Mutual | `physicians mutual commission schedules.xlsx` — **all sheets, confirmed against screenshots** | General Agent (topline street), Level 5 |
| Manhattan Life | `manhattan life commission schedule` (JU Level 5, 2-2026) | MGA |
| Aflac | `aflac commission schedule.pdf` — Tier One Insurance Company (eff. 05/01/2026) | GA 8 |
| American Benefit Life | `American Benefit Life Commission Schedule.pdf` (eff. 11/01/2025) | GA 10 |
| Liberty Bankers | `Liberty Bankers Commission Schedules` (Med Supp eff. 08/01/2026; Supplemental Health eff. 05/01/2026) | GA10 / Level 10 Heaped |
| Medico (Wellabe) | `wellabe/medico commission schedules.pdf` (eff. 09/01/2026) | MGA Level 4 |
| Bankers Fidelity | `bankers fidelity commission schedule` (GAT 7-26) | General Agent |
| Heartland | `heartland commission schedules` (Med Supp eff. 06/01/2019; Cancer/HAS eff. 08/26/2024; Short-Term Home Health Care rev. 10/23) | GA1 |

Advance arrangements come from column B of
`Carrier Advances_Commission schedules.xlsx` and nowhere else — the spreadsheet
is the source of truth for advances, and each one is quoted verbatim in the
`source` field of the `ADVANCES` table.

Appointed states come from column F of the same spreadsheet:
AZ, CA, FL, ID, IL, LA, NC, NJ, NV, OH, PA, TX, VA. Rules are limited to these
13 states, so the state dropdown only ever offers states we can actually write in.

## What's modeled

Rates in the lookup table are **first-year (policy year 1)** rates, since that
is what the calculator needs. Renewal-year rates, override/upline columns, and
guaranteed-issue flat-dollar payments are deliberately not modeled in Version 1.

Where a schedule pays a documented **0%** (for example Liberty Bankers Medicare
Supplement in AZ, FL, LA and NV), the calculator reports $0 and says so. That is
different from "not found" — the rate exists, it is just zero.

## Known gaps

These are omissions, not guesses. The calculator returns
"Commission information not found for this selection." for anything below rather
than estimating.

1. **GTL** — no rules loaded. The linked schedule is a PNG image and the image
   data cannot be retrieved intact through the Drive connector (it arrives
   truncated and renders blank), so there is no rate text to transcribe. The
   spreadsheet's 9-month advance for GTL is already recorded; only the rates are
   missing. **A PDF version, or the rates pasted as text, is all that's needed.**

2. **Mutual of Omaha — everything except Long Term Care.** The schedule PDF was
   re-supplied in full (16 pages) and confirmed: it contains the cover letter,
   the producer FAQ, the Contract Summary and then the Long Term Care schedule
   (MT0044_0526, "Page 1 of 8" through "Page 8 of 8"). No page is a scan hiding
   further tables. The Contract Summary lists seven other schedules on our
   contract whose rate documents are simply **not in this file**:

   | Product | Schedule code |
   |---|---|
   | Medicare Supplement (Mutual Health) | Q64.021 |
   | Medicare Supplement (United Health) | AM2.001 |
   | Medicare Supplement (United World) | R62.005 |
   | Accidental Death | JF9.001 |
   | Dental | K18.001 |
   | Dental Savings | K73.001 |
   | Hospital Indemnity | V09.001 |

   Each is a separate document on Sales Professional Access (Profile →
   Communications → commission schedules). Note the Accidental Death product
   carries a **9-month** advance versus 12 months for other Mutual of Omaha
   health products, so it needs its own advance entry once rates arrive.

3. **Heartland — advance term unknown.** Rates are loaded, but the spreadsheet
   leaves the advance column blank for Heartland and the schedule never states a
   term (it only confirms advances exist, via "chargebacks on unearned advanced
   premiums"). The calculator shows the rate and total first-year commission and
   labels the advance "Not on file" rather than inventing an upfront figure. The
   Medicare Supplement schedule does add that **commissions are not advanced on
   under-65 or 81+ policies**.

4. **Heartland — one unidentified rate table.** The combined PDF contains a GA1
   rate table (form 93017, dated 10/1/2017) whose product name is not in the
   extracted text. It covers issue ages 0–80 and 81–85 across three state groups:
   60%/40% first year for AL, AK, AR, DE, GA, HI, IL, IA, KS, LA, MS, MO, NV, NM,
   NC, OK, OR, PA, TX, UT, WV; 55%/35% for AZ, FL, IN, KY, MD, MT, NE, ND, OH,
   SC, TN, VA; and 45%/30% for CO, SD, WY. **Tell us which product this is and it
   can be added as-is** — the rates are unambiguous, only the name is missing.

5. **American Benefit Life — New Jersey, Ohio, Nevada, Iowa, Nebraska.** In the
   ABL PDF these five state blocks appear with their headings separated from
   their rate rows, so which rate row belongs to which state cannot be
   established with certainty. Rather than guess, these states are left out.
   Every other ABL state block was unambiguous and is loaded.

## Carriers read from the full source PDF

Where a carrier's schedule has been supplied directly as a PDF, it is re-read
from the source using **word-level x/y coordinates**, which recovers the true
column structure that flat text extraction destroys. Scanned pages with no text
layer are read visually from page renders. This is how the Aetna, Mutual of
Omaha, Healthspring and Physicians Mutual entries were produced, and it is the
right way to add the remaining carriers.

### Healthspring — now complete

Confirmed against all 5 pages. The previously-flagged "Level" Dental/Vision/
Hearing gap is resolved (15% all states, 8% CA, 5% NV), and three product
families that were missing are now loaded: the **Flexible Choice Hospital
Indemnity riders** (Accident, Lump Sum Heart/Stroke/Restoration, Lump Sum Cancer
Recurrence, Specified Disease — not available in CA, ID or NJ among our states)
and the **Return of Premium rider**. California Medicare Supplement, Whole Life
and every other previously-loaded rate were verified unchanged.

### Physicians Mutual — verified

All rates confirmed against the Level 5 / General Agent (topline street) column.
Nothing was wrong. Two products were added: **Medigap Internal Replacement**
(12.5%) and **Dental Internal Replacement** (5%), both of which pay materially
less than new business.

### Mutual of Omaha — Pennsylvania needs a decision

Pennsylvania Long Term Care has **two different new-business scales** depending
on whether the writing General Agent has other General Agents in their downline:

| | Under 70 | 70-74 | 75-79 |
|---|---|---|---|
| With downline General Agents | 60% | 40% | 35% |
| No downline General Agents | 50% | 30% | 25% |

Which one applies to Mohr Insurance Services is a fact about our contract, not
something in the schedule, so both are loaded as separate products rather than
one being assumed. **Once confirmed, the other should be deleted** so the
Pennsylvania dropdown has a single entry. California and Virginia have no such
split and were verified correct.

## Aetna: fully transcribed

The Aetna schedule was originally read through the Drive connector, which
flattened its multi-column tables and left several sections unreadable. It has
since been re-read from the source PDF with **word-level x/y coordinates**,
which recovers the true column structure, and pages 6 and 8 — which are scanned
images with no text layer — were read visually from page renders.

That resolved the two previously-listed Aetna gaps and corrected one error:

- **Florida Medicare Supplement, under age 65** was loaded as 24%. The correct
  rate is **6.5%**; 24% is the age 65+ rate. This was a real error, now fixed.
- **Illinois Medicare Supplement, under age 65** was previously omitted. It is
  12.5% for all plans except Plan N, and 15% for Plan N.

Seven products were missing entirely and are now loaded: Dental Vision and
Hearing Flex (page 6, including Nevada's separate Dental Only and full plans),
Home Care Plus, Home Recovery Care, Hospital Indemnity Flex, Recovery Care,
Nursing Facility Care (HFN-97) (page 7), and Recovery Care Choice (page 8).

Products on the schedule that are deliberately **not** loaded because we are not
appointed in the only states they cover: Cancer and Heart Attack or Stroke
(non-Plus, Kansas only) and Home Care (HC-96) (Colorado and Kentucky only).

## Flagged for spot-check

Liberty Bankers **Supplemental Health** rules carry a `verify: true` flag and
show a caution note on the results card. Those rates come from a two-column PDF
layout where the left column is the 50%/60% state group and the right column is
the 55%/65% group. The column pairing is structurally clear but worth confirming
against the schedule before quoting a large case.

**Heartland North Carolina, under age 65.** The NC block has three plan tables
but only one "Age 0-64" table (0.90%), so that rate is applied to all three NC
plans. Every other state on this schedule uses a single under-65 rate across all
plans, so this is consistent with the document's own structure — but it is the
one place the reading is inferred from layout rather than read off directly.

## Discrepancy worth knowing about

For **Liberty Bankers**, the spreadsheet says *"9 month advance for ancillary;
No advance for Medicare supplement."* The PDF itself shows the Supplemental
Health schedule with **"☒ No Advance"** checked, and leaves all three advance
boxes unchecked on the Medicare Supplement schedule. The calculator follows the
spreadsheet, per the requirement that the spreadsheet is the source of truth for
advances — but it is worth confirming with Liberty Bankers which is current.

## Updating the data

`data/commission-data.js` is a plain list of rule objects. Each rule identifies
carrier, states, product category, product, plan (as part of the product name),
min/max age, commission percentage, and any rule or exception text. Advance
months are resolved separately from the `ADVANCES` table by carrier and product
category, so a carrier with different advances per product category is handled by
adding a `byCategory` entry rather than duplicating rates.

After any edit, run `npm test`. The suite checks for overlapping
age bands, unknown states, out-of-range rates, and products that appear in a
dropdown but resolve at no age.
