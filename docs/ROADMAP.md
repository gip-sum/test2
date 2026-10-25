# GharBazaar — roadmap companion

**The roadmap itself is `Phases.txt` at the repository root, and it is
authoritative.** 75 phases across twelve tracks, client-owned. When
anything here disagrees with it, it wins.

This document holds the two things `Phases.txt` deliberately does not: an
engineering audit of what already exists against what is coming, and a
register of the domain models each phase will introduce. Both are mapped to
`Phases.txt` numbering.

`docs/PHASE-0-PLAN.md` remains valid for its architecture decisions — route
grammar, search state model, component architecture, the V0 data model —
but its eight-phase build order is superseded.

---

## Status

| Phase | | |
|---|---|---|
| 1 | Design system and application foundation | **Complete** |
| 2 | Homepage and discovery | **Complete** |
| 3 | Search, filters and results | **Complete** |
| 4 | Property detail page | **Complete** (development fixtures) |
| 5 | Property gallery and media system | **Complete** |
| 6 | User authentication | Implemented; live provider setup pending |
| 7 | Buyer account | Deployed; real-account profile verification pending |
| 8 | Save and shortlist | Implemented; real-account save verification pending |
| 9 | Enquiry and lead system | Implemented; live seller assignment pending |
| 10 | Phone contact and OTP reveal | Postponed by client decision |
| 11 | Post property entry flow | **Complete** and deployed |
| 12 | Property information form | Implemented; CI on `main` and deployment pending |
| 13 | Property location form | Complete and deployed |
| 14 | Property pricing form | Complete and deployed |
| 15 | Property photo upload | Deployed at 10ae47b; CI passed; real-account production upload verification pending |
| 16 | Property draft and autosave | Deployed at 7738dca; full CI and live database checks passed |
| 17 | Property preview | Deployed at d62a534; full CI and live migration checks passed |
| 18 | Property publishing & lifecycle | Implemented locally; browser/live release checks and server credential setup pending |
| 19 | Seller dashboard | Implemented; enquiry migration not yet applied live; real-account verification pending |
| 20 | Seller listing analytics | Implemented; analytics migration not yet applied live; contact reveals deferred to Phase 10 |
| 21 | Admin dashboard | Deployed; live schema confirmed and client-designated first ADMIN granted during Phase 23 acceptance. |
| 22 | Listing moderation | Implemented: private review, approval, rejection, correction requests and immutable decisions. Migration applied and live rollback-only checks passed; first ADMIN granted in Phase 23. Real-account listing approval and seller correction / re-submit verification remain pending. |
| 23 | User & seller management | Complete and deployed at 4a7bd08. Production migration applied; explicitly designated ADMIN granted; real signed-in admin search, classification, suspension/restoration and immutable history verified with a disposable account on 15 October 2026. |
| Python addon | Import audit, local inbox worker and private AI description jobs | Import audit integrated; local automatic inbox audits added without hosted services. Description editor, immutable snapshots and private Python queue worker implemented; paid generation remains disabled by client decision. See the three ADDON-PYTHON specifications. |
| E | 99acres interface redesign from client screenshots | Complete and deployed; green primary colour and header logo restored |
| 40A | Home loan calculators | Implemented ahead of order at client request |
| Workspace addon | Compact admin and property-owner interface | Implemented and verified at client request after Phase 23; [specification and evidence](phases/ADDON-WORKSPACE-interface.md). Phase 24 remains unstarted. |
| UI track | UI modernization, UI-01 … UI-22 (Motion, Kokonut UI, Anime.js, Bklit UI; UI-14 onward the visual track: Home, Search Results, Property Details, Post Property, Seller Dashboard, Account and Saved, Admin, final polish), outside the numbering | UI-01 audit and UI-02 foundation complete ([audit](ui-modernization/UI-01-audit.md), [foundation](ui-modernization/UI-02-foundation.md)). UI-03 design-system cleanup complete ([record](ui-modernization/UI-03-design-system.md)): style-comparison tool, editorial palettes folded into `@theme`, radius/type/shadow/timing on the scales, listing-status tones, CSS colour guard and scale ratchet, dead CSS removed; login and 404 scenes measured identical. UI-04 animation system complete ([record](ui-modernization/UI-04-animation-system.md)): a CSS motion layer for sheets, header panels and the lightbox (no added JavaScript; a Motion Sheet measured +16.6 KB gzip per route), easing roles, the property card's Android stuck-hover fix, skeleton shimmer and photo fade-in, Motion presets and `<Presence>` with no production consumer yet, `motion-check` in CI; login and 404 scenes measured identical. UI-05 core components complete ([record](ui-modernization/UI-05-core-components.md)): one shared StatusBadge, EmptyState and ErrorState, 14 buttons on the shared Button (77 → 62 handwritten), 44px touch targets verified by hit-testing, and SmoothTabs adapted from Kokonut UI `smooth-tab` @ bb9120f for Buy / Rent with a CSS indicator (a Motion-driven version measured +20.5 KB gzip on Home, so Motion still ships nowhere); `ui-check` in CI. UI-06 search & cards complete ([record](ui-modernization/UI-06-search-cards.md)): search works without JavaScript (streamed page revealed, filter chips and Clear all as links, sort as a GET form), each result rendered once by one responsive card (search HTML 2,545 → 1,988 tags), shared card parts and `listingBadges()`, a CSS `@starting-style` entrance for new results and chips (a Motion version measured +17.9 KB gzip plus a 28.4 KB lazy chunk on Search, so Motion still ships nowhere), gallery photos fade into the frame, an `outline` Button variant (62 → 57 handwritten); `content-visibility` measured and rejected (CLS 0.40); login and 404 scenes identical. UI-07 auth UI complete ([record](ui-modernization/UI-07-auth-ui.md)): the sign-in form on one server-action state, so every step works without JavaScript, with a client layer for pre-send checks, duplicate-press refusal and offline recovery; one message table (`lib/auth/messages.ts`) so provider wording never reaches the page; field errors beside their field with focus following; Send a new code and Change email; a busy Google button; busy `Button` keeps focus (`aria-disabled`); 44px targets at eight widths; an open redirect through normalised return paths fixed; login scene byte-identical; no Motion, no Kokonut component; Login +1.3 KB gzip. UI-08 special interactions complete ([record](ui-modernization/UI-08-special-interactions.md)): eleven candidates scored, four shipped — photo reorder that travels to its new cell (a Web Animations FLIP; Motion's layout animation measured +14.5 KB first load, +42.6 KB by idle and slower clicks) with focus kept through every move and removal, gallery direction and a current thumbnail kept in view, a save heart that keeps focus and swells once when the server confirms, and a posting progress fill — all CSS except the FLIP; Motion still ships nowhere; Anime.js not installed (no timeline needed); no Kokonut component; login and 404 scenes identical; Property +0.9 KB, photos route +1.0 KB. UI-09 seller workspace complete ([record](ui-modernization/UI-09-seller-workspace.md)): the approved workspace structure kept; seller actions keep focus while busy and hand it to the changed card or status after the refresh, with the outcome announced (`lib/a11y/after-refresh`); the publishing and submitted pages show status through `StatusBadge`; a `secondaryBrand` Button for the neutral-bordered brand-text tools and a `SubmitButton` for server-action forms (11 buttons migrated; a test pins the rest at 41); the posting forms on one `FormField` frame with 16px fields; the emptied dashboard filter and three page failures on the shared states; no optimistic lifecycle actions (each is public-facing or permanent); no Motion, no Kokonut component; dashboard +0.5 KB, public routes +0.0–0.14 KB; real analytics sources recorded for UI-10. UI-10 seller analytics complete ([record](ui-modernization/UI-10-seller-analytics.md)): a daily views-and-enquiries chart adapted from Bklit UI @ 7167844 (Bklit's own chart measured +89 KB gzip, drew untracked days at the top of the plot, overshot below zero, had no keyboard access and blocked touch scrolling), drawn by the server with a client slider, crosshair and readout; untracked days are hatched gaps, never zeros; period figures as plain tiles with changes in words, compared only between fully measured periods; an all-listings overview; the period change dims rather than blanks; chart and table parity checked day by day; no status chart, lead funnel or saves history (each would repeat a count or imply an unmeasured conversion); no Motion, no Kokonut component, no new dependency; performance route +1.99 KB gzip, every other route unchanged; login and 404 scenes identical. UI-11 admin workspace complete ([record](ui-modernization/UI-11-admin-workspace.md)): the review decision and account forms keep focus while saving and refuse a second press (they disabled their fieldsets and buttons, dropping keyboard users at `<body>`), validate on press with errors on their fields instead of a silently disabled submit, and hand focus to the changed status after the refresh (`afterRefresh` / `RestoreFocus`), the account change announced; the two Refresh buttons on the shared `Button` (handwritten 41 → 39, none left in admin); account status and listing history on `StatusBadge` (one added status, SUSPENDED); admin fields on `FormField` / `FormCheckbox` at 16px; empty queue, listings and accounts on `EmptyState`; admin figures stay plain counts (no stored series exists); authorization unchanged and re-proved, including forged API changes; no new dependency, no Motion, no chart; review and account pages +1.1 KB gzip, every other route unchanged; login and 404 scenes identical. UI-12 buyer forms complete ([record](ui-modernization/UI-12-buyer-forms.md)): the enquiry form on the shared fields with errors at each field behind a focused summary, a busy button that keeps focus and refuses a second press (one request, counted), the confirmation focused and announced, and a lost connection kept as a message with everything typed (it threw into the error boundary); without JavaScript it still posts, and phones get it inline (the sheet needs JavaScript, so a phone had none); the profile form on the shared fields with errors at their field, typed changes kept on a failed save (React reset them to the saved profile) and focus on the confirmation; removing a Saved home hands focus to the next and the cards glide with the UI-08 FLIP (focus fell to `<body>` every time), no Motion, nothing removed before the server confirms; a `text` Button variant for ten text actions and the zero-results exits as links (handwritten 39 → 27); `lead-check` and `saved-check` failed locally only because they defaulted to the public app, and now run in CI; `property-check`'s two failures waited for a sentence the product never had; no new dependency, no Motion, Kokonut, Bklit or Anime.js; property +1.4 KB, account +1.5 KB, Saved +1.2 KB gzip, Search −0.7 KB, other routes ≤ 0.4 KB; login and 404 scenes identical. UI-13 search and discovery complete ([record](ui-modernization/UI-13-search-discovery.md)): the locality picker is one accessible combobox at every width (arrows, Enter, Escape, picks and match counts announced, options not tab stops, 16px, long names wrap; the phone sheet was a text box over tabbable buttons marked as options); one `ToggleChip` for Home's More filters and the results rail and sheet (the rail's was 40px and colour-only); removing a filter chip hands focus to the next chip or the result count, Clear all keeps focus, and no filter control is natively disabled; `home-check`'s local failure was a product bug (Clear all disabled itself under focus, sending focus into the dialog behind, where Escape closed neither); Read more is a named disclosure that shows the whole text without JavaScript; the Home launcher falls back to a results link without JavaScript; Sort and filter fields are 16px; no shared Disclosure (fewer than three genuinely alike); handwritten buttons 27 → 19; no new dependency, no Motion, Kokonut, Bklit or Anime.js change; Home +1.6 KB gzip (combobox and a webpack shared-chunk split), Search +1.3 KB, Property +0.2 KB, Login +0.1 KB; login and 404 scenes identical. UI-14 Home visual redesign complete ([record](ui-modernization/UI-14-home-visual-redesign.md)), approved by the owner in two screenshot reviews: a photographic forest hero with the real search inline (Buy/Rent, locality, More filters and Search on a phone's first screen; links to the results without JavaScript), one 1400px frame for header, sections and footer, framed listing cards with the price first and beds and carpet area as chips, three per row beside a forest See-all card with the real total, neighbourhood cards with CSS map tiles, one Browse-your-way band in place of five tile bands, two mint zones, a forest seller band with the real posting steps and a forest footer; final validation fixed rails snapping cards to the screen edge, the hero clipping the desktop locality list, Home cards moving under reduced motion, a "Review" step tripping the honesty guard and the header overflowing at 320px on pages with its menu button; five browser checks moved from the removed launcher to the inline search without loosening them; no Motion, no new Kokonut component, no Anime.js, Bklit untouched, no new dependency; Home JS −0.7 KB gzip and every other route unchanged, shared CSS +2.1 KB and Home HTML +6.9 KB gzip, first-screen images 296 → 83 KB on a phone (the hero photo now a responsive priority image instead of a 244 KB CSS background); outside Home only the header and footer changed (style-diff); login and 404 scenes identical. UI-15 Search Results visual redesign complete ([record](ui-modernization/UI-15-search-visual-redesign.md)), approved in two owner reviews: Search in the 1400px frame with a mint search band (place, heading, count, Buy/Rent as links, locality shortcuts with real counts), a white sticky filter rail with a tinted selected state, a pill Sort and outlined filter chips, a results card in the homepage family (price first, a fact panel with bedrooms and baths in columns, construction line, seller and date) — vertical on phones with a 16:10 photo after the owner found the side-by-side card cut text short — round pill pagination, zero, loading and error states on the same surfaces, the loading skeleton keeping the header, and an outlined Post property below 640px; a pre-existing defect fixed where a filter moving the URL to another path closed the phone filter sheet and dropped focus to the page; no new dependency, no Motion, no new Kokonut component, no Anime.js, Bklit untouched; Search JS +1.4 KB gzip, shared CSS +0.7 KB, Search HTML +6.8 KB gzip (4.3 KB of it the loading shell with its header); validation also restored the UI-04 photo fade on Home and results cards, which the cards' hover zoom had overridden; login and 404 scenes identical. UI-16 Property Details visual redesign complete ([record](ui-modernization/UI-16-property-visual-redesign.md)), approved in one owner review: the property page in the 1400px frame with a mint band, a desktop photo mosaic (thumbnails in the viewer) and an edge-to-edge swipeable phone photo; the summary in the buyer's order, grouped facts and one area panel, a reading-measure description, amenity checklists, an address card with the seller's landmarks, a sticky seller-led contact card and the results card for similar homes; real published listings (`/listing/[id]`) on the same layout and components through typed adapters (their separate contact components retired), showing the seller's address marked unverified and omitting what a real listing does not hold; the gallery on Motion with Kokonut UI's Lightbox Grid technique @ bb9120f8 (adapted, inside the Radix dialog, no bounce, reduced motion still): swipe-follow, directional arrival, the photo growing out of its box into the viewer and back, pull to close; one designed broken-image fallback for gallery, viewer, cards and photo manager, with a CSS guard against the browser's broken icon without JavaScript (media-check had been blocking a renamed file, now 26/26); Anime.js not added, Bklit not applicable; Property JS +33.0 KB gzip (Motion ~28.9 KB), other routes +0.6–1.9 KB (shared-chunk split, card fallback), shared CSS +0.5 KB; login and 404 scenes identical. UI-17 Post Property visual redesign complete ([record](ui-modernization/UI-17-post-property-visual-redesign.md)), approved in one owner review: every posting step in a 1400px workspace (mint band, the step in one white card at reading width, a sticky side column with a rail of the eight real stages, the answers so far and the step's guide), a one-line phone step bar with its track and every step in a native disclosure, titled form sections, radio option cards for small fixed answers, an Indian-format price echo, neighbourhood apart from building with the privacy note beside the address; a redesigned photo manager (a drop zone adapted from Kokonut UI's File Upload @ bb9120f8 around the native input, tiles with position, cover badge, real upload state, failure with `PhotoFallback`, rows on phones) with drag to reorder on Motion's drag and layout (it replaced UI-08's FLIP there; buttons keep focus and rollback; no edge auto-scroll); the review now renders the real buyer page (`PublishedProperty`) marked as a preview, with seller-only notes, the description editor and the confirmation around it; publishing status on the frame with a real-state path; validation fixed the phone bar's hidden track, option cards reading their description as their name and price fields losing "(₹)" from their accessible name; photo-check 49 → 62 with drag, drop, paste, insertion, rollback and reduced-motion coverage; Anime.js not added, Bklit not applicable, no new dependency; photo step +16.5 KB gzip first load and +30.4 KB lazy (Motion's drag and layout), Property +1.6 KB (chunk regrouping), other routes −0.1 to −0.9 KB; login and 404 scenes identical. UI-18 Seller Dashboard visual redesign complete ([record](ui-modernization/UI-18-seller-dashboard-visual-redesign.md)), approved in one owner review: My properties organised around a seller's questions — a real header summary with Enquiries (unread count) and Post a property; Needs your attention (listings sent back, expiring, new enquiries, expired, unsubmitted drafts, each derived from the cards and linked to the action that resolves it, three shown and the rest behind a native disclosure); one URL-driven status navigation with real counts replacing the summary tiles and tabs; operational cards with the cover buyers see and a photo count (two batched owner reads, never per card), status in words beside the date that matters, measured enquiries and views, the reviewer's note and draft progress, one primary action, up to two links and a native <details> More menu (Withdraw keeps its confirmation); status-specific empty states; Buyer interest with 30-day measured figures and the UI-10 Bklit-derived chart at a compact height; the performance page as one panel per period with a segmented control; `loadActivity` split from `loadPerformance` so the dashboard does not load its cards twice; validation fixed a 320px header overflow and the enquiries link's run-together name; Kokonut, Motion and Anime.js evaluated and not used, Bklit's existing chart retained (bklit-ui 7167844, MIT), no new dependency; dashboard +2.6 KB gzip, performance +0.3 KB, other routes unchanged; login and 404 scenes identical. UI-19 Account, Saved and Enquiries visual redesign complete ([record](ui-modernization/UI-19-account-saved-enquiries-visual-redesign.md)), approved in one owner review: the seller inbox as a server-rendered list beside the open enquiry from 1024px (the open enquiry in the URL, `?enquiry=` beside `?listing=`, newest by default; on a phone the list, then the enquiry on its own page with All enquiries), one New / Contacted / Closed language in words and marks, the message first and the property quieter, the lead status as three radio choices on the unchanged action, the unread bar on `countUnreadNotifications` (checked equal across inbox, sidebar and dashboard); Saved on the UI-15 results card for demo and real listings (`ResultCardData`, three batched public reads), unavailable homes kept with their heart, the UI-12 removal unchanged, an empty state with real browse links; Account as an identity band and grouped settings rows with counts from the Activity hub's own helper (`lib/account/counts`), the nested `<main>` removed; validation found card photos going through the shared image optimizer, whose cache would outlive a withdrawn or moderated listing, so the public photo route now resizes on `?w=` after its per-request check (`lib/listings/photo-widths`, a next/image loader), inbox cover 1.4–4.6 KB instead of 30 KB; Kokonut, Motion and Anime.js evaluated and not used, Bklit not applicable, no new dependency; JavaScript +0.0 KB gzip on every route, the inbox 182.5 → 182.1 KB against a UI-18 build (HTML +1.7 KB); login and 404 scenes identical. UI-20 Admin workspace visual redesign complete ([record](ui-modernization/UI-20-admin-workspace-visual-redesign.md)), approved in one owner review: the console as an internal operations room — a forest admin sidebar and role pill, navigation led by the work (Overview, Review queue, Listings, Accounts, System; destinations unchanged); an overview of Needs attention (the queue count from admin_overview with its oldest wait marked Overdue in words, failing system checks named, each with its action, kept even when the figures cannot be read), the next three submissions straight to their reviews, and every status count as a link to its filtered list; queue and listing rows that are one link each, the queue led by place and wait, columns by container width; a review workspace with a case header, no-JS jump links, the buyer page's own components, factual "Before you decide" checks and a separate decision panel where each of the three unchanged actions is described by its consequence (Kokonut UI ai-tool-approval's information design @ bb9120f8, no code copied) and Reject is a danger button; identity-led accounts with a GET search and a consequence line on account changes; validation fixed the overview losing its system summary when the figures failed, decision radios named by their whole consequence, a long unbroken account name widening phones, and a doubled "Status:" label; authorization unchanged and re-proved; no queue photos (no data without N+1 reads); Bklit, Motion and Anime.js evaluated and not used, no new dependency; admin JS −0.5 to −0.9 KB gzip, shared CSS +1.4 KB, public routes' JS unchanged; login and 404 scenes identical. UI-21 map search and location discovery complete ([record](ui-modernization/UI-21-map-search-location-discovery.md), [locality data](data/locality-centres.md)), approved in one owner review: a Map mode on Search beside the unchanged list (List stays the default; `?view=map`, links that work without JavaScript, kept by every filter, canonical-free and noindexed), one marker per locality meaning "this locality has matching homes" — never a property pin, never seller coordinates — with the real count of every match (not the page) from the same filtered set, the lowest price in its accessible name, a preview of the chosen area and its cards outlined, a focused card marking its marker, results left and a sticky map right from 1024px, the map in the results' place on a phone with the preview above the bottom bar, and a server-rendered area index (counts, lowest prices, "Not on the map") as the map's equivalent; locality points from the India Post directory (data.gov.in, GODL-India) and GeoNames (CC BY 4.0), each cross-checked within 2 km of an independent published reference (a test fails on drift), 25 placed and 7 unplaced (Rajarhat moved out by the check; E M Bypass a corridor), OpenStreetMap verification still a pre-launch blocker because OSM was unreachable; MapLibre GL JS 6.12.0 (BSD-3-Clause) served from a versioned vendor path and imported only when the map mounts, OpenFreeMap's public basemap with no availability guarantee and its credit never collapsed, every failure (basemap, WebGL2, code) one notice with the list and index intact; no clustering, no Search this area (no geographic query exists), no Kokonut, Motion, Anime.js or Bklit addition; Search list view +1.3 KB gzip, map view ~295 KB MapLibre + 10.7 KB CSS on demand, no map code or CSS on any other route; anonymous exact-coordinate reads flagged for a privacy review. UI-22 final polish and performance complete ([record](ui-modernization/UI-22-final-polish-performance.md)), Stage A approved in one owner review: every private photo route (owner draft, owner submission, staff review) now resizes on `?w=` after its own access check, like UI-19's public route, every answer `private, no-store` and the shared optimizer never used; gallery, owner view, preview, admin review, dashboard covers and photo-manager tiles load at their shown size (dashboard 497 → 16–22 KB of photos, a real listing 490 → 55–85 KB, admin review 993 → 64 KB at 1440); two double downloads of access-checked photos removed (a `no-store` preload, and next/image re-assigning `src` when `onError` is set — failure now caught by `photoRef` without touching `src`); about 200 dead Phase E Home rules removed with no rendering change measured by style-diff (shared CSS 31.4 → 28.5 KB gzip); My enquiries brought into the account frame with statuses in words, the account profile warning on `ErrorState`, and a 2px focus ring on the locality field; resize CPU measured (≈19 ms at 320px, ≈150 ms at 1440px, repeated per view because nothing may be cached) and recorded as a production watch item; authorization unchanged and re-proved by route tests; no new dependency, JS +0.0–0.4 KB gzip; login and 404 scenes identical; the locality map's OSM check and basemap remain unverified in production. |

Phase 0 (planning) and the GharBazaar rebrand plus light-first conversion
sit outside the numbering; both are complete and are recorded in the git
history. So is the mobile-first homepage redesign that followed Phase 12,
which reworked Phase 2's homepage without starting a new phase; the
sections it deliberately left out are listed below. The budget and EMI
calculators it first listed there are now Phase 40A, inserted without
renumbering at the client's request.

Each phase is specified in `docs/phases/` with the nine sections required
by `CLAUDE.md` before any code is written for it.

---

## Homepage sections waiting on their phase

Larger portals open with sections this homepage does not have yet. Each is
absent because the data or the feature behind it does not exist, and a
placeholder would claim what the platform cannot show. The homepage gains
each one in the phase that makes it real, not before.

| Section on larger portals | Why it is absent today | Phase that makes it real |
|---|---|---|
| New and upcoming projects, with RERA numbers | There is no project entity. Since Phase B, the homepage's "Homes still being built" rail shows real under-construction *listings*, titled as listings, never as projects | 44–47, with RERA claims verified in 65–66 |
| Buying, renting and locality guides | No editorial content exists; the homepage links only to the two calculators, the one guide-like content that is real | 54 (guides), 49 (locality insights) |
| Plots and land | There is no property type for them, so there is no type tile or search | Needs a roadmap decision |
| "Recommended for you" | No recommendation logic; the rails show the newest listings and are titled that way | 39 |
| Demand by locality ("n% of buyers…") | Nothing measures demand yet | 69 measures it, 50 presents it |
| Price trends and locality insights | No price history | 50–51 |
| Offers | No project commercial terms, no paid placement | 47 (builder terms), 61 (featured listings) |
| "Post property FREE" | No seller plan defines what is free | 59 |
| A localities page | The homepage section at `/#localities` stands in, and the header, footer and quick routes point there | 29 (city hub), 30 (locality pages) |
| Short videos | Since Phase D the phone bar's Videos item opens `/videos`, which says plainly that no listing has a video yet (noindex). There is no upload, storage or player | Needs a phase in `Phases.txt`; video would extend `media_asset` (15) |
| Terms of use and privacy policy | The pages do not exist; their links, which returned 404, were removed | Client-supplied text; not yet in `Phases.txt` |

## Navigation destinations waiting on their phase

The marketplace navigation (Phase A, `lib/navigation/marketplace.ts`) and
its discovery hub (Phase C) link only to routes that exist. Larger portals'
menus also offer the entries below. Each one joins the navigation model —
one entry, reaching the header, the phone menu and the desktop "Explore
all" panel together — in the phase that builds its page, and not before.
None is shown as "coming soon": the hub is where people learn what they
can use, and a row they cannot use would be the one false thing in it.

| Destination | Why it is absent today | Phase that makes it real |
|---|---|---|
| Projects | There is no project entity or project page | 44–45 |
| Agents | No agent profiles | 41 |
| Builders | No builder profiles | 43 |
| Insights and price trends | No price history or locality insight pages | 49–51 |
| A localities page | `/#localities` on the homepage stands in, as it does for the homepage section | 29 (city hub), 30 (locality pages) |
| Commercial property | No commercial property type or intent; not in `Phases.txt` | Needs a roadmap decision |
| Residential land and plots | No property type for them (as on the homepage) | Needs a roadmap decision |
| Property comparison | No comparison page or shortlist-to-compare flow | 40 |
| Buying, renting and locality guides | No editorial content; the discovery hub's Resources group is absent until there is | 54 |
| FAQs | No FAQ content | 53 |

## Activity sections waiting on their phase

The phone bar's Activity item (Phase D) opens `/account/activity`, which
links only to what exists: saved homes, your enquiries, and enquiries on
your listings. Each section below joins it — as its own table, never as a
column on an existing one — in the phase that builds it. None is shown as
a placeholder.

| Section | Why it is absent today | Phase that makes it real |
|---|---|---|
| Recently viewed | Nothing records a viewing | 39 |
| Contact and reveal history | Phone reveal is postponed | 10 |
| Saved searches | No saved-search table | 36 |
| Search alerts | No alert delivery | 37 |
| A buyer notification count on the bar | Only sellers have notifications | Needs a buyer-side notification model |

---

## Deferred model register

Entities the product needs, and the phase that introduces each. Recorded so
they are **planned but not built** — and so nobody half-builds one early by
widening an existing table.

| Model | Phase | Trigger |
|---|---|---|
| `enquiry` / `lead` | 9 | A buyer can contact a seller |
| `contact_reveal` | 10 | A phone number can be released |
| `user`, `organisation` | 6 | Anyone can sign in |
| `buyer_profile` | 7 | A signed-in buyer saves contact details and preferences |
| `media_assets` | 15 | Implemented: private owner-scoped upload metadata and storage; migration applied and live owner isolation verified |
| `property_drafts` | 16 | Implemented locally: private drafts, revisioned autosave and resume; deployed with migration verified |
| `property_draft_reviews` | 17 | Private confirmed draft revision/content signature; deployed and verified |
| `property_listings` | 18 | Durable listing identity, owner, current submission, status and version |
| `property_listing_submissions` | 18 | Immutable typed facts/pricing/location/seller snapshot |
| `property_listing_photos` | 18 | Immutable copies referenced by submission |
| `property_listing_events` | 18 | Status transition, date, owner/operator/system actor and rejection reason |
| `listing_stat` | 20 | Implemented as `property_listing_daily_stats` (views per listing per India day) with same-day `property_listing_view_marks` |
| `saved_listings` | 20 | A buyer can save a real listing; sellers see aggregate counts only |
| `staff_members` | 21 | Implemented: who is platform staff, role, grant and revocation; operator-granted only |
| `moderation_actions` | 22 | Implemented: immutable staff decision, reviewed submission, reason, validity, reviewer and version-bound retry identity |
| `report` | 24 | Content can be reported |
| `audit_log` | 27 | Actions must be reconstructable |
| `location` with stable IDs | 28 | Places outlive their slugs |
| `saved_search` | 36 | A search can be stored and re-run |
| `alert`, `alert_delivery` | 37 | A stored search can notify |
| `agent` | 41 | An agent needs a profile beyond a name |
| `builder` | 43 | A builder needs its own page |
| `project`, `tower`, `unit` | 44 | The second property domain |
| `project_configuration` | 46 | A project has unit types |
| `payment_plan` | 47 | A project has commercial terms |
| `review`, `review_response` | 48 | Anyone can rate anything |
| `locality_stat` | 50 | A locality page states a fact about the place |
| `price_point` (time series) | 51 | A trend is shown over time |
| `article`, `author`, `category` | 55 | Content is authored and published |
| `plan`, `quota` | 59 | Sellers have limits |
| `order`, `payment`, `refund` | 60 | Money changes hands |
| `promotion`, `placement` | 61–62 | Position can be bought |
| `invoice` | 63 | Money needs a record |
| `ledger_entry` (append-only) | 64 | Commercial accounting must reconcile |
| `verification_claim`, `evidence` | 65–66 | The platform asserts it checked something |
| `risk_signal`, `risk_score` | 67 | Behaviour is scored |
| `event` (analytics) | 69 | Behaviour is measured |

---

## Architectural audit

What exists today, read against what is coming. The question is not "is it
built" — it is "would building it later be *unnecessarily* hard because of
a decision already made".

### Already well positioned

- **The data seam holds.** Only `lib/property/queries.ts`,
  `lib/property/search.ts` and their tests import a fixture. No route, page
  or component does. The database migration replaces the fixture without
  touching anything above that line.
- **The place tree already has the right levels.** `LocationType` is
  `CITY | ZONE | LOCALITY | SUB_LOCALITY | SOCIETY`, which is exactly the
  hierarchy Phase 28 formalises. Societies already have a home.
- **A saved search is already a value.** `SearchQuery` is a complete,
  serialisable object that round-trips to a URL and back, unit-tested.
  Phase 36 stores that shape in a row; it is not a redesign. Phase 37 then
  re-runs stored rows against new inventory.
- **Facets map to SQL.** Filter predicates are one function per filter in a
  single table, and facet counts are computed by excluding exactly one of
  them. That becomes `WHERE` clauses and a `GROUP BY` per facet without
  changing the semantics — and the same structure is what Phase 73 would
  hand to a search engine.
- **Zero-result recovery already counts alternatives correctly.**
  `suggestLocalities` counts nearby places with every *other* filter still
  applied, which is the behaviour Phase 33 formalises.
- **No unearned trust claims exist to unwind.** V0 ships no verified badge,
  no ratings, no marketplace statistics — deliberately. Phase 65 introduces
  verification as a defined claim rather than retrofitting meaning onto a
  badge that already shipped without any.

### Needs care, and where it lands

**1. `society` is free text.** *(Phases 13, 28, 44.)*

Today a society name is a string repeated on every listing that mentions
it. Phase 13 collects a society during posting and Phase 44 makes projects
a real domain with configurations, towers and a builder.

The risk is the window between them: if Phase 13 lets sellers *type* a
society, we inherit forty spellings of one project, and resolving those
afterwards is entity resolution over dirty data — slow, lossy, never
complete. **Phase 13 should select from the gazetteer, not free-type**,
with free text only as the explicit fallback for a genuinely unlisted
building. Phase 28 gives those places stable IDs, and Phase 44 promotes the
ones that are projects.

**2. `sellerName` is free text.** *(Phase 6.)*

Agents, builders, reviews, subscriptions and payments all attach to a
seller *entity*, not a display string on a listing. This resolves when auth
lands — the point is that a listing should carry `sellerId` from the first
real listing, not from the first agent profile in Phase 41.

**3. Listings have no status history.** *(Phases 18, 27.)*

Moderation, verification and every "why was this rejected" conversation
need who-changed-what-when. History cannot be backfilled: a table added in
Phase 27 knows nothing about what happened in Phase 18. Phase 18 now writes state changes as events, retaining owner identity for owner
actions and operator/system provenance for review and expiry. A trusted service
review can carry an optional reviewer account ID; the admin UI is introduced later.

**4. Contact reveals need an audit trail from day one.** *(Phase 10.)*

Phase 10 lists "audit trail" in its own focus, and Phase 67 scores contact
abuse. Both depend on every reveal being recorded when it happens. There is
no way to reconstruct this later.

**5. Money has no currency or minor units.** *(Phase 60.)*

Integer rupees is right for a listing price and should stay. A *payment* is
a different thing and needs currency and minor units explicitly. Worth
saying now so the two are never conflated.

**6. Amenities are one flat enum.** *(Phases 45, 46.)*

A project has amenities and so does a unit, and they are not the same list
— a swimming pool belongs to the complex, a modular kitchen to the flat.
The enum splits when project pages arrive. Cheap either way; noted so it is
a decision rather than a surprise.

### Deliberate, not an oversight

`localityName` and `cityName` are stored on the listing summary alongside
`localitySlug`. This is a read-model convenience so a card renders without
a join, and the slug remains the real key. It should survive the database
migration — recorded here so it is not "cleaned up" by someone reading it
as a mistake.

### Known cost, already flagged

Each result card renders twice in the DOM — a horizontal list for phones, a
vertical grid from `md` up, one of them `display: none`. Screen readers see
one, so it is not an accessibility defect, but it doubles DOM nodes on a
results page. Phase 71 owns it.

---

## Nothing changes today

None of the audit above requires a code change now. Every item lands in a
phase that is already planned, and doing them early would be exactly the
premature modelling that `CLAUDE.md` forbids — as clearly as it forbids
flattening an entity into a string later.

They are recorded so that when those phases arrive, the work is *introduce
the entity properly*, not *discover the problem*.
