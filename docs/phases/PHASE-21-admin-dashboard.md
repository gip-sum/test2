# Phase 21 — Admin dashboard

Started 2026-10-14 on the client's instruction ("Start phase 21 and push
and deploy"). `Phases.txt` lists: overview, listings, users, leads,
reports, moderation and system status. This phase builds the operational
control centre: a read-only console for platform staff. The actions it
leads to belong to the phases that own them.

## 1. Scope
**In:**
- **Staff identity.** A `staff_members` entity: who is platform staff, with
  what role, granted when and by whom, and when revoked. Only the `ADMIN`
  role exists now. Staff are granted by a trusted operator in the database
  (§9); there is no self-service and no in-app grant.
- **`/admin` overview.**
  - Listings by status.
  - The moderation queue: how many listings wait, and the oldest wait.
  - Leads: last 7 and 30 days, how many are on real listings, how many
    reached no seller, and new leads untouched for over 2 days.
  - Users: total accounts, new in 7 days, accounts with a listing, staff
    count.
  - A system status summary.
- **`/admin/listings`:** every listing that has been submitted, filtered by
  status, paged and sorted, with status, filter and page in the URL.
- **`/admin/moderation`:** the review queue, oldest first, with how long
  each listing has waited.
- **`/admin/system`:**
  - whether the app has its server settings (configured or missing, never
    the values);
  - whether the database and sign-in provider are reachable, and how
    quickly;
  - whether database migrations are up to date;
  - whether the listing-expiry job is running (its last run, and the
    backlog of overdue listings);
  - the oldest wait in the review queue.

**Out:**
- **Moderation actions** (approve, reject, request correction): Phase 22.
  Until then, decisions stay with the trusted operator function from
  Phase 18. The queue says so.
- **User management** (search, view accounts, roles, account status):
  Phase 23. Here, users appear only as aggregate counts. No email, phone or
  name of any user is shown.
- **Reports.** The `report` entity is introduced by Phase 24 (report
  property or user). With nothing reported, a Reports section would be a
  placeholder, so it is left out until Phase 24 builds it.
- **Lead contents.** Buyer names and numbers stay with the seller. Staff
  see counts only; any lead detail view needs Phase 27's audit log first.
- **Audit of staff actions** (Phase 27). This phase changes nothing, so it
  has no actions to log.

## 2. UX requirements
- **Access.**
  - A signed-out visitor is sent to log in and returned.
  - A signed-in account that is not staff gets the ordinary 404 page, so
    the console's existence is not advertised.
  - Revoked staff are treated as non-staff at once.
- **Shell.** Admin pages share a heading, a "Staff only" line naming the
  signed-in role, and section navigation (Overview, Listings, Moderation,
  System) with `aria-current`. The phone bottom bar stays hidden on
  `/admin`, as already decided in Phase D.
- **Overview.** Every figure comes from the database at request time, with
  its unit in words. A section that could not be read says so; none is
  shown as zero.
- **Listings.**
  - Status filters: All, Under review, Active, Expired, Rejected,
    Withdrawn, Removed, with real counts.
  - Each row shows the title, seller name and type, sale or rent, price
    (through `PriceDisplay`), place, submission date and expiry.
  - Under review sorts oldest first; everything else sorts most recently
    changed first.
  - 25 rows per page.
- **Moderation.** Each queued listing shows how long it has waited ("2
  days 4 hours"), and waits over 48 hours are flagged in words. A note
  explains that review decisions arrive in Phase 22.
- **System.** Each check reads OK, Warning, Problem or Unknown, in words
  with a short explanation, and is colour-reinforced only.

## 3. Technical requirements
- **Data seams.**
  - `lib/admin/queries.ts` is the only module that knows where admin data
    comes from.
  - `lib/admin/model.ts` (pure) handles URL parsing, status labels, wait
    formatting and check evaluation.
  - App-level checks (configuration presence, provider reachability) live
    in `lib/admin/system.ts`.
- **Staff gate.**
  - Every admin page calls `requireStaff()`: the verified user, then
    `my_staff_role()` with the user's session. Anything else ends in
    `notFound()`.
  - The proxy adds `/admin` to the signed-in guard.
  - Database functions repeat the check themselves, so a client calling
    them directly is refused.
- **Admin reads** are security-definer functions with an empty search path
  that raise `42501` unless `private.is_staff()` is true:
  - `admin_overview()` returns aggregates only;
  - `admin_listings(status, limit, offset)` returns submitted listings
    with their current submission's public fields and a total count;
  - `admin_system_status()` covers the latest applied migration, expiry
    backlog, last expiry event, the expiry job's last run (when the cron
    schema exists), and the oldest wait in the review queue.

  No table gains a staff row policy: the functions return exactly the
  fields the console shows, and nothing else becomes readable.
- **Expected schema version.** `EXPECTED_MIGRATION` in `lib/admin/system.ts`
  names the latest migration this build expects. The system page compares
  it with what the database has applied.
- **Rendering.** Admin pages render on every request, are never cached,
  and carry `noindex`.

## 4. Data requirements
Migration `20261014044042_phase_21_admin_console.sql`, which requires the
Phase 18–20 migrations:
- **`staff_members`:**
  - fields: `user_id` (primary key, references the user), `role`
    (`ADMIN`), `granted_at`, `granted_by` (nullable), `revoked_at`;
  - row policy: signed-in users read their own row only, with no client
    writes; `service_role` manages rows;
  - a check that a revocation cannot predate its grant.
- **`private.is_staff()`:** security definer, stable; true while an
  unrevoked row exists for `auth.uid()`.
- **`public.my_staff_role()`:** returns the caller's active role or null.
- **`admin_overview`, `admin_listings`, `admin_system_status`:** callable
  only by `authenticated` (anon has no grant), and each refuses non-staff.
- **Removed listings** are visible to staff, labelled as removed.
  "Withdrawn" is derived from history, as on the seller dashboard.

## 5. Edge cases
- **Access:**
  - no session, an expired session, a non-staff account, revoked staff;
  - a staff account calling the functions directly, and anon calling them;
  - the Phase 21 migration not yet applied (the role function is missing,
    so everyone gets 404).
- **Listings:**
  - empty queues; a listing past expiry before the hourly job (counted as
    expired, and as backlog once over 2 hours overdue);
  - removed listings; very long titles and seller names;
  - a page beyond the end (clamped); an invalid status (falls back to
    All).
- **System:**
  - the cron schema absent (expiry job reads Unknown, never OK);
  - the migrations table absent (Unknown);
  - a missing service key or sign-in provider settings (Problem);
  - the provider unreachable or slow (Problem or Warning);
  - a database function failing (that section errors; others still
    render).

## 6. Accessibility requirements
- One `h1` per page.
- Section navigation is a labelled `nav` with `aria-current`.
- Listing data is in a real `table`, with column headers and the title as
  the row header, from 768 up. On phones each row becomes a card.
- Status words appear in text, never colour alone.
- Waiting times and check results are text.
- All controls are at least 44px. Long text wraps.

## 7. Responsive requirements
- 390, 412, 768 and 1280, with no horizontal page scroll.
- Overview cards stack on phones and become a grid from 768.
- The listings table becomes cards on phones.
- Filters wrap.

## 8. Verification
- **Unit tests:** the model (status labels, URL parsing, wait formatting,
  check evaluation), the queries (user session only, unreadable sections,
  missing role function means not staff), and the app system checks
  (presence only, never values).
- **`npm run admin-db-check` (PGlite, Phase 9 and 15–21 migrations):**
  - every admin function refuses anon, non-staff and revoked staff;
  - staff get correct aggregates, effective statuses (including overdue
    active as expired, and withdrawn from history), filters, sort and
    totals;
  - system status without the cron or migrations schemas reads unknown;
  - a staff row is readable only by its owner, and cannot be
    self-granted.
- **`npm run admin-check` (browser against the simulator):**
  - guest redirect; 404 for non-staff;
  - staff overview figures and unreadable-section text;
  - listing filters and paging in the URL; queue order and the over-48h
    flag;
  - system checks; outage behaviour;
  - four widths with 44px targets.
- **Gates:** `npm run verify`, `npm run build`, and the existing database
  and browser gates.

## 9. Production readiness
- Apply the Phase 19, 20 and 21 migrations in order.
- Run the security advisor (the new definer functions).
- Grant the first admin as a trusted operator in the SQL editor, using the
  account's Auth user id:

  ```sql
  insert into public.staff_members (user_id, role) values ('<auth user uuid>', 'ADMIN');
  ```

  Revoke with `update public.staff_members set revoked_at = now() where
  user_id = '<uuid>';`.
- Run rollback-only checks: a non-staff account is refused by each
  function, and staff see the console.
- No Phase 22 work.

### Verification record — 2026-10-14
- **`npm run verify`:** lint, TypeScript and 479 unit tests passed. New
  suites cover the admin model (including a test that keeps the
  expected-migrations list equal to `supabase/migrations`), the staff gate
  and queries, and the presence-only configuration and provider checks.
- **`npm run build`:** the production build passed. The `/admin` routes are
  rendered on every request.
- **`npm run admin-db-check`:** 38 PostgreSQL checks passed in PGlite with
  the Phase 9 and 15–21 migrations applied. They cover:
  - every admin function refusing anon, non-staff and revoked staff, with
    no self-grant or self-edit;
  - truthful aggregates with no personal details;
  - effective statuses, withdrawn derived from history, queue order,
    paging and totals;
  - system status reading unknown without the cron or migrations schemas,
    and reporting when they exist.
- **`npm run admin-check`:** 51 browser checks passed against the
  3101/3300 simulator.
  - The first run's oldest-wait text read "2 days 23 hours" because the
    simulator placed the wait exactly on a 3-day boundary and the page
    measures from a reference time taken a few milliseconds earlier. The
    test data moved off the boundary; the page logic is unchanged.
- **Existing gates re-run on this build, all passing:**
  - performance-check 53, dashboard-check 47, listing-check 23,
    preview-check 24, draft-check 27, photo-check 31, auth-check 38,
    login-check (auth 138, unconfigured 117), lead-check 15,
    saved-check 14;
  - phase-e-check 64, shots, light-check, search-check 64,
    calculator-check 43, shell-check 355, pricing-check 46, post-check 87,
    notfound-check 36;
  - every database check (media, draft, preview 8, listing 40, enquiry 32,
    analytics 39).

  `home-check` fails only in this container, as before this phase; it
  passes in CI.
- **Not done in this session:**
  - Migrations 19–21 are not applied live: no database credential was
    available.
  - No staff member has been granted.
  - Until both are done, `/admin` is a 404 for every account in
    production.
