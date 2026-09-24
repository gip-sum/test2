# Phase 9 — Enquiry and lead system

**Status:** Implemented and verified with isolated providers; live migration and delivery configuration pending.
**Source:** `Phases.txt`, Phase 9.

## 1. Scope

Replace the process-local enquiry store with durable Supabase leads. Keep both guest and signed-in enquiry submission, retain every repeat attempt, notify the configured seller-delivery webhook, and give signed-in buyers a private enquiry history. A seller inbox, seller account ownership, follow-up notes, assignment, phone reveal and contact-reveal auditing remain Phases 10, 19 and 68.

## 2. UX requirements

The existing short form remains usable without JavaScript. Its result says whether seller notification was accepted, failed, or is not configured; it never equates database persistence with delivery. Repeat submissions are accepted and identified. Signed-in buyers can open `/account/enquiries` to see the property snapshot, submission date, lead status, delivery status and whether an attempt repeated an earlier enquiry.

## 3. Technical requirements

All database access stays in `lib/enquiry/queries.ts`. Server actions validate identity through Supabase Auth and use a server-only Supabase secret for guest-capable writes; the secret never enters rendered output or client modules. Notification delivery is an adapter with an HTTPS-only production URL, bounded timeout and authenticated request. The property page remains cacheable and does not load account data while rendering.

## 4. Data requirements

`public.enquiries` stores a UUID, optional buyer UUID, stable property public ID, immutable listing/seller display snapshots, normalised buyer name and Indian mobile number, optional message, source, lead status, notification status/timestamps, optional link to the previous matching enquiry, and creation time. Authenticated buyers may select only their own rows. Browsers receive no direct insert/update/delete grants; server writes use `SUPABASE_SECRET_KEY`.

## 5. Edge cases

Reject invalid or unavailable listings before writing. Preserve valid leads when notification is absent or fails. Reject malformed provider rows rather than rendering invented history. Keep both simultaneous/repeated attempts; a repeat links to the latest matching property-and-phone row. Treat provider, timeout and malformed-response failures as unavailable states. Guests can submit but cannot later claim unaffiliated history.

## 6. Accessibility requirements

Field errors remain attached to controls and an error summary receives focus. Submission has a pending label. Success and delivery outcomes use live status text, not colour alone. History is structured with headings and definition lists; errors use `role="alert"`; all links and actions retain 44px minimum targets and visible keyboard focus.

## 7. Responsive requirements

Verify the form and history at 390, 412, 768 and 1280 CSS pixels with no horizontal overflow. History cards stack at phone widths and may use two columns only when labels and long titles remain readable.

## 8. Verification

Run `npm run verify`, `npm run build`, the existing browser suites and `npm run enquiry-check` against the isolated Auth/REST/notification provider. Assert guest persistence, signed-in ownership, duplicate retention, notification success/failure truthfulness, history isolation, database outage handling and responsive fit. Apply the migration, test an insert/read policy matrix and run Supabase security/performance advisors when connected credentials are available.

## 9. Production readiness

- [ ] Migration applied and RLS/advisors verified on the connected project.
- [ ] `SUPABASE_SECRET_KEY`, seller notification webhook URL and webhook secret configured in the deployment secret store.
- [x] Durable guest/signed-in persistence, repeats, buyer isolation, notification success/failure and responsive history verified with isolated providers (15 browser assertions).
- [x] Project verification, production build and existing browser regressions pass.
- [ ] Notification endpoint contract and retry/alert ownership accepted by operations.
- [ ] Real guest and signed-in leads verified end to end without exposing secrets or another buyer's history.
- [ ] Seller identities and destinations attached to real listings when the supply platform introduces seller-owned inventory.
