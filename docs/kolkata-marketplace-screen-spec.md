# Kolkata Property Marketplace — Screen-by-Screen Product Specification (V1)

**Version:** 1.0 · **Date:** 2026-09-20
**Governing document:** *Kolkata Property Marketplace — V1 Product Blueprint*
**Companion:** the design system (tokens, 19 components, usage rules) — published separately as a browsable reference
**Status:** specification only. No application code. Implementation begins after this is approved.

---

## 0. How to read this document

One section per screen. Every screen carries the same eleven fields, so nothing is forgotten and nothing is invented:

| Field | What it fixes |
|---|---|
| **Route** | The exact URL. Decided now, because changing an indexed URL later costs search ranking. |
| **Access** | Who can open it, and what happens to everyone else. |
| **Purpose** | The one job the screen does. If a screen has two jobs, it is two screens. |
| **Mobile layout** | The 390–412px layout. Designed first. |
| **Desktop layout** | What that becomes at 1024px+. |
| **Components** | From the design system. A screen that needs a component not listed there is a gap to close before building. |
| **Data** | What the server must supply. |
| **Actions** | What the user can do, and what each does. |
| **States** | Loading, empty, error — specified, not improvised. |
| **Edge cases** | The things that break in production. |
| **Acceptance** | How you know it is done. Testable, not aspirational. |

Three tags appear throughout:

- **`[BLUEPRINT]`** — stated directly in the V1 Product Blueprint.
- **`[PROPOSED]`** — our recommendation, derived from the blueprint and the earlier research. Change freely.
- **`[DECISION REQUIRED]`** — genuinely undecided. Listed together in §14.

---

## 1. Screen inventory

26 screens for V1. Nothing else is built.

| # | Screen | Route | Access | SEO |
|---|---|---|---|---|
| **Public / buyer** |
| 1 | Homepage | `/` | Public | Yes |
| 2 | Search results — SEO landing | `/kolkata/{slug}` | Public | Yes |
| 3 | Search results — app surface | `/search?…` | Public | **No — noindex** |
| 4 | Property detail | `/property/{slug}-p{id}` | Public | Yes |
| 5 | Property unavailable | same route, HTTP 410 | Public | Yes (410) |
| 6 | Log in / Register | `/login` | Public | No |
| **Buyer account** |
| 7 | My Account | `/account` | Buyer | No |
| 8 | Saved properties | `/account/saved` | Buyer | No |
| 9 | My enquiries | `/account/enquiries` | Buyer | No |
| 10 | Profile & settings | `/account/profile` | Any signed in | No |
| **Seller — posting** |
| 11 | Post: 1 Basic details | `/post/{draftId}/basics` | Seller | No |
| 12 | Post: 2 Location | `/post/{draftId}/location` | Seller | No |
| 13 | Post: 3 Property profile | `/post/{draftId}/profile` | Seller | No |
| 14 | Post: 4 Photos | `/post/{draftId}/photos` | Seller | No |
| 15 | Post: 5 Pricing & other | `/post/{draftId}/pricing` | Seller | No |
| 16 | Post: 6 Preview & submit | `/post/{draftId}/preview` | Seller | No |
| **Seller — management** |
| 17 | Seller overview | `/dashboard` | Seller | No |
| 18 | My properties | `/dashboard/properties` | Seller | No |
| 19 | Leads | `/dashboard/leads` | Seller | No |
| **Admin** |
| 20 | Admin overview | `/admin` | Admin | No |
| 21 | Moderation queue | `/admin/moderation` | Admin | No |
| 22 | Listing review | `/admin/moderation/{id}` | Admin | No |
| 23 | Users | `/admin/users` | Admin | No |
| 24 | Reports | `/admin/reports` | Admin | No |
| **Utility** |
| 25 | Not found / Error | `*` | Public | No |
| 26 | Legal pages | `/terms`, `/privacy` | Public | Yes |

### 1.1 URL design `[PROPOSED, from BLUEPRINT §19]`

The blueprint gives the pattern; this fixes the grammar.

```
/                                        Homepage
/kolkata/flats-for-sale                  City + type + intent
/kolkata/flats-for-rent
/kolkata/new-town/flats-for-sale         + locality
/kolkata/new-town/2-bhk-flats-for-sale   + configuration
/kolkata/new-town/flats-for-sale/page/2  Crawlable pagination
/property/upohar-luxury-3-bhk-new-town-p84213
/search?intent=buy&loc=4412,4418&pmin=4000000&pmax=6250000&bhk=2,3&sort=newest
```

**Two surfaces, one query engine.** The pretty routes are server-rendered and indexable. `/search` is the interactive surface and is `noindex, follow`. Both parse to the **same normalised filter object** — this is the single most important architectural rule in the product, because the moment the two surfaces disagree, results differ depending on how you arrived.

**Locality slugs come from our own canonical location database**, never from the external seed source. `[BLUEPRINT §16]`

**Indexation is gated on inventory.** A landing page is indexable only above a minimum active-listing count; below it the page is `noindex` and links to its parent. `[BLUEPRINT §19 — "must be controlled to avoid thin/duplicate pages"]` Threshold: **`[DECISION REQUIRED]` D-19**, proposed ≥5.

---

## 2. Screen 1 — Homepage

**Route** `/` · **Access** Public · **SEO** Yes

### Purpose
Convert an ambiguous visitor into a **typed intent plus a place**, as fast as possible. The homepage is a router, not a storefront. `[BLUEPRINT §4]`

### Mobile layout (390–412)
1. Header: wordmark left, "Log in" right (`AppHeader`)
2. Headline — "Find your next property in Kolkata" `[BLUEPRINT §4]`
3. Intent tabs: **Buy · Rent** (pill row)
4. Collapsed search target → opens the full-screen search sheet (`SearchBar`, phone variant)
5. Popular locality chips — New Town, Salt Lake, Ballygunge, Rajarhat, Tollygunge, Behala
6. Recently viewed (signed in) or Recently added (signed out) — horizontal card scroller, 1.15 cards wide so the peek signals scrollability
7. Browse by budget tiles — under ₹40 L · ₹40–60 L · ₹60 L–1 Cr · above ₹1 Cr
8. Browse by BHK tiles — 1 / 2 / 3 / 4+
9. Owner band: "Post your property free" (`supply-600`) `[BLUEPRINT §4]`
10. SEO footer — link groups by locality × intent × type
11. `BottomNav`

### Desktop layout (≥1024)
Container 1200px. Full inline `SearchBar` with intent tabs above it. Rails become 4-up grids. Budget and BHK tiles sit side by side. Footer is 4 columns.

### Components
`AppHeader` · `SearchBar` · `LocationTypeahead` · `Chip` · `PropertyCard` · `Button` · `SkeletonCard` · `BottomNav`

### Data
- Popular localities for Kolkata with active-listing counts (cached, 1 h)
- Recently added listings, 8 (cached, 5 min)
- Recently viewed, from the signed-in user
- Budget and BHK band counts (cached, 1 h)
- Footer link clusters, generated from the location database

### Actions
| Action | Result |
|---|---|
| Select Buy / Rent | Search scope switches; localities kept, budget cleared, and the user is told |
| Tap search | Full-screen search sheet |
| Tap a locality chip | Straight to that landing page — no intermediate search |
| Tap a card | Property detail |
| Tap Post property | `/post` (signs in first if needed) |

### States
- **Loading** — skeletons for rails only. Header, headline and search render immediately and must never wait on data.
- **Empty** — a rail with no data hides itself. A homepage must never look broken.
- **Error** — rails fail silently and hide. Search must still work.

### Edge cases
- Signed-in seller with active listings: the owner band is suppressed. Showing "post your property" to someone with three live listings is a personalisation failure people notice.
- Signed out: "Recently viewed" becomes "Recently added".
- JavaScript disabled: search still submits as a plain form GET to the landing route.

### Acceptance
- [ ] LCP ≤ 2.0 s on a throttled mid-range Android over simulated 4G `[BLUEPRINT §22]`
- [ ] Search is usable without waiting for any rail to load
- [ ] Every locality chip resolves to a real landing page with ≥1 listing
- [ ] Switching Buy ⇄ Rent preserves selected localities
- [ ] Page renders meaningful content with JavaScript disabled

---

## 3. Screen 2 — Search results (SEO landing)

**Route** `/kolkata/{slug}` and `/kolkata/{locality}/{slug}` · **Access** Public · **SEO** Yes — the primary acquisition surface

### Purpose
Rank for a specific search intent, and convert that visitor into a property view.

### Mobile layout
1. `AppHeader` (compact)
2. Breadcrumb — Home › Kolkata › New Town › Flats for sale
3. H1 with live count — "1,284 flats for sale in New Town, Kolkata"
4. Sticky bar: **Filters (3)** · **Sort** — stays as the list scrolls
5. Applied filter chips, horizontally scrollable, each removable
6. Result list — horizontal `PropertyCard`, 20 per page
7. Pagination — crawlable `/page/2` links **and** infinite scroll for the interactive path
8. SEO content block — genuine, useful copy about the locality
9. Internal link clusters — nearby localities, adjacent budget bands, other configurations
10. FAQ block (`FAQPage` structured data)

### Desktop layout
Two columns: sticky filter rail 280px left, results right at 2-up (3-up at 1280+). Sort sits inline above the grid. Filters apply on change, not on confirm.

### Components
`AppHeader` · `Chip` (applied) · `FilterSheet` (mobile) / filter rail (desktop) · `PropertyCard` · `SkeletonCard` · `EmptyState` · `Button`

### Data
`GET /search` → results, total, page · `GET /search/facets` → option counts · locality summary · internal link clusters

### Actions
| Action | Result |
|---|---|
| Change a filter | URL updates, results refresh, chip added — **scroll position, filter state and loaded results all survive** |
| Change sort | Results reorder. An explicit sort is obeyed exactly; nothing is interleaved into it |
| Remove a chip | That filter clears, results refresh |
| Save a card | Optimistic fill; signed out → auth sheet → the save replays after login |
| Open a card | Property detail, with search context preserved for Back |

### States
- **Loading** — 6 `SkeletonCard`s at the exact final card height. Filter bar stays interactive.
- **Empty** — `EmptyState` running the relaxation ladder: name the most restrictive filter, offer to relax it, show what is nearby, offer to save the search. **Never a bare "no results".**
- **Error** — inline retry. **Filter chips stay rendered and scroll position holds.** The page must never bounce to home.

### Edge cases
- Page beyond the last: redirect to the last real page, never a blank grid.
- A locality below the indexation threshold: `noindex`, and the page offers the parent area.
- Filter combination with zero results: the ladder runs and discloses every relaxation with one-tap undo.
- A listing expiring while the user is on the page: it stays visible until refresh, then resolves to the 410 page.

### Acceptance
- [ ] **No filter or sort action loses scroll position, filter state or loaded results — including when the API errors.** This is the product's headline quality bar `[BLUEPRINT §25 Quality]`
- [ ] Facet counts exclude their own facet's selection
- [ ] Zero-count options are shown disabled with their count, never hidden
- [ ] Browser Back returns to the previous filter state, not the homepage
- [ ] Page renders complete results server-side with JavaScript disabled
- [ ] Title, meta description, canonical and `ItemList` + `BreadcrumbList` JSON-LD all present
- [ ] `/page/2` is independently crawlable and self-canonical
- [ ] Search API p95 ≤ 300 ms `[BLUEPRINT §22]`

---

## 4. Screen 3 — Search results (app surface)

**Route** `/search?…` · **Access** Public · **SEO** `noindex, follow`

### Purpose
The fast, stateful filtering experience. Same data as screen 2, different job: no page reloads, everything in the URL so a filtered search is shareable.

### Differences from screen 2
- Filter changes update the URL via `replaceState` for refinement, `pushState` for a genuine navigation — so Back behaves predictably.
- Infinite scroll, with a "Load more" fallback so the footer stays reachable.
- No SEO content block, no internal link clusters, no FAQ.
- `noindex` — it duplicates the landing pages with unstable parameters.

### Acceptance
- [ ] Resolves to a byte-identical filter object as the equivalent pretty URL
- [ ] `noindex` present and verified
- [ ] Infinite scroll never traps the footer
- [ ] A shared `/search?…` URL reproduces the exact same result set

---

## 5. Screen 4 — Property detail

**Route** `/property/{slug}-p{id}` · **Access** Public · **SEO** Yes

### Purpose
Answer every buyer question, and convert to a lead. **The primary conversion surface.** `[BLUEPRINT §6]`

### Mobile layout
1. `AppHeader` (compact, back arrow)
2. `Gallery` — full-bleed, 4:3, counter, tabs for Photos / Video / Floor plan
3. Header block — price, price per sqft, BHK · baths · area **with basis**, locality, badges
4. Key details grid — type, status, furnishing, floor / total floors, facing, age, parking, bathrooms, balconies, availability `[BLUEPRINT §6]`
5. Amenities — grouped, expandable
6. Description — sanitised of contact details
7. Seller block — Owner / Agent / Builder, verification information `[BLUEPRINT §6]`
8. Report this property
9. Similar properties — horizontal scroller `[BLUEPRINT §7]`
10. `ContactBar` — sticky bottom, always reachable
11. Legal disclaimer — what verification does and does not mean

**No map in V1.** `[BLUEPRINT §6 omits it; §24 excludes advanced maps]` Coordinates are still captured at posting `[BLUEPRINT §9 Step 2]` so the map can be added later without a data migration. Flagged in §14 as **D-06** because it is a visible departure from the earlier research recommendation.

### Desktop layout
Two columns. Left: gallery, details, amenities, description, similar. Right: sticky `ContactBar` card with price, both contact actions and the seller block. In-page anchor nav appears at 1280+.

### Components
`Gallery` · `Badge` · `ContactBar` · `Button` · `PropertyCard` (similar) · `Toast` · `StatusPill` (owner's own view)

### Data
`GET /properties/{id}` → listing, media, amenities, seller summary (**no contact details**) · `GET /properties/{id}/similar`

**Similar-properties matching `[BLUEPRINT §7 — no AI]`:** same locality → same property type → same BHK → price within ±20%, ordered by proximity then recency. If fewer than 4 results, widen to adjacent localities, then to ±35% price. Deterministic, explainable, and cheap.

### Actions
| Action | Result |
|---|---|
| **Enquire** | Auth if needed → form → `Inquiry(QUERY)` → seller notified |
| **View phone** | Auth → OTP → **inquiry written first** → number revealed → seller notified |
| **Save** | Optimistic; replays after login |
| **Report** | Reason picker → enters the moderation queue |
| Share | Native share sheet / copy link |

### States
- **Loading** — gallery box reserved at 4:3, then three text bars. Contact bar renders immediately.
- **Error** — full-page error with retry and a link back to results.
- **Unavailable** — see screen 5.

### Edge cases
- Listing has one photo: the gallery hides its thumbnail strip and the counter.
- No video or floor plan: those tabs do not render.
- Owner viewing their own listing: contact actions are replaced by Edit / View leads, plus a `StatusPill`.
- Already enquired: the button reads "Enquire again" and the previous enquiry date is shown.
- Signed-out user taps View phone: auth sheet, then OTP, then the reveal completes automatically — the user is never dropped back to the top of the page.

### Acceptance
- [ ] **Seller contact details are absent from the API payload until the reveal** — verified by inspecting the raw network response, not the UI `[BLUEPRINT §12, §23]`
- [ ] The `Inquiry` row is written **before** the number renders
- [ ] Repeat reveals by the same user on the same listing are deduplicated `[BLUEPRINT §12]`
- [ ] A contact action is reachable at every scroll position
- [ ] Area basis (carpet / built-up / super) is labelled everywhere area appears
- [ ] `RealEstateListing` + `BreadcrumbList` JSON-LD valid
- [ ] CLS ≤ 0.05 with the gallery loading `[BLUEPRINT §22]`
- [ ] Similar properties load asynchronously and never block first paint

---

## 6. Screen 5 — Property unavailable

**Route** same as screen 4 · **HTTP 410 Gone** · **SEO** Yes

### Purpose
Handle a removed listing without a dead end or an SEO penalty.

Returns **410**, not 404 and not a soft redirect — 410 tells search engines the removal is permanent. The listing is dropped from the sitemap in the same operation.

Shows: a plain explanation, 6 similar active properties in the same locality and budget, and a search CTA. `EmptyState` + `PropertyCard`.

### Acceptance
- [ ] Returns HTTP 410 with a useful page body
- [ ] Removed from the sitemap within one generation cycle
- [ ] At least 3 genuinely similar active listings shown, or the locality page if none exist

---

## 7. Screen 6 — Log in / Register

**Route** `/login` · **Access** Public · **SEO** `noindex`

### Purpose
Get a verified phone number with the least possible friction. `[BLUEPRINT §8]`

### Flow
```
Phone number → OTP sent → 6-digit code → verified
   │                                        │
   └─ existing account → signed in ─────────┘
   └─ new account → choose role → Buyer | Owner | Agent | Builder → signed in
```

**Phone OTP is the primary method.** Email is captured for account information, notifications and recovery — **not as a login method in V1**. `[BLUEPRINT §8]` Social login is deferred. `[BLUEPRINT §8]`

### Layout
A single centred card, max 400px, on both mobile and desktop. When triggered mid-action it opens as a bottom sheet on mobile and a modal on desktop, so the underlying page is never lost.

### Components
`Field` · `Button` · `Toast`

### Actions & validation
| Field | Rule |
|---|---|
| Phone | Indian mobile format; normalised to E.164 before sending |
| OTP | 6 digits; expires in 5 minutes; single-use; max 5 attempts |
| Role | Required for new accounts only |
| Email | Optional at registration, required before publishing a listing |

### States
- **Sending** — button keeps its width, label becomes a spinner
- **Resend** — disabled with a visible 30-second countdown
- **Wrong code** — "That code doesn't match. 2 attempts left."
- **Expired** — "That code expired." + Resend
- **Rate limited** — "Too many attempts. Try again in 10 minutes." Never fail silently. `[BLUEPRINT §23]`

### Edge cases
- **The interrupted action always replays.** Save, enquire or reveal resumes automatically after login. Dropping the user on the homepage after authentication is the single most costly auth bug in this product.
- A number already registered simply signs in — no "account exists" error.
- Role is chosen once; a buyer who later posts a property gains the Owner role without a second account. Roles are additive. `[PROPOSED]`

### Acceptance
- [ ] OTP arrives within 30 s on major Indian networks (requires DLT template approval)
- [ ] Rate limits enforced **server-side**, per number and per IP `[BLUEPRINT §23]`
- [ ] The pre-auth action completes automatically afterwards, every time
- [ ] Codes are stored hashed, expire, and cannot be reused
- [ ] Session persists across reloads; logout revokes

---

## 8. Screens 7–10 — Buyer account

The blueprint is explicit: **"The dashboard should remain simple in V1."** `[BLUEPRINT §13]` Four screens, no more.

### Screen 7 — My Account · `/account`

**Purpose** A hub, not a dashboard. Four links and the user's name.

Rows: Saved properties (with count) · My enquiries (with count) · Profile & settings · Log out. On desktop these become a left sidebar with the selected section beside it; on mobile they are a plain list.

**Acceptance** — [ ] Every row shows an accurate live count · [ ] Log out revokes the session server-side

### Screen 8 — Saved properties · `/account/saved`

**Purpose** The buyer's shortlist — the main reason to come back during a months-long decision.

Vertical list of `PropertyCard`s with an unsave action. Sorted newest-saved first.

- **Empty**: "Nothing saved yet — tap the heart on any property to keep it here." + "Browse flats in Kolkata"
- **Edge case**: a saved property that expires stays in the list, greyed, marked "No longer available", with "See similar". Silently deleting someone's saved item is worse than showing it gone.
- **Acceptance** — [ ] Saves persist across devices for a signed-in user · [ ] Unsave is optimistic and reverts on failure

### Screen 9 — My enquiries · `/account/enquiries`

**Purpose** What the buyer has contacted, so they don't enquire twice and can find the number again.

Each row: property thumbnail, title, locality, enquiry type (Enquiry / Viewed contact), date, and the seller's number if it was revealed. Tapping opens the property.

- **Empty**: "You haven't contacted anyone yet."
- **Acceptance** — [ ] A revealed number stays accessible without consuming a second reveal · [ ] Rows survive the listing being removed, showing it as unavailable

### Screen 10 — Profile & settings · `/account/profile`

**Purpose** Account details, notification preferences, and the data rights the law requires.

Fields: name, email (verify on change), phone (**OTP on change, which invalidates other sessions**), role display, notification toggles, delete account.

- **Acceptance** — [ ] Phone change requires OTP and revokes other sessions `[BLUEPRINT §23]` · [ ] Account deletion is available and honoured · [ ] Notification preferences are respected by the notification service

---

## 9. Screens 11–16 — Post property (the six-step wizard)

**Access** Seller roles (Owner / Agent / Builder) · **SEO** `noindex`
**Target: a real owner completes this in under 8 minutes on a phone.**

The blueprint fixes the six steps. `[BLUEPRINT §9]` This section fixes the behaviour around them.

### 9.1 Rules that apply to every step

1. **The draft is created server-side on the first field blur of step 1**, not at submit. Losing a half-finished form is the single biggest cause of abandonment. `[BLUEPRINT §9 Step 6 "Save draft"]`
2. **Autosave on every step change and every 20 seconds**, with a visible "Saved just now". The reassurance itself reduces drop-off.
3. **Fields are driven by `(intent, segment, property type)` from a configuration table, not hardcoded branching.** `[PROPOSED]` With three property types this feels unnecessary; by the fifth it is the difference between an afternoon and a rewrite.
4. Completed steps are tappable; future steps are not.
5. Mobile shows "Step 3 of 6" + a progress bar; desktop shows all six labelled.
6. Validation runs on blur and again on Next. Errors never shift the layout — the message slot is always reserved.
7. **Back never loses data.**

### Screen 11 — Step 1: Basic details · `/post/{draftId}/basics`

Sale or Rent · Owner / Agent / Builder · Property type (Flat/Apartment, Independent house, Builder floor, Villa, Studio) · BHK configuration. `[BLUEPRINT §9]`

These four answers configure every later step, which is why they come first.

- **Edge case**: changing property type after step 3 warns that some entered details will be cleared, and names them.
- **Acceptance** — [ ] Draft exists server-side before the user reaches step 2 · [ ] Role selection persists onto the account

### Screen 12 — Step 2: Location · `/post/{draftId}/location`

City (fixed: Kolkata) · Locality via `LocationTypeahead` · Address line (**private — never published**) · Landmark · Map pin with coordinates where available. `[BLUEPRINT §9, §16]`

- Localities resolve against **our canonical database**, not the external seed. `[BLUEPRINT §16]`
- **Edge case — the locality is missing**: the seller can submit a free-text locality, which routes to admin for canonicalisation rather than blocking the post. Kolkata's locality data will never be complete on day one, and blocking a seller over it costs supply.
- **Acceptance** — [ ] Address line never appears in any public response · [ ] A pin dropped far from the selected locality raises a warning (not a block) · [ ] A missing locality does not prevent posting

### Screen 13 — Step 3: Property profile · `/post/{draftId}/profile`

Carpet area (**required**) · built-up · super area · area unit · bedrooms · bathrooms · balconies · floor · total floors · furnishing · parking · property age · amenities. `[BLUEPRINT §9]`

- **Carpet area is the required one.** All three are stored separately and never conflated — this is the most common data-integrity failure in Indian property listings and it produces wrong price-per-sqft everywhere downstream.
- Amenities are grouped (Society / Flat / Safety / Recreation) with a search box once the list exceeds ~15.
- **Acceptance** — [ ] The three area fields are separately stored and separately labelled · [ ] Floor cannot exceed total floors · [ ] Amenity list is scannable on a 390px screen

### Screen 14 — Step 4: Photos · `/post/{draftId}/photos`

Upload · reorder · cover photo · validation · moderation. `[BLUEPRINT §9, §11]`

- **Up to 30 photos, JPEG/PNG** `[BLUEPRINT §11]` — deliberately below what the research observed on the incumbent.
- Client-side compression before upload; presigned direct-to-storage upload; per-file progress and per-file retry.
- Server-side: EXIF stripped (**photo GPS can expose a home address**), variants generated, perceptual hash computed for duplicate detection, OCR for embedded contact details. `[BLUEPRINT §11, §23]`
- **Edge cases**: partial failure retries only the failed files · a rejected photo says exactly why ("this photo shows a phone number") · at least one photo is required to submit.
- **Acceptance** — [ ] Upload completes on a throttled 3G connection or fails with a working retry · [ ] EXIF is absent from every stored derivative · [ ] Photos containing contact details are flagged before publication · [ ] Reordering persists

### Screen 15 — Step 5: Pricing & other · `/post/{draftId}/pricing`

Sale price or monthly rent · maintenance · security deposit (rent) · availability date · negotiable · price on request · description · additional information. `[BLUEPRINT §9]`

- Price is entered in rupees and displayed back in Indian format (`₹62.5 L`) so the seller can confirm the magnitude — a mis-keyed zero is the most common and most damaging listing error.
- **The description is sanitised**: phone numbers, emails and URLs are stripped, including obfuscated forms ("nine eight seven…", "at gmail dot com"). `[BLUEPRINT §23]`
- **Edge case**: a price far outside the locality distribution triggers a soft confirmation ("This is well above similar properties in New Town — is that right?"), never a hard block.
- **Acceptance** — [ ] Entered price is echoed in Indian format before submission · [ ] Obfuscated contact details are caught in tests · [ ] Rent listings capture deposit and maintenance separately

### Screen 16 — Step 6: Preview & submit · `/post/{draftId}/preview`

The exact public rendering, the completeness score, Save draft and Submit. `[BLUEPRINT §9]`

- **The preview is the real property-detail component in preview mode** — not a separate approximation. If they diverge, the preview stops being trustworthy.
- The completeness score names the single highest-value missing field.
- Submitting moves the listing to **Under screening** and says what happens next and roughly how long it takes.
- **Acceptance** — [ ] Preview is visually identical to the published page · [ ] Submit is blocked only by genuinely required fields, each named and linked · [ ] The seller is told what "being reviewed" means in plain language

---

## 10. Screens 17–19 — Seller dashboard

### Screen 17 — Overview · `/dashboard`

Counters, each a link into a filtered list: **Active · Drafts · Being reviewed · Needs changes · Expired · New enquiries**. `[BLUEPRINT §14]`

Below: the three most recent leads, and a "Post another property" action.

- **Empty (no listings)**: a single prominent "Post your property — it's free" (`supply-600`).
- **Acceptance** — [ ] Every counter links to that exact filtered view · [ ] Counts match the underlying lists exactly

### Screen 18 — My properties · `/dashboard/properties`

Tabs by lifecycle state, each row a compact card with `StatusPill` and contextual actions. `[BLUEPRINT §14]`

| State | Available actions |
|---|---|
| Draft | Continue · Delete |
| Being reviewed | View · Withdraw |
| Live | View · Edit · Mark sold/rented · Withdraw |
| Needs changes | **Read the reason** · Edit and resubmit |
| Expired | Renew · Edit · Delete |

- **Needs changes always shows the specific reason and the field to fix.** A rejection with no reason generates support load and churn.
- Editing a live listing re-enters screening **only when a material field changes** (price, area, location, photos). A typo fix should not take a listing offline. `[PROPOSED]`
- **Marking sold/rented removes it from search immediately** — stale live listings are the category's biggest trust problem.
- **Acceptance** — [ ] Every state is reachable and clearly labelled in plain language · [ ] Rejection reasons are specific and actionable · [ ] Sold/rented disappears from search within one minute

### Screen 19 — Leads · `/dashboard/leads`

`LeadRow` list, newest first, filterable by type and status. `[BLUEPRINT §14]`

Each lead: buyer name, verified phone, property, date, type (Enquiry / Viewed contact), message if any, status dropdown, note. **A full CRM is explicitly deferred.** `[BLUEPRINT §14]`

- **Empty**: "No enquiries yet" plus what actually improves visibility — more photos, a complete listing.
- **Edge case**: repeat reveals by the same buyer on the same property **collapse into one row**. A seller must never believe they received two leads when they received one.
- **Acceptance** — [ ] Phone numbers are tappable and copyable · [ ] Status and notes persist · [ ] Duplicates are collapsed · [ ] A new lead notifies the seller within one minute `[BLUEPRINT §12]`

---

## 11. Screens 20–24 — Admin

Admin screens are **optimised for density and speed**, not for first-time users. These are repetitive power-user tools. `[PROPOSED]` Desktop-only is acceptable for V1. `[PROPOSED]`

### Screen 20 — Overview · `/admin`
Users · Active properties · Pending moderation · Reported properties · Enquiries · marketplace activity. `[BLUEPRINT §15]` Queue depth is the number that matters daily; surface it first and alert when it grows faster than it is cleared.

### Screen 21 — Moderation queue · `/admin/moderation`
Pending listings, **oldest first** so nothing starves. Each row: thumbnail, title, seller, submitted-at, an age indicator, and automated check results (duplicate score, contact-info detection, price sanity). `[BLUEPRINT §15]`

Filters: flagged-only, by check type, by seller type.

- **Acceptance** — [ ] Automated check results are visible **before** opening a listing · [ ] Queue is ordered oldest-first · [ ] Age over the SLA is visually obvious

### Screen 22 — Listing review · `/admin/moderation/{id}`
Full listing beside the automated findings. Actions: **Approve · Reject (reason required) · Request changes · Suspend · Delete**. `[BLUEPRINT §15]`

- **A reason is mandatory on reject**, chosen from a catalogue plus optional free text, and it is what the seller sees.
- Every action writes an immutable audit entry. `[BLUEPRINT §23]`
- **Acceptance** — [ ] No rejection can be saved without a reason · [ ] Every decision writes exactly one audit entry · [ ] The seller is notified with the specific reason

### Screen 23 — Users · `/admin/users`
Search by phone, email or name. View role, listings, leads and activity. Suspend and restore. `[BLUEPRINT §15]`

- **Acceptance** — [ ] Suspension takes effect immediately and hides that user's live listings · [ ] Every access to buyer contact data is logged `[BLUEPRINT §23]`

### Screen 24 — Reports · `/admin/reports`
User-submitted reports with an SLA timer. Reasons `[BLUEPRINT §15]`: incorrect information · duplicate property · wrong price · inappropriate content · suspicious listing · other.

Repeat-reported listings are auto-flagged for priority. Resolution closes the loop: the reporter is told it was handled, and the seller is told if action was taken.

- **Acceptance** — [ ] Every report carries an SLA timer · [ ] Repeat reports escalate automatically · [ ] Reporters hear back — otherwise they stop reporting

---

## 12. Screens 25–26 — Utility

### Screen 25 — Not found / Error
**404**: explanation, search box, popular localities, link home. Never a bare message.
**500**: apology-free explanation, retry, support link. Brand intact.

### Screen 26 — Legal pages · `/terms`, `/privacy`
Reviewed by a lawyer before launch. `/terms` must carry the **verification-scope disclaimer**: state exactly what a verified badge does and does not prove. Overclaiming is a legal exposure, not a copy choice.

---

## 13. Cross-cutting requirements

### 13.1 Analytics — every screen `[BLUEPRINT §21]`

| Funnel | Events |
|---|---|
| Buyer | `search_performed` → `results_viewed` → `property_viewed` → `property_saved` → `enquiry_sent` → `contact_revealed` |
| Seller | `registered` → `post_started` → `draft_saved` → `post_submitted` → `listing_approved` → `listing_published` → `lead_received` |
| Also | errors, performance (field Core Web Vitals), search behaviour (including zero-result rate), moderation activity |

Every event carries: user or anonymous id, session, surface, timestamp, and the normalised filter object where relevant.

### 13.2 Performance budgets — enforced in CI, not audited later `[BLUEPRINT §22]`

| Metric | Target |
|---|---|
| LCP | ≤ 2.0 s |
| CLS | ≤ 0.05 |
| INP | ≤ 150 ms |
| TTFB | ≤ 400 ms |
| Search API p95 | ≤ 300 ms |
| Typeahead p95 | ≤ 120 ms |

Measured on a throttled mid-range Android over simulated 4G. A budget met only on a developer laptop is not a budget.

### 13.3 Security applying to every screen `[BLUEPRINT §23]`

Server-side role checks on every endpoint · object-level ownership checks · input validation server-side · OTP and API rate limiting · secure uploads with real content-type validation · XSS escaping of all user text · audit logging of administrative actions · **contact details never serialised before a reveal**.

### 13.4 Accessibility floor

WCAG 2.1 AA · visible focus rings · 44×44 touch targets · real form labels · result-count changes announced · `prefers-reduced-motion` honoured.

---

## 14. Decisions

### 14.1 Settled by this blueprint

| ID | Decision | Outcome |
|---|---|---|
| D-01 | Frontend | Next.js + React + TypeScript |
| D-03 | Database | PostgreSQL + PostGIS |
| D-04 | Search | PostgreSQL first; OpenSearch only when measured need justifies it |
| D-05 | Image storage | S3-compatible object storage + CDN |
| D-07 | Hosting | Vercel / managed infrastructure |
| D-08 | Auth | Phone OTP primary; email for notifications and recovery |
| D-11 | Launch geography | **Kolkata only** |
| D-12 | Categories | Residential Buy + Rent only |
| D-13 | Roles | Owner, Agent/Dealer, Builder — **all three in V1** |
| D-14 | Similar properties | **In V1**, non-AI matching |
| D-15 | Mobile | Web first; native apps deferred |
| D-20 | Location data | Hybrid: external seed → our canonical database as source of truth |
| D-22 | Photo limit | 30 |

### 14.2 Still open — these block or shape implementation

| ID | Decision | Why it matters | Proposed |
|---|---|---|---|
| **D-02** | **Backend framework.** The blueprint names the frontend, database and hosting but **never says what runs the API** — Next.js route handlers, or a separate service (NestJS / Spring Boot)? | Affects project structure, deployment, testing and hiring. Everything in §9–§11 assumes an API exists; nothing here assumes its shape. **The largest open gap in the blueprint.** | Start with Next.js route handlers for V1's scale, with module boundaries drawn so extraction stays cheap |
| **D-06** | **Map on the property page.** §6 omits it and §24 excludes "advanced maps", but §9 captures coordinates. Is a *static* location map in V1? | A visible departure from the earlier research recommendation. Cheap to add now, awkward later. | Capture coordinates in V1; add a static map only if it does not threaten the LCP budget |
| **D-17** | **Brand name and domain.** | Blocks the wordmark, the design system's name, email sending domains and all SEO. | — |
| **D-18** | **Free listing quota per seller.** The blueprint excludes payments but never states a quota. | With no quota and no payment, nothing limits listing volume per account — an abuse vector. | Generous during the supply-building phase, with an account-level rate limit rather than a hard cap |
| **D-19** | **Thin-content indexation threshold.** | Uncontrolled indexation of near-empty landing pages is the classic cause of portal-wide SEO demotion. | ≥5 active listings |
| **D-21** | **Listing expiry period.** §10 lists an Expired state but not the duration. | Directly determines perceived catalogue freshness — our stated differentiator. | 60 days, with a renewal prompt at day 53 |
| **D-23** | **Photo verification in V1.** §6 mentions "relevant verification information" and §24 does not exclude verification, but §15 does not list it as an admin function. | Determines whether the `Verified` badge exists at launch. Scope it honestly if it does. | Include tier 1 (guided on-site photo capture); it is the badge buyers value most |
| **D-24** | **Who builds this, and in what time.** | Every estimate elsewhere assumes competent full-time development. | — |

---

## 15. What this specification deliberately does not cover

Per **`[BLUEPRINT §24]`**, none of the following is specified, designed or built for V1, and no screen above assumes them:

native apps · advanced maps · saved-search alerts · reviews · price trends · projects · builder discovery · advanced agent tools · payments · featured or paid listings · phone masking · home-loan tools · AI recommendations · commercial property · PG · plots · advanced comparison · multi-language · OpenSearch.

The data model keeps room for them — coordinates are captured, the lead object is typed, quota accounting exists — so none requires a migration later. But none is built now.

---

## 16. Definition of done for V1

The blueprint's own success definition `[BLUEPRINT §25]`, restated as testable gates:

| Gate | Test |
|---|---|
| **Supply** | A real owner posts and publishes a legitimate property from a phone in under 8 minutes |
| **Discovery** | A buyer finds relevant Kolkata properties through search and filters, with no interaction losing state |
| **Conversion** | A buyer opens a property and contacts the seller end to end, including OTP |
| **Lead** | The seller sees that enquiry in their inbox within a minute and can act on it |
| **Trust** | An admin moderates a submitted listing and resolves a report, with both audited |
| **Acquisition** | Landing pages and property pages are indexed, with thin pages excluded |
| **Quality** | All performance, security and testing requirements in §13 are met |

**V1 is not successful because the website works. It is successful when that loop closes.**
