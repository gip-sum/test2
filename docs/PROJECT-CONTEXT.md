# Project context

GharBazaar is a working name for a Kolkata-first Indian property marketplace.
The product roadmap is [../Phases.txt](../Phases.txt); its phase numbering
supersedes the original eight-step plan still preserved in
[`PHASE-0-PLAN.md`](PHASE-0-PLAN.md). The real brand and domain are pending
client approval. `lib/brand.ts` is the current source of brand values.

## Current state

- Design follow-up before Phase 7: green is the primary colour. Shared tokens
  use warm white, mint and accessible dark-green actions. The homepage has
  a larger green hero, rounded neighbourhood cards and a glass search panel.
  Header and mobile navigation use translucent glass with opaque fallbacks.
  Stronger mint lighting sits behind frosted search, listing, locality and
  information cards; reduced-transparency preferences restore solid surfaces.
  Home is visible in both headers, the mobile bottom navigation and footer.
  No roadmap phase advances as part of this visual update.

- Phases 1–3 provide the responsive shell, discovery homepage and URL-driven
  buy/rent search. Filters, sorting, facets and pagination are encoded in the
  URL, so links and browser history reproduce the same state.
- Phase 4 adds `/property/{slug}-p{id}`. The proxy chooses 200, canonical
  301 and 404 status before the streamed route renders. The page displays
  gallery, listing facts, distinct area bases, description, amenities,
  location, seller identity, contact form and similar listings. It emits
  listing and breadcrumb structured data.
- Phase 5 adds a responsive gallery with desktop photo mosaic, full-screen
  viewer, keyboard and touch navigation, image counters, lazy thumbnails and
  explicit missing/broken-image fallbacks. Development images carry visible
  sample markers in the gallery and listing cards.
- Phase 6 implements email OTP and Google registration/login through Supabase Auth,
  HTTP-only token cookies, session refresh, logout and an account guard.
  Google uses a server-side PKCE exchange; phone OTP is not a login option.
  It requires a live Supabase project URL, publishable key, Google OAuth
  configuration, SMTP OTP template
  and migration application before it is production ready. The local
  browser suite uses a simulated provider; it does not test real email.
- Phase 7 adds the guarded buyer account editor. Profiles persist in
  `public.buyer_profiles` with owner-only RLS, storing a name, optional
  unverified contact number, buying/renting preference, locality and
  optional product email choice. Email and account activity come directly
  from Supabase Auth; missing activity timestamps are shown as unavailable.
- Phase 8 adds buyer-owned `public.saved_properties` with RLS and explicit
  authenticated grants. Cards and property details share a client shortlist
  state backed by verified server endpoints; `/account/saved` displays the
  buyer's list, empty state and unavailable listing removal. Simulated browser
  checks pass; a live real-account save still needs verification.
- Phase 9 persists enquiries in Supabase, flags repeats, records lead events,
  shows buyer history and provides an in-app seller inbox and notifications
  scoped by owner RLS. Listing ownership requires trusted assignment. No
  fixture listing currently has a real seller account attached, so real
  seller notification cannot yet be verified.
- Listing, location and media data are deterministic development fixtures.
  Generated illustrations in `public/dev-media/` are explicitly labelled
  as samples. They do not represent real properties.
- The enquiry form accepts signed-out submissions via a server action.
  `lib/enquiry/queries.ts` validates inputs and records enquiries durably in
  Supabase. Unassigned fixture listings hold the lead without seller delivery.

## Boundaries

Phase 8 implements persistent shortlists; live real-account verification remains.
Phase 9 implements lead history and assigned seller inbox delivery. Phase 10's
phone OTP was postponed by the client. Phase 18 owns listing lifecycle and
unavailable-page semantics. Do not imply a seller was notified for an
unassigned fixture listing.

Data access stays in `lib/*/queries.ts`, `lib/property/search.ts` and
`lib/enquiry/queries.ts`; routes and components do not import fixtures.
Prices are integer rupees. Carpet, built-up and super built-up area remain
separate. Missing values are omitted rather than invented.

## Run and verify

`npm ci`, then `npm run verify` and `npm run build`. Start the production
server with `npm start -- -p 3100`, then run `npm run shots`,
`npm run light-check`, `npm run search-check`, `npm run property-check` and
`npm run media-check` and `npm run auth-check` (with a local fake Auth API).
Browser checks require Chromium. Set `CHROME_PATH` to its executable when
the default path is unavailable. See the Phase 4 spec for manual checks
and explicit acceptance thresholds.
