# UI-10 — Seller analytics

Status: complete, 18 October 2026, on `main`. Builds on UI-01 to UI-09
([UI-09](UI-09-seller-workspace.md)).

UI-10 modernizes the seller performance pages (`/dashboard/performance`)
on the analytics data GharBazaar already measures:
- **A daily views-and-enquiries chart**, adapted from Bklit UI's time-series
  line chart. It replaces the two CSS column charts:
  - drawn on the server and complete without JavaScript;
  - a small client layer adds keyboard, touch and pointer reading of any day.
- **Untracked days are gaps, never zeros.** They are hatched bands in the
  chart and "Not tracked" in the table and the readout.
- **Period figures stay plain numbers.** There are four tiles:
  - views and enquiries, each with its change from the previous period in
    words;
  - saves, labelled as a current count;
  - the enquiry rate, still hidden below 20 views.
- **An overview for all listings together** sits above the per-listing table,
  with the same tiles and chart.
- **A period change dims the figures** instead of blanking or replacing them.

What did not ship, and why:
- **Bklit's chart as published.** It plots a missing day at the top of the
  plot, overshoots below zero, has no keyboard access and blocks page scroll
  on touch. It is also 89 KB gzip (§4).
- **A status chart, a lead funnel, a saves history, metric cards.** Each
  would repeat a count already shown, or imply something never measured (§6).

Other numbers:
- **Bundle:** the performance route +1.99 KB gzip; every other route
  unchanged (±0.01 KB, hash renames).
- **No Motion, no Kokonut component, no Anime.js.**
- **The login and 404 scenes are untouched.**

---

## 1. Scope

**In:**
- the seller performance overview and per-listing pages;
- their tiles, chart, daily table, empty, error and loading behaviour;
- one chart token (`chart-2`).

**Out:**
- new measurements: no new tables, RPCs or tracking;
- admin analytics;
- the dashboard's status counts and the enquiries inbox (§6);
- the login and 404 scenes;
- the 75-phase numbering.

## 2. Data sources (all existing, read with the seller's own session)

| Figure | Source | Notes |
|---|---|---|
| Daily views, daily enquiries per listing | `rpc/seller_listing_activity` → `loadPerformance` → `seriesFor` (`DayPoint[]`) | a day before `listing_analytics_meta.views_since` is `null`; enquiries are counted whenever they happen |
| Period totals and previous period | `totals`, `buildPerformance` (7 / 30 / 90 days) | unchanged |
| Enquiry rate | `enquiryRate` | `null` below `RATE_MIN_VIEWS` (20); unchanged |
| Saved now | `rpc/seller_listing_save_counts` | a current count; `null` when unreadable, shown "Unavailable" |
| **All listings together** (new) | `combineSeries`, `sumTotals` in `lib/analytics/model.ts` | a per-day sum of the same rows; listings share one counting start, so a day nobody counted stays `null` |
| **Change from the previous period** (new) | `viewsChange`, `enquiriesChange` | plain differences, never percentages (§7) |

Nothing is fabricated. The chart and tiles have no sample data, no
impressions, no click-through and no averages.

## 3. What the seller sees

**Overview** (`/dashboard/performance?range=…`):
1. The period links (7, 30, 90 days), unchanged; the URL is the state.
2. **All listings together**:
   - four tiles;
   - the counting-start sentence when the period was partly untracked;
   - the chart;
   - "Daily figures" (a table of every day).
3. **Your listings**: the per-listing table and mobile list, unchanged.

**One listing** (`?listing=…`):
- the status, links, tiles and counting sentence;
- under "Day by day": the chart, then "Daily figures".

**Tiles** (`components/analytics/PeriodSummary.tsx`):

| Tile | Value | Note |
|---|---|---|
| Views, last N days | the count, or **Not tracked** | "↑ Up 8 from 22 in the previous 7 days" / "Down…" / "Same as…"; "Previous 7 days: not tracked"; "Previous 30 days: 165 views on 11 counted days, so not compared" |
| Enquiries, last N days | the count | the same wording; always compared (§7) |
| Saved now | the count, or **Unavailable** | "…have it saved today. A current count, not a figure for the period." |
| Enquiry rate | "4.7 per 100 views", or **Not enough views yet** | "Enquiry rate appears once the period has at least 20 views." |

Direction is in words. The arrow is `aria-hidden` and the colour is ink, so
red and green never carry meaning.

## 4. Bklit UI evaluation

**Source:**
- github.com/bklit/bklit-ui, `packages/ui/src/charts`;
- commit **`7167844902bf81afd43c52f223a04f40f6b03159`** (15 Oct 2026), the
  pin recorded in UI-02;
- MIT licence (charts), Copyright (c) 2026 uixmat. Bklit Studio is
  proprietary and was not used.
- The registry host stays blocked, so the GitHub source is the record.

**Method:** Bklit's `LineChart` + `Line` + `Grid` + `XAxis` + `ChartTooltip`,
copied unmodified into a scratch build of UI-09, imported from their own
modules (not the catalogue barrel), fed our data shape, measured from
served HTML and driven in Chromium.

| Finding (Bklit as published) | Measured | Consequence |
|---|---|---|
| Client JS for one line chart | **+89.0 KB gzip** on the route (67.3 KB visx / d3 / Motion chunk + 21.7 KB chart code); +169 KB through the `charts` barrel | 45× what the adaptation costs (1.99 KB) |
| A missing value | `getY` returns pixel **0**, the top of the plot: untracked days drew as the busiest days (`M0,0 C…`) | violates the untracked rule; no `defined()` on the path |
| Default curve `curveNatural` | path y went to **−0.064** between points | draws values below zero and peaks that never happened |
| Server render | **no SVG in the HTML**: `ParentSize` measures first | a blank box until hydration |
| Entrance | a Motion clip grows from width 0 (0.2px at 150 ms); with reduced motion it is full width | starts above-the-fold content invisible (CLAUDE.md) |
| Keyboard and ARIA | **no tab stop, no role, no label**; Tab passed the chart | no accessible interaction |
| Touch | container `touch-action: none` | a finger landing on the chart cannot scroll the page |
| Edges | the line fades to transparent at both ends by default | the first and last days look less certain than they are |
| Theme | `--chart-*` shadcn variables, dashed grid | re-tokenising needed in any case |

**Decision: adapt, don't ship.** The chart's visual and interaction language
is kept; the parts that broke our data or rules are replaced (§5). This
follows the SmoothTabs precedent (UI-05): a source, not a dependency, with
provenance in the file header.

**Alternatives compared:**
- **Ship Bklit and patch it.** Fixing the null handling, curve, server
  render, keyboard, touch and reveal touches most of `line.tsx`,
  `time-series-chart-shell.tsx` and the interaction hook, and still costs
  89 KB.
- **The previous CSS columns.** These were honest, but two separate charts
  had no shared date reading, and the native `title` tooltip is mouse-only.
- **The adaptation.** It keeps Bklit's crosshair-and-readout model and costs
  1.99 KB. Shipped.

**Components shipped (adapted, `components/analytics/`):**
- `DailyActivityChart.tsx` (server). It draws:
  - the two panels, grid, y and x axes;
  - the views line and its 10% area wash;
  - untracked bands, dots, enquiry columns;
  - the legend keys.
- `ChartScrubber.tsx` (client): slider, crosshair, active dot, readout.
- `chart-marks.tsx`: the series keys.
- Geometry in `lib/analytics/chart.ts` (pure, unit-tested).

**Not adapted:**
- area, bar, composed, pie, ring, radar, sankey, funnel, gauge, heatmap,
  choropleth and candlestick charts;
- brush, markers, loading pulses, y-domain tweens, legends with
  `@base-ui/react`, `@number-flow/react`.

**Dependencies added: none.** A straight-segment path over a daily grid is
a few lines (`linePath`). visx and d3 would be 67 KB for scales and a path
generator the chart does not need.

## 5. The chart

**Type:**
- one date axis;
- **views as a line** with a 10% wash, a continuous measure over 7–90 days;
- **enquiries as columns** in a second panel below: small integer counts,
  often zero, where a line between 0 and 1 would suggest fractions.

Each panel has its own axis from zero. Views and enquiries are never on one
scale (enquiries would lie flat) or on two y-scales in one plot.

**Adaptations from Bklit:**

| Bklit | GharBazaar |
|---|---|
| crosshair snaps to the nearest day; one readout for every series; header row then value rows; box 16px beside the crosshair, flipped left at the right edge | **kept** (positions set on the elements, so a moving pointer does not re-render) |
| readout moves on a Motion spring | moves instantly |
| missing value → top of the plot | a **gap** in the line and a **hatched band** behind it |
| `curveNatural` | straight segments |
| measures the parent, renders on the client | **server-rendered**: day units in a stretched `viewBox` with `vector-effect: non-scaling-stroke`; labels and dots are HTML placed in percentages, so nothing distorts and nothing needs measuring |
| clip reveal from invisible | no entrance |
| no keyboard | a **slider** over the days (§8) |
| `touch-action: none` | `pan-y pinch-zoom` |
| fade-edged line, dashed grid, `--chart-*` | solid hairline grid, tokens only |

**Renderer:** SVG for the line and wash; HTML for labels, dots, columns,
crosshair and readout.
- **Accessibility:** the graphics are `aria-hidden`. Everything is said by
  the summary, the slider value text and the table.
- **Resizing:** percentages and a stretched viewBox reflow with the
  container; no `ResizeObserver`.
- **Performance:** about 100–400 elements depending on the period; no
  canvas, no per-frame work.
- **Server rendering:** complete in the HTML.
- **Testing:** paths and bands are DOM attributes, asserted in unit tests
  and in the browser.

**Colour:**
- Views: `chart-1` (#117744).
- Enquiries: new **`chart-2` (#3d68c4)**, validated against chart-1 with
  the dataviz validator:
  - CVD ΔE 20.3, normal ΔE 22.3, both over 3:1 on white;
  - the dark step #5a86dc also passes.
- The EMI ochre was rejected: 2.85:1, and darkening it failed CVD
  separation (ΔE 3.7–7.5).
- The two series also differ in mark (line vs column) and panel, each titled
  with a key.

**Density:**
- Date labels: every day for 7 days, weekly for 30, fortnightly for 90,
  counted back from the latest day.
- Under 28rem (a container query) every other label is hidden, so labels
  never collide at 320px.
- Every day stays in the line, the columns, the readout and the table.
- Nothing is aggregated.
- Dots mark every counted day on a 7-day chart, and a lone counted day
  between gaps (a one-point line is invisible).

## 6. Rejected visualizations

| Candidate | Decision | Why |
|---|---|---|
| **Listing-status chart** (donut / bars from `arrange().counts`) | not shipped | My properties already shows each status count, as a labelled filter with its number; a chart would repeat it with less precision and no new comparison |
| **Lead pipeline** (new / contacted / closed) | plain figures, where they already are (inbox) | `Lead.status` is a current state the seller sets by hand, in any order, with no transition history; "closed" is not "won". A funnel or conversion rate would claim progression that is not recorded. Loading leads on the analytics page would also put buyer records in its payload for no gain |
| **Views → saves → enquiries funnel** | not shipped | saves are a current count, not a period measure; the funnel would mix time bases and imply a conversion never measured |
| **Saves over time** | not shipped | no save history exists; only "saved now" |
| **Bklit metric cards / number-flow** | not shipped | the tiles are already clean; animated digits add a dependency and motion to a number that should simply be there; no sparkline without a real series beyond the chart already below |
| **Area chart alone, bar chart alone, dual axis** | rejected | §5 |
| **SmoothTabs for the period** | not reused | SmoothTabs is WAI-ARIA tabs (selection follows focus, in-place content); the period is navigation to a new URL, so links with `aria-current` are the right control |

## 7. Untracked and unavailable data

- A day before counting began:
  - **chart:** a gap and a hatched band, with "Hatched days: views were not
    counted yet, so they are gaps, not zero.";
  - **readout and slider:** "views not tracked";
  - **table:** "Not tracked".
- A counted day with no views is **0** on the baseline. The two never look
  alike.
- A wholly untracked period:
  - no line;
  - "Views were not tracked in this period.";
  - the tile says **Not tracked**;
  - its comparison says "Previous 7 days: not tracked".
- **Comparison:**
  - views are compared only when every day of both periods was counted;
  - a partly counted previous period is stated, "… on 11 counted days, so
    not compared";
  - never 0, never 0%;
  - enquiries are recorded whenever they happen, so they always compare.
- **Saves unavailable:** the tile says "Unavailable" and the rest of the page
  stands (`performance-check` simulates the failure).
- **Activity unavailable:** the whole figure set is an `ErrorState` (it
  always was). Without activity there is nothing to show, and the listing
  list alone would duplicate My properties. A failure is never turned into
  zeros.

## 8. Accessibility

- **Text alternative:**
  - each chart's caption has a one-line summary, e.g. "Most views in a day:
    41, on 13 Oct. 5 enquiries on 3 days.";
  - "Daily figures" is a full table (date, views, enquiries), the same
    rows the chart draws.
- **Keyboard:** after hydration the plot is one tab stop, `role="slider"`.
  - Its name is "Day, last 30 days", with `aria-describedby` key help.
  - `aria-valuetext` reads, for example, "Fri 16 Oct 2026: 8 views,
    0 enquiries", so the slider value says what the readout shows.
  - Keys: arrows move a day, Page Up/Down a week, Home/End the ends,
    Escape hides the readout.
  - Tab leaves; nothing traps focus.
  - The global focus ring is visible on it.
- **Before hydration or without JavaScript:** no role and no tab stop, so
  nothing promises keys that would do nothing.
- **Pointer and touch:**
  - hover snaps to the nearest day;
  - a tap reads a day and a horizontal drag scrubs;
  - vertical drags scroll and pinch zooms;
  - a mouse leaving clears the readout; a tap elsewhere does too.
- **Readout:** `aria-hidden`, `pointer-events: none`, never focusable, and
  kept inside the chart (so inside the viewport).
- **Contrast:** both series over 3:1; text in ink tokens, never the series
  colour.
- **Parity:** `performance-check` steps the slider from Home to End and
  compares every value text and readout with the table row for that day.

## 9. Motion, reduced motion, Kokonut, Anime.js

- **No chart animation at all.** Data is there at first paint. There is no
  line drawing, growing bar, pulsing point or delayed content. Under both
  motion settings the browser check finds `getAnimations()` empty on the
  chart.
- **Bklit's own animation**, considered first: a Motion clip reveal (which
  does honour reduced motion) and a spring readout. Removed, because a
  reveal starts content invisible and a spring is motion our language does
  not use.
- **No animation** compared with that: the readout and crosshair follow the
  pointer at once.
- **Motion** was not considered further: nothing left needs it. It still has
  no production consumer, and this stage added none (the Bklit chunk that
  carried it measured 67 KB).
- **The only transition** is the period-change dim (opacity, `--duration-base`,
  `--ease-standard`). The global reduced-motion rule collapses it (asserted
  < 1ms).
- **Kokonut:** none. **Anime.js:** not installed.

## 10. Mobile

`performance-check` at **320, 360, 375, 390, 412, 430, 768 and 1280**, on
the overview and a 30-day listing:
- the workspace shell assertions (no overflow, skip link, keyboard reach);
- every control ≥ 44px;
- **the chart fits** the viewport;
- its plot keeps its 160px height;
- **visible date labels never collide** (4px apart) and stay inside the chart,
  at least three of them.

Touch at 390, with reduced motion:
- taps at both edges read the first and last day, with the readout fully on
  screen;
- `touch-action` is `pan-y pinch-zoom`;
- no sideways scroll.

At 320 the tiles stack two-up, the chart takes the full width, and 90 days
draw 90 columns about 2.5px wide (the 2px gaps return above 28rem).

## 11. Bundle and performance (vs UI-09)

Client JavaScript, gzip, from served HTML; signed-in routes with a
simulator session; two builds side by side:

| Route | UI-09 | UI-10 | Δ |
|---|---|---|---|
| **Seller performance** | 178.38 | **180.37** | **+1.99** (page chunk 1.32 → 3.31) |
| Seller dashboard | 180.70 | 180.70 | 0.00 |
| Home | 177.05 | 177.05 | 0.00 |
| Search (buy / rent / filtered) | 178.83 | 178.83 | 0.00 |
| Property details | 177.24 | 177.23 | −0.01 |
| Login | 170.54 | 170.55 | +0.01 |
| Not found | 177.05 | 177.05 | 0.00 |
| Admin overview | 178.38 | 178.37 | −0.01 |
| Post property / photos (upper bound), EMI, activity | — | — | ±0.01 |

- Same file count on every route. The ±0.01 KB is build-hash renaming.
- **Chart-specific dependencies: none. Lazy chunk: none.**
  - The chart is server-rendered and its client layer is needed to hydrate,
    so `next/dynamic` would only add a request.
  - App Router splitting already keeps it in the performance page's chunk.
- **Route isolation**, three ways:
  - a unit test that only `app/dashboard/performance/page.tsx` imports the
    chart;
  - `performance-check` finds the chunk containing the chart's client code
    on the performance page and asserts **none of Home, Search, Property,
    Login, 404, the dashboard or the inbox loads it**;
  - the bundle table above (admin unchanged).
- **One client component vs split:**
  - drawn as one client component, the route cost +3.50 KB;
  - split (server drawing + client scrubber), it costs +1.99 KB.

Runtime at 390px, 4× CPU, 15 interleaved runs (medians):

| | UI-09 | UI-10 |
|---|---|---|
| Listing, 90 days: total blocking time | 381 ms | 395 ms |
| Listing, 90 days: FCP | 420 ms | 384 ms |
| Overview: total blocking time | 383 ms | 441 ms |
| Overview: FCP | 372 ms | 388 ms |
| CLS (both pages) | 0 | 0 |
| Arrow key on the chart (Event Timing, worst of 6) | — | 40 ms |
| Pointer move on the chart | — | under the 16 ms threshold |

**The listing page** is within noise. The one-component version measured
+28 ms there. The split brought it to +14 ms.

**The overview** carries a new section: tiles, chart and a daily table. That
is about 120 more DOM nodes and 25 KB more HTML, and its blocking time rose
about 55 ms at 4× (about 14 ms real CPU). Individual long-task totals overlap
between builds run to run; the difference follows the added content, not the
chart's code (it held through the split). Kept: it is the overview's new
information.

Chart render: complete in the server HTML (first paint), no client render
step. CLS is 0: the chart's height is fixed and drawn by the server.

## 12. Loading, empty and error

- **Loading.** No `loading.tsx`. A route loading boundary would stream
  the finished page hidden behind a skeleton, which strands visitors without
  JavaScript (the search page needed a `<noscript>` workaround for exactly
  this, UI-06). It would also swap the chart for a skeleton on every period
  change. Instead:
  - navigating into the page keeps the previous page until the server
    answers, as before;
  - **changing the period dims the figures in place**, keeping their frame.
    `PeriodPending` uses `useLinkStatus` inside each period link, and
    `main:has([data-period-pending]) .analytics-body` dims. The dataviz
    rule is "refetch keeps the frame";
  - the chart's height is fixed and server-drawn, so nothing shifts.
- **Empty:**
  - no submitted listings: `EmptyState` (unchanged);
  - a listing that is not yours or is gone: now `EmptyState` (was a
    hand-built alert);
  - no enquiries: "No enquiries in this period.";
  - counting not started: §7.
- **Error:** `ErrorState` for an outage or a missing migration (unchanged);
  saves failing alone stays partial (§7).

## 13. Security and authorization

- **No change to auth or authorization.** The page reads with the
  seller's own session; the RPCs filter by `auth.uid()` under row-level
  security.
- `analytics-db-check` (39):
  - another seller sees no activity;
  - another seller sees no save counts.
- `performance-check`:
  - another seller requesting a listing by id gets no figures, no chart
    and not its title;
  - a non-existent listing shows "not available here";
  - a guest is sent to log in, with the period kept.
- **Chart payload:** only `{ day, views, enquiries }` per day.
  `performance-check` asserts the page HTML carries no buyer id, email,
  name or phone field. Leads are not loaded on this page (§6).
- The UI-07 return-path fix is untouched.

## 14. Protected pages

- No login or 404 scene file is in the diff.
- `protected-scenes.test.ts` passes.
- style-diff reports both scenes **unchanged** (markup, keyframes, timing).
- `login-check` 117 and 179 (signed-in server), including the timing beats;
  `notfound-check` 36.

## 15. Verification

| Check | Result |
|---|---|
| `npm run verify` | lint, types, **667** unit tests (new: 19 in `lib/analytics/chart.test.ts`) |
| `npm run build` | passes |
| `performance-check` | **225** (UI-09: 102), three consecutive passes |
| `analytics-db-check` | 39 |
| `dashboard-check` | 124 (UI-09 behaviour intact) |
| full CI suite | phase-e 64, moderation 34, users 92, listing 23, admin 124, description 28, preview 24, draft 27, photo 48, auth 48, shots, light-check, search 64, calculator 43, shell 355, motion 101, ui 128, pricing 46, post 89, notfound 36, login 117 / 179: all unchanged |

**New unit tests** (`lib/analytics/chart.test.ts`):
- untracked runs and gaps, a counted zero on the baseline;
- lone-day dots, "not tracked" in words;
- 7 / 30 / 90-day labels;
- every day kept at 90;
- independent axes from zero, fixed-table dates;
- the server render complete, with no slider role before hydration;
- no animation classes, no saves series;
- summary wording;
- comparison (fully tracked, untracked, partly tracked, enquiries);
- direction in words without colour;
- the enquiry-rate threshold;
- "Unavailable";
- combined series;
- route isolation.

**New browser assertions** (`performance-check`):
- server HTML complete and without a premature role;
- the gap geometry;
- no animations;
- Tab reaches the slider with a visible ring;
- table/slider/readout parity for every day;
- Page Down / End / Escape / Tab-out;
- hover snapping and clearing;
- 7/30/90 day counts and label counts;
- touch at both edges with the readout on screen;
- `touch-action`;
- reduced motion (no animations, instant transitions);
- tap elsewhere;
- the period-change dim and recovery;
- counting not started;
- no enquiries;
- overview totals from the same rows;
- partial failure (saves);
- another seller's request;
- no buyer data;
- route isolation over seven routes;
- chart fit and label separation at eight widths.

**Checks adjusted, same intent:**
- The listing-row selector is scoped to the "Your listings" region, because
  the overview now has a second table.
- "the chart is hidden from assistive technology" is replaced by the
  accessibility assertions above. The chart is now operable rather than
  hidden.

### style-diff (UI-09 → UI-10)

A new screen, `dashboard-performance-listing`, was captured on both builds.

**Compared with both builds' image caches warm:**
- **property changes only on the two performance screens**;
- 918 structural notes there: the overview and listing content moved
  under the new wrapper and gained the summary, chart and table, so the
  tool reports their elements as removed and re-added at new paths;
- protected scenes unchanged.

**Noise found and explained, not changed:**
- **Image fade transitions on Home and Property** (27 + 8 elements) when one
  server's image cache was cold. They vanished with both warm.
- **The hero image URL** differs by server port.
- **`.guest-activity` margin at 1280** reads 0 or 190px at random on UI-09
  too, because `margin: auto` is read mid-layout.

Capturing the same UI-10 build twice reports 0 differences.

## 16. Known failures

Identical failure points to UI-09, compared on both builds side by side:
- `home-check` line 200 (passes in CI);
- `lead-check` line 70;
- `saved-check` line 61;
- `property-check`: the same two assertions;
- `media-check`: the same fallback case.

None was modified.

## 17. Remaining risks

- **The overview's added content** costs about 55 ms blocking time at 4×
  CPU (§11). With many listings the per-listing table grows as before; the
  chart does not.
- **A 90-day overview table** has 90 rows inside a closed `<details>`. It
  is rendered but not shown until opened.
- **The tooltip position** is computed from layout on each move. A
  transformed ancestor (none today) would offset it; SmoothTabs had to
  correct for one inside a Sheet.
- **Screen-reader support for `role="slider"`** on a non-input is good in
  NVDA, JAWS and VoiceOver, but not universal. The table is the guaranteed
  path.
- **`useLinkStatus`** is a Next.js API (15.3+). If it changes, the dim stops,
  but nothing else does.
- **style-diff captures** are sensitive to image-cache warmth (§15). Warm both
  servers first.

## 18. Recommendation for UI-11 — Admin workspace modernization

The admin screens are the remaining surface the track has not brought
onto its rules (deferred by UI-09):
1. **Busy and focus:**
   - ReviewDecision and AccountControls still `disabled` busy buttons and
     fieldsets, so focus falls to `<body>`;
   - apply `aria-disabled` busy `Button`s, `SubmitButton`, and
     `afterRefresh` / `<RestoreFocus>` after moderation and account actions.
2. **Shared states and badges:** `StatusBadge` for listing and account
   states in the queues; `EmptyState` / `ErrorState` for empty queues and
   outages.
3. **Buttons:** migrate the two admin handwritten buttons and lower the
   ratchet below 41.
4. **Forms:** `FormField` for the moderation reason and account forms.
5. **Admin figures stay plain counts.** Queue sizes and user counts are
   current states, not series. No chart unless a measured time series exists,
   reusing `DailyActivityChart`'s pattern (server drawing, client scrubber)
   rather than adding Bklit code.
6. **Same gates:** 44px at eight widths, no Motion unless measured,
   style-diff, login and 404 untouched.

Out of UI-11: new analytics tracking, public pages, the login and 404 scenes.
