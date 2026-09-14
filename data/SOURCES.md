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
| United American | `United American Commission Schedules.pdf` — **all 7 pages** (Med Supp 1H96 rev. 03-01-22; Other Health 1H97 eff. 01-01-2018; Life & Annuity 1L98 eff. 01-01-2018) | Level 01, Non-Lead Contract |
| UnitedHealthcare | `uhc commissions.pdf` — **all 69 pages** (agent agreement amendment 09/09/2025; AARP Med Supp schedule for signature dates on/after 10/01/2025 and effective dates on/after 01/01/2026) | Agent level, UnitedHealthcare Insurance Company |

Advance arrangements come from column B of
`Carrier Advances_Commission schedules.xlsx` and nowhere else — the spreadsheet
is the source of truth for advances, and each one is quoted verbatim in the
`source` field of the `ADVANCES` table.

Appointed states come from column F of the same spreadsheet:
AZ, CA, FL, ID, IL, LA, NC, NJ, NV, OH, PA, TX, VA. Rules are limited to these
13 states, so the state dropdown only ever offers states we can actually write in.

## MAPD

MAPD is held separately from the carrier rules because it works differently: it
pays a **flat CMS-capped dollar amount per enrollment**, identical whichever
carrier the plan is written through, varying only by state group and effective
year. It is therefore reached by its own tab rather than being
duplicated as a product under all twelve carriers, and it takes no carrier, age
or premium.

| Group | States | 2026 Initial / Renewal | 2027 Initial / Renewal |
|---|---|---|---|
| CA/NJ | CA, NJ | $864 / $432 | $902 / $451 |
| PA | PA | $781 / $391 | $816 / $408 |
| National | AZ, NV, LA, TX, NC, ID, OH, IL, VA, FL | $694 / $347 | $725 / $363 |

The member's **current coverage** decides Initial/FYC versus Renewal — New to
Medicare, Original Medicare, PDP and Employer Group Plan are Initial; MA and
MAPD are like-plan Renewals. Enrollment type (IEP / AEP / SEP) is recorded for
tracking and deliberately does **not** affect the rate.

Renewals are prorated as `annual rate ÷ 12 × (13 − effective month)`. Initial/FYC
is never prorated. An effective date outside 2026-2027 returns a message naming
the year rather than falling back to a nearby schedule.

### These are CMS caps, and one carrier is known to pay less on PPOs

The table above is the CMS-published maximum. UnitedHealthcare's own 2026 MA
schedule (Exhibit 2 of its agent agreement amendment) shows the Agent-level
amounts it actually pays, and they split by plan type:

| | CA / NJ | PA | All other states |
|---|---|---|---|
| Initial — HMO plans and all SNPs | $864 | $781 | $694 |
| **Initial — non-SNP PPOs** | **$510** | **$465** | **$406** |
| Renewal — all MA plans | $432 | $391 | $347 |
| PDP — initial and renewal | $0 | $0 | $0 |

The HMO/SNP row and the renewal row match the CMS caps exactly. The PPO row does
not: on a UnitedHealthcare non-SNP PPO the MAPD tab currently overstates the
initial commission by $288-$354, roughly 41%. UnitedHealthcare also pays **$0**
on standalone Part D.

The tab is deliberately carrier-agnostic, so this has not been changed. Fixing
it properly means adding a carrier and plan-type selection to the MAPD tab; the
data for UnitedHealthcare is transcribed above and ready if we want it.

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

1. **UnitedHealthcare — the AARP Medicare Supplement schedule is loaded; two
   other exhibits in the same document are not.**

   - **UnitedHealthcare Insurance Company OF AMERICA** (Exhibit 3, page 8) is a
     separate, much lower schedule for the same AARP plans — $100 / $50 / $0 in
     AZ, IL, NC, NJ and PA, $0 in full for several states. It applies only to
     agents "specifically authorized by way of a separate notice from the
     Company". We have not confirmed that authorization, so it is not loaded.
     If we hold it, the calculator needs to know which insurer wrote the policy.
   - **Exhibit 2, the 2026 PDP and MA schedule**, is not loaded — the MAPD tab
     covers Medicare Advantage from the CMS caps. See the note under **MAPD**
     below: UnitedHealthcare's non-SNP PPO amounts are materially lower than
     the figures that tab currently shows.

   An earlier file supplied for UHC was a five-page DocuSign *Certificate Of
   Completion* rather than the document it certified. The full 69-page schedule
   has since been supplied and is what is transcribed here.

2. **GTL — a rates panel is all the carrier provides.** The source is the
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

3. **Mutual of Omaha — everything except Long Term Care.** The schedule PDF was
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

### UnitedHealthcare — AARP Medicare Supplement, flat dollar amounts

Read from all 69 pages. The document is the September 9, 2025 amendment to the
agent agreement; rate content sits in four exhibits, of which Exhibit 3 is the
Medicare Supplement schedule loaded here, for **applicant signature dates on or
after 10/01/2025 and policy effective dates on or after 01/01/2026**.

**This carrier pays flat dollars, not a percentage.** Every other carrier in the
calculator pays a percentage of premium; UnitedHealthcare pays a set amount per
policy year that does not vary with premium at all. Rules therefore carry
`flatAmount` rather than `rate`, and the premium input disappears from the form
when one of these products is selected — asking for a number that cannot change
the answer would imply that it does. Amounts are Agent-level and, per the
schedule, "net of compensation payable to all lower sales levels".

**Four of our states are area-rated by ZIP code.** The schedule says plainly:
"The applicable Area is determined based on the applicant's permanent
residential address and the applicable AREA CHART for the state [in Appendix
C]". Florida has 4 areas, Louisiana 2, Nevada 2, Pennsylvania 3 — and the
spread is large: Florida Plans B/C/F/G pay **$582** in Area 1 against **$431**
in Area 3, a $151 difference on the same policy. The calculator asks for the
applicant's ZIP in those four states and nowhere else.

Appendix C's charts for those four states are transcribed into
`data/uhc-areas.js` — 4,667 ZIP codes stored as inclusive ranges. The areas
partition cleanly; a test walks every range and asserts no ZIP falls in two
areas of the same state. The charts for MI, MO, NE, NY and WI are not
transcribed, as we are not appointed there.

**Year-1 Agent-level amounts, age 65+, for our states:**

| State | Plan group | Year 1 |
|---|---|---|
| AZ, IL, NC | B, C, D, F, G, Select G / N, Select N / A, K, L | $315 / $252 / $126 |
| OH, TX | B, C, D, F, G, Select G / N, Select N / A, K, L | $315 / $252 / $126 |
| VA | B, C, F, G, Select G / N, Select N / A, K, L | $360 / $288 / $96 |
| CA | B, C, F, G / N / A, K, L | $360 / $288 / $144 |
| NJ | B, C, D, F, G / N / A, K, L | $510 / $408 / $126 |
| ID | B, C, F, G / N / A, K, L | $100 / $50 / **$0** |
| FL Areas 1-4 | B, C, F, G, Select G | $582 / $468.25 / $431 / $443.25 |
| FL Areas 1-4 | High-Deductible G | $141.50 / $114.25 / $105 / $108 |
| LA Areas 1-2 | B, C, F, G, Select G | $315 / $255 |
| NV Areas 1-2 | B, C, F, G | $360 / $270 |
| PA Areas 1-3 | B, C, F, G | $360 / $315 / $255 |

High-Deductible G appears on the Florida rows only. Idaho's Plans A, K and L
pay a documented **$0** — reported as $0, not as a missing lookup.

**Under 65 is handled, because the rules differ sharply by state.** Condition
(g) of the schedule says commission is not payable for an applicant under 65
"except as noted in the following states where required", and of our states
that list names CA, FL, ID, IL and PA. So:

- **AZ, LA, NC, NJ, NV, OH, TX, VA** — nothing is payable under 65.
- **FL, ID, IL** — the full age 65+ amount applies.
- **PA** — "for years 1-6, commissions for all levels will be paid at 5% of the
  65+ rates", so a PA Area 1 Plan G under 65 pays $18.00 rather than $360.00.
- **CA** — the 65+ amount, but only during the applicant's first six months of
  Medicare Part B enrollment. The results card carries that condition.

**Advance:** nine months, stated in the schedule itself — "A nine-month
commission advance is paid on all AARP Med Supp Plan sales once the first month
premium has been paid". No advance is paid on internal replacements. For a flat
amount the advance is nine twelfths of the year-1 figure.

**Modeled as year 1 only, as everywhere else.** Two renewal-side details are
worth knowing even so: Ohio and Texas band their renewal years 2-7 and 8-10
rather than 2-6 and 7-10, and guaranteed-issue business outside open enrollment
pays only 5% of the 65+ amount for years 1-6 (1-7 in OH and TX) in every one of
our states except FL and ID. A sale replacing another carrier's Medicare
Supplement pays the year 2 amount in year 1.

**Not loaded, deliberately:** the schedule for AARP plans insured by
UnitedHealthcare Insurance Company **of America** (a separate, much lower table
on the following page) and Exhibit 2, the 2026 PDP and MA schedule. Both are
covered under **Known gaps**.

### United American — loaded from all three schedules

Read from all 7 pages with coordinate extraction. The file holds **three
schedules, one per product family**, each labelled `LEVEL 01` and
`Non-Lead Contract`:

| Contract | Family | Effective |
|---|---|---|
| 1H96 | Medicare Supplement | rev. 03-01-22 |
| 1H97 | Other Health Products | 01-01-2018 |
| 1L98 | Life & Annuity Products | 01-01-2018 |

They are not three alternative contract levels to choose between — all three are
ours, one per family. Pages 5–7 are Globe Life's social media and trademark
policy and carry no rate content.

**Reading the schedule.** Each row is *policy type → plans → ages → states →
rates by policy year*. Only the **1st Year** column is loaded. The footer sets
the fallback rule: "Standard Rates shall apply unless state specific rates are
provided herein", so an appointed state absent from every override takes the
Standard row. Overrides naming IN, WA, WV, KS, MT, MO, ME, CO, MD, SD or NH are
outside our licensing and are not transcribed.

**The state overrides that do reach us:**

| Product | Standard | Our exceptions |
|---|---|---|
| Med Supp A, B, C, D, F, G, MC48 (65+) | 13% | ID also 13% — no difference |
| Med Supp HDF & HDG (65+) | 10% | **ID 13%** |
| Med Supp K, L, N attained age (65+) | 18 / 13 / 8% by band | none |
| Med Supp K, L, N issue age (65+) | 15 / 13 / 11% by band | **ID flat 13% at all ages 65+** |
| Under-65 disability, underwritten | 13% / 10% / 10% | none |
| Under-65 disability, OE/GI/ESRD | **0%** | FL 3.20 / 2.50 / 2.70%; ID 13%; CA & IL 13 / 10 / 8% |
| MMGAP | 15% | **CA 3%** |

**Under-65 disability needed a product split.** The schedule prices under-65
disability business two ways at very different rates — medically underwritten
versus open enrollment / guaranteed issue / ESRD — and age alone cannot tell
them apart. Taking Plans A–G in Florida: 13% underwritten against 3.20% on a
GI basis, a 4× difference. Since the calculator's inputs are carrier, state,
product, age and premium, the underwriting basis is carried in the **product
name** and the agent picks it. Guessing either way would have been wrong most of
the time.

The OE/GI/ESRD standard rate is a real, documented **0%** in AZ, LA, NC, NJ, NV,
OH, PA, TX and VA. The calculator reports $0 there rather than "not found" — the
rate exists and it is zero. Same for the Accidental Death Policy (ADP), which
the Life schedule shows at 0.00% in every policy year.

**Products listed for one state only.** CANLS appears for Florida alone and
INDEM1 for California alone, neither with a Standard row, so each is written to
that state only. **CANB is not loaded at all** — it is listed for MT and NH,
which we are not appointed in, and has no Standard rate.

**Product codes.** The Other Health schedule names its products only by code
(MMGAP, CILS, CANLS, CANLS-2, UA250, INDEM1), so that is what the Product
dropdown shows, with a note saying so. Plain-English names to be supplied.

**Advance:** none — confirmed with the agency; commission is paid as earned. The
schedules themselves state no advance terms.

**Carried as notes, not as math:** commission is 3% less when the initial
premium is paid by credit or debit card (this note is on every United American
rule); no commission is paid on the portion of Medicare Supplement premium
attributable to the Part B deductible; plans C, F and HDF are closed to newly
eligible beneficiaries on or after 1/1/2020; and renewal commission is 0% in
policy years 7+ on Medicare Supplement issued guaranteed-issue to replace a
Medicare Advantage policy — renewal years are not modeled in Version 1 either
way.

**Not to be confused with** Mutual of Omaha's "United Health" (AM2.001) and
"United World" (R62.005) Medicare Supplement schedules listed in its Contract
Summary, or with UnitedHealthcare. Three different companies.

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
