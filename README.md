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

Loaded: Aetna Senior Supplemental, Aflac, American Benefit Life, Bankers
Fidelity, Healthspring, Heartland, Liberty Bankers, Manhattan Life, Medico,
Mutual of Omaha (Long Term Care only), Physicians Mutual.

Read from the full source and complete: **Aetna Senior Supplemental**,
**Aflac**, **Healthspring**, **Physicians Mutual**, **Manhattan Life**, and
**Mutual of Omaha** (for the Long Term Care schedule, which is all that
schedule contains).

Not loaded: **GTL** — its schedule is a PNG image whose data can't be retrieved
intact, so there are no rates to transcribe.

Heartland's rates are loaded but its **advance term is unknown** (blank in the
spreadsheet, unstated in the schedule). For Heartland the calculator shows the
rate and total first-year commission and labels the advance "Not on file"
rather than inventing an upfront figure.

A few individual state blocks from other carriers were left out where the source
PDF's layout made the state-to-rate mapping ambiguous. All of it is listed in
[`data/SOURCES.md`](data/SOURCES.md).

## Adding or fixing rates

Edit `data/commission-data.js` — it's a plain list of rule objects, each with
carrier, states, category, product, age range, rate, and any exception note.
Then run `npm test`. See `data/SOURCES.md` for the conventions.

If you add a new file the page loads, add it to the `ALLOWED` list in
`server.js` — the server serves an explicit allowlist, not the whole directory.
