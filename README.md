# Commission Calculator

A single-screen commission calculator for Mohr Insurance Services. Pick the
carrier, state and product, enter the client's age and monthly premium, and see
what the agency should be paid and how much of it should be advanced upfront —
instead of opening carrier PDFs on every sale.

## Running it

Open `index.html` in a browser. That's the whole install — no build step, no
dependencies. It works from a local file, a shared drive, or any static host.

To serve it over HTTP instead:

```
npm start          # http://localhost:3000
```

`server.js` is a zero-dependency static file server that listens on `$PORT`
(default 3000) and binds `0.0.0.0`, which is what platform hosts expect.

### Deploying

Railway, Render, Fly and Heroku all work with no configuration: they detect
Node, find the `start` script, and run it. `/healthz` returns `200 ok` for
health checks.

Railway note: Railpack looks for a start command and fails the build without
one, which is why `server.js` and the `start` script exist even though the page
itself is static.

## How it works

**Dependent dropdowns.** Choosing a carrier narrows the state list to states
that carrier's schedule covers *and* that we're appointed in. Choosing a state
narrows the product list to products available in that state.

**Age is applied automatically.** Where a schedule has age-based levels (under
65 vs 65+, 65–79 vs 80+, 80–85 vs 86+, issue-age bands on Short Term Care or
Whole Life), the age entered selects the right rate. Nobody has to know the
percentage.

**Plans are distinguished.** Where a carrier pays differently for Medicare
Supplement Plan N than for its other plans, Plan N is a separate product in the
dropdown with its own rate.

**Two tabs, one calculator.** *Medicare Supplement & Ancillary* is the carrier
flow above. *MAPD* is its own tab because Medicare Advantage pays a flat
CMS-capped amount per enrollment rather than a percentage of premium — the
amount is the same whichever carrier writes it, so there is no carrier to pick
and no premium to enter. The MAPD tab asks for State, Enrollment Type, Current
Coverage and Effective Date, and shares the same results card. Switching tabs
keeps your state selection where it still applies and clears it where it does
not.

**Advances are per carrier *and* product — and sometimes per age.** Bankers
Fidelity advances 9 months on Medicare Supplement and 6 months on ancillary.
Liberty Bankers advances 9 months on ancillary and nothing on Medicare
Supplement. Heartland advances 9 months, except on Medicare Supplement under 65
or at 81+, which pays as-earned. The calculator applies the right one and shows
which source it came from.

## The math

Most carriers pay a percentage of premium:

```
Annualized Premium          = Monthly Premium × 12
Total First-Year Commission = Annualized Premium × Commission Rate
```

### Flat-amount carriers

UnitedHealthcare, Anthem Blue Cross and Blue Shield of California pay a set
dollar amount per policy year instead, so premium does not enter the calculation
at all and the premium field disappears when one of their products is selected:

```
Total First-Year Commission = the schedule's year-1 amount
```

Four states are **area-rated by ZIP** on that schedule — Florida, Louisiana,
Nevada and Pennsylvania — so the calculator asks for the applicant's ZIP in
those states and looks up the rating area from the carrier's own area chart.
Florida Plans B/C/F/G pay $582 in Area 1 and $431 in Area 3, so the ZIP is not a
detail. A ZIP outside the chart says so rather than reporting no data.

### MAPD

MAPD pays a flat annual amount set by state group and effective year, so there
is no premium in the calculation. What the member is switching *from* decides
the rate — not which enrollment period they used:

| Current coverage | Commission type |
|---|---|
| New to Medicare, Original Medicare, PDP, Employer Group Plan | Initial / FYC |
| MA, MAPD | Renewal / Like-Plan |

Initial/FYC pays the full initial rate. A like-plan renewal is prorated over the
months the member will be active on the new plan this year:

```
Months Active       = 13 − effective month
Expected Commission = Annual Renewal Rate ÷ 12 × Months Active
```

So a Texas MAPD-to-MAPD switch effective 1 September 2026 pays
`$347 ÷ 12 × 4 = $115.67`, while the same switch effective 1 January pays the
full `$347`.

State groups are **CA/NJ**, **PA**, and **National** (the other ten licensed
states). Rates are on file for 2026 and 2027; an effective date in any other
year returns a message naming the year rather than guessing.

With an advance of *N* months, the advance is *N* months' worth of the
first-year commission, whichever way that commission was calculated:

```
Expected Upfront Commission   = Total First-Year Commission ÷ 12 × N
Remaining As-Earned           = Total First-Year Commission − Upfront
```

With no advance, the card shows **Payment Method: As-Earned** and the expected
monthly commission (`Monthly Premium × Commission Rate`).

## It never guesses

If there is no exact match for carrier + state + product + age, the calculator
shows:

> Commission information not found for this selection.

It does not fall back to a nearby age band, a neighbouring state, or a generic
carrier rate. A schedule that genuinely pays 0% is reported as $0 with a note
saying so — that's a real contracted rate, not a missing lookup.

## Files

| File | What it is |
|---|---|
| `index.html` | The calculator screen |
| `styles.css` | Styling |
| `app.js` | Dropdown wiring and the results card |
| `engine.js` | Lookup and math — no DOM, shared with the tests |
| `data/commission-data.js` | The normalized commission rule table |
| `data/uhc-areas.js` | UnitedHealthcare ZIP-to-rating-area charts |
| `data/SOURCES.md` | Which schedule each rate came from, plus known gaps |
| `server.js` | Zero-dependency static server for deployment |
| `test/engine.test.js` | Lookup and calculation tests |
| `test/server.test.js` | Static server smoke tests |

## Tests

```
npm test
```

Covers the 12/9/6/no-advance paths, age-band and Plan N selection, the
never-guess behaviour, dropdown dependency, and data integrity checks
(overlapping age bands, unknown states, out-of-range rates, products that appear
in a dropdown but resolve at no age), plus static-server smoke tests including
the asset allowlist and path-traversal handling.

## Data coverage

Loaded: Aetna Senior Supplemental, Aflac, American Benefit Life,
Anthem Blue Cross (California only), Bankers Fidelity, Blue Shield of California
(California only), GTL, Healthspring,
Heartland, Liberty Bankers, Manhattan Life, Medico,
Mutual of Omaha (Long Term Care only), Physicians Mutual, United American,
UnitedHealthcare (AARP Medicare Supplement).

Read from the full source and complete: **Aetna Senior Supplemental**,
**Aflac**, **American Benefit Life**, **Anthem Blue Cross**, **Bankers
Fidelity**, **Healthspring**, **Heartland**, **Liberty Bankers**, **Manhattan
Life**, **Medico**, **Physicians Mutual**, **United American**,
**UnitedHealthcare**, and **Mutual of Omaha** (for the Long Term Care schedule,
which is all that schedule contains). Only **GTL** rests on a weaker source — a
carrier portal rates panel — and its rules are flagged accordingly.

**GTL** is loaded from a carrier-portal rates panel rather than a commission
schedule. It has no state or age breakdown, so every GTL rule is flagged for
verification and shows a caution note on the results card. See
[`data/SOURCES.md`](data/SOURCES.md) before relying on it.

**Heads-up on the MAPD tab:** it uses the CMS caps, which every carrier is
capped at but not every carrier pays. UnitedHealthcare's own schedule pays
$406-$510 initial on a **non-SNP PPO** against the $694-$864 the tab shows — its
HMO, SNP and renewal amounts do match. See [`data/SOURCES.md`](data/SOURCES.md).

**Blue Shield of California** is the one carrier whose rate did not come from a
commission schedule — the agency supplied it directly. There is no advance, so
its results card shows the flat first-year commission on its own with no advance
section at all.

**Healthspring Medicare Supplement** moved to the Medco Containment (MCLIC)
AMGA-70 schedule effective 09/22/2025, replacing the Loyal American
California-only rates. It now covers every appointed state, and the rates are
higher — Plans F & G at 65-79 went from 15% to 23%. Healthspring's ancillary
products are unchanged, still on the Loyal American GA-60 schedule. Two rules on
that schedule are flagged for verification because the carrier's own document is
self-contradictory; both show a caution note on the results card and are written
up in [`data/SOURCES.md`](data/SOURCES.md).

Remaining gaps are listed in [`data/SOURCES.md`](data/SOURCES.md).

## Adding or fixing rates

Edit `data/commission-data.js` — it's a plain list of rule objects, each with
carrier, states, category, product, age range, rate, and any exception note.
Then run `npm test`. See `data/SOURCES.md` for the conventions.

If you add a new file the page loads, add it to the `ALLOWED` list in
`server.js` — the server serves an explicit allowlist, not the whole directory.
