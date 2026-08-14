# Where the numbers come from

Every rate in `data/commission-data.js` was transcribed from our own carrier
commission schedules at our own contracted levels. No street-level or publicly
published rates are used anywhere.

## Source documents

| Carrier | Schedule read | Our contract level |
|---|---|---|
| Aetna Senior Supplemental | `aetna senior supplemental commission schedule.pdf` (eff. 07/23/2026) | General Agent, Level 12 |
| Mutual of Omaha | `Mutual of Omaha Commission Schedule.pdf` (eff. 05/2026) | General Agent (BMO151) |
| Healthspring | Loyal American Life commission schedule (eff. 04/07/2025) | GA-60 |
| Physicians Mutual | `physicians mutual commission schedules.xlsx` | General Agent (topline street), Level 5 |
| Manhattan Life | `manhattan life commission schedule` (JU Level 5, 2-2026) | MGA |
| Aflac | `aflac commission schedule.pdf` — Tier One Insurance Company (eff. 05/01/2026) | GA 8 |
| American Benefit Life | `American Benefit Life Commission Schedule.pdf` (eff. 11/01/2025) | GA 10 |
| Liberty Bankers | `Liberty Bankers Commission Schedules` (Med Supp eff. 08/01/2026; Supplemental Health eff. 05/01/2026) | GA10 / Level 10 Heaped |
| Medico (Wellabe) | `wellabe/medico commission schedules.pdf` (eff. 09/01/2026) | MGA Level 4 |
| Bankers Fidelity | `bankers fidelity commission schedule` (GAT 7-26) | General Agent |

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
   data could not be retrieved intact, so there is no rate text to transcribe.
   The spreadsheet's 9-month advance for GTL is already recorded; only the rates
   are missing. Send the schedule as a PDF or paste the rates and this is a
   quick add.

2. **Heartland** — no rules loaded. The spreadsheet has no schedule link and no
   advance arrangement for this carrier.

3. **Mutual of Omaha — Medicare Supplement, Dental, Dental Savings, Hospital
   Indemnity, Accidental Death.** The PDF's text extraction stopped after the
   Long Term Care schedule, so only Long Term Care rates are loaded. The contract
   summary confirms these products exist on our contract (schedule codes Q64.021,
   AM2.001, R62.005, K18.001, K73.001, V09.001, JF9.001) but the rate tables were
   not recoverable. Note the schedule also states a **9-month** advance applies to
   the Accidental Death product specifically, versus 12 months for other Mutual of
   Omaha health products.

4. **American Benefit Life — New Jersey, Ohio, Nevada, Iowa, Nebraska.** In the
   ABL PDF these five state blocks appear with their headings separated from
   their rate rows, so which rate row belongs to which state cannot be
   established with certainty. Rather than guess, these states are left out.
   Every other ABL state block was unambiguous and is loaded.

5. **Aetna — Illinois under-65 Medicare Supplement, and the Protection Series /
   Home Care / Recovery Care legacy products.** Same problem: the state-to-rate
   column mapping in those specific tables was not recoverable with certainty.
   Illinois ages 65+ and 80+ are loaded; Illinois under-65 is not.

6. **Healthspring — the "Level" (as opposed to "Heaped") Dental/Vision/Hearing
   variants.** Only the Heaped rates were unambiguous.

## Flagged for spot-check

Liberty Bankers **Supplemental Health** rules carry a `verify: true` flag and
show a caution note on the results card. Those rates come from a two-column PDF
layout where the left column is the 50%/60% state group and the right column is
the 55%/65% group. The column pairing is structurally clear but worth confirming
against the schedule before quoting a large case.

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

After any edit, run `node test/engine.test.js`. The suite checks for overlapping
age bands, unknown states, out-of-range rates, and products that appear in a
dropdown but resolve at no age.
