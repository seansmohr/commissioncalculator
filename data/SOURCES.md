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
| Manhattan Life | `manhattan life commission schedule` (JU Level 5, 2-2026) — **all 4 pages, scanned; read visually** | MGA |
| Aflac | `aflac commission schedule.pdf` — Tier One Insurance Company (TERBRKXX01_08, eff. 05/01/2026) — **all 4 pages** | GA 8 |
| American Benefit Life | `American Benefit Life Commission Schedule.pdf` (ABLBRKMS1_10, eff. 11/01/2025) — **all 3 pages** | GA 10 |
| Liberty Bankers | `Liberty Bankers Commission Schedules` — **all 5 pages** (Med Supp eff. 08/01/2026; Supplemental Health eff. 05/01/2026) | GA10 / Level 10 Heaped |
| Medico (Wellabe) | `wellabe/medico commission schedules.pdf` (eff. 09/01/2026) — **all 12 pages** | MGA Level 4 |
| Bankers Fidelity | `bankers fidelity commission schedule` (GAT 7-26) — **all 5 pages** | General Agent |
| GTL | "GTL Commission Rates" panel from the carrier portal (screenshot) | not stated on the panel |
| Heartland | `heartland commission schedules` — **all 10 pages** (Med Supp eff. 06/01/2019; Cancer/HAS eff. 08/26/2024; Secure Advantage Flex form 93017; Short-Term Home Health Care rev. 10/23) | GA1 |

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

1. **GTL — a rates panel is all the carrier provides.** The source is the
   carrier portal's "GTL Commission Rates" list, which gives a first-year/renewal
   pair per product code and nothing else. The agency has confirmed this is what
   GTL supplies, so the rules are **not** flagged for verification — there is no
   fuller schedule to check them against. Each GTL result does carry a note
   saying the rate has no state or age breakdown. The limitations to keep in
   mind:

   - **No state breakdown.** The panel does not vary by state, so the rules are
     written to all 13 appointed states. If GTL's rates actually differ by
     state — as every other carrier's Medicare Supplement does — these will be
     wrong outside whichever state the panel reflects.
   - **No age bands.** Same issue. **MedSup at a flat 23% is the one to check
     hardest**: every other carrier in this calculator varies Medicare
     Supplement by age (under 65 / 65-79 / 80+), so a single flat rate is
     unusual and may be a headline figure rather than the whole picture.
   - **The panel screenshot is cut off** at "GmGap" and "SupSel", so there may be
     further products below the visible area. A second screenshot scrolled down
     would complete the list.

   Products listed on the panel with **no rate shown** are deliberately not
   loaded: CCash, CHS Pro+, CI, DVH, LifeSelect, Indemnity Plus, IndGap.

   The `ADV+` entry reads "50/3 N25" on the panel. It is loaded at 50%; the
   meaning of "N25" is not established and is recorded in the rule's note.

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

### Medico — verified, nothing wrong

Confirmed against all 12 pages. Every Medicare Supplement state block, plus
Short Term Care, Medico Dental, Hospital Indemnity, First Diagnosis Cancer and
Critical Illness, matched what was already loaded. No changes were needed.

### Bankers Fidelity — verified, Disability rates corrected

Confirmed against all 5 pages. Medicare Supplement Preferred/Standard and
HDF/HDG/K rates, Vantage Flex Plus, Vantage Care, Vantage Recovery and
LifeVantage Secure Final Expense all matched.

One error: **the Disability rate is not 4% everywhere.** It had been loaded as a
flat 4% across AZ, LA, NC, NJ, OH, PA, TX and VA. The schedule actually pays:

| State | Disability | Disability, Plans HDF/HDG/K |
|---|---|---|
| AZ, NC, NJ, OH, TX, VA | 4% | — |
| Pennsylvania | **11.5%** | **14%** |
| Louisiana | **23%** | **28%** |

Pennsylvania and Louisiana also carry a separate rate for the high-deductible
disability form (8236), which had no entry at all. Louisiana disability was
understated by nearly six times.

### Liberty Bankers — verified, nothing wrong

Confirmed against all 5 pages. Both previously-flagged readings turned out to be
correct and their caution flags are removed:

- **Supplemental Health state groups.** The left-hand table is the 50%/60% group
  and the right-hand table the 55%/65% group, exactly as transcribed. So Hospital
  Indemnity pays 72.50%/57.50% in the 50% states (FL, ID, IL, LA, NC, NV, PA,
  TX), 62.50%/47.50% in the 55% states (AZ, OH, VA) and 47.50%/32.50% in New
  Jersey.
- **Medicare Supplement**, every appointed state, matched the source exactly —
  including Ohio and New Jersey having no under-65 rate on Plans F & G or Plan N,
  and the AZ / FL / LA / NV group paying a genuine 0%.

### Heartland — complete, and both open questions closed

Read from all 10 pages (7-9 are blank). Two things that had been outstanding are
now resolved:

- **The advance term is 9 months** at GA1 level, confirmed by the agency. It had
  been blank in the spreadsheet and unstated in the schedule, so the calculator
  had been showing "Advance: Not on file" rather than an upfront figure.
- **The unidentified rate table on page 2 (form 93017) is Secure Advantage Flex**
  hospital coverage. Its name appears only inside a logo image, which is why flat
  text extraction could not find it. Now loaded: 60% / 40% (ages 0-80 / 81-85) in
  IL, LA, NC, NV, PA and TX, and 55% / 35% in AZ, FL, OH and VA.

One correction: **North Carolina's under-65 rate of 0.90% applies to Plan A
only.** The 0-64 block sits inside the Plan A table on the page; Plan G and
Plan N have no under-65 rate in NC. This had previously been applied to all
three plans and was noted as the one reading inferred from layout — the render
settles it.

**Medicare Supplement is not advanced under 65 or at 81+**, even though the
carrier advances 9 months normally. Those rules carry a per-rule advance
override of 0 so the calculator reports them as-earned instead of showing an
upfront amount that would not be paid. Ancillary products at 81-85 are still
advanced normally.

### American Benefit Life — ambiguity resolved

The five state blocks previously left out (New Jersey, Ohio, Nevada, Iowa,
Nebraska) were unreadable only because flat text extraction separated each
block's heading from its rate row. Reading the PDF with column coordinates
resolved them completely — the rate cells sit at fixed x positions that identify
the plan and age band unambiguously.

Three of the five are states we are appointed in and are now loaded:

- **New Jersey** — Plan A pays 0.50% under 65, 0.90% at 65-79 and **0%** at 80+.
  Plans F & G and Plan N have no under-65 rate at all on this schedule.
- **Ohio** — no under-65 rates on any plan, and renewals drop to 0% from year 6.
- **Nevada** — pays materially less than every other state: F & G at **14.50%**
  (65-79) and **2.25%** (80+), Plan N at **20%** and **4.75%**, versus the usual
  24.50% / 12.25% and 29.50% / 14.75%.

Iowa and Nebraska were also recovered but are not states we are appointed in, so
they are not loaded. Every previously-loaded American Benefit Life state was
re-verified against the source and is unchanged.

### Aflac (Tier One) — verified, Final Expense added

All Medicare Supplement state blocks confirmed correct, including the flat-7%
states (CA, ID, NV, VA), the states with no under-65 availability (AZ, OH), and
New Jersey's split where Plans C and D are available under 65 but Plan N is not.

**Page 4 is a scanned page and had been missed entirely.** It carries the Tier
One **Final Expense** schedule, now loaded: Level Benefit (issue ages 45-80) at
108% and Modified (issue ages 40-75) at 95%, available in all states where the
product is sold. No commission on policy fee or conversions; full commission on
all plan riders.

### Manhattan Life — verified, one state fixed

All 4 pages of this schedule are **scanned images with no text layer at all**,
so coordinate extraction does not apply; the pages were read visually from
renders. Every flat rate on the Health and Disability Products table, the
Florida-only variants, the Arizona 24 Hour Accident rate and Hospital Indemnity
Select were confirmed correct.

One error was found and fixed: **Nevada belongs in the top Short Term Care band**
(60% ages 45-79, 50% ages 80+). It had been dropped when the state list was
first transcribed, so Nevada Short Term Care returned "not found" instead of a
rate. Every other Short Term Care band was correct.

### Mutual of Omaha — Pennsylvania resolved

Pennsylvania Long Term Care has two new-business scales depending on whether the
writing General Agent has other General Agents in their downline. **The agency
has confirmed it has no downline General Agents**, so the lower scale applies and
the other has been removed:

| | Under 70 | 70-74 | 75-79 |
|---|---|---|---|
| Individual (loaded) | 50% | 30% | 25% |
| Association / Sponsored Group (loaded) | 45% | 25% | 20% |
| *Downline-GA scale (not loaded)* | *60% / 55%* | *40% / 35%* | *35% / 30%* |

Pennsylvania now offers the same two products as California and Virginia, at its
own rates. **Revisit this if the agency ever takes on downline General Agents** —
the rules carry a note to that effect. California and Virginia pay the higher
scale and were verified correct.

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

Nothing. Every rule has been checked against its carrier's own schedule, except
GTL's, where the portal rates panel is the only source the carrier provides and
a caution to "check the schedule" would point at a document that does not exist.

## Discrepancy worth knowing about

For **Liberty Bankers**, the spreadsheet says *"9 month advance for ancillary;
No advance for Medicare supplement,"* and the agency has since confirmed that
again. The PDF's Supplemental Health schedule, however, shows **"☒ No Advance"**
checked. The calculator follows the agency's instruction and advances ancillary
9 months. The Medicare Supplement side agrees in both sources: no advance.

This is the one place where a loaded advance term contradicts the carrier
document, so it is worth a call to Liberty Bankers to settle which is current.

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
