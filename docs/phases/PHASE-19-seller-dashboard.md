# Phase 19 — Seller dashboard

Approved 2026-10-13 with these decisions: enquiries are linked to real
listings and active listings get a public enquiry form (option a); removed
listings appear in a collapsed "Removed" group that is excluded from the
normal counts; listings within 7 days of expiry get a warning.
Adjustments made at approval:
- Phase 18 withdrawal returns a listing to `DRAFT`, so the "Withdrawn" label
  is derived from status history.
- Each draft/listing pair is exactly one card, so nothing is shown or
  counted twice.
- The dashboard reuses the Phase 18 lifecycle actions. Enquiry creation gets
  its own secure path that checks the listing is active and works out the
  seller on the server.

## 1. Scope
**In:**
- `/dashboard`, the seller's main workspace: one card per property (a
  working draft plus its listing, if it has one), status filters, a sort
  order and pages, with all three kept in the URL.
- A summary row of real counts, an expiring-soon notice and per-listing
  enquiry counts linking to the inbox, which can now be filtered to one
  listing.
- A collapsed "Removed" group.
- Links to the dashboard from Activity, the account page, My drafts and the
  publishing status page.
- Enquiries connected to the Phase 18 listing entity: a new nullable
  `enquiries.listing_id`, a secure `submit_listing_enquiry` path, and an
  enquiry form (desktop sidebar card and phone sticky bar) on active public
  `/listing/:id` pages. The seller inbox shows these enquiries alongside
  the existing ones.

**Out:**
- Views, saves, contact reveals and trends (Phase 20).
- Admin and moderation screens (Phases 21–22).
- Paid boosts or plans, bulk actions, and editing a listing inside the
  dashboard (editing stays in the draft flow).
- Draft deletion, which no phase has introduced.
- Adding published listings to search and discovery, which still use the
  labelled demo inventory.
- Email and SMS notification of new enquiries.

## 2. UX requirements
- **Signed out:** visitors are sent to log in and returned to `/dashboard`.
- **Nothing posted:** a short explanation and a "Post your first property"
  action. No sample cards.
- **Summary row:** counts for Drafts, Under review, Active, Expired,
  Rejected and Withdrawn, each a link that applies its filter. "All" counts
  every card except removed ones.
- **Cards:** status text, title, Buy or Rent, locality and city, a price
  through `PriceDisplay` when one is known, and the date that matters for
  the status. Actions by status:

| Shown status | Derived from | Date shown | Actions |
|---|---|---|---|
| Draft | No listing yet | Last saved | Continue editing, Preview, Publishing status. The four information sections show how many are complete; photos are checked in the preview. |
| Under review | `UNDER_REVIEW` | Submitted | View submitted copy, Withdraw (with confirmation) |
| Active | `ACTIVE` and expiry still in the future | Live since; expires on (plus "Expires in N days" within 7 days) | View public page, Copy link, Withdraw (with confirmation) |
| Expired | `EXPIRED`, or `ACTIVE` past its expiry before the hourly job runs | Expired on | Review & re-submit, View submitted copy |
| Rejected | `REJECTED` | Rejected on, with the full reason | Edit draft, Review & re-submit |
| Withdrawn | `DRAFT` whose latest history event came from another status | Withdrawn on | Edit draft, Re-submit, Remove (on the publishing page) |
| Removed | `DELETED` | Removed on | Publishing status only (history). Shown in the collapsed group, never counted. |

- Withdrawing from the dashboard asks for confirmation inside the card,
  then calls the Phase 18 lifecycle endpoint with the card's version. Any
  failure is shown on the card with a reload action.
- Removing a listing links to the Phase 18 publishing page, which keeps its
  separate acknowledgement.
- **Enquiries:** each listing shows "N enquiries · M new". It links to
  `/dashboard/enquiries?listing=<id>`. If counts cannot be read, the card
  says so and still links to the inbox.
- **Expiring soon:** a notice names how many active listings expire within
  7 days and links to `?status=active&sort=expiring`.
- **Public enquiry form:** buyers on `/listing/:id` see a name, mobile and
  message form. An owner looking at their own listing sees a link to the
  dashboard instead. The confirmation says the owner, agent or builder can
  see it in their inbox, because a seller always exists for a real listing.

## 3. Technical requirements
- **Data seams.**
  - `lib/dashboard/model.ts` is pure. It pairs drafts with listings,
    derives the display status and dates, counts, filters, sorts and
    paginates.
  - `lib/dashboard/queries.ts` reads drafts, listings, current submission
    summaries, DRAFT-status history events and enquiry counts with the
    owner's session only. It never uses the service key.
  - `lib/enquiry/queries.ts` gains `recordListingLead` and an optional
    listing filter.
  - No page or component imports a database client.
- **URL state.** `status` is one of all, draft, review, active, expired,
  rejected or withdrawn. `sort` is recent or expiring. `page` starts at 1
  with 20 cards per page. Invalid values fall back to the defaults. No
  filter is held in component state.
- **Lifecycle actions.** Withdraw posts to the existing
  `/api/posting/lifecycle` with the same body, origin check, verified
  session and version check. Submit and remove stay on the publishing page.
- **Enquiry path.** `public.submit_listing_enquiry(listing, name, phone,
  message)` is a security-invoker wrapper around
  `private.submit_listing_enquiry_impl`, following the Phase 9 pattern.
  Inside one transaction the implementation:
  - locks the listing and requires `ACTIVE` with an expiry in the future;
  - takes the seller from `property_listings.owner_id` and the title from
    the current immutable submission;
  - rejects an enquiry from the owner;
  - applies the Phase 9 rate limits and repeat detection;
  - writes the lead event and the seller notification.

  The client never supplies a seller, title or status. The server action
  validates with the same `validateEnquiry`.
- **Enquiry counts.** `public.seller_listing_enquiry_counts()` is security
  invoker and runs under the enquiries row policy. It returns one row per
  listing (total, new, latest), so counts stay bounded and nothing is
  invented.
- **Rollout order.** The inbox reads `listing_id`, but falls back to the
  Phase 9 column list if the column does not exist yet. Before the
  migration, enquiry counts and the public form report themselves as
  unavailable instead of failing silently. The fallback is removed once the
  migration is confirmed live.
- Dashboard and listing routes render on every request and are never
  cached. `/dashboard` is guarded by the proxy (already covered by
  `/dashboard/:path*`) and again on the server.

## 4. Data requirements
Migration `20261013192641_phase_19_listing_enquiries.sql`:
- **`enquiries.listing_id`.** A nullable column referencing
  `property_listings(id)`. `listing_public_id` becomes nullable, and a check
  requires exactly one of the two, so demo and real listing identities can
  never be mixed. Existing rows are unchanged.
- **Indexes.** `(listing_id, created_at desc)` and
  `(listing_id, buyer_phone, created_at desc)`, both partial on
  `listing_id is not null`.
- **Functions.** `private.submit_listing_enquiry_impl` (security definer,
  empty search_path), the `public.submit_listing_enquiry` wrapper (execute
  for anon and authenticated), and `public.seller_listing_enquiry_counts`
  (invoker, authenticated only).
- No new tables:
  - The status, dates and history come from Phase 18.
  - "Withdrawn" is derived, not stored.
  - Removed listings are `DELETED` rows that are kept.
- **Fixtures.** Browser checks use a simulator with one property in every
  status. No seeded data reaches production.

## 5. Edge cases
- **Volume and content.**
  - No drafts at all.
  - 50 drafts (the account limit) across 3 pages.
  - Very long titles, addresses and rejection reasons, which must wrap.
  - A draft with no price or intent yet: the price is omitted, never shown
    as ₹0.
- **Status.**
  - An active listing past its expiry before the hourly job has run counts
    as Expired.
  - A listing changed in another tab: the version check rejects the
    withdraw and the card asks for a reload.
  - A withdrawn listing re-submitted: the DRAFT history is ignored once its
    status moves on.
  - A listing whose draft is not in the response still gets a card, titled
    from its submission.
- **Failures.**
  - The provider is unreachable: a full-page alert, never an empty
    dashboard.
  - Enquiry counts or submission summaries fail on their own: the cards
    still render with "unavailable" text.
  - The publishing service key is missing: withdraw is disabled with an
    explanation.
- **Access and abuse.**
  - Guest access, a foreign user, and a forged listing id on the enquiry
    form.
  - An enquiry against a withdrawn, expired, deleted or under-review
    listing.
  - A seller enquiring about their own listing.
  - Rate-limited numbers.
  - The enquiry function or column missing before the migration.

## 6. Accessibility requirements
- One `h1`. Section headings for the summary, the property list and
  Removed. Each card is an `article` headed by its title.
- Status, expiry warnings and enquiry counts are written in text. Colour is
  only reinforcement.
- Filters are links with `aria-current="page"`. Pagination uses the
  existing labelled `Pagination` component.
- Every control is at least 44px tall. Action links and buttons include
  the property title for screen readers.
- The withdraw confirmation moves focus to its question. Results and errors
  are announced with `role="status"` or `role="alert"`.
- "Copy link" announces success, or shows the address to copy by hand if
  the clipboard is unavailable.
- The Removed group is a native `details`/`summary`.
- The enquiry form keeps the Phase 4 behaviour: an error summary that
  receives focus, and a form that submits without JavaScript.

## 7. Responsive requirements
- **390 and 412:** single-column cards, filters in a wrapping row, actions
  wrapping, no horizontal page scroll, clearance above the bottom bar.
- **768:** two columns.
- **1280:** two columns inside a centred page width.
- **Public listing on phones:** a fixed contact bar opens the form in a
  sheet. On desktop the form sits in the sticky sidebar.

## 8. Verification
- **Unit tests:**
  - the model (status derivation including Withdrawn and post-expiry
    Active, one card per pair, the Removed group excluded from counts,
    filters, sorting, pagination, expiry days);
  - the dashboard queries (owner token only, partial-failure behaviour);
  - the listing enquiry command (validation, RPC payload carrying no
    seller or title, unavailable before the migration, error mapping);
  - the inbox fallback before the migration.
- **`npm run enquiry-db-check` (PGlite):**
  - an active listing accepts enquiries with the seller derived on the
    server;
  - inactive or expired listings and the owner are refused;
  - the exactly-one identity check;
  - repeats and rate limits;
  - the seller sees counts and leads while a foreign user sees nothing;
  - anon cannot call the counts function.
- **`npm run dashboard-check` (browser against the simulator):**
  - a guest is redirected;
  - every status card and its actions;
  - filters, sort and page in the URL surviving reload and back;
  - Removed collapsed and uncounted;
  - the withdraw confirmation;
  - copy link;
  - enquiry count linking to the filtered inbox;
  - the public enquiry form reaching the inbox;
  - owner self-view;
  - provider outage;
  - no overflow at all four widths.
- **Gates:** `npm run verify`, `npm run build`, and the existing browser
  gates in CI. Anything that cannot be run here is recorded as not run.

## 9. Production readiness
- Apply the Phase 19 migration to the live project.
- Run the security advisor.
- Run rollback-only checks: an anon enquiry on an active listing; refusal
  on inactive listings; counts visible to the seller and not to a foreign
  user.
- Once the migration is confirmed live, remove the inbox fallback.
- Phase 18 release items still apply: the service key must be set before
  withdraw or submit work in production, and a real-account
  submit→approve→active→expire pass is still outstanding.
- Then verify the dashboard with a real seller account in each status.
- No Phase 20 work.

### Verification record — 2026-10-13
- **`npm run verify`:** lint, TypeScript and 436 unit tests across 35
  suites passed. New suites cover the dashboard model, the dashboard
  queries, and the listing enquiry command and inbox fallback.
- **`npm run build`:** the production build passed.
- **`npm run enquiry-db-check`:** 32 PostgreSQL checks passed in PGlite
  with the Phase 9 and 15–19 migrations applied. The existing
  media/draft/preview/listing database checks still pass (40 lifecycle
  checks unchanged).
- **`npm run dashboard-check`:** 47 browser checks passed against the
  3101/3300 simulator, run 3 times with the same result. The first run
  found a real defect: the enquiry-count link was a 17px inline target. It
  is now 44px, and the check measures every link, button and summary in
  `main`. A race in the check itself was also fixed: it now waits for each
  view's heading, not just the URL.
- **Existing browser gates re-run here:**
  - listing-check: 23 passed, after changing one assertion from "exactly
    one ₹60 L" to "₹60 L shown and the draft's ₹70 L absent", since the
    contact card and phone bar now also show the price;
  - preview-check 24, draft-check 27, photo-check 31, auth-check 38,
    login-check (auth 138, unconfigured 117), lead-check 15;
  - shots, light-check, search-check 64, calculator-check 43, pricing-check
    46, post-check 87, notfound-check 36;
  - shell-check 355, after removing "my properties" from its
    not-yet-built guard.
- **Failing before this phase:** `phase-e-check` (homepage search-sheet
  reopen loop, line 70) and `home-check` (homepage locality search
  button). Both fail identically on the untouched base commit `cc44439`,
  built and run in a separate worktree. They are not caused by Phase 19
  and were not changed here.
- **States checked by provoking them in the simulator:** provider outage
  (page-level alert, not an empty dashboard), missing enquiry-counts
  function (cards say counts are unavailable), and a foreign account (empty
  state). No loading skeleton or error boundary was added in this phase.
- **Not done in this session:**
  - The migration was not applied live: no database credential or
    Supabase connector was available. The inbox fallback stays until it
    is.
  - No real-account production verification. The Phase 18 publishing
    credential is still pending, so production withdraw shows its
    unavailable state.
  - Screenshots in `/tmp/phase19-shots` were looked at for obvious layout
    faults only; they are not counted as verification.
