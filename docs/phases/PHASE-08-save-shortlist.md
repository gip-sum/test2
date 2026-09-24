# Phase 8 — Save and shortlist

**Status:** Implemented and verified with a simulated provider; live account verification pending.
**Source:** `Phases.txt`, Phase 8.

## 1. Scope

Buyers can save and remove properties and view their shortlist at `/account/saved`. Enquiries and alerts remain later phases.

## 2. UX requirements

Hearts on search cards, recent listings and property details reflect the same saved state. A signed-out buyer goes to login and returns to the listing. The saved page offers a browse link when empty and a useful removal control when a listing disappears.

## 3. Technical requirements

Keep search pages cacheable: load the buyer's shortlist in a client provider once per page view. Server endpoints verify Auth on every read and mutation. Never expose Auth tokens to the browser. Failed reads and writes show an error and do not claim success.

## 4. Data requirements

`public.saved_properties` stores `user_id`, stable `property_public_id` and `created_at`, unique by buyer and listing. RLS restricts all operations to the row owner; anonymous users have no table privileges. The current listing source is a fixture behind `lib/property/queries.ts`, so no property foreign key exists yet.

## 5. Edge cases

Handle invalid IDs, forged or expired sessions, repeated saves/removes, simultaneous controls for the same property, database outages and withdrawn listings. Do not let one buyer see another buyer's saves. An absent provider is an error, not an empty shortlist.

## 6. Accessibility requirements

Heart buttons have specific labels and pressed state, keyboard focus, pending state and error announcements. Empty and failure states are text as well as visual styling.

## 7. Responsive requirements

Saved listings stack on phones and form a card grid on larger screens. Check common phone, tablet and desktop widths for clipping.

## 8. Verification

Run project verification and production build. Test browser save, persistence across reload, remove, sign-out handling and user isolation using the simulated provider. Apply and inspect the Supabase migration and security policies.

## 9. Production readiness

- [x] Database migration and owner RLS applied; security advisors clear.
- [x] UI, server endpoints and responsive shortlist verified with simulated buyers.
- [x] Production build passes.
- [ ] Live save with a real buyer account verified.
