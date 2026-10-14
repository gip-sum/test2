# Phase 20 — Seller listing analytics

Started 2026-10-14 on the client's instruction ("Start phase 20").
`Phases.txt` lists views, saves, enquiries, contact reveals, listing
performance and basic trends. Contact reveals are left out (see §1). The
other five are built from data that exists and is measured, never
estimated.

## 1. Scope
**In:**
- **Views:** a privacy-preserving count of how many browsers looked at
  each active public listing on each day.
- **Saves:** signed-in buyers can save real listings (from the public
  listing page and their saved list), and sellers see how many buyers
  currently have each listing saved.
- **Enquiries:** per listing per day, from the Phase 19 link between
  enquiries and listings.
- **Performance pages:**
  - `/dashboard/performance`: every submitted listing with its views,
    enquiries and saves for a chosen period;
  - `/dashboard/performance?listing=<id>`: one listing, with a daily trend
    of views and enquiries, the same totals for the previous period, and
    an enquiry rate once there are enough views to mean anything.
  - Both are linked from the dashboard cards and header.

**Out:**
- **Contact reveals.** Phase 10 (phone contact and OTP reveal) is postponed
  by client decision. No reveal exists, so there is nothing to count, and
  showing a reveal figure would claim something that never happens. The
  metric arrives with Phase 10's `contact_reveal` entity.
- **A history of saves over time.** Buyers can remove a save, and a daily
  series of saves would either count toggling or hide removals. Sellers see
  the current number of savers. A behavioural event history is Phase 69's
  `event` model.
- **Things later phases own:**
  - search impressions and position, which need search on real listings;
  - comparisons with other listings or the market (Phases 50–51);
  - exports and email reports;
  - fraud or bot scoring (Phase 67).
- **Admin analytics** (Phase 21).

## 2. UX requirements
- **Dashboard.** A "Performance" link in the header, and on every card with
  a listing.
- **Overview.**
  - Period links: Last 7 days, Last 30 days, Last 90 days, kept in the URL
    as `range`.
  - Each listing row shows its status and title, then views, enquiries and
    saves (saves are "now", not per period), and a link to its detail.
  - Listings are sorted by views in the period, then by title.
  - With no submitted listings, the page explains that performance appears
    once a property is submitted, and links to My properties.
- **Detail.**
  - **Totals:** views, enquiries and current saves for the period, plus the
    previous period of the same length as plain figures ("Previous 7 days:
    12 views"). No percentage arrows: on small numbers a "+200%" says more
    than the data does.
  - **Enquiry rate:** shown only when the period has at least 20 views, as
    "N enquiries per 100 views". Below that the page says there are not
    enough views yet.
  - **Trend:** a daily bar chart of views with enquiries marked, plus the
    same figures in a data table.
  - **Untracked days:** days before view counting started are shown as
    "not tracked", never as zero.
- **What counts as a view.** The page states it in words: one view per
  browser per listing per day (India time); the owner's own visits and
  known crawlers are excluded; listings are counted only while public.
- **Public listing page.** A save (heart) control for signed-in buyers;
  signed-out visitors are sent to log in and brought back. The owner sees
  no save control on their own listing.
- **Saved properties.** The page lists saved real listings alongside demo
  ones. A listing that is no longer public stays in the list as "no longer
  available" with a remove control, and is never silently dropped.

## 3. Technical requirements
- **Data seams:**
  - `lib/analytics/queries.ts`, `lib/analytics/model.ts` (pure),
    `lib/analytics/views.ts` (visitor key and crawler filter);
  - `lib/saved/queries.ts` for saved listings;
  - `lib/listings/queries.ts` for public listing summaries.

  No component imports a database client.
- **View recording.**
  - A client component on the public listing page sends one POST beacon
    after load to `/api/listings/[id]/view`.
  - The route checks the origin, the id format and the user agent.
  - It sets a random httpOnly first-party cookie `gb-visitor` (UUID, one
    year) if absent.
  - It derives `sha256(visitor:listing:IST-day)`, so marks cannot be
    linked across days or listings.
  - It calls the service-only `record_listing_view(listing, visitor_key,
    viewer)`.

  The database:
  - counts only active, unexpired listings;
  - ignores the owner (the viewer id is passed by the verified server, not
    by the browser);
  - dedupes per day with a mark row;
  - increments the day's total;
  - deletes that listing's marks older than yesterday.

  The route always answers 204, so it reveals nothing about listings or
  owners. A missing service key or database error means no count, never a
  failed page.
- **Saves.**
  - `save_listing(listing)` is a security-definer function: it requires an
    active listing and refuses the owner. Removal uses the buyer's own row
    policy.
  - `/api/saved` accepts `{ listingId }` alongside the Phase 8
    `{ publicId }`, and GET returns both kinds of id. They cannot collide:
    demo ids start with `p_`, listing ids are UUIDs.
- **Seller reads** use the seller's session only:
  - `seller_listing_activity(from, to)` (invoker) returns per-day views
    and enquiries for the caller's listings under row policies;
  - `seller_listing_save_counts()` (definer) returns only aggregate counts
    for listings the caller owns, never who saved;
  - `listing_analytics_meta.views_since` marks when counting began.
- **URL state.** `range` is 7, 30 or 90, and `listing` is a UUID. Invalid
  values fall back to 7 and the overview. Periods are whole IST days ending
  today.
- **Rollout.** Before the migration is applied, the view route and
  activity read fail. The pages then say performance data is not available
  yet, and save on a real listing reports that saving is unavailable. Demo
  saves are unaffected.

## 4. Data requirements
Migration `20261014032608_phase_20_listing_analytics.sql`, which requires
the Phase 18 and 19 migrations:
- **`property_listing_daily_stats`** (`listing_stat` in the roadmap
  register): `(listing_id, day)` primary key, `views ≥ 0`. Owners can read
  it; nobody but the service can write it.
- **`property_listing_view_marks`:** `(listing_id, day, visitor_key)`
  primary key, where `visitor_key` is a 64-hex hash. Nobody can read it
  through the API, and it is purged on each view to at most two days per
  listing. No IP address, user agent or account id is stored.
- **`listing_analytics_meta`:** a single row holding `views_since`, set
  when the migration runs. Readable by signed-in users.
- **`saved_listings`:** `(user_id, listing_id)` primary key and
  `created_at`. Buyers can read and delete their own rows; inserts go only
  through `save_listing`.
- **Functions:** `record_listing_view` (service role only),
  `save_listing` (authenticated), `seller_listing_activity` (authenticated,
  range capped at 184 days), `seller_listing_save_counts` (authenticated).

## 5. Edge cases
- **Views:**
  - repeat visits on the same day, the same browser on another day,
    midnight in India time, and cookies blocked (no cookie means no key, so
    no count);
  - a crawler user agent, the owner viewing their own listing, and a guest
    viewing a listing that expired before the hourly job ran;
  - a withdrawn listing, a forged listing id, and a beacon from another
    origin;
  - the service key missing, or the database down.
- **Saves:**
  - saving an expired or withdrawn listing (refused), the owner saving
    their own listing (refused), saving twice, removing a listing that is
    no longer public, and a demo save next to a real one.
- **Reading performance:**
  - a listing with no views, untracked days before counting began, fewer
    than 20 views, and a 90-day range spanning untracked days;
  - removed listings, another account's listing id in the URL,
    supplementary reads failing, and the activity function missing before
    the migration.

## 6. Accessibility requirements
- One `h1`.
- Period and listing selection are links with `aria-current`.
- Every figure carries its unit in words ("12 views"). The chart has a
  text summary and an equivalent data table; it is decorative to
  assistive technology (`aria-hidden`), so information never depends on
  it alone.
- Colours are tokens, with views and enquiries told apart by shape and
  label as well as colour.
- Untracked days read "not tracked" in the table.
- The save control on the listing page is the existing `SaveButton`, with
  a 44px target, `aria-pressed` and a descriptive label.
- All controls are at least 44px.

## 7. Responsive requirements
- 390, 412, 768 and 1280, with no horizontal page scroll.
- The overview stacks each listing as a card on phones and becomes a table
  from 768.
- The chart scales to its container width (each bar a fraction of the
  width) and its data table scrolls inside its own region if needed.
- Bottom navigation clearance.

## 8. Verification
- **Unit tests:**
  - the model: series, untracked days, previous period, the rate
    threshold, sorting, URL parsing;
  - the visitor key and crawler filter;
  - the queries: owner session only, partial failures, before the
    migration;
  - the saved-listing API.
- **`npm run analytics-db-check` (PGlite, Phase 9 and 15–20 migrations):**
  - dedupe per visitor per day; the owner and inactive or expired listings
    ignored;
  - service-only recording; mark purging;
  - row policies on stats, marks and saved listings;
  - save refusals; aggregate-only save counts for the owner;
  - the activity function's scoping and range cap.
- **`npm run performance-check` (browser against the simulator):**
  - views recorded once per day and not for the owner;
  - save, unsave and the saved page for real listings;
  - the overview and detail views, with period and listing kept in the
    URL;
  - the rate threshold text, untracked days, and the table;
  - outage and before-migration states;
  - guest redirect;
  - four widths with 44px targets.
- **Gates:** `npm run verify`, `npm run build`, and the existing database
  and browser gates.

## 9. Production readiness
- Apply the Phase 19 migration first if it is not already live, then the
  Phase 20 migration.
- Run the security advisor.
- Run rollback-only live checks: views dedupe and owner exclusion, save
  refusals, and seller-only counts.
- Confirm the publishing service key is set in production; view recording
  uses it.
- Add a privacy-notice line about the `gb-visitor` cookie before public
  launch. That copy is the client's to approve.
- Do a real-account pass: view a listing as a guest, save it as a buyer,
  then see both on the seller's performance page.
- No Phase 21 work.

### Verification record — 2026-10-14
- **`npm run verify`:** lint, TypeScript and 460 unit tests passed. New
  suites cover the analytics model, the visitor key and crawler filter,
  performance loading and view recording, and saved listings.
- **`npm run build`:** the production build passed.
- **`npm run analytics-db-check`:** 39 PostgreSQL checks passed in PGlite
  with the Phase 9 and 15–20 migrations applied. They cover:
  - dedupe per browser per day; the owner, inactive listings and
    past-expiry listings ignored;
  - service-only recording and mark purging;
  - row policies on stats, marks and saves;
  - save refusals and aggregate-only save counts;
  - activity scoping, the India-date boundary and the range cap.
- **Existing database checks:** media, draft, preview (8), listing (40)
  and enquiry (32) still pass.
- **`npm run performance-check`:** 53 browser checks passed against the
  3101/3300 simulator.
  - The first run's view count was expected wrong in the check itself: the
    signed-in buyer's visit is a real view. The check now derives expected
    figures from the simulator.
  - From the screenshots, a caption was added under charts with untracked
    days, so the shading cannot be read as data.
- **Existing browser gates re-run on this build, all passing:**
  dashboard-check 47, listing-check 23, preview-check 24, draft-check 27,
  photo-check 31, auth-check 38, login-check (auth 138, unconfigured 117),
  lead-check 15, saved-check 14, phase-e-check 64, shots, light-check,
  search-check 64, calculator-check 43, shell-check 355, pricing-check 46,
  post-check 87, notfound-check 36.
- **Failing before this phase:**
  - `home-check` fails in this container exactly as on the Phase 18 base
    commit, and passes in CI.
  - `property-check` (not in CI): 65 of 67 pass. The 2 failures expect
    "temporarily unavailable" while the Phase 9 enquiry path says "could
    not be saved". The message dates from `be8bfa2` (Phase 9) and is
    unchanged here. Recorded for a follow-up; not changed in this phase.
- **Palette:** the chart colour token `chart-1` was validated with the
  dataviz palette script (light `#117744` and dark `#34a96b` both pass;
  `brand-600`'s dark step did not, which is why the chart has its own
  token).
- **Not done in this session:**
  - The migration was not applied live: no database credential was
    available.
  - No real-account production verification.
  - The `gb-visitor` cookie needs a line in the privacy notice before
    public launch; that wording is the client's.
