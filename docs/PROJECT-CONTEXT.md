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
  Header and mobile navigation use translucent glass with opaque fallbacks;
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
- Listing, location and media data are deterministic development fixtures.
  Generated illustrations in `public/dev-media/` are explicitly labelled
  as samples. They do not represent real properties.
- The enquiry form accepts signed-out submissions via a server action.
  `lib/enquiry/commands.ts` validates inputs and stores enquiries in a
  **process-local, non-durable array**. There is no seller inbox or
  notification delivery. Restarting a server loses enquiries. This is not
  suitable for real customer leads; Phase 9 introduces the lead system.

## Boundaries

Phase 7 owns account management. Phase 8 owns persistent shortlists.
Phase 9 owns lead delivery and history. Phase 10 owns
phone reveal and OTP. Phase 18 owns listing lifecycle and unavailable-page
semantics. Do not imply that a seller was notified merely because a
development enquiry reached the process-local store.

Data access stays in `lib/*/queries.ts`, `lib/property/search.ts` and
`lib/enquiry/commands.ts`; routes and components do not import fixtures.
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
