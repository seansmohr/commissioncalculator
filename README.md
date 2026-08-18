# Commission Calculator

A single-screen commission calculator for Mohr Insurance Services. Pick the
carrier, state and product, enter the client's age and monthly premium, and see
what the agency should be paid and how much of it should be advanced upfront —
instead of opening carrier PDFs on every sale.

## Running it

Open `index.html` in a browser. That's the whole install — no server, no build
step, no dependencies. It works from a local file, a shared drive, or any static
host.

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

**Advances are per carrier *and* product.** Bankers Fidelity advances 9 months
on Medicare Supplement and 6 months on ancillary. Liberty Bankers advances 9
months on ancillary and nothing on Medicare Supplement. The calculator applies
the right one and shows which spreadsheet line it came from.

## The math

```
Annualized Premium          = Monthly Premium × 12
Total First-Year Commission = Annualized Premium × Commission Rate
```

With an advance of *N* months:

```
Expected Upfront Commission   = Monthly Premium × N × Commission Rate
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
| `data/SOURCES.md` | Which schedule each rate came from, plus known gaps |
| `test/engine.test.js` | Test suite |

## Tests

```
node test/engine.test.js
```

Covers the 12/9/6/no-advance paths, age-band and Plan N selection, the
never-guess behaviour, dropdown dependency, and data integrity checks
(overlapping age bands, unknown states, out-of-range rates, products that appear
in a dropdown but resolve at no age).

## Data coverage

Loaded: Aetna Senior Supplemental, Aflac, American Benefit Life, Bankers
Fidelity, Healthspring, Heartland, Liberty Bankers, Manhattan Life, Medico,
Mutual of Omaha (Long Term Care only), Physicians Mutual.

Not loaded: **GTL** — its schedule is a PNG image whose data can't be retrieved
intact, so there are no rates to transcribe.

Heartland's rates are loaded but its **advance term is unknown** (blank in the
spreadsheet, unstated in the schedule). For Heartland the calculator shows the
rate and total first-year commission and labels the advance "Not on file"
rather than inventing an upfront figure.

A handful of individual state blocks were also left out where the source PDF's
layout made the state-to-rate mapping ambiguous. All of it is listed in
[`data/SOURCES.md`](data/SOURCES.md).

## Adding or fixing rates

Edit `data/commission-data.js` — it's a plain list of rule objects, each with
carrier, states, category, product, age range, rate, and any exception note.
Then run the tests. See `data/SOURCES.md` for the conventions.
