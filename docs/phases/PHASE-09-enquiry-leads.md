# Phase 9 — Enquiry and lead system

**Status:** Implemented with simulated provider; real seller assignment pending.
**Source:** `Phases.txt`, Phase 9.

## 1. Scope

Persist buyer enquiries, track repeats, provide buyer history and a seller inbox with lead status and an in-app notification. Phone reveal and OTP are deferred at the client's request. Seller listing creation begins in Phase 11.

## 2. UX requirements

The current signed-out contact form remains usable. Success means the enquiry was stored. If a seller account is assigned to the listing, say that the seller can see the enquiry; otherwise clearly explain that notification is pending assignment. Buyers with accounts see their own enquiry history, and assigned sellers see new enquiries and can mark them contacted or closed.

## 3. Technical requirements

Use a server action and one server-only REST adapter. Validate a real listing on the server. Database insertion is a narrow RPC that validates input again, associates the verified Auth user when available, flags repeat phone/listing pairs and queues a seller inbox notification atomically. Never expose a service key to a browser. Seller ownership is set by trusted provisioning, never by an arbitrary buyer or seller request.

## 4. Data requirements

`public.enquiries` holds buyer details, property ID/title snapshot, optional buyer and seller IDs, repeat reference, status and timestamp. `public.listing_sellers` maps a listing to one verified Auth seller. `public.lead_events` records creation/repeat/status changes. `public.seller_notifications` holds the seller's inbox events. RLS grants each buyer their rows and each seller their assigned leads; guest enquiries have no public read permission. Existing fixture listings have no real seller assignment.

## 5. Edge cases

Handle invalid/missing property, phone normalisation, empty or oversized input, duplicate enquiries, concurrent repeats, unauthenticated submissions, provider outages and unassigned sellers. Protect direct Data API access and limit excessive repeated submissions. Never claim email or phone delivery without it.

## 6. Accessibility requirements

The existing accessible form preserves errors and entered values. History and inbox have headings, clear text status and keyboard controls; update feedback uses status/alert semantics.

## 7. Responsive requirements

Buyer history and seller inbox stack on 390/412px phones and remain readable at 768/1280px, without horizontal overflow.

## 8. Verification

Run `npm run verify`, `npm run build`, the browser regression checks and simulated provider tests for persistence, owner isolation, repeat submissions, status transitions and failure states. Apply migration and inspect security advisors.

## 9. Production readiness

- [x] Persistent rows, RLS and RPC verified with a rolled-back guest submission.
- [x] Buyer history and seller inbox verified with simulated buyer and seller accounts (15 browser checks).
- [x] Production build passes.
- [ ] Real seller account linked to a real listing and lead delivery verified.
