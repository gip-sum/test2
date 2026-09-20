# 99acres Reverse Engineering & New Property Marketplace Specification

**Version:** 1.0
**Date:** 2026-09-20
**Phase:** Research & specification only — no application code, no implementation
**Purpose:** Provide a developer-ready specification for building an **original** real-estate marketplace, informed by study of the publicly observable structure of 99acres.com.

---

## 0. Methodology, Scope and Honest Limitations

**Read this section before trusting any other section.** It defines what could and could not be verified, and it is the reason several requested analyses are marked `UNKNOWN` rather than filled with plausible-sounding invention.

### 0.1 What this document is

A product, UX, information-architecture and technical specification derived from studying a market-leading Indian property marketplace. The goal is **comparable functionality, original implementation**. No 99acres copy, asset, stylesheet, image, wording or proprietary data is reproduced here.

### 0.2 Research environment constraint (critical)

This research was performed inside a sandboxed remote execution environment whose outbound network access is governed by an organisational egress policy. **That policy blocked all direct HTTP access**, verified as follows:

| Attempted channel | Target | Result |
|---|---|---|
| `curl` via HTTPS proxy | `www.99acres.com` | `403` CONNECT denied by egress gateway |
| `curl` via HTTPS proxy | `example.com`, `google.com`, `wikipedia.org`, `builtwith.com` | all denied (`000` / no tunnel) |
| `WebFetch` tool | `www.99acres.com` | `EGRESS_BLOCKED` |
| `WebFetch` tool | `en.wikipedia.org`, `similarweb.com` | `EGRESS_BLOCKED` |
| `WebSearch` tool | any query | **Working** |

The proxy's own diagnostic endpoint recorded the denial explicitly:

```
{ "kind": "connect_rejected",
  "detail": "gateway answered 403 to CONNECT (policy denial or upstream failure)",
  "host": "www.99acres.com:443" }
```

Per the environment's documented policy, egress denials must be reported rather than routed around. No attempt was made to circumvent the policy, and no anti-bot, authentication or rate-limiting control on the target site was probed, tested or bypassed.

### 0.3 Consequences — what could NOT be done

The brief asked for several first-party browser investigations. **None of these were possible**, and nothing in this document pretends otherwise:

| Requested | Status | Why |
|---|---|---|
| Live click-through of every page | ✗ Not done | Site unreachable |
| DevTools Network → Fetch/XHR capture | ✗ Not done | Site unreachable |
| View-source / JS bundle inspection | ✗ Not done | Site unreachable |
| Wappalyzer / BuiltWith / W3Techs readout | ✗ Not done | Those services also unreachable |
| Lighthouse runs, Core Web Vitals measurement | ✗ Not done | Site unreachable; **no measurements are fabricated** |
| Responsive testing at 390/412/768/1024/1280px | ✗ Not done | Site unreachable |
| Visual design audit (fonts, hex colours, shadows, radii) | ✗ Not done | Site unreachable |
| robots.txt / sitemap.xml retrieval | ✗ Not done | Site unreachable |

### 0.4 What WAS possible

A single research channel remained: a web-search tool that returns page titles, canonical URLs, and content summaries drawn from the search index. This turned out to be substantially more productive than expected, because 99acres exposes an enormous, deeply-indexed public surface:

1. **First-party pages surfaced through the index** — their own FAQ corpus (`/faq/*.html`), help articles (`/articles/*.html`), Terms & Conditions, pricing pages, and thousands of SEO landing pages. Their exact titles and URLs are directly observable, and title templates leak product logic (live result counts, dynamic month tokens).
2. **Third-party developer documentation** — commercial scraper products document 99acres URL grammar, field-level data shapes and pagination behaviour in detail.
3. **Corporate disclosure** — Info Edge (India) Ltd is publicly listed; segment results, traffic-share claims and AI investment are disclosed.
4. **App store listings and user reviews** — a feature inventory and a candid usability signal.

### 0.5 Confidence scale used throughout

| Level | Meaning in this document |
|---|---|
| **CONFIRMED** | First-party 99acres text/URL observed through the search index (their own page, title, FAQ, or T&C wording). Highest tier available here. Note: pages were **not** retrieved directly. |
| **STRONG** | Multiple independent secondary sources agree, or first-party corporate disclosure. |
| **MODERATE** | One credible secondary source (e.g. a commercial scraper vendor documenting behaviour they depend on). |
| **LOW** | Inference from general industry patterns; plausible, unverified. |
| **UNKNOWN** | Could not be verified in this environment. Stated as unknown, never guessed. |

### 0.6 Two kinds of content in this document

To keep observation and invention clearly separated:

- **🔍 OBSERVED** — what the research found about 99acres.
- **🧭 DESIGNED** — our original proposals (data model, design system, architecture, roadmap). These are engineering recommendations, not claims about 99acres.

Sections §1–§11 and §16–§19 are primarily OBSERVED. Sections §12–§15 and §20–§25 are primarily DESIGNED. The evidence table in §27 covers only OBSERVED claims.

### 0.7 Legal and ethical posture

Studying a competitor's **publicly visible** product structure, IA, UX patterns and URL grammar is standard competitive analysis. This document deliberately excludes: proprietary schemas, private endpoints, non-public data, copied text/imagery/CSS, and any instruction for evading access controls. Functional ideas (map search, price trends, verified badges) are industry-standard patterns, not protectable expression. **Trade dress must not be copied** — see §14 for why our design system is specified as original.

---

## 1. Executive Summary

### 1.1 What 99acres actually is

99acres is not, structurally, "a property website with a search box." It is three tightly-coupled machines:

1. **A lead-generation marketplace.** The transacting product is not a property — it is a *contact reveal*. A buyer clicking "View Phone Number" triggers OTP verification, and that buyer's identity is delivered to the seller as a billable lead. 99acres' own help content describes seller-side responses split into **"Queries"** (enquiry-form submissions) and **"Viewed Contact"** (phone reveals), with the seller receiving the prospect's name, phone, email, focus area and interest. Sellers pay for visibility and lead volume; buyers pay nothing. Every product decision downstream follows from this. *(CONFIRMED)*

2. **A programmatic SEO engine.** The site generates a combinatorial matrix of landing pages across {intent × property type × city × micro-market × locality × budget band × construction status × page number}, each with a distinct URL, a templated title carrying a live inventory count, and its own crawl path. Observed examples include `/flats-in-kolkata-ffid`, `/flats-in-south-kolkata-ffid`, `/resale-flats-in-kolkata-ffid`, `/flats-in-kolkata-5-lakhs-to-10-lakhs-ffid`, and deep paginated variants such as `…-ffid-page-32`. This is the primary customer-acquisition channel. *(CONFIRMED)*

3. **A content and data moat.** Price trends per locality (`-prffid`), resident reviews and ratings (`-wrffid`), locality profiles, a large FAQ/article corpus, builder profiles, and RERA-compliance landing pages. This content ranks for research-intent queries that listings alone cannot capture, and it is expensive for a new entrant to replicate. *(CONFIRMED)*

### 1.2 Scale context

| Metric | Value | Source tier |
|---|---|---|
| Claimed catalogue size | 4M+ properties (app store listing) | CONFIRMED (first-party marketing) |
| FY26 segment billings | ₹497.1 crore, +10.3% YoY | STRONG (corporate reporting) |
| Q4 FY26 billings | ₹162.8 crore, +1.9% YoY | STRONG |
| Claimed traffic share (Jan–Feb 2026) | 49% web, 53% app, 66% iOS app | STRONG (company claim, relayed) |
| Third-party traffic estimate (Feb 2026) | ~10.71M visits vs MagicBricks 7.48M, NoBroker 5.99M | MODERATE (estimation vendors disagree) |
| Agent database | ~20,000 agents | MODERATE |

Note: third-party traffic estimates vary widely between vendors and should be treated as directional only.

### 1.3 The five findings that should shape our build

1. **The URL taxonomy IS the product architecture.** Nine distinct URL suffix families were identified, each mapping to a page archetype. Our route design must be decided *before* the first component is written, because retrofitting SEO-grade URLs onto an app-shell SPA is extremely expensive. This is the single highest-leverage finding in the document.

2. **Contact reveal is the monetisable event — instrument it from day one.** Build the lead object, OTP gate, seller-side lead inbox and quota accounting in v1, even if nothing is charged yet. Retrofitting billing onto an un-instrumented funnel is a rewrite.

3. **Trust is a *scoped* product feature, not a vague promise.** 99acres' verified badge is explicitly limited by their own Terms to confirming *existence and genuine photos* — expressly **not** ownership, documentation, area or price. Their self-verification flow captures real-time photos on-site via the mobile app. Copy the honesty of that scoping; it is legally protective and user-honest.

4. **Their own users report the failure mode to avoid.** App reviews consistently describe the experience as over-dense, slow and buggy after updates, with filter/sort actions bouncing users out of results. A new entrant's most credible differentiator is not more features — it is a *fast, calm, correct* search that never loses state.

5. **Two pagination systems coexist, deliberately.** Crawlable SEO pages use path-embedded `-page-N`; interactive filtered search uses query parameters with infinite scroll. This dual model reconciles "indexable" with "app-like." We should adopt the same split.

### 1.4 Recommended direction (detail in §21–§25)

Build a **server-rendered, URL-first marketplace** on Next.js (App Router) + TypeScript, backed by a modular monolith in NestJS/TypeScript or Spring Boot, with **PostgreSQL + PostGIS** as the system of record and **OpenSearch/Elasticsearch** as the query engine for faceted, geo and relevance search. Defer microservices, Kafka and Kubernetes until load and team size justify them. Ship a three-city MVP in ~16 weeks focused on: search that works, listings that are trustworthy, and a lead loop that is instrumented end-to-end.

---

## 2. Complete Sitemap

🔍 **OBSERVED.** Reconstructed from indexed URLs. Every pattern below was seen in real indexed URLs or first-party pages. Where a pattern is inferred by extrapolation rather than directly observed, it is marked *(inferred)*.

### 2.1 URL suffix grammar — the core discovery

99acres encodes **page archetype in a URL suffix token**. This is unusual, highly systematic, and the most transferable structural lesson in this research.

| Suffix | Archetype | Observed example | Confidence |
|---|---|---|---|
| `-ffid` | Search / listing landing page | `/flats-in-kolkata-ffid` | CONFIRMED |
| `-ffid-page-N` | Paginated landing page | `/ready-to-move-office-space-for-sale-in-india-3-crores-to-5-crores-ffid-page-32` | CONFIRMED |
| `-spid-<ID>` | Individual property detail | `/3-bhk-bedroom-apartment-flat-for-sale-in-sewri-south-mumbai-2036-sqft-spid-H91004828` | CONFIRMED |
| `-npxid-<ID>` | New-project detail | `/son-aavya-homes-kammasandra-bangalore-south-npxid-r459768` | CONFIRMED |
| `-bid-<ID>` | Builder / developer profile | `builders.99acres.com/dlf-builders-developers-bid-9` | CONFIRMED |
| `-bcffid` | Builder × city projects page | `/my-home-builders-projects-in-hyderabad-bcffid` | CONFIRMED |
| `-prffid` | Price rates & trends | `/property-rates-and-price-trends-in-mumbai-prffid` | CONFIRMED |
| `-wrffid` | Reviews & ratings | `/delhi-reviews-and-ratings-wrffid` | CONFIRMED |
| `-hlpg` | Home-loan tool pages | `/home-loan-emi-calculator-hlpg` | CONFIRMED |
| `-bgid.html` | Editorial article | `/articles/how-to-use-99acres-to-buy-your-dream-home-bgid.html` | CONFIRMED |

**Why this design works:** the suffix is a stable, collision-free namespace token. The human-readable slug in front of it can be regenerated (locality renames, count changes, copy tweaks) while routing stays deterministic — the router only needs the suffix and trailing ID. It also prevents a listing slug from ever colliding with a locality slug.

### 2.2 Full sitemap tree

```
www.99acres.com
│
├── /                                     Homepage
├── /register.html                        Login / Registration
│
├── DISCOVERY — SEARCH LANDING PAGES  (-ffid)
│   ├── /property-in-{city}-ffid                       All property, city
│   ├── /property-for-rent-in-{city}-ffid              Rent, city
│   ├── /flats-in-{city}-ffid                          Flats for sale
│   ├── /flats-in-{north|south|east|west}-{city}-ffid  Micro-market split
│   ├── /flats-for-rent-in-{micro}-{city}-ffid         Rent × micro-market
│   ├── /ready-to-move-flats-apartments-in-{city}-ffid Construction status
│   ├── /resale-flats-in-{city}-ffid                   Resale axis
│   ├── /flats-in-{city}-{X}-lakhs-to-{Y}-lakhs-ffid   Budget band
│   ├── /{n}-bhk-flats-in-{city}-ffid                  BHK axis (inferred)
│   ├── /commercial-property-in-{city}-ffid            Commercial, all
│   ├── /commercial-office-space-in-{city}-ffid        Office sale
│   ├── /ready-to-move-office-space-for-sale-in-{locality}-{city}-ffid
│   ├── /ready-to-move-office-space-for-sale-in-india-{X}-crores-to-{Y}-crores-ffid
│   ├── /rent-furnished-paying-guest-pg-in-{locality}-{city}-ffid   PG
│   ├── /rent-{n}-bhk-paying-guest-pg-in-{city}-ffid                PG × config
│   ├── /residential-plots-land-in-{city}-ffid          Plots (inferred)
│   ├── /new-projects-in-india-ffid                     Projects hub
│   ├── /rera-registered-projects-in-{india|state|city}-ffid        RERA
│   └── /real-estate-agents-in-{state|city}-ffid        Agent directory
│
├── DETAIL PAGES
│   ├── /{descriptive-slug}-{area}-sqft-spid-{ID}       Property detail
│   ├── /{descriptive-slug}-r{N}-spid-{ID}              Variant w/ r-token
│   └── /{project}-{locality}-{city}-npxid-{ID}         Project detail
│
├── DATA / INSIGHT PAGES
│   ├── /property-rates-and-price-trends-prffid                National index
│   ├── /property-rates-and-price-trends-in-{city}-prffid      City rates
│   ├── /real-estate-reviews-and-ratings-wrffid                Reviews hub
│   └── /{city}-reviews-and-ratings-wrffid                     City reviews
│
├── SUPPLY SIDE
│   ├── /post-property                     Post property (sale//generic)
│   ├── /post-property-for-rent            Post property (rent intent)
│   ├── /premium                           Premium listing benefits
│   ├── /do/buyourservices?userClass=A&ownerCommerce=false   Packages
│   └── My99acres (authenticated dashboard)
│       ├── Manage Listings → All Listings
│       │     states: active | deleted | expired | under screening | reported
│       ├── View Responses → Queries | Viewed Contact
│       ├── Owner Services / Dealer Services
│       └── Profile → Modify → contact details
│
├── FINANCE TOOLS  (-hlpg)
│   ├── /home-loan-emi-calculator-hlpg
│   ├── /home-loan-eligibility-calculator-hlpg
│   └── /apply-for-home-loan-hlpg
│
├── CONTENT
│   ├── /articles/{slug}.html  and  /articles/{slug}-bgid.html
│   ├── /articles/locality-profile-real-estate
│   ├── /articles/property-builders
│   ├── /faq/                          FAQ hub
│   ├── /faq/{category}                login-registration | property-listing |
│   │                                  manage-services | enquiry-complaint |
│   │                                  general-questions
│   ├── /faq/{question-slug}.html
│   └── /ask-{question-slug}-{id}.html  Community Q&A
│
├── CORPORATE / UTILITY
│   ├── /info/about-us
│   ├── /info/terms-and-conditions
│   ├── /info/request-info
│   ├── /info/feedback
│   └── /mobile-apps
│
├── builders.99acres.com
│   ├── /                                  Builder hub
│   └── /{builder-slug}-builders-developers-bid-{ID}
│
└── newprojects.99acres.com
    └── /projects/{builder}/{project}/payplan/{hash}.pdf   Project collateral
```

### 2.3 Landing-page combinatorics

The `-ffid` family multiplies across at least these axes, all observed:

| Axis | Observed values |
|---|---|
| Intent | buy / sale, rent, PG, lease |
| Segment | residential, commercial |
| Property type | flats/apartments, office space, shops/showrooms, plots/land, PG, farmhouse, service apartment |
| Geography | country → state → city → zone (north/south/…) → locality |
| Budget band | `5-lakhs-to-10-lakhs`, `3-crores-to-5-crores` |
| Status | ready-to-move, resale, new launch, under construction |
| Furnishing | furnished (seen in PG) |
| Config | 1/2/3/4 BHK |
| Compliance | RERA-registered |
| Actor | agents, builders |
| Page | `-page-N` |

Conservatively this yields **hundreds of thousands of indexable URLs**. The strategic implication for us is in §16.5: this matrix must be *generated and governed*, not hand-authored, and must be gated on inventory thresholds to avoid thin-content penalties.

---

## 3. Feature Inventory

🔍 **OBSERVED.** Grouped by actor. Confidence per row. "—" means the feature is asserted by first-party marketing but its mechanics were not observable.

### 3.1 Demand side (buyer / tenant)

| # | Feature | Evidence | Confidence |
|---|---|---|---|
| D1 | Search by city / locality / project with typeahead | Landing-page corpus; app description | STRONG |
| D2 | Intent tabs: Buy / Rent / PG / Commercial / Plots / Projects | Landing-page families for each; app description | CONFIRMED |
| D3 | Faceted filtering (budget, BHK, type, status, furnishing, amenities, floor, sale type, posted-by) | Their filter descriptions + landing-page axes | CONFIRMED |
| D4 | Sorting (relevance default + price/newest variants) | Filter/sort references; user reviews mention sort bugs | MODERATE |
| D5 | Map search on Google Maps, with civic amenities | First-party article: introduced 2015, on Google Maps | CONFIRMED |
| D6 | Infinite scroll on interactive results | Scraper vendor documentation | MODERATE |
| D7 | Paginated crawlable listing pages | `-ffid-page-32` URL | CONFIRMED |
| D8 | Property detail with photos, video, floor plan/layout drawings, location map | First-party + vendor field lists | STRONG |
| D9 | Shortlist / save properties | App description; FAQ | CONFIRMED |
| D10 | Contact owner / dealer / builder | FAQ contact flow | CONFIRMED |
| D11 | "View Phone Number" reveal gated by OTP | FAQ describes form → OTP → View Owner Details | CONFIRMED |
| D12 | Enquiry form (query) separate from phone reveal | Seller response taxonomy | CONFIRMED |
| D13 | Locality reviews & ratings by residents (environment, lifestyle, connectivity, safety) | `-wrffid` pages + first-party description | CONFIRMED |
| D14 | Price trends / rate-per-sqft, 3-year appreciation by locality | `-prffid` pages with concrete appreciation figures | CONFIRMED |
| D15 | Similar localities recommendation | App description | CONFIRMED |
| D16 | "Real Estate Intelligence" neighbourhood research | App description | CONFIRMED |
| D17 | Verified-listing badge | Verification article + T&C | CONFIRMED |
| D18 | RERA-registered project discovery | `rera-registered-projects-in-*-ffid` | CONFIRMED |
| D19 | New-project microsites (amenities, floor plans, reviews, discussions) | First-party article | CONFIRMED |
| D20 | Builder profiles & builder×city pages | `-bid-`, `-bcffid` | CONFIRMED |
| D21 | Agent/dealer directory by state/city | `real-estate-agents-in-*-ffid` | CONFIRMED |
| D22 | Home-loan EMI & eligibility calculators; loan application from 12+ banks | `-hlpg` pages | CONFIRMED |
| D23 | Editorial articles, locality profiles, FAQ, community Q&A | `/articles`, `/faq`, `/ask-` | CONFIRMED |
| D24 | Saved searches / alerts | Implied by "responses"/alerts language | LOW |
| D25 | AI-assisted search | App claims "backed by AI"; Info Edge AI-lab disclosure | MODERATE |

### 3.2 Supply side (owner / agent / builder)

| # | Feature | Evidence | Confidence |
|---|---|---|---|
| S1 | Post property — 6-step wizard | First-party guide names the steps | CONFIRMED |
| S2 | Actor-typed posting (Owner / Dealer / Builder tab) | "click on the 'Owner' tab and continue" | CONFIRMED |
| S3 | Free listing quota for owners (1–2) | First-party help content (sources differ on 1 vs 2) | STRONG |
| S4 | Photo upload — up to 50 per listing, JPEG/PNG, 10KB–5MB | First-party FAQ | CONFIRMED |
| S5 | Photo content moderation (no phone/email/name/address/watermark/URL; no artistic renders) | First-party FAQ | CONFIRMED |
| S6 | Video support | App description ("genuine photos & videos") | STRONG |
| S7 | Self-verification via mobile app with live on-site photo capture | Verification article | CONFIRMED |
| S8 | My99acres dashboard | First-party article | CONFIRMED |
| S9 | Listing lifecycle states: active, deleted, expired, under screening, reported | First-party FAQ | CONFIRMED |
| S10 | Lead inbox split: Queries vs Viewed Contact | First-party article | CONFIRMED |
| S11 | Lead detail: name, phone, email, focus area, interest, property ID | First-party article | CONFIRMED |
| S12 | Paid packages for owners/agents/builders | `/do/buyourservices`, `/premium` | CONFIRMED |
| S13 | Premium/Platinum listing tiers | `/premium`; package docs | STRONG |
| S14 | Ad products: top-slot visibility, banners, digital marketing, project microsite | Package description | STRONG |
| S15 | Single-account rule (one account per mobile+email) | FAQ | CONFIRMED |
| S16 | Profile auto-reclassification Owner → Dealer/Builder | FAQ question exists by that name | CONFIRMED |
| S17 | Fraud reporting channel + report wrong listing info | FAQ | CONFIRMED |

### 3.3 Notable absences / non-features

- No public API or developer documentation was found. A commercial scraper ecosystem exists precisely because no official data access does. *(STRONG)*
- No evidence of in-platform transaction/escrow — the model ends at lead handoff. *(MODERATE)*
- No evidence of `hreflang` / multi-language surface in indexed URLs. *(LOW — absence of evidence only)*

---

## 4. Page-by-Page Analysis

🔍 **OBSERVED** where cited. ⚠️ Because the live site was unreachable, *visual* specifics (exact section order, spacing, image ratios, animation) are **UNKNOWN**. Where the brief asked for those, this section gives the **🧭 DESIGNED specification for our platform** instead — which is what the next phase actually needs.

### 4.1 Homepage

**URL:** `/` · **Title pattern (observed):** `99acres.com: India Real Estate Property Site - Buy Sell Rent …`

**Purpose.** Route intent, not display inventory. A property homepage has one job: convert an ambiguous visitor into a *typed intent* (buy/rent/PG/commercial) plus a *place*, as fast as possible. Secondary job: absorb navigational/brand search traffic and distribute crawl equity to the landing-page matrix.

**Observed elements**

| Element | Evidence | Confidence |
|---|---|---|
| Intent-tabbed search widget (residential/commercial, Buy/Rent) | "user-friendly search tab … residential and commercial property (Buy/Rent)" | CONFIRMED |
| Hamburger "Menu" at top-right | "click on the three lines with the name of 'Menu' at the top-right corner" | CONFIRMED |
| Menu contains: Post Property, Owner Services, Dealer Services, My99acres, View Responses, username | First-party navigation description | CONFIRMED |
| "City Overview" section — Secunderabad, Pune, Noida, Mumbai, Hyderabad, Gurgaon, Delhi, Chennai | First-party | CONFIRMED |
| Post Property entry point in primary nav | Multiple | CONFIRMED |

**UNKNOWN:** hero imagery, exact section ordering, presence/position of recommended-properties rails, personalisation, article rails, footer link-group composition.

**🧭 DESIGNED — our homepage IA** (12 blocks, in order):

| # | Block | Why it exists | User action | On click | Dynamic? | Personalised? |
|---|---|---|---|---|---|---|
| 1 | Header: logo (left), intent nav, Post Property (accent CTA), account | Persistent orientation + supply CTA | Navigate / auth | Route change | No | Auth state only |
| 2 | Intent tabs: Buy / Rent / PG / Commercial / Plots / Projects | Declares taxonomy; sets search scope | Select tab | Swaps search config + placeholder | No | Last-used tab |
| 3 | Hero search: location typeahead (multi-select) + type + budget | The primary conversion | Type/select → Search | `POST`-less route to `/{intent}-in-{city}` | Yes (suggest API) | Recent searches |
| 4 | Quick chips: popular localities in detected/last city | Removes typing for the 80% case | Tap chip | Direct to landing page | Yes | Yes (geo/history) |
| 5 | Continue your search | Highest-intent re-entry point | Tap | Restores saved filter state | Yes | Yes (logged-in) |
| 6 | Recommended properties rail | Inventory taste-test; proves catalogue depth | Scroll / tap card | PDP | Yes | Yes (falls back to popular) |
| 7 | Browse by budget / by BHK tiles | Converts vague intent into a filtered URL; internal-link equity | Tap | Landing page | No | No |
| 8 | New projects / builder spotlight | Monetised placement; different buyer psychology | Tap | Project detail | Yes | No (paid slot) |
| 9 | Explore localities: price trend + rating cards | Research intent capture; data moat display | Tap | Locality page | Yes | Partly |
| 10 | Owner CTA band: "Post your property free" | Supply acquisition — the scarce side | Tap | Post flow | No | Hidden for active sellers |
| 11 | Insights/articles rail | Long-tail SEO + trust | Tap | Article | Yes | No |
| 12 | SEO footer: link groups by city × intent × type, corporate, legal, apps | Crawl distribution + trust | Tap | Landing pages | Semi-static | No |

**Desktop layout:** 1200–1280px container; header 64–72px; hero search as one horizontal bar (location flex-grows, type/budget fixed, submit button); rails as 4-up horizontal scrollers; footer as 4–5 columns.

**Mobile layout:** sticky compact header (logo + account); intent tabs become a scrollable pill row; hero search collapses to a single tap-target that opens a **full-screen search sheet** (critical — do not attempt inline multi-field entry on mobile); rails become 1.15-card-wide horizontal snap scrollers (the 0.15 peek is what signals scrollability); footer collapses to accordions; bottom nav bar (§14.9).

**States:** skeleton cards for rails (never spinners — layout must be reserved to protect CLS); personalised rails fall back to popular content when cold; failed rail hides itself rather than showing an error (a homepage must never look broken).

### 4.2 Search results / landing page

**URL:** `/{descriptor}-in-{place}-ffid[-page-N]` (SEO) · filtered/interactive state via query params.

**Observed title template:** `Flats in Kolkata - 23934+ Apartments / Flats for Sale in Kolkata`, `Property for rent in Kolkata - 12411+ Rent Property in Kolkata`, `Delhi Reviews by Users - 1538+ Localities and Societies`.
→ **The `N+` live count is injected into the `<title>`.** This is a deliberate SEO CTR device and requires a fast count service. *(CONFIRMED)*

**Observed description content:** landing pages carry curated sub-inventory counts, e.g. Kolkata flats page citing "11400+ Owner Properties, 300+ Projects, 21760+ Ready to Move, 2660+ Furnished, 6100+ Affordable, 2430+ Luxury". These are *pre-computed facet counts rendered as marketing copy* and as internal links. *(CONFIRMED)*

**Observed query parameters** (from a real search URL documented by a scraper vendor):

```
?city=264&preference=S&area_unit=1&budget_min=0&res_com=R&isPreLeased=N&page=2
```

| Param | Meaning | Confidence |
|---|---|---|
| `city` | Numeric city ID (e.g. `264`) — **not** a slug | CONFIRMED |
| `preference` | Intent; `S` = sale (`R` rent inferred) | STRONG |
| `res_com` | `R` residential / `C` commercial | CONFIRMED |
| `budget_min` (and `budget_max`) | Price bounds | CONFIRMED |
| `area_unit` | Unit for area values (sqft/sqm/…) | CONFIRMED |
| `isPreLeased` | Commercial pre-leased flag | CONFIRMED |
| `bedroom_num` | BHK | MODERATE |
| `page` | Page index | CONFIRMED |

**The critical structural insight:** locations are **numeric IDs**, not slugs. A canonical place gazetteer with stable integer IDs sits underneath everything, and the pretty slug is a *presentation* of it. Our design must do the same (§12.3).

**Sections:** breadcrumb → H1 with count → filter bar/rail → sort → applied-filter chips → result cards → pagination or infinite scroll → SEO content block → internal-link clusters (nearby localities, related budgets, related types) → FAQ block.

**Behaviours:** infinite scroll on the interactive surface, XHR-driven *(MODERATE)*; crawlable `-page-N` variants for indexation *(CONFIRMED)*.

**⚠️ Known failure mode to avoid:** their own users report that changing a filter or sort can throw them back to the home screen with "something went wrong." Our acceptance criteria must include: *filter and sort changes never lose scroll position, never lose filter state, and never navigate away on error.*

**Empty state (🧭 DESIGNED):** never a dead end. Show (a) which filter is most responsible for zero results, with one-tap removal; (b) nearest-radius expansion ("12 within 5 km"); (c) similar localities; (d) create-alert CTA. **Error state:** keep filter chips rendered and retry inline. **Loading:** skeleton cards matching final card height exactly.

### 4.3 Property detail page (PDP) — summary here, full architecture in §7

**URL:** `/{intent-and-config}-in-{locality}-{city}-{area}-sqft[-r{N}]-spid-{ID}`
Real examples *(CONFIRMED)*:
- `/3-bhk-bedroom-apartment-flat-for-sale-in-sewri-south-mumbai-2036-sqft-spid-H91004828`
- `/1-bhk-bedroom-apartment-flat-for-rent-in-eden-park-at-the-prestige-city-sarjapur-bangalore-east-666-sqft-spid-Q92187302`
- `/studio-apartment-flat-for-sale-in-piccadilly-3-goregaon-east-mumbai-andheri-dahisar-344-sqft-r1-spid-O88250018`
- `/paying-guest-pg-for-rent-in-sector-48-gurgaon-r15-spid-H53103684`

**Slug anatomy:** `{config}-{type}-for-{intent}-in-[{society}-]{locality}-{city}[-{zone}]-{area}-sqft-[r{N}-]spid-{ID}`. The slug front-loads every high-value query term (config, type, intent, society, locality, city, area). The `spid` ID carries a **letter prefix** (H, O, Q observed) — plausibly a shard/source/type discriminator, **UNKNOWN**. The `-r{N}-` token is **UNKNOWN** (candidates: locality/region id, revision, or ranking variant).

### 4.4 Project detail page

**URL:** `/{project}-{locality}-{city}-npxid-{ID}` (e.g. `…-npxid-r459768`; note `r` prefix on the ID here too).
**Observed title template:** `{Project} {Locality}, {City} | Price List & Brochure, Floor Plan, Location Map & Reviews` — the title enumerates the page's own section anchors, a neat SEO/IA alignment. *(CONFIRMED)*
**Observed content:** project amenities, floor plans, reviews/discussions on project and locality, status labels ("New Launch"), price-list/payment-plan PDFs served from `newprojects.99acres.com`. *(CONFIRMED)*

### 4.5 Builder page

**URL:** `builders.99acres.com/{builder-slug}-builders-developers-bid-{ID}`. DLF is `bid-9` — a **low sequential integer**, indicating an early-seeded, monotonic builder table. Companion `-bcffid` pages slice builder × city. *(CONFIRMED)*

### 4.6 Locality price-trends page

**URL:** `/property-rates-and-price-trends-in-{city}-prffid`, hub at `/property-rates-and-price-trends-prffid`.
**Observed title carries a live month token:** `Property Rates in Mumbai Sep-2026 …` — matching the current month at research time. **Monthly-recomputed, programmatically-titled pages.** *(CONFIRMED)*
**Observed content:** rate per sqft, 3-year appreciation leaderboards per locality (e.g. Mumbai: Naigaon 402.0%, Santacruz West 64.4%, Gamdevi 63.9%; Bangalore: Anjanapura 6th Block 205.5%, Kundalahalli 151.1%; Hyderabad: Turkapally 168.4%), by property type (flats, builder floors, residential plots). *(CONFIRMED)*
**Product lesson:** a *ranked leaderboard* is the unit of engagement, not a raw table. It is quotable, linkable, and generates press coverage.

### 4.7 Reviews & ratings page

**URL:** `/{city}-reviews-and-ratings-wrffid`, hub `/real-estate-reviews-and-ratings-wrffid`.
**Observed title:** `Delhi Reviews by Users - 1538+ Localities and Societies` — again count-in-title. Coverage counts observed: Delhi 1538+, Chennai 1073+, Pune 808+, Mumbai 575+, Coimbatore 91+. Review dimensions: **environment, lifestyle, connectivity, safety**. Reviewers are current/past residents. *(CONFIRMED)*

### 4.8 Agent directory

**URL:** `/real-estate-agents-in-{state|city}-ffid`. Agents are also a *filter* on search ("Posted by: Owner/Builder/Dealer"). ~20,000 agents claimed. *(CONFIRMED / MODERATE)*

### 4.9 Post Property

**URL:** `/post-property`, `/post-property-for-rent`. Detailed in §8.

### 4.10 Authentication

**URL:** `/register.html`. Register in 3 steps via email or mobile, as owner/dealer/builder. One account per mobile+email. OTP verification at registration and at listing time. Account deletion/reactivation requires contacting support (no self-serve delete). *(CONFIRMED)*

### 4.11 Finance tools

`/home-loan-emi-calculator-hlpg`, `/home-loan-eligibility-calculator-hlpg`, `/apply-for-home-loan-hlpg` — calculators plus loan application against 12+ banks. Classic high-intent capture: an EMI calculator is a *qualification* instrument disguised as a utility. *(CONFIRMED)*

### 4.12 Content corpus

`/articles/*.html` (some `-bgid.html`), `/articles/locality-profile-real-estate`, `/articles/property-builders`, `/faq/` with categories (login-registration, property-listing, manage-services, enquiry-complaint, general-questions), `/ask-{slug}-{id}.html` community Q&A, `/info/{about-us,terms-and-conditions,request-info,feedback}`, `/mobile-apps`. *(CONFIRMED)*

---

## 5. Homepage Reverse Engineering — UX Rationale

🧭 **DESIGNED**, informed by 🔍 observation. Per the brief: patterns, not copy. No 99acres text or asset is reproduced.

### 5.1 The governing insight

A property homepage is a **router**, not a storefront. Visitors arrive in one of four states: (1) know exactly where and what — needs a fast search; (2) know the city, not the locality — needs geographic browse; (3) researching, not transacting — needs price trends and reviews; (4) wants to *sell/rent out* — needs Post Property. A homepage that serves all four without one drowning the others is the design problem. 99acres solves it by giving each a dedicated band: search widget, city overview, data pages, and a persistent Post Property CTA.

### 5.2 Section-by-section rationale

**Header / logo / nav.** Logo left is not aesthetic convention — it is the "escape hatch" affordance; users expect home from it, and breaking that costs measurable task failure. Post Property gets accent treatment because supply is the scarce side of a two-sided market; every marketplace over-weights the scarce side in its nav. *(Pattern; our design.)*

**Intent tabs.** Buy and Rent are not filter values — they are different *products* with different economics, urgency and decision horizons. Encoding them as tabs (a) sets the search schema (rent needs furnishing/availability; buy needs construction status/possession), (b) yields distinct URL namespaces for SEO, (c) lets us measure funnels separately. A single search box with a buried buy/rent dropdown is the classic mistake.

**Hero search.** Must support **multi-locality selection** — real users search "Salt Lake OR New Town OR Rajarhat," not one locality. Requires server-backed typeahead over a gazetteer with entity types (city / locality / society / project / landmark), because users type all five interchangeably. Recent searches must persist; property search is a multi-session activity over weeks.

**Quick chips.** Lets a user skip typing entirely. Also doubles as an internal-link surface for crawlers.

**Recommended rail.** Two jobs: prove catalogue depth and give a taste of card quality. Must degrade to popular/nearby when the personalisation signal is cold — an empty personalised rail on a first visit is worse than no rail.

**Browse-by-budget / BHK tiles.** These convert vague intent into a *specific filtered URL*, which is both a UX win and the primary internal-linking mechanism into the landing-page matrix.

**Projects/builder spotlight.** New-construction buyers behave differently (longer horizon, brand-led, payment plans). It is also the highest-yield advertising inventory — builders have the largest marketing budgets.

**Locality explorer.** Price trend + rating cards capture research intent and showcase the data moat. Strategically, this content ranks for queries listings can never win.

**Owner CTA band.** Supply acquisition. Should be suppressed for users with active listings — showing "post your property" to someone with three live listings is a personalisation failure users notice.

**SEO footer.** Not decoration. It is a crawl-distribution device, pushing PageRank into city × intent × type landing pages. Should be templated from the same matrix that generates those pages.

### 5.3 Dynamism & personalisation classification (🧭 our plan)

| Section | Dynamic | Personalised | Cache strategy |
|---|---|---|---|
| Header/nav/footer | No | Auth state | Edge, long TTL |
| Intent tabs | No | Last-used (client) | Static |
| Search typeahead | Yes | Recent (client) | API, short TTL |
| Quick chips | Yes | Geo/history | Edge by city, 1h |
| Continue search | Yes | Yes | Client/user, no cache |
| Recommended rail | Yes | Yes (fallback popular) | Per-user; popular variant cached 15m |
| Budget/BHK tiles | No | No | Static |
| Projects spotlight | Yes | No (paid) | Edge by city, 5m |
| Locality explorer | Yes | Partly | Edge by city, 1h |
| Articles | Yes | No | Edge, 1h |

**Rendering rule:** the homepage must be server-rendered with personalised slots hydrated *after* first paint. Personalisation must never block LCP.

---

## 6. Search Experience

### 6.1 What was observed 🔍

| Aspect | Finding | Confidence |
|---|---|---|
| URL state | Query parameters carry filter state: `city`, `preference`, `res_com`, `budget_min`, `area_unit`, `isPreLeased`, `page` | CONFIRMED |
| Location encoding | Numeric IDs (`city=264`) | CONFIRMED |
| SEO surface | Separate human-readable `-ffid` URLs per common filter combination | CONFIRMED |
| Pagination (SEO) | Path-embedded `-page-N` | CONFIRMED |
| Pagination (interactive) | `&page=N` + infinite scroll fed by XHR | MODERATE |
| Filters present | budget, BHK/config, property type, location, construction status, furnishing, amenities, floor number, sale type, posted-by, RERA, area | CONFIRMED |
| Result counts | Live counts surfaced in titles and facet copy | CONFIRMED |
| Map | Google Maps based, with civic amenities | CONFIRMED |
| Reliability | User reports of filter/sort causing navigation loss and errors | MODERATE |
| Budget param behaviour | A scraper vendor notes server-side budget params "behave inconsistently" | MODERATE |

**⚠️ Not observed:** request/response payload shapes, endpoint paths, suggestion API behaviour, debounce timings, chip interaction details, map bounding-box request format. The brief asked for these; they required DevTools. **UNKNOWN.**

### 6.2 Interpretation: the dual-surface model

The key architectural inference *(STRONG)*: 99acres runs **one query engine behind two presentation surfaces**.

```
                    ┌──────────────────────────────┐
                    │      QUERY ENGINE            │
                    │  facets · geo · relevance    │
                    └───────┬──────────────┬───────┘
          canonical filter  │              │  canonical filter
          set (pretty URL)  │              │  set (query params)
                    ┌───────▼──────┐  ┌────▼─────────────┐
                    │ SEO SURFACE  │  │ APP SURFACE      │
                    │ /…-ffid      │  │ ?city=…&page=…   │
                    │ SSR, crawl-  │  │ XHR, infinite    │
                    │ able, -page-N│  │ scroll, stateful │
                    └──────────────┘  └──────────────────┘
```

Both surfaces must resolve to the **same normalised filter object**. This is the design our platform should copy outright (§6.4).

### 6.3 Filter taxonomy (🧭 DESIGNED — complete spec for our build)

Filters are not a flat list; they are **conditional on intent × segment**. This table is the authoritative spec for the next phase.

| Filter | Control | Buy-Res | Rent-Res | PG | Commercial | Plots | URL key |
|---|---|---|---|---|---|---|---|
| Location (multi) | Typeahead chips | ✓ | ✓ | ✓ | ✓ | ✓ | `loc` (ids, csv) |
| Intent | Tab | ✓ | ✓ | ✓ | ✓ | ✓ | path |
| Property type (multi) | Chip group | ✓ | ✓ | — | ✓ | ✓ | `ptype` |
| Budget | Dual slider + inputs | ✓ | ✓ | ✓ | ✓ | ✓ | `pmin`,`pmax` |
| BHK / config | Chip group | ✓ | ✓ | sharing type | — | — | `bhk` |
| Area | Range + unit | ✓ | ✓ | — | ✓ | ✓ | `amin`,`amax`,`aunit` |
| Area basis | Segmented | ✓ | ✓ | — | ✓ | — | `abasis` (carpet/builtup/super) |
| Construction status | Chips | ✓ | — | — | ✓ | — | `status` |
| Possession by | Select | ✓ | — | — | ✓ | — | `poss` |
| Age of property | Select | ✓ | ✓ | — | ✓ | — | `age` |
| Furnishing | Chips | ✓ | ✓ | ✓ | ✓ | — | `furn` |
| Amenities (multi) | Checkbox + search | ✓ | ✓ | ✓ | ✓ | ✓ | `amen` |
| Parking | Chips | ✓ | ✓ | — | ✓ | — | `park` |
| Floor | Range + "not ground/top" | ✓ | ✓ | — | ✓ | — | `fmin`,`fmax` |
| Facing | Chips | ✓ | ✓ | — | — | ✓ | `face` |
| Bathrooms | Stepper | ✓ | ✓ | — | — | — | `bath` |
| Posted by | Chips (Owner/Agent/Builder) | ✓ | ✓ | ✓ | ✓ | ✓ | `by` |
| Verified only | Toggle | ✓ | ✓ | ✓ | ✓ | ✓ | `ver` |
| With photos/video | Toggle | ✓ | ✓ | ✓ | ✓ | ✓ | `media` |
| RERA registered | Toggle | ✓ | — | — | ✓ | ✓ | `rera` |
| Availability from | Date | — | ✓ | ✓ | — | — | `avail` |
| Tenant preference | Chips | — | ✓ | — | — | — | `tenant` |
| Gender | Chips | — | — | ✓ | — | — | `gender` |
| Meals included | Toggle | — | — | ✓ | — | — | `meals` |
| Pre-leased | Toggle | — | — | — | ✓ | — | `preleased` |
| Plot dimensions | Range | — | — | — | — | ✓ | `plotw`,`plotl` |
| Boundary wall | Toggle | — | — | — | — | ✓ | `bwall` |
| Posted since | Select | ✓ | ✓ | ✓ | ✓ | ✓ | `since` |
| Sort | Select | ✓ | ✓ | ✓ | ✓ | ✓ | `sort` |

**Sort options:** Relevance (default), Price ↑, Price ↓, Newest, Area ↑/↓, Price-per-unit-area, Most popular. Relevance is proprietary ranking (§13.5); everything else is deterministic — important, because users distrust "relevance" if it visibly disagrees with an explicit sort.

### 6.4 Filter interaction rules (🧭 DESIGNED)

These are the rules the next phase must implement. They are where most marketplaces get it wrong.

1. **Intent switch preserves geography, resets economics.** Buy → Rent keeps localities, clears budget (a ₹80L buy budget is nonsense as rent), swaps conditional filters. Tell the user what was cleared — silent resets feel like bugs.
2. **Segment switch (Res ↔ Com) resets the type-dependent set** — BHK is meaningless for a warehouse.
3. **Facet counts are computed excluding the facet's own selection** (standard faceted-search semantics). Within "Property type", counts for *other* types must reflect all filters *except* property type. Getting this wrong makes multi-select appear broken.
4. **Zero-result options are shown, disabled, with count 0** — never hidden. Hiding options makes users think the filter is broken.
5. **Every filter change updates the URL** via `replaceState` for within-page refinement and `pushState` for a genuine navigation, so Back is predictable.
6. **Filter changes never reset scroll or lose loaded results** on desktop; on mobile, a filter *sheet* applies on explicit "Apply" with a live count on the button ("Show 248 properties") so users can tune before committing.
7. **Applied-filter chips** appear above results, individually removable, plus "Clear all". Chips must read in human language ("₹40L–₹60L", "2, 3 BHK"), not parameter values.
8. **Budget/area sliders must be non-linear** — a linear ₹0–₹10cr slider makes the ₹40–60L range (where most volume is) untouchable. Use a piecewise scale with denser resolution at low end, plus exact numeric inputs.
9. **Debounce typeahead at ~250ms; cancel in-flight requests** on new keystrokes. Race-condition-driven flickering suggestions are a common, avoidable defect.
10. **The result count must be authoritative and fast** — it appears in the H1, the page title, the Apply button and the chips. Budget one dedicated count query, cached.

### 6.5 Map ↔ list switching (🧭 DESIGNED)

- Desktop ≥1024px: split view (list left ~40%, map right ~60%), or list-only toggle. Hovering a card highlights its marker; clicking a marker opens a mini-card.
- Below 1024px: exclusive toggle — map *or* list, never split. A split map on a phone is unusable.
- Map queries by **bounding box + zoom**, not by locality, once the user pans. "Search as I move the map" must be a toggle, default ON with a visible "Redo search here" fallback.
- Cluster markers server-side above a density threshold (geohash-grid or similar aggregation); client-side clustering of 10k markers will jank.
- Preserve map viewport in the URL (`?bbox=` or `?lat,lng,z`) so map states are shareable.
- **Privacy:** for owner-posted residential listings, show an approximate circle rather than an exact pin until contact — standard practice and a genuine safety consideration.

### 6.6 Search input, suggestions, recent searches (🧭 DESIGNED)

Typeahead must be **entity-typed**, returning grouped results: City, Locality, Society/Project, Builder, Landmark, Property ID. Each suggestion carries `{type, id, label, parentPath, resultCount}`. Showing the count next to each suggestion ("New Town, Kolkata · 1,240 properties") materially improves selection quality. Selecting a suggestion adds a **chip**; multiple chips = OR semantics within the location dimension, AND across dimensions. Recent searches persist client-side and, when logged in, server-side.

---

## 7. Property Card & Property Detail Architecture

### 7.1 Property card 🧭 DESIGNED (observed inputs noted)

**Observed field inventory** — from vendor documentation of extractable fields *(MODERATE, consistent across vendors)*: price, BHK, bathrooms, carpet area, super area, area unit, locality, city, furnishing status, property type, RERA ID, latitude/longitude, amenities, images, posted-by/dealer identity, developer metadata, verification status, posted date. 50+ fields per listing is the commonly cited figure.

**🧭 Card specification:**

| Zone | Content | Notes |
|---|---|---|
| Media | 4:3 image, carousel, counter "1/12", video/floor-plan badge | 4:3 shows interiors better than 16:9; fixed ratio via `aspect-ratio` to protect CLS |
| Badges (on media) | Verified · Featured · New · RERA | Max 2 visible; overflow suppressed |
| Save | Heart, top-right of media | Optimistic toggle; unauth → auth sheet, action replayed after login |
| Price | ₹ in Indian format (L/Cr), then per-unit-area | Largest type on the card |
| Config | "3 BHK · 3 Baths · 2036 sqft (carpet)" | Area basis must be explicit — the single most misleading field in Indian real estate |
| Title | Project/society + property type | Truncate at 2 lines |
| Location | Locality, City | |
| Attributes | Status · furnishing · floor | Max 3, ellipsised |
| Seller | "Owner" / "Agent · Name" / "Builder" + verified tick | Posted-by is a top-3 filter; surface it |
| Freshness | "Posted 3 days ago" | Recency is a strong quality proxy |
| Actions | Primary "Contact" · secondary "View Number" · tertiary save/share | One primary only |

**CTA hierarchy:** exactly one filled primary button per card. Two competing filled buttons measurably reduce clicks on both.

**Responsive:** ≥1280px 3-up grid (or 2-up beside map); 1024–1279 2-up; 768–1023 2-up narrow; <768 1-up **horizontal card** (image left ~40%, content right) for scan density, switching to vertical full-bleed only in map mini-card context. Carousel: swipe on touch, hover-arrows on desktop, lazy-load beyond the first image, never autoplay.

**States:** skeleton matching exact final height; unavailable → greyed with "No longer available" + "See similar"; image failure → branded placeholder, never a broken-image icon.

### 7.2 PDP architecture

**Observed content** *(STRONG)*: photo gallery, videos, floor plans / layout drawings, location map, carpet area, configuration, floor number, amenities, neighbourhood/civic amenities, seller contact, price. Plus contextual blocks: similar properties, locality information, price trends, reviews.

**🧭 DESIGNED section order** (mobile order; desktop uses a two-column split with a sticky right rail):

1. Breadcrumb — `Home › Kolkata › New Town › 3 BHK for Sale › {Project}`
2. Gallery — photos / video / floor plan / map as tabs; counter; fullscreen lightbox
3. Header — price, per-unit-area, config, area (with basis), address, badges, save/share
4. **Sticky contact module** — desktop: sticky right rail; mobile: sticky bottom bar. Never let the user scroll to a state with no contact affordance.
5. Key details grid — type, status, possession, floor/total, facing, age, furnishing, bathrooms, balconies, ownership, parking, availability
6. Description — seller-written, sanitised (strip phone/email/URLs; see §17.4)
7. Amenities — grouped (Society / Flat / Safety / Recreation), icons, expandable
8. Floor plan & pricing (for projects) — configuration table with per-config price
9. Location — map, nearby landmarks by category (schools, hospitals, transit, malls) with distances; commute-time widget
10. Locality insight — rating summary, price trend sparkline, links to `-prffid` and `-wrffid` equivalents
11. Seller card — name, type, verification, member-since, active listing count, response indicator
12. Similar properties — same locality/budget/config
13. Recommended localities — lateral discovery
14. FAQ — templated, structured-data eligible
15. SEO content + related links — cluster links back into the landing matrix
16. Legal disclaimer — verification scope, RERA disclosure

**Phone-reveal behaviour** *(CONFIRMED pattern)*: click "View Phone Number" → contact form → **OTP to mobile** → "View Owner Details" → number displayed in a modal → **the prospect's details are simultaneously delivered to the seller as a lead**. This is the monetisation event. Our implementation must: create the `Inquiry` record *before* revealing, dedupe repeat reveals of the same listing by the same user (do not double-charge), rate-limit reveals per user per day, and respect seller quota.

**🧭 Likely data model behind the PDP** — see §12. The PDP requires a **single aggregate read** (listing + media + amenities + seller + location) plus **async side-loads** (similar, trends, reviews, nearby). Do not block first paint on any recommendation service.

---

## 8. Post-Property Architecture

### 8.1 Observed flow 🔍 (CONFIRMED)

First-party help content describes a **6-step Property Posting Form**, naming: **Basic Details | Location Details | Property Profile | Photos | Pricing and Others**. Posting begins with an actor selection (Owner tab / Dealer / Builder).

| Constraint | Value | Confidence |
|---|---|---|
| Photos per listing | up to 50 | CONFIRMED |
| Formats | JPEG, PNG | CONFIRMED |
| File size | 10 KB – 5 MB | CONFIRMED |
| Rejected photo content | contact numbers, email IDs, company names, owner names, property addresses, watermarks, website addresses, artistic/imaginary images | CONFIRMED |
| Free listings (owner) | 1–2 | STRONG |
| Phone verification | OTP required at posting | CONFIRMED |
| Post-submit state | "under screening" before going live | CONFIRMED |
| Lifecycle states | active, deleted, expired, under screening, reported | CONFIRMED |

**No listing was submitted and no irreversible action was taken** — consistent with the brief. (It was in any case impossible: the site was unreachable.)

### 8.2 🧭 DESIGNED posting flow for our platform

```
[0] Actor select ── Owner │ Agent │ Builder
        │                     └── requires verified business profile
        ▼
[1] BASICS        intent(Sell/Rent/PG) · segment(Res/Com) · property type
        ▼         ── determines every subsequent field set
[2] LOCATION      city* → locality* → society/project (typeahead, may create)
        │         address (private) · map pin (draggable) · landmark
        ▼         ── validate pin inside locality polygon; warn on mismatch
[3] PROFILE       config · areas (carpet*/builtup/super + unit) · floors ·
        │         bathrooms · balconies · furnishing · age · facing ·
        │         amenities · parking · availability
        ▼
[4] MEDIA         photos (≥1 required, ≤50) · video · floor plan
        │         client-side compress → presigned direct-to-object-store upload
        ▼         → async: EXIF strip, thumbnails, AI moderation
[5] PRICING       price* · negotiable · maintenance · booking/deposit ·
        │         price-on-request · tax/charges · (rent) lock-in, tenant pref
        ▼
[6] DESCRIPTION   free text (sanitised: strip phone/email/URL) · unique features
        ▼
[7] CONTACT       auto from profile · OTP verify · masked-number preference ·
        │         contact-hours preference
        ▼
[8] PREVIEW       renders the exact public PDP · completeness score ·
        │         "boost your listing" prompts for missing high-impact fields
        ▼
[9] PUBLISH ──► UNDER_SCREENING ──► ACTIVE ──► EXPIRING ──► EXPIRED
        │            │  (auto+manual moderation)      │
        │            └──► REJECTED (reason + fix CTA) └──► RENEW
        ▼
[10] UPSELL       free vs Premium vs Featured · verification booking
```

**Critical implementation requirements:**

- **Draft persistence from step 1.** Create the draft server-side on first field blur. A multi-step form that loses data on refresh is the top abandonment cause. Autosave per step; resumable from dashboard and email.
- **Progressive field disclosure.** Field sets are driven by `(intent, segment, propertyType)` — a config-driven schema, not hardcoded forms. Build this as a **declarative field registry** from day one; hardcoded branching becomes unmaintainable at ~6 property types.
- **Required vs optional.** Required: intent, segment, type, city, locality, carpet area + unit, price (or price-on-request), ≥1 photo, verified phone. Everything else optional but scored.
- **Completeness score.** Show a live score with the marginal value of each missing field ("Add floor plan → +18% more views"). This is the cheapest lever on listing quality.
- **Verification as a separate, optional flow** — guided live-photo capture on mobile, geo-stamped, matched against the listing pin. Scope it honestly (§17.2).
- **Moderation pipeline:** automated checks (duplicate detection via perceptual image hash + text similarity, contact-info detection in text and OCR on images, price sanity vs locality distribution, banned content) → auto-approve high-confidence, queue the rest for human review. Communicate rejection reasons specifically; "rejected" with no reason generates support load and churn.

---

## 9. User Journeys

🧭 Flow diagrams for our platform, modelled on observed 99acres patterns.

### 9.1 Buyer

```
Homepage
  └─ intent: BUY ──► type city ──► typeahead ──► select locality chip(s)
        └─ [Search]
             ▼
     SEARCH RESULTS  /flats-in-kolkata-ffid
        ├─ refine: budget → BHK → status → verified-only
        │     └─ each change: URL updated · count updated · chips added
        ├─ sort: relevance ⇄ price ⇄ newest
        ├─ toggle MAP ⇄ LIST  (bbox search on pan)
        └─ scroll → infinite load (crawlable -page-N mirror exists)
             ▼
     PROPERTY DETAIL  /…-spid-{ID}
        ├─ gallery → fullscreen
        ├─ read details · amenities · locality insight · price trend
        ├─ SAVE ──► [unauth] auth sheet ──► login ──► save replayed
        └─ CONTACT
             ├─ "Enquire"      ──► form ──► submit ──► Inquiry(QUERY)
             └─ "View Number"  ──► form ──► OTP ──► reveal
                                        └──► Inquiry(CONTACT_VIEW) ──► seller lead
             ▼
     POST-CONTACT
        ├─ similar properties rail
        ├─ "save this search & get alerts"
        └─ shortlist comparison view
```

**Drop-off points to instrument:** search→results (query quality), results→PDP (card quality/CTR), PDP→contact (trust/price clarity), contact→OTP completion (friction). The OTP step is where the funnel leaks hardest; measure it separately.

### 9.2 Tenant

```
Homepage ─ intent: RENT ──► city + locality
   ▼
RENT RESULTS
   └─ rent-specific facets: furnishing · availability date ·
      tenant preference · deposit · pet policy
   ▼
PROPERTY DETAIL (rent variant)
   └─ monthly rent · deposit · maintenance · lock-in · available-from
   ▼
CONTACT ──► OTP ──► reveal ──► lead
   │
   └─ (differentiator) schedule visit ──► slot picker ──► confirmation
```

Tenants convert faster and on a shorter horizon than buyers; the rent funnel should be optimised for **speed to contact**, and multi-contact is normal behaviour (a tenant contacts 5–10 listings). Do not throttle tenants the way you might throttle buyers.

### 9.3 Owner (supply)

```
Homepage ──► [Post Property]
   ▼
AUTH / REGISTER ──► role: OWNER ──► OTP verify
   ▼
6-STEP WIZARD (autosaved draft at every step)
   Basics → Location → Profile → Photos → Pricing → Description/Contact
   ▼
PREVIEW (exact public rendering + completeness score)
   ▼
PUBLISH ──► UNDER_SCREENING ──► ACTIVE
                   └──► REJECTED ──► reason ──► edit ──► resubmit
   ▼
DASHBOARD
   ├─ Listings: active │ under screening │ expired │ rejected │ reported
   ├─ Leads: Queries │ Contact Views   (name, phone, email, interest, listing)
   ├─ Analytics: views · saves · contacts · search impressions · rank
   └─ Upsell: verify · feature · premium · renew
```

### 9.4 Agent

```
LOGIN (agent role)
   ▼
AGENT DASHBOARD
   ├─ Portfolio: bulk listings · bulk upload (CSV/XML feed) · bulk edit
   ├─ Leads inbox: assign · status(new/contacted/qualified/closed/lost) ·
   │                notes · follow-up reminders · export
   ├─ Subscription: listing quota · lead quota · featured credits · renewal
   ├─ Performance: response time · conversion · listing quality score
   └─ Public profile: /agents/{slug}-{id} ─ bio · areas served · reviews
```

Agents are power users: bulk operations and a real CRM-grade lead inbox are not nice-to-haves, they are the retention mechanism for the paying cohort.

### 9.5 Builder

```
PROJECTS HUB  /new-projects-in-{city}
   ▼
PROJECT DETAIL  /{project}-{locality}-{city}-npxid-{id}
   ├─ overview · status · RERA ID · possession date
   ├─ configurations table (type × area × price)
   ├─ floor plans · master plan · brochure/payment-plan PDF
   ├─ amenities · specifications · gallery/walkthrough
   ├─ location & connectivity
   ├─ reviews / discussions
   └─ [Request callback] / [Download brochure] ──► gated form ──► BUILDER LEAD
   ▼
BUILDER PROFILE  /builders/{slug}-{id}
   └─ all projects · completed/ongoing/upcoming · track record
```

Brochure download is the canonical builder lead magnet: high intent, low friction, unambiguous consent.

---

## 10. Frontend Technology Findings

⚠️ **This section is deliberately short and mostly `UNKNOWN`.** The brief asked for DevTools, view-source, bundle and Wappalyzer/BuiltWith analysis. All required loading the site or the detection services; **all were blocked** (§0.2). Fabricating a stack here would be worse than useless — it would be acted upon.

### 10.1 Findings

| Technology area | Finding | Confidence |
|---|---|---|
| **Maps provider** | **Google Maps** — first-party article states map search launched 2015 indicating project/property location "on Google Maps" | **CONFIRMED** |
| **Client-side rendering / XHR** | Search results load additional pages via XHR/fetch on infinite scroll | MODERATE |
| **Server-rendered content** | SEO landing pages, PDPs, trends and reviews pages are indexed with full titles/content incl. live counts, implying server-rendered HTML | STRONG (inference from indexability) |
| **Mobile apps** | Native/hybrid Android (`com.nnacres.app`) and iOS (id `781765588`) apps exist | CONFIRMED |
| **AI in product** | App marketed as "backed by AI"; Info Edge discloses a 60+ scientist AI lab serving 99acres and ₹150cr AI budget | STRONG (corporate disclosure) |
| Framework (React/Next/Angular/Vue) | **UNKNOWN** | — |
| TypeScript vs JavaScript | **UNKNOWN** | — |
| CSS architecture / styling solution | **UNKNOWN** | — |
| Component library | **UNKNOWN** | — |
| State management | **UNKNOWN** | — |
| Routing library | **UNKNOWN** | — |
| Image optimisation / formats | **UNKNOWN** | — |
| Lazy loading implementation | **UNKNOWN** (infinite scroll implies some) | — |
| Analytics vendors | **UNKNOWN** | — |
| A/B testing / feature flags | **UNKNOWN** | — |
| Third-party JS libraries | **UNKNOWN** | — |
| Video player | **UNKNOWN** | — |
| Auth implementation (token/session) | **UNKNOWN** (OTP is user-visible; mechanism is not) | — |
| CDN vendor | **UNKNOWN** | — |

### 10.2 The one solid architectural inference

**Landing pages and detail pages are server-rendered.** The evidence is indirect but strong: search engines index their titles *including live inventory counts* (`23934+`) and *current-month tokens* (`Sep-2026`), plus deep paginated variants (`-page-32`). Client-only rendering does not reliably produce that indexation profile at that scale.

Combined with XHR-driven infinite scroll on the interactive surface, the likely shape is **server-rendered document + client-side hydration + XHR for subsequent pages** — i.e. the same hybrid model we recommend in §21–§22. Stated as an inference, not a fact.

### 10.3 How to complete this section later

If a future session has unrestricted egress, run: `curl -sI` for headers; view-source for `__NEXT_DATA__` / `self.__next_f.push` (Next.js), `ng-version` (Angular), `data-reactroot`/hydration markers; inspect `/_next/static/**` chunk naming; check `Server`, `X-Powered-By`, `CF-*`/`X-Akamai-*`/`X-Cache` headers; load a Wappalyzer/BuiltWith profile. **Two hours of that work would convert most of the `UNKNOWN` rows above.** Until then, they stay unknown.

---

## 11. Backend, API and Infrastructure Findings

### 11.1 API research 🔍

**What the brief asked for:** DevTools Network → Fetch/XHR capture of requests generated by search, filter changes, property opening, location selection and login. **This required loading the site and was blocked (§0.2). Request/response payloads, endpoint paths and headers are `UNKNOWN`.** No private endpoint was accessed, no authentication bypassed, no security control probed.

**What *is* observable** — the **public URL contract**, which is itself an API surface:

| Element | Observed | Confidence |
|---|---|---|
| Filter transport | HTTP GET query parameters | CONFIRMED |
| Parameter names | `city`, `preference`, `res_com`, `budget_min`, `area_unit`, `isPreLeased`, `page`, `bedroom_num` | CONFIRMED / MODERATE |
| Location identifiers | **Numeric integer IDs** (`city=264`) | CONFIRMED |
| Property identifiers | `spid` — letter prefix + digits (`H91004828`, `O88250018`, `Q92187302`) | CONFIRMED |
| Project identifiers | `npxid` — `r` prefix + digits (`r459768`) | CONFIRMED |
| Builder identifiers | `bid` — low sequential integers (`9`, `271`, `2704`, `54883`) | CONFIRMED |
| Pagination (SEO) | `-page-N` path token | CONFIRMED |
| Pagination (app) | `page` query param + XHR on infinite scroll | MODERATE |
| Public JSON API | None found; commercial scraper ecosystem exists *because* none is published | STRONG |

**Inferences worth acting on:**

1. **Identifier design is deliberate and multi-namespace.** Distinct prefixes per entity class (`spid`/`npxid`/`bid`) make IDs self-describing and collision-proof across the URL space. The letter prefix on `spid` plausibly encodes source, shard or type — **UNKNOWN**, but the *pattern* (typed, prefixed, opaque-ish public IDs) is worth copying.
2. **Builder IDs are small sequential integers; property IDs are large.** Consistent with builders being a curated, slowly-growing dimension table and properties being a high-volume fact table. Sequential integers leak volume and enable enumeration — our design should use them internally but expose prefixed, non-enumerable public IDs.
3. **Numeric location IDs imply a normalised gazetteer** shared across search, trends, reviews and landing pages. One canonical place table, many consumers.

### 11.2 Backend technology findings 🔍

**No 99acres-specific backend disclosure was found.** The strongest available evidence is at the **parent-company (Info Edge) level**, and must be labelled as such — Info Edge runs Naukri, 99acres, Jeevansathi and Shiksha, and stack requirements in group hiring do not prove per-property-vertical usage.

Info Edge engineering role requirements cite: **Java-based microservices and system design with Spring / Spring Boot**; **Apache Tomcat**; **message queues — Kafka, RabbitMQ**; **caching — Redis, Aerospike, Memcached**.

| Technology | Assessment | Confidence |
|---|---|---|
| **Java** | Named in Info Edge engineering requirements | **STRONG (Info Edge) / MODERATE (99acres specifically)** |
| **Spring / Spring Boot** | Named explicitly | **STRONG (Info Edge) / MODERATE (99acres)** |
| **Apache Tomcat** | Named explicitly | STRONG (Info Edge) / MODERATE (99acres) |
| **Microservices** | Named explicitly ("Java-based microservices & system design architecture") | STRONG (Info Edge) / MODERATE (99acres) |
| **Kafka** | Named explicitly | STRONG (Info Edge) / MODERATE (99acres) |
| **RabbitMQ** | Named explicitly | STRONG (Info Edge) / MODERATE (99acres) |
| **Redis** | Named explicitly | STRONG (Info Edge) / MODERATE (99acres) |
| **Aerospike / Memcached** | Named explicitly | STRONG (Info Edge) / MODERATE (99acres) |
| **ML/AI services** | Info Edge discloses 60+ AI scientists, ₹150cr AI budget, models for 99acres | STRONG |
| Node.js | No evidence found | **UNKNOWN** |
| Python | No evidence found (likely in ML, unverified) | **UNKNOWN** |
| API gateway | No evidence found | **UNKNOWN** |
| PostgreSQL | No evidence found | **UNKNOWN** |
| MySQL | No evidence found | **UNKNOWN** |
| MongoDB | No evidence found | **UNKNOWN** |
| Solr | No evidence found | **UNKNOWN** |
| Elasticsearch / OpenSearch | No evidence found | **UNKNOWN** |

**Explicit non-finding:** despite targeted searching, **no public evidence was found for 99acres' search engine, primary datastore, or API gateway.** Any document telling you 99acres "uses Solr" or "uses MySQL" without a cited primary source is speculating. That the site *needs* faceted geo-search does not tell you what implements it.

### 11.3 Infrastructure findings 🔍

| Technology | Assessment | Confidence |
|---|---|---|
| **Multi-subdomain topology** | `www`, `builders.`, `newprojects.` — separate hostnames for builder profiles and project collateral | **CONFIRMED** |
| **Static asset/document hosting** | Payment-plan PDFs served from `newprojects.99acres.com/projects/{builder}/{project}/payplan/{hash}.pdf` — hashed filenames indicate content-addressed or token-named object storage | **CONFIRMED** (pattern) / UNKNOWN (vendor) |
| **Mobile app distribution** | Google Play + Apple App Store | CONFIRMED |
| Kubernetes / Docker | No evidence found | **UNKNOWN** |
| AWS / GCP / Azure / on-prem | No evidence found | **UNKNOWN** |
| S3 or equivalent object store | Pattern-consistent, vendor unverified | LOW |
| CDN (Akamai / Cloudflare / other) | No evidence found | **UNKNOWN** |
| nginx | No evidence found | **UNKNOWN** |
| WAF / anti-bot vendor | No evidence found; **not probed by design** | **UNKNOWN** |

**On anti-bot systems:** a generic search on scraping-protection returned only vendor marketing about bypassing Akamai/Cloudflare/DataDome. **None of it concerned 99acres**, no such control was tested, and nothing in this document should be read as guidance for evading one. The existence of many commercial 99acres scrapers suggests *some* friction exists worth charging to overcome, but that is speculation and is not a finding.

**The one inference worth carrying forward:** the subdomain split (`builders.`, `newprojects.`) is a real architectural signal. It suggests **separately-deployed applications or at least separately-routed services per domain concern**, with project collateral treated as static objects rather than application responses. Our §21 architecture adopts the same separation of concerns (though via path routing initially, not subdomains — see §16.6 for why subdomains are an SEO cost we should avoid).

---

## 12. Database / Conceptual Data Model

🧭 **DESIGNED — 100% original.** This is *our* schema, derived from the functionality observed, not a reconstruction of anyone's private schema. No attempt was made to discover 99acres' internal data model, and none of it is known.

### 12.1 Entity–relationship overview

```
                         ┌──────────────┐
                         │     USER     │
                         │ role: BUYER/ │
                         │ OWNER/AGENT/ │
                         │ BUILDER/ADMIN│
                         └──┬────┬───┬──┘
              1:1 (optional)│    │   │1:N
        ┌──────────────┬────┘    │   └────────────────┬──────────────┐
        ▼              ▼         │                    ▼              ▼
  ┌──────────┐   ┌──────────┐    │             ┌────────────┐ ┌────────────┐
  │  AGENT   │   │ BUILDER  │    │             │  FAVORITE  │ │SAVED_SEARCH│
  │ profile  │   │ profile  │    │             └─────┬──────┘ └─────┬──────┘
  └────┬─────┘   └────┬─────┘    │                   │              │
       │ 1:N          │ 1:N      │                   │              ▼
       │              ▼          │                   │      ┌──────────────┐
       │        ┌──────────┐     │                   │      │ SEARCH_ALERT │
       │        │ PROJECT  │     │                   │      └──────────────┘
       │        └────┬─────┘     │                   │
       │             │ 1:N       │                   │
       │             ▼           │                   │
       │   ┌──────────────────┐  │                   │
       │   │PROJECT_CONFIG    │  │                   │
       │   │(type,area,price) │  │                   │
       │   └──────────────────┘  │                   │
       │             │           │                   │
       └─────────┬───┴───────────┘                   │
                 ▼                                   │
          ┌──────────────┐◄───────────────────────────┘
          │   PROPERTY   │  (listing)
          └──┬─┬─┬─┬─┬─┬─┘
    1:N ┌────┘ │ │ │ │ └────┐ 1:N
        ▼      │ │ │ │      ▼
┌──────────────┐│ │ │ │ ┌──────────────┐
│PROPERTY_MEDIA││ │ │ │ │ PRICE_HISTORY│
│ image/video/ ││ │ │ │ └──────────────┘
│ floorplan    ││ │ │ │
└──────────────┘│ │ │ └──────┐ 1:N
       M:N ┌────┘ │ │        ▼
           ▼      │ │  ┌──────────────┐
    ┌──────────┐  │ │  │   INQUIRY    │──► lead to seller
    │ AMENITY  │  │ │  │ QUERY |      │
    └──────────┘  │ │  │ CONTACT_VIEW │
                  │ │  │ CALLBACK |   │
      N:1 ────────┘ │  │ VISIT_REQUEST│
        ▼           │  └──────────────┘
  ┌──────────────┐  │
  │   LOCATION   │  └────► N:1 ─► PROPERTY_TYPE (ref)
  │ self-ref tree│
  │ + geometry   │◄──────── LOCALITY_STATS (price trends)
  └──────┬───────┘◄──────── REVIEW (locality/society/project)
         │
         └── COUNTRY ▸ STATE ▸ CITY ▸ ZONE ▸ LOCALITY ▸ SUB_LOCALITY ▸ SOCIETY

  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
  │ SUBSCRIPTION │───►│   PAYMENT    │    │   PLAN       │
  │ (user-scoped)│    └──────────────┘◄───│ quotas/price │
  └──────┬───────┘                        └──────────────┘
         │ 1:N
         ▼
  ┌──────────────┐    ┌──────────────┐
  │ QUOTA_LEDGER │    │  PROMOTION   │ (featured/boost on a PROPERTY)
  └──────────────┘    └──────────────┘
```

### 12.2 Core entities

**USER**
`id · public_id · phone(unique, verified_at) · email(unique, verified_at) · name · password_hash|null · roles[] · status · preferred_city_id · locale · created_at · last_login_at · deleted_at`
*Notes:* roles as an array, not a single column — a user is often both buyer and owner. Observed constraint worth adopting: **one account per phone+email**. Soft-delete only (leads and payments reference users).

**AGENT_PROFILE** (1:1 with USER where role=AGENT)
`user_id · agency_name · slug · rera_agent_id · verified_status · verified_at · areas_served[](location_ids) · specialisations[] · about · logo_media_id · established_year · response_rate · avg_response_minutes · rating · review_count`

**BUILDER_PROFILE** (1:1 where role=BUILDER)
`user_id · name · slug · public_id · logo_media_id · about · established_year · hq_location_id · total_projects · completed_projects · ongoing_projects · rera_ids[] · website · verified_status`

**LOCATION** — the gazetteer. The most important table in the system.
`id · public_id · parent_id(self-FK) · type(COUNTRY|STATE|CITY|ZONE|LOCALITY|SUB_LOCALITY|SOCIETY) · name · slug · full_slug · centroid(POINT, SRID 4326) · boundary(POLYGON|MULTIPOLYGON, nullable) · pincode · aliases[] · popularity_score · listing_count · is_active · path(ltree/materialised)`
*Notes:* self-referencing tree with a materialised path for fast ancestor queries. `aliases[]` is essential in India (Bangalore/Bengaluru, Gurgaon/Gurugram). `boundary` powers "is this pin actually in this locality" validation and polygon search. `listing_count` is denormalised and refreshed — it drives landing-page titles and thin-content gating.

**PROPERTY** (the listing)
```
id · public_id(prefixed, non-sequential) · slug
owner_user_id · posted_by(OWNER|AGENT|BUILDER)
intent(SALE|RENT|PG|LEASE) · segment(RESIDENTIAL|COMMERCIAL)
property_type_id · project_id(nullable) · society_location_id(nullable)
location_id · address_line(private) · geo(POINT) · geo_precision(EXACT|APPROX)
title · description
-- config
bedrooms · bathrooms · balconies · floor_number · total_floors
facing · age_years · furnishing(UNFURNISHED|SEMI|FULL)
-- area
carpet_area · builtup_area · super_area · area_unit · plot_length · plot_width
-- money
price · price_unit · is_negotiable · is_price_on_request
maintenance_charge · maintenance_period · security_deposit · booking_amount
price_per_unit_area (generated)
-- lifecycle
status(DRAFT|UNDER_SCREENING|ACTIVE|REJECTED|EXPIRED|SOLD|RENTED|DELETED)
rejection_reason · construction_status · possession_date · available_from
-- trust
is_verified · verified_at · verification_method · rera_id · rera_verified
-- quality & ranking
completeness_score · quality_score · boost_score
-- counters (denormalised)
view_count · save_count · inquiry_count · contact_view_count
published_at · expires_at · last_refreshed_at · created_at · updated_at
```
*Notes:* three area fields, never one — carpet/built-up/super are legally and commercially distinct in India, and conflating them is the most common data-integrity failure in this domain. `geo_precision` supports the privacy pattern in §6.5. `status` is an explicit state machine mirroring the observed lifecycle (active / under screening / expired / deleted / reported).

**PROPERTY_MEDIA** (unifies image, video, floor plan)
`id · property_id · kind(IMAGE|VIDEO|FLOOR_PLAN|WALKTHROUGH|DOCUMENT) · storage_key · cdn_url · width · height · duration_seconds · bytes · mime · sort_order · is_primary · caption · room_tag · phash(perceptual hash) · moderation_status · moderation_labels[] · uploaded_at`
*Notes:* one table with a `kind` discriminator beats separate `PropertyImage`/`PropertyVideo` tables — ordering, moderation and CDN handling are identical. `phash` powers duplicate detection (§17.5). Cap enforcement at 50 per listing matches the observed constraint.

**AMENITY** + **PROPERTY_AMENITY**
`AMENITY: id · code · name · category(SOCIETY|FLAT|SAFETY|RECREATION|CONNECTIVITY|COMMERCIAL) · icon · applies_to_segments[] · applies_to_types[] · is_filterable · sort_order`
`PROPERTY_AMENITY: property_id · amenity_id · value(nullable)` — `value` supports "Parking: 2" without a schema change.

**PROJECT**
`id · public_id · builder_user_id · name · slug · location_id · geo · status(NEW_LAUNCH|UNDER_CONSTRUCTION|READY|COMPLETED) · launch_date · possession_date · rera_ids[] · total_units · total_towers · total_area · price_min · price_max · description · amenities[] · media[] · brochure_media_id · payment_plan_media_id · is_featured`

**PROJECT_CONFIGURATION**
`id · project_id · property_type_id · bedrooms · carpet_area · builtup_area · super_area · area_unit · price_min · price_max · floor_plan_media_id · availability_status`

**INQUIRY** — the monetisable event, modelled explicitly
`id · property_id|project_id · from_user_id · to_user_id · type(QUERY|CONTACT_VIEW|CALLBACK|VISIT_REQUEST|BROCHURE_DOWNLOAD) · message · contact_snapshot{name,phone,email} · source_surface(CARD|PDP|MAP|PROJECT) · is_billable · billed_subscription_id · dedupe_key · seller_status(NEW|VIEWED|CONTACTED|QUALIFIED|CLOSED|LOST) · seller_notes · created_at`
*Notes:* `contact_snapshot` freezes the buyer's details at inquiry time (they may change later; the lead record must not mutate). `dedupe_key = hash(property_id, from_user_id, type, day)` prevents double-billing on repeat reveals — a real revenue-integrity concern. `type` mirrors the observed Queries vs Viewed Contact split exactly.

**FAVORITE** `user_id · property_id · created_at · folder(nullable) · note(nullable)` — PK `(user_id, property_id)`.

**SAVED_SEARCH** `id · user_id · name · filter_json(normalised filter object) · canonical_url · alert_frequency(OFF|INSTANT|DAILY|WEEKLY) · last_run_at · last_seen_max_id`
*Notes:* store the **normalised filter object**, not the raw URL — URLs change, semantics shouldn't. `last_seen_max_id` makes "what's new since you last looked" cheap.

**SEARCH_EVENT** (analytics, append-only) `id · user_id|anon_id · filter_json · result_count · surface · executed_at · latency_ms · clicked_property_ids[]` — feeds relevance tuning and "continue your search".

**REVIEW** `id · author_user_id · subject_type(LOCALITY|SOCIETY|PROJECT|AGENT|BUILDER) · subject_id · overall_rating · ratings{environment,lifestyle,connectivity,safety,commute,amenities} · title · body · resident_status(CURRENT|FORMER|VISITOR) · tenure_years · status(PENDING|PUBLISHED|REJECTED) · helpful_count · created_at`
*Notes:* the sub-rating dimensions mirror those observed (environment, lifestyle, connectivity, safety), extended with commute and amenities.

**LOCALITY_STATS** (powers price-trends pages) `id · location_id · property_type_id · transaction_type(SALE|RENT) · period_month · median_price_per_unit_area · p25 · p75 · sample_size · mom_change_pct · yoy_change_pct · three_year_change_pct · computed_at`
*Notes:* monthly grain, matching the observed monthly page regeneration (`Sep-2026`). `sample_size` must be stored **and enforced** — publishing a trend from 3 listings is how a data product loses credibility. Suppress below a threshold.

**PRICE_HISTORY** `id · property_id · old_price · new_price · change_pct · changed_at` — powers "price reduced" badges, a high-converting signal.

**PLAN / SUBSCRIPTION / PAYMENT / QUOTA_LEDGER / PROMOTION**
```
PLAN:         id · code · audience(OWNER|AGENT|BUILDER) · name · price · currency ·
              duration_days · listing_quota · featured_quota · lead_quota ·
              verification_included · analytics_tier · support_tier
SUBSCRIPTION: id · user_id · plan_id · status(ACTIVE|EXPIRED|CANCELLED) ·
              starts_at · ends_at · auto_renew · payment_id
PAYMENT:      id · user_id · subscription_id · amount · currency · gateway ·
              gateway_ref · status(CREATED|PENDING|SUCCESS|FAILED|REFUNDED) ·
              invoice_number · gst_amount · created_at
QUOTA_LEDGER: id · subscription_id · quota_type(LISTING|FEATURED|LEAD) ·
              delta · balance_after · reason · ref_id · created_at
PROMOTION:    id · property_id · subscription_id · kind(FEATURED|TOP_SLOT|BOOST) ·
              starts_at · ends_at · placement_scope(city|locality|search) · priority
```
*Notes:* `QUOTA_LEDGER` as an **append-only ledger**, never a mutable counter. Quota disputes are common in this business and an immutable ledger is the only defensible answer. GST is a first-class field for the Indian market, not an afterthought.

**Supporting:** `PROPERTY_TYPE` (ref), `VERIFICATION_REQUEST`, `MODERATION_TASK`, `REPORT` (abuse reports), `NOTIFICATION`, `AUDIT_LOG`, `OTP_CHALLENGE`.

### 12.3 Key modelling decisions and their rationale

| Decision | Rationale |
|---|---|
| Location as a self-referencing tree with geometry | Mirrors the observed numeric-ID gazetteer shared by search/trends/reviews/landing pages. One canonical place identity avoids the classic "New Town appears 4 ways" disaster. |
| Three area fields, never one | Carpet/built-up/super are distinct legal quantities; conflating them produces wrong prices-per-sqft and destroys trust. |
| Unified `PROPERTY_MEDIA` with `kind` | Ordering, moderation, CDN and limits are identical across media types. |
| `INQUIRY.type` enum incl. `CONTACT_VIEW` | Makes the monetisable event a first-class, countable, billable object from day one. |
| `dedupe_key` on inquiry | Revenue integrity: repeat reveals must not double-charge. |
| Append-only `QUOTA_LEDGER` | Auditable quota accounting; disputes are resolvable. |
| Denormalised counters on PROPERTY and LOCATION | Counts appear in titles, facets, H1s and buttons; they must be O(1) reads. |
| Explicit `status` state machines | The observed lifecycle (under screening → active → expired) is a product feature, not an implementation detail. |
| `public_id` distinct from `id` | Never expose sequential integers publicly (enumeration + volume leakage). |
| `filter_json` on saved search | URLs are presentation; semantics must survive URL changes. |
| `sample_size` on stats | Statistical honesty gate for the data product. |

### 12.4 Indexing plan (PostgreSQL)

```sql
-- hot search path (mirrored into the search engine; SQL is fallback + source of truth)
CREATE INDEX ON property (status, intent, segment, location_id, price)
  WHERE status = 'ACTIVE';
CREATE INDEX ON property USING GIST (geo);                       -- PostGIS
CREATE INDEX ON property (location_id, intent, bedrooms, price)
  WHERE status = 'ACTIVE';
CREATE INDEX ON property (published_at DESC) WHERE status = 'ACTIVE';
CREATE INDEX ON property (owner_user_id, status);                -- seller dashboard
CREATE INDEX ON property_media (property_id, sort_order);
CREATE INDEX ON property_media (phash);                          -- duplicate detection
CREATE INDEX ON inquiry (to_user_id, created_at DESC);           -- lead inbox
CREATE UNIQUE INDEX ON inquiry (dedupe_key);
CREATE INDEX ON location USING GIST (boundary);
CREATE INDEX ON location (parent_id, type, is_active);
CREATE INDEX ON locality_stats (location_id, property_type_id,
                                transaction_type, period_month DESC);
```

---

## 13. Search Engine Analysis

### 13.1 What a property marketplace search must actually do

Property search is **not** e-commerce search with different nouns. Its distinguishing demands:

1. **Multi-entity resolution** — one input box must resolve city, locality, society, project, builder and landmark, because users type them interchangeably.
2. **Numeric range filtering at high cardinality** — price and area are continuous, unevenly distributed, and always filtered.
3. **Geospatial primitives** — radius, polygon (locality boundary), bounding box (map pan), and distance-based sort.
4. **Deep faceting with accurate counts** — counts appear in titles, buttons and facet labels; they must be correct and fast.
5. **Freshness-weighted relevance** — a 400-day-old listing is usually a worse result than a 2-day-old one at equal match quality.
6. **Commercial ranking overlays** — featured/boosted placement must be injectable without destroying perceived relevance.
7. **Zero-result recovery** — property queries are over-constrained constantly; graceful relaxation is a core feature, not a nicety.
8. **Aggregations for the data product** — median price per sqft per locality per month is an aggregation workload, not a search workload.

### 13.2 Evidence about 99acres' engine 🔍

**None found.** Targeted searching produced no public evidence of Solr, Elasticsearch, OpenSearch or any named engine at 99acres. Info Edge role descriptions reference marketplace "search, matching, recommendations, paid visibility, listings and data quality" as engineering topics, confirming search is a serious internal concern, but naming no technology.

**Status: `UNKNOWN`.** What *can* be inferred from observable behaviour *(STRONG)* is that their system supports: multi-axis faceting, fast result counts surfaced in page titles, budget/area range filtering, geo/map search, multiple sort orders, and monthly locality-level aggregations. Those are capability requirements, not implementation evidence.

The one first-party hint of engine *behaviour* is a scraper vendor's note that server-side budget parameters "behave inconsistently" — suggesting budget may be partly applied post-query or bucketed rather than as a clean range filter *(MODERATE, single source)*.

### 13.3 🧭 Recommended search architecture for our platform

**Phase 1 — PostgreSQL + PostGIS only (0 → ~100k listings).**

Do not deploy a search cluster on day one. Postgres with GIN/GiST indexes handles this scale comfortably, and the operational simplicity is worth more than the marginal latency.

- Full-text: `tsvector` over title + description + locality + project, with `pg_trgm` for fuzzy typeahead.
- Geo: PostGIS `ST_DWithin` (radius), `ST_Contains` (locality polygon), `ST_MakeEnvelope` (map bbox).
- Facet counts: a single grouped aggregate query, or `FILTER`-clause aggregation in one pass.
- Typeahead: a dedicated denormalised `place_suggest` table (id, type, label, path, popularity, listing_count) with trigram index — never typeahead against the live property table.

**Why:** one datastore, no sync lag, no dual-write bugs, transactional consistency between what the seller edits and what the buyer sees. Most marketplaces that fail do so from operational complexity, not query latency.

**Phase 2 — Add OpenSearch/Elasticsearch (~100k+ listings, or when facet latency exceeds ~200ms).**

- Postgres remains the **system of record**. The index is a **derived, disposable projection** — rebuildable from scratch at any time. This rule is non-negotiable; violating it turns the index into an un-reconstructable liability.
- Sync via transactional outbox → CDC/queue consumer → bulk indexer. Never dual-write from application code.
- One denormalised `listing` index: all filterable fields flattened; `geo_point` for coordinates; nested amenities; pre-computed `price_per_unit_area`.
- Facets via `terms`/`range` aggregations; map clustering via `geohash_grid` or `geotile_grid`.
- Relevance: `function_score` — text match × freshness decay × quality score × boost multiplier.
- Keep the Postgres path as a **live fallback**; if the cluster degrades, search must still work, slower.

**Phase 3 — At scale.** Learning-to-rank on click/contact signals; vector/semantic search for natural-language queries ("3 BHK near a good school with a park"); personalised ranking; a separate analytics store (ClickHouse or similar) for trends aggregation — trend computation should never share a cluster with live search.

### 13.4 Index design sketch

```jsonc
{
  "listing_id": "P_8f3c2a", "status": "ACTIVE",
  "intent": "SALE", "segment": "RESIDENTIAL", "property_type": "APARTMENT",
  "location_path": [1, 12, 264, 3301, 88214],   // country▸state▸city▸zone▸locality
  "location_names": ["India","West Bengal","Kolkata","North","New Town"],
  "society_id": 44120, "project_id": 9912,
  "geo": { "lat": 22.5808, "lon": 88.4712 },
  "bedrooms": 3, "bathrooms": 3,
  "carpet_area_sqft": 1240, "super_area_sqft": 1580,
  "price": 8500000, "price_per_sqft_carpet": 6854,
  "furnishing": "SEMI", "construction_status": "READY",
  "possession_date": null, "age_years": 2, "floor_number": 7, "total_floors": 14,
  "facing": "EAST", "parking_count": 1,
  "amenities": ["LIFT","POWER_BACKUP","GYM","SECURITY_24X7"],
  "posted_by": "OWNER", "is_verified": true, "has_video": false, "photo_count": 14,
  "rera_id": "WBRERA/P/…", "published_at": "2026-09-02T…",
  "quality_score": 0.82, "boost_score": 0.0,
  "suggest": { "input": ["New Town 3 BHK", "Kolkata apartment"] }
}
```

**Denormalise `location_path` as an array** — it makes "all listings in Kolkata" and "all listings in New Town" the *same* query shape (`terms` on the array), which is the single most useful indexing trick in this domain.

### 13.5 Relevance ranking (🧭 our formula)

```
score = w1·text_match            (BM25, when a text query exists)
      + w2·freshness_decay       (exp decay, ~30-day half-life)
      + w3·quality_score         (completeness, photo count/quality, verified)
      + w4·seller_reputation     (response rate, historical lead quality)
      + w5·engagement_rate       (CTR & contact-rate, position-debiased)
      + w6·geo_proximity         (when a centre point exists)
      + boost_multiplier         (paid placement — bounded, disclosed)
```

**Two rules, both non-negotiable:**
1. **Paid boost is bounded and disclosed.** A featured listing gets a capped multiplier and a visible "Featured" label. Unbounded paid ranking destroys result quality, and users detect it fast — this is precisely the trust erosion visible in competitor app reviews.
2. **Explicit sorts are pure.** When a user picks "Price: low to high", featured listings must not be interleaved. Violating an explicit sort is the fastest way to lose user trust in the whole system.

### 13.6 Zero-result relaxation ladder

Applied in order, each step disclosed to the user:
1. Widen budget ±10%, then ±25%
2. Expand radius: locality → 3km → 5km → 10km
3. Relax config (3 BHK → 3 or 4 BHK)
4. Drop the least-selective amenity filters
5. Include nearby localities by adjacency
6. Offer: save this search + alert me

Always show what was relaxed and offer one-tap undo. A silently-relaxed search feels like a broken filter.

---

## 14. Design System Analysis

### 14.1 Honest position on 99acres' visual design

**Their visual design system could not be observed.** Fonts, weights, hex values, radii, shadows, spacing scale, icon set, animation timings and hover/focus treatments all require rendering the site (§0.3). **Every one of those is `UNKNOWN`.**

This turns out not to matter much, because the brief explicitly says *"Do NOT simply copy their visual identity. Extract design principles that can inform an ORIGINAL design system."* Copying trade dress would also be the one part of this exercise with real legal exposure. So this section delivers **an original design system**, derived from the functional requirements the research did establish.

### 14.2 Design principles (derived from observed product requirements)

| # | Principle | Derived from |
|---|---|---|
| 1 | **Density with hierarchy.** Property shoppers compare many options; show a lot, but make exactly one thing per card dominant (price). | Competitor reviews citing "too much detail, hard to navigate" — density without hierarchy is the failure mode. |
| 2 | **Trust is visual.** Verification, RERA and seller type need instantly-parseable treatment. | Observed centrality of verified badges, RERA pages, posted-by filtering. |
| 3 | **Never lose the user's state.** Filters, scroll and results survive every interaction. | Observed complaints of filters bouncing users to home. |
| 4 | **Numbers are the interface.** Price, area, EMI, price/sqft, appreciation % — typography must make numbers scannable. | Observed count-in-title, trend leaderboards, EMI tools. |
| 5 | **One primary action per surface.** | Lead-gen model: contact is *the* action. |
| 6 | **Calm over clever.** No parallax, no carousels that move on their own, no motion over 200ms on core paths. | Performance + the "slow/buggy" perception to avoid. |
| 7 | **Mobile is the product.** | Observed 53% app traffic share; India is mobile-first. |

### 14.3 Typography 🧭

| Role | Spec |
|---|---|
| Family | One geometric-humanist sans for UI + one tabular-capable face for numerics. Must include **Devanagari and Indic script coverage** for future localisation — a real constraint, decide it now. |
| Numerals | `font-variant-numeric: tabular-nums` on all price/area/stat displays so columns align. |
| Scale (1.250 major third) | 12 · 14 · 16 · 18 · 20 · 25 · 31 · 39 · 49 px |
| Weights | 400 body · 500 UI labels · 600 headings · 700 price/emphasis only |
| Line height | 1.5 body · 1.25 headings · 1.2 numerics |
| H1 | 31px mobile / 39px desktop, 600 |
| Body | 16px (never below 14px for content; 12px only for meta/legal) |
| Price display | 20px mobile / 25px desktop, 700, tabular |

### 14.4 Colour 🧭

Semantic tokens only — no raw hex in components.

| Token | Role | Constraint |
|---|---|---|
| `--brand-primary` | Primary actions, links | ≥4.5:1 on surface |
| `--brand-primary-hover/active` | States | |
| `--accent-supply` | Post Property CTA | Distinct from primary — supply and demand CTAs must never look identical |
| `--trust` | Verified badges | Conventionally green; must also carry an icon (never colour alone) |
| `--warn` | Expiring, incomplete | |
| `--danger` | Errors, rejections | |
| `--surface / --surface-raised / --surface-sunken` | Backgrounds | |
| `--border-subtle / --border-strong` | Dividers | |
| `--text-primary / --secondary / --tertiary / --inverse` | Text | primary ≥7:1, secondary ≥4.5:1 |
| `--promoted` | Featured listing marker | Must be perceptible but not dominant |

**Rules:** WCAG AA minimum throughout; never encode meaning in colour alone (verified = icon + colour + text); full dark-mode token set defined from the start, not retrofitted.

### 14.5 Spacing, radius, elevation 🧭

- **Spacing:** 4px base — `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64`. No arbitrary values.
- **Radius:** `4` inputs/chips · `8` cards/buttons · `12` modals/sheets · `999` pills/avatars.
- **Elevation:** 4 levels only — `0` flat, `1` card (subtle), `2` dropdown/popover, `3` modal/sheet. Prefer borders over shadows for card separation; shadows cost paint performance on long lists.

### 14.6 Core components 🧭

| Component | Spec |
|---|---|
| **Button** | Variants: primary (filled) · secondary (outline) · tertiary (text) · danger. Sizes sm 32 / md 40 / lg 48. Min touch target **44×44**. Loading state preserves width (no layout shift). |
| **Input** | 40/48px, 4px radius, label above (never placeholder-as-label), helper + error slots reserved so validation doesn't shift layout. |
| **Chip** | Two kinds: *filter chip* (toggle, selected state) and *applied chip* (with × remove). Human-language content ("₹40L–₹60L", not "pmin=4000000"). |
| **Badge** | Verified · RERA · Featured · New · Price Reduced. Icon + short text. Max 2 per card. |
| **Property card** | Per §7.1. Fixed media aspect ratio. Entire card clickable, with nested interactive elements (save, contact) correctly stop-propagated. |
| **Filter panel** | Desktop: sticky left rail, collapsible groups, counts per option. Mobile: full-screen sheet with live "Show N properties" apply button. |
| **Range control** | Dual-handle slider **plus** numeric inputs. Non-linear scale (§6.4.8). |
| **Gallery** | Swipe (touch) · arrows (desktop) · keyboard arrows · counter · fullscreen lightbox with Esc. Lazy-load beyond first image. |
| **Map** | Clustered markers, price-label pins, hover↔card linkage, "search this area" control. |
| **Sheet / Modal** | Focus trap, Esc close, scroll lock, restore focus on close. Mobile prefers bottom sheets. |
| **Skeleton** | Exact final dimensions. Never spinners for content areas. |
| **Toast** | Non-blocking confirmations (saved, copied, alert created). |

### 14.7 Iconography 🧭

One outline icon set, 24px grid, 1.5–2px stroke, rendered as inline SVG sprite (not an icon font — icon fonts break with content blockers and hurt a11y). Domain icons needed: bed, bath, area, floor, facing, parking, lift, power-backup, gym, pool, security, school, hospital, metro, verified, RERA, camera, video, floor-plan, map-pin, heart, share, phone, WhatsApp, filter, sort.

### 14.8 Grid & breakpoints 🧭

| Breakpoint | Range | Container | Columns | Gutter |
|---|---|---|---|---|
| `xs` | <480 | fluid, 16px pad | 4 | 16 |
| `sm` | 480–767 | fluid, 16px pad | 4 | 16 |
| `md` | 768–1023 | 720 | 8 | 24 |
| `lg` | 1024–1279 | 960 | 12 | 24 |
| `xl` | 1280–1439 | 1200 | 12 | 32 |
| `2xl` | ≥1440 | 1320 | 12 | 32 |

Image ratios: **4:3** cards/gallery · **16:9** video/hero · **1:1** avatars/logos · floor plans `contain` on a fixed-height canvas (never crop a floor plan).

### 14.9 Navigation 🧭

- **Desktop:** horizontal top nav — logo · intent links · Post Property (accent) · account. Sticky, condensing on scroll (a compact search bar appears in the header once the hero scrolls out).
- **Mobile:** top bar (logo + account) plus a **bottom navigation bar**: Search · Saved · Post · Leads/Alerts · Account. Bottom nav is correct here because the app-traffic majority expects app conventions on mobile web. Hide bottom nav inside the post-property wizard and the gallery lightbox.
- **Sticky contact bar** on PDP mobile — always reachable.

### 14.10 Motion, hover, focus 🧭

- Durations: 120ms micro (hover/press) · 200ms standard (sheets/dropdowns) · 300ms max (page transitions). Easing `cubic-bezier(0.2, 0, 0, 1)`.
- Hover (pointer devices only, via `@media (hover: hover)`): card lifts one elevation step + image scales ≤1.02. Never reflow on hover.
- **Focus: a visible 2px focus ring with 2px offset on every interactive element. Never `outline: none` without a replacement.** Keyboard navigation of the filter panel and gallery must be fully functional.
- Honour `prefers-reduced-motion: reduce` — disable transforms, keep opacity fades.

### 14.11 Accessibility floor (non-negotiable)

WCAG 2.1 AA; all interactive elements keyboard-reachable in logical order; form inputs with real `<label>`s; images with meaningful alt (`"3 BHK apartment living room, New Town"` not `"image1"`); ARIA live regions announcing result-count changes; modals/sheets focus-trapped; 44×44 minimum touch targets; never colour-only meaning.

---

## 15. Responsive Design Analysis

### 15.1 What could be observed 🔍

**Direct breakpoint testing at 390/412/768/1024/1280px was not possible** (§0.3). Their responsive behaviour is `UNKNOWN`.

Two things *are* known: a distinct mobile web experience exists (a first-party "Mobile Site Feedback" page exists), and mobile carries the majority of engagement (company-claimed 53% app traffic share). Mobile is the primary surface, not an adaptation of desktop.

### 15.2 🧭 Our responsive specification

| Element | 390–412 (phone) | 768 (tablet ⌷) | 1024 (small laptop) | 1280+ (desktop) |
|---|---|---|---|---|
| **Header** | Compact: logo + account. Bottom nav carries primary nav. | Logo + condensed nav, hamburger for overflow | Full horizontal nav | Full nav + header search on scroll |
| **Search entry** | Tap-target → **full-screen sheet**, one field at a time | Inline 2-field + expand | Full inline bar | Full inline bar + extras |
| **Intent tabs** | Scrollable pill row | Full row | Full row | Full row |
| **Filters** | Sticky "Filters (3)" button → full-screen sheet, apply-on-confirm with live count | Same sheet, wider | **Left rail appears**, apply-on-change | Left rail, sticky |
| **Sort** | Bottom sheet | Bottom sheet | Inline dropdown | Inline dropdown |
| **Result cards** | 1-up **horizontal** card (image left 40%) | 2-up vertical | 2-up vertical (rail present) | 3-up, or 2-up beside map |
| **Map** | Exclusive toggle, full-screen | Exclusive toggle | **Split view available** 40/60 | Split view default on map routes |
| **PDP layout** | Single column; sticky bottom contact bar | Single column, wider gallery | Two-column, sticky right contact rail | Two-column, sticky rail + in-page nav |
| **Gallery** | Full-bleed swipe, counter | Full-bleed swipe | Primary + 2 thumbs, grid on click | Primary + 4 thumbs |
| **Images** | 1x/2x, `srcset` widths 320/480 | 480/768 | 768/1024 | 1024/1440 |
| **CTAs** | Full-width; sticky bottom bar on PDP | Full-width in column | Inline | Inline |
| **Sticky elements** | Bottom nav, PDP contact bar, filter button | Filter button | Filter rail, contact rail | Header, filter rail, contact rail |
| **Footer** | Accordion groups | 2 columns | 4 columns | 4–5 columns |

### 15.3 Mobile-specific rules

1. **Full-screen sheets, not inline multi-field forms.** Tapping search opens a dedicated screen with one decision at a time.
2. **Apply-on-confirm, not apply-on-change.** On desktop a filter rail can refresh live; on mobile, every change triggering a reload is disorienting and wasteful. Show the pending count on the Apply button.
3. **Thumb zone.** Primary actions in the bottom third. The most important button on a phone is at the bottom, not the top.
4. **No hover dependencies.** Anything only reachable by hover is unreachable on touch.
5. **Horizontal cards on phones** — vertical cards waste vertical space and show ~1.5 results per screen; horizontal shows 3–4 while keeping the image meaningful.
6. **Reserve every image box** via `aspect-ratio` to keep CLS ≈ 0.
7. **Never hijack scroll.** No scroll-jacking, no pull-to-refresh override, no infinite scroll that traps the footer (provide a "load more" fallback and keep footer links reachable).

---

## 16. SEO Analysis

🔍 **The best-evidenced section of this document**, because SEO artefacts are precisely what a search index exposes.

### 16.1 URL structure — findings

| Finding | Evidence | Confidence |
|---|---|---|
| Keyword-rich, human-readable slugs | `/flats-for-rent-in-north-kolkata-ffid` | CONFIRMED |
| Archetype encoded in a suffix token | 9 distinct suffixes (§2.1) | CONFIRMED |
| Flat hierarchy — most pages one level from root | All `-ffid`/`-spid-`/`-prffid` examples | CONFIRMED |
| Pagination in the path for indexable pages | `-ffid-page-32` | CONFIRMED |
| Query params reserved for the interactive surface | `?city=264&…&page=2` | CONFIRMED |
| Entity IDs appended to slugs | `-spid-H91004828`, `-npxid-r459768`, `-bid-9` | CONFIRMED |
| Subdomains for builder + project collateral | `builders.`, `newprojects.` | CONFIRMED |
| `.html` on legacy/content paths only | `/faq/*.html`, `/articles/*-bgid.html`, `/register.html` | CONFIRMED |

**Why this structure works:**
- The slug carries every term a user would type; the ID guarantees uniqueness. Slugs can be regenerated without breaking routing — the router only needs suffix + ID.
- Path-based pagination is independently indexable and link-equity-bearing in a way `?page=2` generally is not.
- Suffix namespacing prevents slug collisions across entity types forever.

### 16.2 Metadata — findings

Observed title templates *(all CONFIRMED)*:

| Page type | Template |
|---|---|
| City listing | `Flats in Kolkata - 23934+ Apartments / Flats for Sale in Kolkata` |
| Micro-market | `Flats in Kolkata South - 9739+ Apartments / Flats for Sale in Kolkata South` |
| Rent | `1358+ Flats for Rent in Kolkata North - Flats / Apartments on Rent in Kolkata North` |
| Budget band | `Flats in Kolkata from 5 lakhs to 10 lakhs - 103+ Apartments/Flats for Sale in Kolkata below 10 lakhs` |
| Status | `Ready to Move Flats in Kolkata - 21003+ Properties` |
| Price trends | `Property Rates in Mumbai Sep-2026 - Property Prices / Real Estate Trends in Mumbai` |
| Reviews | `Delhi Reviews by Users - 1538+ Localities and Societies` |
| Project | `{Project} {Locality}, {City} \| Price List & Brochure, Floor Plan, Location Map & Reviews` |
| PDP | `Paying Guest / Hostel / PG in Sector 48 Gurgaon` |

**Three high-value techniques, all verified:**

1. **Live inventory counts in titles** (`23934+`, `12411+`, `1538+`). Raises CTR (specificity signals depth) and signals freshness. Requires a fast, cached count service — the count is on the critical path of every title.
2. **A dynamic month token** (`Sep-2026`, matching the research date). Monthly-regenerated titles on data pages give perpetual freshness without new content, and win "property rates in X *now*" queries.
3. **Dual-phrasing titles** — the same intent restated twice with different word order ("Flats in Kolkata" + "Apartments / Flats for Sale in Kolkata"), capturing synonym variants (flat/apartment, buy/sale) in one title.

Meta descriptions carry pre-computed facet counts as copy: *"11400+ Owner Properties, 300+ Projects, 21760+ Ready to Move, 2660+ Furnished, 6100+ Affordable, 2430+ Luxury"* — simultaneously a value proposition and an internal-link map. *(CONFIRMED)*

**`UNKNOWN`:** canonical tag implementation, robots directives, `hreflang`, Open Graph/Twitter cards, JSON-LD presence and types, XML sitemap structure. All require fetching HTML. **No claims made.**

### 16.3 Content & internal linking — findings

Confirmed internal-linking surfaces: budget-band pages, micro-market splits (north/south/east/west), status pages (ready-to-move, resale), config pages, type pages, RERA pages, agent directories, builder×city pages, locality reviews, price trends, FAQ, articles, community Q&A. Content depth is substantial — locality profiles, an extensive FAQ corpus, editorial articles, community Q&A.

**The strategic pattern:** they own the *entire query spectrum* — transactional ("2 BHK flat for sale in New Town"), commercial-investigation ("property rates in Mumbai"), informational ("how to identify a fake RERA number"), and navigational. Listings alone win only the first.

### 16.4 Why this works for a property marketplace

1. **Property search is inherently long-tail.** Nobody searches "property." They search "3 BHK semi-furnished flat for rent in New Town under 30000." A combinatorial landing matrix intercepts each variant with a dedicated page.
2. **Inventory is volatile; pages must be stable.** Individual listings expire constantly. Landing pages are permanent URLs whose *contents* change — accumulating authority while inventory churns. This is the central insight of property-portal SEO.
3. **Research precedes transaction by months.** Price trends and reviews capture users long before they are ready to contact anyone, then retarget them internally.
4. **Local intent is geographic hierarchy.** City → zone → locality → society maps 1:1 onto both user mental models and URL hierarchy.
5. **Freshness is cheap at scale.** Counts and month tokens regenerate automatically; no editorial cost.

### 16.5 🧭 Our SEO architecture

**Route plan:**

```
/                                          Home
/{intent}/{city}                           /buy/kolkata, /rent/kolkata
/{intent}/{city}/{locality}                /buy/kolkata/new-town
/{intent}/{city}/{locality}/{type}         /buy/kolkata/new-town/apartments
/{intent}/{city}/{filter-slug}             /buy/kolkata/3-bhk-flats
                                           /buy/kolkata/under-50-lakh
                                           /rent/kolkata/furnished-2-bhk
/{intent}/{city}/…/page/{n}                path-based pagination
/property/{slug}-p{id}                     PDP
/project/{slug}-j{id}                      Project
/builder/{slug}-b{id}                      Builder
/agent/{slug}-a{id}                        Agent
/localities/{city}/{locality}              Locality hub
/price-trends/{city}[/{locality}]          Trends
/reviews/{city}[/{locality}]               Reviews
/guides/{slug}                             Editorial
/search?…                                  Interactive surface — noindex
```

**Rules:**

1. **Two surfaces, strictly separated.** Pretty paths are SSR + indexable; `/search?…` is the app surface and is `noindex, follow`. Both resolve to the same normalised filter object.
2. **Canonical discipline.** Every filtered variant canonicalises to its cleanest indexable form. Facet combinations beyond an allowlist are `noindex`. This is where most property portals generate index bloat and get demoted.
3. **Thin-content gating.** A landing page is only indexable above an inventory threshold (e.g. ≥5 active listings). Below it: `noindex` + redirect to parent + show nearby inventory. **Generate the matrix, but govern it.**
4. **Structured data (JSON-LD)** on every page type:
   - PDP → `RealEstateListing` / `Residence` + `Offer` + `GeoCoordinates` + `ImageObject`
   - Project → `ApartmentComplex` + `Offer` aggregation
   - Locality → `Place` + `AggregateRating`
   - Listing pages → `ItemList` + `BreadcrumbList`
   - FAQ blocks → `FAQPage`
   - Agent/Builder → `RealEstateAgent` / `Organization`
   - Site-wide → `WebSite` with `SearchAction`
5. **Sitemap strategy:** a sitemap index with segmented children (properties, projects, localities, trends, reviews, guides), ≤50k URLs each, `lastmod` accurate, regenerated nightly; expired listings removed promptly. Reference from `robots.txt`.
6. **Expired listings:** never 404 silently. Return **410 Gone** with a useful page (similar active listings in the same locality) and remove from sitemap. Leaving dead listings indexed is a slow-acting quality penalty.
7. **Dynamic titles:** adopt both observed techniques — live counts and month tokens — with counts served from cache and a correct fallback when the count service is unavailable (never render `0+`).
8. **Breadcrumbs** on every page, visible and marked up, mirroring the location hierarchy.
9. **Internal-link clusters** on every landing page: nearby localities, adjacent budget bands, related configs, related types, parent city. Generated from the gazetteer, not hand-authored.
10. **Performance is SEO** (§18).

### 16.6 One thing we should *not* copy

**The subdomain split (`builders.`, `newprojects.`).** Subdomains fragment authority and complicate analytics, sessions and cookies. Ours should be path-based (`/builder/…`, `/project/…`) on the primary host. 99acres' split is most plausibly a legacy artefact of separately-built applications rather than an SEO choice — and at their domain authority, the cost is absorbable. At ours, it would not be.

---

## 17. Security & Trust Analysis

🔍 Observed mechanisms. **No security control was tested, probed or bypassed** — consistent with the brief.

### 17.1 Observed trust mechanisms

| Mechanism | Detail | Confidence |
|---|---|---|
| Verified-listing badge | Seal of trust shown on listings and used in ranking | CONFIRMED |
| Self-verification via app | Guided flow capturing **real-time photos while present at the property** | CONFIRMED |
| Explicitly scoped verification | T&C: confirms *existence as advertised*, **expressly not** documentation, ownership, area or pricing | CONFIRMED |
| OTP phone verification | At registration and at contact reveal | CONFIRMED |
| Single-account rule | One account per mobile + email | CONFIRMED |
| Listing screening | "Under screening" state before going live | CONFIRMED |
| Photo content moderation | Rejects contact numbers, emails, company/owner names, addresses, watermarks, URLs, artistic/imaginary images | CONFIRMED |
| Reported-listing state | `reported` is a first-class listing state | CONFIRMED |
| Report wrong information | Dedicated support channel | CONFIRMED |
| Fraud reporting | Dedicated channel; guidance to also approach police | CONFIRMED |
| Seller-type disclosure | Owner / Dealer / Builder shown and filterable | CONFIRMED |
| Profile reclassification | Owner → Dealer/Builder reclassification exists (anti-gaming: dealers posing as owners) | CONFIRMED |
| RERA surfacing | RERA IDs on listings, dedicated RERA landing pages, educational content on spotting fake RERA numbers | CONFIRMED |
| Account deletion via support | No self-serve delete | CONFIRMED |
| Phone masking | **Not evidenced** | UNKNOWN |
| Anti-bot / WAF vendor | **Not evidenced; not probed** | UNKNOWN |
| Login security internals | **Not observable** | UNKNOWN |

### 17.2 The most transferable insight: scope your trust claims

99acres' verified badge is legally bounded in their own Terms: existence and genuine photos — **not** ownership, documents, area or price. That is exactly right and worth copying, for two reasons: it is honest, and an unbounded "Verified" claim creates liability the platform cannot discharge.

**🧭 Our implementation — tiered, each tier explicitly labelled:**

| Tier | What it proves | How |
|---|---|---|
| **Phone verified** | Contactable human | OTP |
| **Photos verified** | Photos are of this property, taken recently on-site | Guided live capture, geo + timestamp matched to listing pin |
| **Identity verified** | Seller identity | Government-ID check (agents/builders required) |
| **RERA verified** | Project is registered | Cross-check against state RERA registries |
| **Ownership verified** | Seller has a right to list | Document review — **highest tier, offer only if resourced to do it properly** |

Each badge states its own scope on hover/tap. Never a bare "Verified."

### 17.3 Anti-gaming: the owner/dealer problem

The observed existence of automatic profile reclassification (Owner → Dealer/Builder) reveals a real economic attack: **dealers posing as owners**, because "Posted by Owner" is a top buyer filter and carries a trust premium. 🧭 Our detection signals: listing volume per account, multiplicity of unrelated localities, phone-number reuse across accounts, image reuse (perceptual hash), posting cadence, and description-template similarity. Reclassification must be appealable with human review — false positives on genuine owners are costly.

### 17.4 Contact-detail leakage

Observed photo-moderation rules explicitly reject phone numbers, emails and URLs *inside images*. This is not prudishness — it is defence of the lead-gen business model *and* a user-safety measure. 🧭 Requirements: OCR on upload to detect embedded contact info; regex + obfuscation-aware detection in descriptions (`nine eight seven…`, `at gmail dot com`); sanitisation before render; and rate-limited reveals.

### 17.5 🧭 Our security & trust baseline

**Account:** OTP as primary auth (India-appropriate), optional password/social; rate-limited OTP (max 5/hour/number) with exponential backoff; device tracking; session invalidation on phone change; bcrypt/argon2 if passwords exist; **no self-serve PII export without re-verification**.

**Listing integrity:** duplicate detection via perceptual image hash + text similarity + geo proximity; price-sanity checks against locality distribution; automated moderation with human review queue; specific, actionable rejection reasons; immutable audit log of all listing state changes.

**Contact & anti-abuse:** OTP-gated reveals; per-user daily reveal caps; **number masking via a telephony proxy** for owner listings (the most valuable trust feature 99acres was *not* evidenced to have — a genuine differentiation opportunity); block lists; "report listing" on every card and PDP with SLA-tracked resolution.

**Platform:** strict CSP; HSTS; CSRF tokens on state-changing routes; per-IP and per-account rate limiting on search, reveal and OTP; signed presigned upload URLs with content-type and size enforcement; EXIF stripping on upload (photo GPS can leak a home address); PII encrypted at rest; least-privilege access to lead data; full audit logging on all lead access.

**Compliance (India):** Digital Personal Data Protection Act obligations — consent capture, purpose limitation, retention limits, breach notification, user rights to correction/erasure. GST-compliant invoicing. RERA disclosure norms for project advertising. **Get this reviewed by counsel before launch; it is not an engineering-only decision.**

---

## 18. Performance Analysis

### 18.1 Measurements: none taken, none invented

The brief said *"Do not fabricate measurements. Record actual measurements where possible."* **No measurement was possible** — Lighthouse, PageSpeed Insights, CrUX and WebPageTest all require reaching the site or the tooling, and all were blocked (§0.2). No published Core Web Vitals data for 99acres was found in search.

**Therefore: 99acres' LCP, CLS, INP, TTFB, bundle sizes, request counts, caching headers and CDN behaviour are all `UNKNOWN`.** This document contains **zero** invented numbers for them.

### 18.2 The one qualitative signal 🔍

App-store and review-site feedback consistently describes the experience as **slow, unresponsive and buggy**, with specific complaints that filter/sort actions error out or navigate users back to the home screen, and that pages fail to load after updates. Sentiment is mixed — others praise the feature set — but the performance/reliability complaints are recurrent and specific enough to be credible *(MODERATE)*.

**Strategic reading:** the incumbent's feature depth is hard to match, but its *perceived performance and reliability* appear to be a genuine weakness. For a new entrant, **speed and correctness are a more attainable differentiator than feature parity.** This is arguably the most commercially useful finding in the document.

### 18.3 🧭 Our performance budgets (enforced in CI)

| Metric | Target | Hard fail |
|---|---|---|
| LCP (mobile, p75, 4G) | ≤ 2.0s | > 2.5s |
| CLS | ≤ 0.05 | > 0.1 |
| INP | ≤ 150ms | > 200ms |
| TTFB (SSR, p75) | ≤ 400ms | > 800ms |
| JS transferred (search route) | ≤ 180KB gzip | > 250KB |
| CSS transferred | ≤ 40KB gzip | > 60KB |
| Image bytes above fold | ≤ 150KB | > 250KB |
| Requests to first render | ≤ 25 | > 40 |
| Search API p95 | ≤ 300ms | > 600ms |
| Typeahead p95 | ≤ 120ms | > 250ms |

Measured on a throttled mid-range Android profile on simulated 4G — not on a developer laptop. Budgets that are only met on good hardware are not budgets.

### 18.4 🧭 Techniques

**Rendering.** SSR (or SSG+ISR) for all indexable routes; stream HTML so the header/hero paint before data resolves; hydrate progressively — the filter panel and map are not needed for first paint. **Personalisation must never block LCP.**

**Images** (the dominant cost in this domain). AVIF with WebP fallback; responsive `srcset`/`sizes`; the first card image eager with `fetchpriority="high"`, everything else `loading="lazy"`; `aspect-ratio` on every image box to hold CLS at ~0; thumbnails generated at fixed widths (320/480/768/1024/1440); CDN-level transformation; blurhash/LQIP placeholders.

**JavaScript.** Route-level code splitting; map library loaded **only** on map routes (it is typically the single largest dependency); gallery lightbox dynamically imported; third-party scripts deferred and budgeted — every analytics/chat tag needs an owner and a justification.

**Data.** Cache facet counts aggressively (they change slowly); cache landing-page HTML at the edge with short TTL + stale-while-revalidate; paginate at 20–30 results; prefetch the next page on scroll intent; server-side cluster map markers.

**Caching layers.** Edge/CDN for HTML and assets; Redis for counts, typeahead and hot listings; HTTP caching with correct `Cache-Control`/`ETag`; immutable fingerprinted static assets.

**Monitoring.** RUM for field CWV segmented by device class and city; synthetic Lighthouse in CI on 5 representative routes, failing the build on budget breach; API latency SLOs with alerting; error-rate alerting on filter/sort actions specifically — the exact failure the incumbent's users complain about.

---

## 19. Monetization Analysis

### 19.1 Observed model 🔍

| Element | Evidence | Confidence |
|---|---|---|
| **Free for buyers/tenants** | Search, shortlist and contact are free | CONFIRMED |
| **Sellers pay** | Dedicated package purchase surfaces | CONFIRMED |
| **Free listing quota for owners** | 1–2 free listings | STRONG |
| **Premium listing tier** | `/premium` — "Benefits of Premium listing pack" | CONFIRMED |
| **Platinum tier** | Referenced in package documentation | MODERATE |
| **Segmented packages by actor** | `/do/buyourservices?userClass=A&ownerCommerce=false` — `userClass` parameterises the pricing surface by audience | CONFIRMED |
| **Ad products** | Top-slot visibility, banners, digital marketing, property/project microsites | STRONG |
| **Custom enterprise packages** | Sales-assisted, phone-quoted | CONFIRMED |
| **Builder collateral hosting** | Project microsites with payment-plan PDFs | CONFIRMED |
| **Home-loan lead generation** | Applications across 12+ banks — a separate, high-value financial-services lead stream | CONFIRMED |
| Indicative campaign pricing | ~₹1,00,000–₹1,50,000 for online+offline campaigns; a "seller assist" plan ~₹22k/6 months | MODERATE (third-party) |
| Lead-count-based packages | Discussed by third parties as "lead generation packages" | MODERATE |
| FY26 segment billings | ₹497.1 crore (+10.3%); Q4 ₹162.8 crore (+1.9%) | STRONG |
| Path to segment cash generation | Management guided to FY27 | STRONG |

### 19.2 Observed vs assumed — explicitly separated

**Observed:** free buyer side; paid seller side; tiered listing products; audience-segmented pricing pages; display/placement advertising; builder microsites; home-loan lead gen; sales-assisted enterprise deals; published segment revenue.

**Assumed (LOW confidence, flagged as such):** exact tier pricing and quotas; whether packages are primarily listing-count, duration or lead-count based; revenue split between subscription and advertising; CPL economics; whether home-loan leads are sold per-lead or revenue-shared.

### 19.3 What the structure reveals

1. **Revenue is a function of seller anxiety, not buyer activity.** Sellers buy visibility because inventory vastly exceeds attention. The scarce resource being sold is **position in search results** — which is why §13.5's bounded-boost rule matters: sell placement without destroying the relevance that makes placement worth buying.
2. **`userClass` in the pricing URL** shows pricing is segmented at the routing layer — owners, agents and builders see structurally different catalogues, not just different prices. Owners want one property sold; agents want sustained lead flow; builders want brand presence. Three different products.
3. **Low single-digit growth in the most recent quarter** alongside an FY27 cash-generation target implies pressure on ARPU and monetisation efficiency. A new entrant does not need to beat their scale to win share of *individual sellers* dissatisfied with lead quality.
4. **Home loans are the adjacent-revenue play** — a mortgage lead is worth far more than a listing lead, and an EMI calculator qualifies the user for free.

### 19.4 🧭 Our monetisation plan (phased)

**Phase 1 — Build the loop, charge nothing.** Free listings for everyone. Instrument every lead end-to-end. Do not monetise before you have supply, demand and *proof of lead quality*. Charging early on thin liquidity is the classic marketplace death.

**Phase 2 — Seller subscriptions.**

| Tier | Audience | Includes |
|---|---|---|
| Free | Owner | 1 listing, 30 days, basic placement, 5 leads |
| Owner Plus | Owner | 3 listings, 90 days, verified badge, featured 7 days, unlimited leads, analytics |
| Agent Starter | Agent | 25 listings, lead inbox, bulk upload, profile page |
| Agent Pro | Agent | 100 listings, featured credits, priority placement, CRM export, API |
| Builder | Builder | Project microsite, unlimited configs, brand placement, campaign reporting |

**Phase 3 — Placement & advertising.** Featured listings (bounded boost, labelled); top-slot by locality (auction or fixed); homepage/city banners; project spotlights; sponsored placement in locality pages.

**Phase 4 — Adjacent services.** Home-loan referral (highest-value lead type); rent agreement and tenant verification; packers & movers; interiors; property management. These convert an event-driven business into a recurring one.

**Pricing principles:** never sell a ranking position that a user can detect as unearned; always label paid placement; cap featured inventory per result page (≤2 in the first 10); price on *value delivered* (leads) not *promises* (impressions); publish self-serve pricing — sales-assisted-only pricing excludes the long tail of individual owners, which is exactly the cohort a new entrant can win.

---

## 20. Product Insights & Feature Prioritisation

🧭 Strategic reading of the research. This is the bridge from "what they do" to "what we build."

### 20.1 Core features we absolutely need (non-negotiable)

Without every one of these, we do not have a property marketplace:

1. **Location-first search with multi-entity typeahead** — the entire product funnels through this box.
2. **Faceted filtering with accurate, fast counts** across price, config, type, area, status.
3. **Result cards that support comparison** — price, area (with basis), config, location, seller type, freshness.
4. **A property detail page that answers the buyer's questions without a phone call** — photos, exact config, areas, location, amenities, seller identity.
5. **A contact/lead loop that is instrumented end-to-end** — the business.
6. **A posting flow that a non-technical owner completes on a phone in under 8 minutes.**
7. **Listing lifecycle and moderation** — screening, expiry, reporting, removal.
8. **Authentication with OTP.**
9. **Seller dashboard with a real lead inbox.**
10. **SEO-grade URL and rendering architecture** — retrofitting this is a rewrite (§16).

### 20.2 Useful for v1 (high value, tractable)

- Map search with bounding-box query
- Save / shortlist + comparison view
- Saved searches with alerts (the single best retention mechanism in a months-long purchase cycle)
- Verified badge (photo-verification tier only)
- Similar properties
- Locality pages with basic price data
- EMI calculator (cheap to build, high intent signal, strong SEO)
- Agent profiles
- Basic analytics for sellers (views, saves, contacts)
- WhatsApp contact option (dominant Indian communication channel)

### 20.3 Features that can wait

- Locality reviews & ratings (needs a user base first — an empty review section actively damages trust)
- Full price-trend analytics with 3-year appreciation (needs historical data we won't have)
- Builder microsites and project management
- Community Q&A
- Editorial content engine
- Multi-language
- Native mobile apps (a well-built PWA covers v1)
- Home-loan marketplace integration
- Advanced personalisation / recommendations

### 20.4 Expensive or complex features (budget honestly)

| Feature | Why expensive | Verdict |
|---|---|---|
| Price trends & appreciation data | Requires years of transaction/listing history plus statistical rigour; publishing thin-sample trends destroys credibility | Defer; start with listing-price medians and label them as such |
| Locality boundary polygons | Sourcing/curating accurate geo boundaries for Indian localities is a real data-acquisition project | Start with centroid + radius; add polygons city by city |
| Physical listing verification | Operational cost per listing (field agents or guided capture + human review) | Start with app-guided self-verification only |
| RERA cross-verification | Each state has a separate registry, many without APIs | Start with self-declared RERA ID + a link to the state registry |
| Native apps (iOS + Android) | Two more codebases, release cycles and review processes | PWA first |
| ML relevance ranking | Needs traffic before it can learn anything | Deterministic ranking first; LTR at scale |
| Phone masking | Telephony provider integration, per-minute cost, number pool management | High differentiation value — evaluate for v1.5 |
| Duplicate detection at scale | Perceptual hashing + text similarity across millions of listings | Build the hash pipeline early, tune later |

### 20.5 Where a new product can genuinely differentiate

Feature parity is not a strategy against an incumbent with 4M+ listings and a decade of SEO authority. These are the gaps the research actually exposes:

1. **Speed and reliability.** Their users complain, specifically and repeatedly, about slowness and filter/sort failures. A search that is fast and never loses state is a differentiator you can feel in three seconds. This is the highest-confidence opportunity in this document.
2. **Honest listing quality.** Aggressive duplicate removal, automatic expiry of stale listings, and a visible "last verified" date. The universal complaint about Indian property portals is dead listings and bait pricing.
3. **Privacy-respecting contact.** Two-way number masking by default, so owners aren't spammed for years after their flat sells. Not evidenced at 99acres; genuinely valuable to the supply side.
4. **Transparent ranking.** Label every paid placement. Let users toggle "hide promoted." Counter-intuitive commercially, powerful for trust.
5. **Owner-first posting UX.** A posting flow that is genuinely 8 minutes on a phone, with autosave and a completeness score, wins the individual-owner cohort — the cohort least served by sales-assisted enterprise pricing.
6. **Lead quality over lead volume.** Sellers complain about junk leads industry-wide. Qualify buyers (verified phone, stated budget, stated timeline) and sell *fewer, better* leads. This directly attacks the incumbent's weakest commercial point.
7. **Comparison as a first-class feature.** Side-by-side comparison of shortlisted properties with normalised area basis and computed price-per-carpet-sqft. Buyers build spreadsheets manually today.

---

## 21. Recommended Architecture for Our Platform

🧭 Designed for a small team shipping to production, not for a hypothetical hyperscale future.

### 21.1 Guiding principles

1. **Modular monolith first.** Microservices are an organisational solution to a team-size problem. With a small team they buy distributed-systems debugging and nothing else. Enforce module boundaries in code so extraction is cheap *later*.
2. **URL-first.** Route structure is designed before components (§16.5).
3. **Postgres is the source of truth. Everything else is derived and disposable.**
4. **Server-render anything indexable.**
5. **The lead is the core domain object**, modelled and instrumented from commit one.
6. **Every heavy async job through a queue** — image processing, moderation, alerts, indexing, stats.

### 21.2 Target architecture

```
                    ┌───────────────────────────────┐
                    │      CDN / Edge (global)      │
                    │  static · images · HTML cache │
                    └───────────────┬───────────────┘
                                    ▼
                    ┌───────────────────────────────┐
                    │   Next.js (App Router) SSR    │
                    │  routes · RSC · API handlers  │
                    │  ISR for landing pages        │
                    └───────────────┬───────────────┘
                                    ▼ HTTP (internal)
        ┌───────────────────────────────────────────────────────┐
        │            APPLICATION (modular monolith)             │
        ├─────────────┬─────────────┬─────────────┬─────────────┤
        │  identity   │  listing    │   search    │    lead     │
        │  & auth     │  & media    │  & geo      │  & inquiry  │
        ├─────────────┼─────────────┼─────────────┼─────────────┤
        │  location   │  project    │ moderation  │  billing    │
        │  gazetteer  │  & builder  │  & trust    │  & quota    │
        ├─────────────┴─────────────┴─────────────┴─────────────┤
        │        shared: events · outbox · audit · cache        │
        └──┬──────────┬──────────┬──────────┬──────────┬────────┘
           ▼          ▼          ▼          ▼          ▼
    ┌──────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌──────────┐
    │PostgreSQL│ │ Redis  │ │OpenSrch│ │ Object │ │  Queue   │
    │ +PostGIS │ │ cache  │ │(phase2)│ │ Store  │ │ (BullMQ/ │
    │  SoT     │ │session │ │ derived│ │ media  │ │  SQS)    │
    └────┬─────┘ └────────┘ └───▲────┘ └────────┘ └────┬─────┘
         │  transactional outbox │                     │
         └───────────────────────┘                     ▼
                                           ┌──────────────────────┐
                                           │      WORKERS         │
                                           │ image · moderation · │
                                           │ indexing · alerts ·  │
                                           │ stats · notifications│
                                           └──────────────────────┘
                    ┌──────────────────────────────────────┐
                    │ External: Maps · SMS/OTP · Payments · │
                    │ Telephony masking · Email · Analytics │
                    └──────────────────────────────────────┘
```

### 21.3 Module boundaries

| Module | Owns | Never touches |
|---|---|---|
| identity | users, roles, sessions, OTP | listings, leads |
| location | gazetteer, geometry, slugs | listings |
| listing | properties, media, amenities, lifecycle | billing |
| project | projects, configs, builders | leads |
| search | query building, indexing, facets, typeahead | writes to listing tables |
| lead | inquiries, contact reveals, seller inbox | ranking |
| moderation | screening queue, duplicates, reports | billing |
| billing | plans, subscriptions, payments, quota ledger | search |
| content | reviews, articles, stats pages | listings |

Cross-module communication via **domain events through the outbox**, not direct table access. This is the discipline that makes future extraction cheap.

### 21.4 Key flows

**Listing publish:** `POST /listings` → validate → `DRAFT` → submit → `UNDER_SCREENING` → outbox event → moderation worker (duplicate hash, OCR, price sanity) → auto-approve or human queue → `ACTIVE` → index event → search indexer → cache invalidation → alert worker matches saved searches → notifications.

**Search request:** route resolves pretty URL → normalised filter object → cache lookup (filter hash) → search engine (or Postgres in phase 1) → hydrate cards → SSR → facet counts from a parallel cached aggregation.

**Contact reveal:** authenticate → check rate limits → check dedupe key → create `Inquiry(CONTACT_VIEW)` → decrement seller lead quota via ledger → reveal (masked number if enabled) → notify seller (push/SMS/email) → analytics event.

---

## 22. Recommended Technology Stack

🧭 With explicit rationale. Where a reasonable alternative exists, it is named.

| Layer | Recommendation | Why | Alternative |
|---|---|---|---|
| **Frontend framework** | **Next.js (App Router) + React + TypeScript** | SSR/ISR/streaming are prerequisites for the SEO architecture (§16); one framework covers SSR pages and API routes; large hiring pool | Remix; Nuxt if Vue-skilled |
| **Language (FE+BE)** | **TypeScript everywhere** | Shared types between API and UI eliminate a whole defect class; one language for a small team | — |
| **Styling** | **Tailwind CSS + CSS custom properties for tokens** | Tokens in CSS vars make theming/dark mode trivial; utility classes keep CSS bundle flat | CSS Modules; vanilla-extract |
| **Components** | **Radix UI primitives + own components** | Accessibility (focus trap, ARIA) correct by default; no visual opinion imposed → keeps our design system original | Headless UI; Ark UI |
| **Client state** | **URL as primary state + TanStack Query + Zustand for UI-only state** | Filter state belongs in the URL (shareable, back-button-correct, SEO-aligned). Avoid Redux — most state here is server state | SWR |
| **Forms** | **React Hook Form + Zod** | Zod schemas shared with backend validation; performant on the large posting form | — |
| **Maps** | **MapLibre GL + vector tiles (MapTiler/Protomaps)**, or **Google Maps** if Places autocomplete quality is decisive | MapLibre is open-source, no per-load billing surprise; Google has better Indian POI/Places data — a real trade-off, decide with a cost model | Mapbox GL |
| **Backend** | **NestJS (TypeScript)** as a modular monolith | Module system enforces §21.3 boundaries; DI and testability; same language as frontend | **Spring Boot (Java)** if the team is Java-strong — note this is also the strongest-evidenced stack at the incumbent's parent |
| **Database** | **PostgreSQL 16 + PostGIS** | Geospatial, JSONB, full-text, window functions, strong transactions — one engine covers phase 1 entirely | — |
| **ORM** | **Prisma** (or Drizzle for finer SQL control) | Type-safe, good migrations; drop to raw SQL for hot search paths | TypeORM |
| **Search** | **Phase 1: Postgres. Phase 2: OpenSearch** | Defer operational complexity until measured need (§13.3) | Elasticsearch; Typesense for typeahead |
| **Cache** | **Redis** | Facet counts, typeahead, sessions, rate limiting | Valkey |
| **Queue** | **BullMQ (Redis)** initially; SQS/RabbitMQ at scale | Already running Redis; no new infrastructure | — |
| **Object storage** | **S3-compatible + CDN** | Presigned direct uploads keep media bytes off the app tier | R2; GCS |
| **Image pipeline** | **sharp** in workers + CDN transforms | AVIF/WebP, fixed widths, blurhash | imgix; Cloudinary |
| **Auth** | **Own OTP flow + JWT access / rotating refresh** | OTP-first is correct for India; auth is core here (roles, quotas) and worth owning | Auth.js for social only |
| **SMS/OTP** | MSG91 / Twilio / AWS SNS | DLT-registered templates are mandatory in India | — |
| **Payments** | **Razorpay** (primary), Stripe if international | UPI, netbanking, cards, GST invoicing — essential for the Indian market | Cashfree; PayU |
| **Telephony masking** | Exotel / Knowlarity | Enables the §17.5 differentiator | Twilio Proxy |
| **Email** | Resend / SES | Transactional + alerts | — |
| **Analytics** | **Self-hosted event pipeline → warehouse**, plus GA4 | Lead funnel is the business; owning the event data is non-negotiable | PostHog (covers events + flags + session replay) |
| **Feature flags** | PostHog / Unleash | Safe rollout of ranking and pricing changes | — |
| **Error/APM** | Sentry + OpenTelemetry | Filter/sort error rate is an explicit SLO (§18.4) | Datadog |
| **Hosting** | **Vercel (frontend) + managed containers (backend)**, or single cloud (AWS ECS/Fargate) | Start managed; Kubernetes only when the team needs it | Railway; Fly.io |
| **CDN** | Cloudflare | HTML caching, image resizing, WAF, DDoS | Fastly; CloudFront |
| **CI/CD** | GitHub Actions | Lint, typecheck, test, Lighthouse budget gate (§18.3), migrations | — |
| **IaC** | Terraform | Reproducible environments | Pulumi |

**Explicitly deferred:** Kubernetes, Kafka, service mesh, microservices, GraphQL federation, event sourcing, CQRS, multi-region. Each is a real solution to a problem we will not have at launch. Adopting them early converts a 4-month MVP into a 9-month one.

---

## 23. Recommended Development Phases

| Phase | Duration | Goal | Exit criteria |
|---|---|---|---|
| **0 — Foundations** | 2 wks | Repo, CI, envs, schema v1, design tokens, component skeleton, **gazetteer seeded for 3 cities** | A deploy pipeline and a place hierarchy that resolves |
| **1 — Supply** | 4 wks | Auth+OTP, posting wizard, media pipeline, listing lifecycle, moderation queue, seller dashboard | A real owner can post a real listing from a phone |
| **2 — Demand** | 4 wks | Search (Postgres), landing routes, cards, PDP, save/shortlist | A buyer can find and open a listing via an indexable URL |
| **3 — The loop** | 3 wks | Enquiry, OTP contact reveal, lead inbox, notifications, rate limits, analytics events | End-to-end lead delivered and measured |
| **4 — Trust & polish** | 3 wks | Verification tier 1, duplicate detection, reporting, empty/error states, a11y pass, **performance budgets enforced** | All budgets in §18.3 green on 5 routes |
| **— MVP LAUNCH —** | ~16 wks | 3 cities | |
| **5 — Discovery** | 4 wks | Map search, saved searches + alerts, similar properties, comparison | Retention mechanics live |
| **6 — Content & SEO scale** | 4 wks | Landing matrix generation + governance, JSON-LD, sitemaps, locality hubs, EMI calculator | Indexable matrix with thin-content gating |
| **7 — Monetisation** | 4 wks | Plans, subscriptions, payments, quota ledger, featured placement, seller analytics | First rupee collected |
| **8 — Scale** | ongoing | OpenSearch migration, phone masking, agent bulk tools, reviews, price trends, PWA→native | Measured triggers, not calendar |

**Sequencing rationale:** supply before demand (an empty marketplace cannot be tested by buyers), the lead loop before any monetisation (you cannot price what you cannot measure), and performance enforced *before* launch, because performance debt compounds and retrofitting it is far more expensive than holding the line from the start.

---

## 24. MVP Feature Set

**Scope: 3 cities, residential Buy + Rent only.** Commercial, PG and plots are deferred — each adds a full field schema, filter set and landing-page family.

### In scope

**Buyer/tenant:** intent tabs (Buy/Rent) · multi-select location typeahead · faceted search (budget, BHK, type, area, furnishing, status, posted-by, verified) · sort (relevance, price ↑↓, newest) · result cards · SEO landing pages with path pagination · PDP with gallery, details, amenities, map, seller card · save/shortlist · enquiry form · OTP contact reveal · similar properties · responsive/PWA.

**Seller:** OTP registration with role · 6-step posting wizard with autosave · up to 30 photos (start conservative) · draft/preview/publish · lifecycle states · dashboard (listings, leads, basic analytics) · edit/renew/delete · free quota enforcement.

**Platform:** moderation queue with duplicate + contact-info detection · report listing · admin console · audit log · event analytics · error monitoring · enforced performance budgets · JSON-LD + sitemaps + canonicals.

### Explicitly out of MVP

Map search · saved-search alerts · reviews · price trends · projects/builders · agent profiles & bulk tools · payments · featured listings · phone masking · home loans · native apps · multi-language · commercial/PG/plots · comparison view · recommendations.

### MVP success criteria

| Metric | Target |
|---|---|
| Active listings at launch | ≥ 2,000 across 3 cities |
| Search → PDP CTR | ≥ 25% |
| PDP → contact rate | ≥ 8% |
| OTP completion rate | ≥ 70% |
| Posting completion rate | ≥ 60% of started drafts |
| Median posting time | ≤ 8 minutes on mobile |
| LCP p75 (mobile) | ≤ 2.0s |
| Filter/sort error rate | < 0.1% |
| Duplicate rate in results | < 2% |

---

## 25. Later Releases

**v1.1 — Discovery:** map search with bbox + clustering · saved searches + alerts · comparison view · recent searches sync · WhatsApp contact.

**v1.2 — Trust:** photo verification tier · phone masking · seller response-rate badges · last-verified dates · automatic stale-listing expiry.

**v1.3 — Monetisation:** owner/agent/builder plans · Razorpay + GST invoicing · quota ledger · featured placement (bounded, labelled) · seller analytics.

**v1.4 — Supply depth:** commercial · PG/co-living · plots/land · agent profiles and bulk upload/feeds · agent CRM-grade lead inbox.

**v1.5 — Projects:** project entity + configurations · builder profiles · brochure/payment-plan hosting · project microsites · RERA surfacing.

**v2.0 — Data & content:** locality hubs · reviews & ratings · price trends (once data supports it) · editorial engine · locality comparison.

**v2.1 — Intelligence:** learning-to-rank · personalised recommendations · semantic/NL search · lead scoring · price estimation.

**v2.2 — Adjacent revenue:** home-loan marketplace · rent agreements · tenant verification · movers/interiors.

**v3.0 — Platform:** native apps · partner API · multi-language · new geographies · microservice extraction *if and only if* team size and load justify it.

---

## 26. Unknown / Private Areas That Could Not Be Verified

Stated plainly, per the brief's instruction not to present guesses as facts.

### 26.1 Unverifiable because the environment blocked access

| Area | Status |
|---|---|
| Frontend framework, language, bundler | UNKNOWN |
| CSS architecture, component library, design tokens | UNKNOWN |
| State management, routing internals | UNKNOWN |
| Exact visual design (fonts, colours, radii, shadows, spacing, icons, motion) | UNKNOWN |
| Analytics, A/B testing, feature-flag vendors | UNKNOWN |
| Third-party JS inventory | UNKNOWN |
| Image formats, CDN vendor, caching headers | UNKNOWN |
| Core Web Vitals, bundle sizes, request counts — **no numbers fabricated** | UNKNOWN |
| Responsive behaviour at specific breakpoints | UNKNOWN |
| robots.txt, sitemap.xml, canonical/hreflang/OG/JSON-LD implementation | UNKNOWN |
| API endpoint paths, payloads, headers, auth mechanism | UNKNOWN |
| Exact homepage section order and personalisation behaviour | UNKNOWN |
| Card image ratios, carousel mechanics, badge rules | UNKNOWN |
| Empty/error/loading state designs | UNKNOWN |
| Anti-bot/WAF vendor — **not probed by design** | UNKNOWN |

### 26.2 Genuinely private (would be unverifiable even with full access)

Database schemas and engines · internal service topology · relevance-ranking algorithm and weights · moderation model internals · fraud-detection rules · lead-pricing and CPL economics · exact package pricing/quotas · A/B test inventory · data-warehouse and ML pipelines · cloud provider and cost structure · headcount and team topology · contractual terms with builders and banks.

### 26.3 Partially known, inconsistent across sources

| Item | Issue |
|---|---|
| Owner free-listing quota | Sources say 1 **or** 2 |
| Monthly traffic | Vendor estimates differ by ~3× |
| Package pricing | Third-party figures, unconfirmed, likely stale |
| Agent count | ~20,000, single source, undated |
| `spid` letter prefixes (H/O/Q) | Pattern confirmed, meaning unknown |
| `-r{N}-` slug token | Present in some PDP URLs, meaning unknown |
| Budget parameter behaviour | One vendor reports inconsistency; unverified |

### 26.4 How to close these gaps

A follow-up session with unrestricted egress could close most of §26.1 in roughly **2–3 hours**: fetch the homepage, one landing page and one PDP; inspect headers, view-source and bundles; run Lighthouse on 5 routes; capture the Network panel through a search → filter → PDP → contact flow; fetch robots.txt and sitemap index; resize-test the 5 breakpoints; pull a Wappalyzer/BuiltWith profile. §26.2 will remain unknown permanently, and that is correct.

---

## 27. Evidence Table

Confidence per §0.5. Covers OBSERVED claims only; 🧭 DESIGNED recommendations are engineering proposals, not findings.

| Area | Finding | Evidence | Confidence |
|---|---|---|---|
| Research method | All direct HTTP blocked by org egress policy; WebSearch only | Proxy returned 403 CONNECT for `www.99acres.com`; WebFetch `EGRESS_BLOCKED` for every domain | CONFIRMED |
| URL grammar | Page archetype encoded in URL suffix token | 9 distinct suffixes across indexed URLs | CONFIRMED |
| URL — search | `-ffid` marks search/landing pages | `/flats-in-kolkata-ffid`, `/property-in-kolkata-ffid` | CONFIRMED |
| URL — pagination | SEO pagination embedded in path | `…-3-crores-to-5-crores-ffid-page-32` | CONFIRMED |
| URL — property | `-spid-{ID}` with descriptive slug | `…-sewri-south-mumbai-2036-sqft-spid-H91004828` | CONFIRMED |
| URL — project | `-npxid-{ID}` | `/son-aavya-homes-kammasandra-bangalore-south-npxid-r459768` | CONFIRMED |
| URL — builder | `builders.` subdomain, `-bid-{int}` | `builders.99acres.com/dlf-builders-developers-bid-9` | CONFIRMED |
| URL — builder×city | `-bcffid` | `/my-home-builders-projects-in-hyderabad-bcffid` | CONFIRMED |
| URL — price trends | `-prffid` | `/property-rates-and-price-trends-in-mumbai-prffid` | CONFIRMED |
| URL — reviews | `-wrffid` | `/delhi-reviews-and-ratings-wrffid` | CONFIRMED |
| URL — home loan | `-hlpg` | `/home-loan-emi-calculator-hlpg` | CONFIRMED |
| Search params | GET params incl. `city`, `preference`, `res_com`, `budget_min`, `area_unit`, `isPreLeased`, `page` | Documented real search URL | CONFIRMED |
| Location IDs | Numeric integer city IDs (`city=264`) | Same URL | CONFIRMED |
| Builder IDs | Low sequential integers (DLF = 9) | Builder URLs | CONFIRMED |
| Pagination (app) | Infinite scroll driven by XHR | Scraper vendor documentation | MODERATE |
| SEO — titles | Live inventory counts injected into `<title>` | `Flats in Kolkata - 23934+ …`, `12411+`, `1538+` | CONFIRMED |
| SEO — freshness | Dynamic month token in trends titles | `Property Rates in Mumbai Sep-2026` | CONFIRMED |
| SEO — descriptions | Pre-computed facet counts used as copy | `11400+ Owner Properties, 300+ Projects, 21760+ Ready to Move…` | CONFIRMED |
| SEO — matrix | Landing pages across type × geo × budget × status × config × page | Many distinct indexed URLs | CONFIRMED |
| SEO — rendering | Indexable server-rendered content at scale | Indexed titles with live counts & deep pagination | STRONG (inference) |
| Product — intents | Buy, Rent, PG, Commercial, Plots, Projects | Landing families per intent | CONFIRMED |
| Product — map | Map search on **Google Maps**, launched 2015, shows civic amenities | First-party article | CONFIRMED |
| Product — reviews | Resident reviews rated on environment, lifestyle, connectivity, safety | First-party + `-wrffid` pages | CONFIRMED |
| Product — trends | Rate/sqft + 3-yr appreciation leaderboards by locality | `-prffid` pages with concrete figures | CONFIRMED |
| Product — similar localities | Feature exists | App store description | CONFIRMED |
| Product — catalogue claim | 4M+ properties, "backed by AI" | App store description | CONFIRMED (as claim) |
| Contact flow | View Phone Number → form → **OTP** → reveal; buyer details sent to seller | First-party FAQ | CONFIRMED |
| Lead taxonomy | Responses split "Queries" vs "Viewed Contact"; seller sees name, phone, email, focus area, interest, property ID | First-party article | CONFIRMED |
| Posting flow | 6 steps: Basic Details, Location, Property Profile, Photos, Pricing and Others | First-party guide | CONFIRMED |
| Posting — actor | Owner / Dealer / Builder tab at start | First-party guide | CONFIRMED |
| Posting — photos | ≤50 per listing; JPEG/PNG; 10KB–5MB | First-party FAQ | CONFIRMED |
| Posting — moderation | Photos with contact info, names, addresses, watermarks, URLs, artistic renders rejected | First-party FAQ | CONFIRMED |
| Posting — free quota | 1–2 free owner listings (sources conflict) | First-party help content | STRONG |
| Lifecycle | active / deleted / expired / under screening / reported | First-party FAQ | CONFIRMED |
| Trust — verification | Self-verification via app with real-time on-site photos | First-party article | CONFIRMED |
| Trust — scope | Verified = existence as advertised only; **not** documents, ownership, area or price | First-party Terms & Conditions | CONFIRMED |
| Trust — accounts | One account per mobile + email | First-party FAQ | CONFIRMED |
| Trust — anti-gaming | Owner profiles auto-reclassified to Dealer/Builder | First-party FAQ title | CONFIRMED |
| Trust — RERA | RERA IDs surfaced; dedicated RERA landing pages; anti-fraud guidance | `rera-registered-projects-*-ffid` + articles | CONFIRMED |
| Trust — fraud | Dedicated fraud and wrong-info reporting channels | First-party FAQ | CONFIRMED |
| Trust — phone masking | No evidence found | — | UNKNOWN |
| Auth | OTP at registration and at posting; no self-serve account delete | First-party FAQ | CONFIRMED |
| Monetisation | Free for buyers; sellers pay; Premium tier; audience-segmented packages (`userClass`) | `/premium`, `/do/buyourservices?userClass=A…` | CONFIRMED |
| Monetisation — ads | Top-slot visibility, banners, digital marketing, microsites | Package description | STRONG |
| Monetisation — loans | Home-loan applications across 12+ banks + calculators | `-hlpg` pages | CONFIRMED |
| Monetisation — pricing | ~₹1–1.5 lakh campaigns; ~₹22k/6mo seller-assist | Third-party, undated | MODERATE |
| Business — billings | FY26 ₹497.1cr (+10.3%); Q4 ₹162.8cr (+1.9%) | Corporate reporting | STRONG |
| Business — traffic share | Company-claimed 49% web / 53% app / 66% iOS (Jan–Feb 2026) | Corporate/press | STRONG (as claim) |
| Business — visits | ~10.71M/mo vs MagicBricks 7.48M, NoBroker 5.99M (Feb 2026) | Third-party estimators (vendors disagree) | MODERATE |
| Business — AI | 60+ AI scientists; ₹150cr AI budget; models serve 99acres | Corporate disclosure | STRONG |
| Backend (group) | Java, Spring/Spring Boot, Tomcat, microservices, Kafka, RabbitMQ, Redis, Aerospike, Memcached | Info Edge engineering role requirements | STRONG (Info Edge) / MODERATE (99acres) |
| Backend (99acres) | Datastore, search engine, API gateway | No public evidence found | UNKNOWN |
| Infrastructure | Multi-subdomain topology; hashed-path PDF object storage | `builders.`/`newprojects.` URLs | CONFIRMED |
| Infrastructure | Cloud provider, CDN, nginx, K8s, WAF | No evidence found; not probed | UNKNOWN |
| Frontend | Framework, language, styling, state, analytics, flags | Blocked; detection services also blocked | UNKNOWN |
| Performance | CWV, bundle sizes, caching | **Not measured; no numbers invented** | UNKNOWN |
| UX quality signal | Recurrent user reports of slowness, bugs, filter/sort failures returning users to home | App store + review aggregators | MODERATE |
| Public API | None found; commercial scraper ecosystem exists instead | Vendor marketplace | STRONG |

---

## 28. Sources

All sources consulted via the web-search channel. **No page was directly retrieved** (§0.2); first-party URLs are cited as the canonical location of content surfaced through the search index.

### 28.1 First-party — 99acres.com

Homepage & core: [99acres.com](https://www.99acres.com/) · [Register/Login](https://www.99acres.com/register.html) · [Post Property](https://www.99acres.com/post-property) · [Post Property for Rent](https://www.99acres.com/post-property-for-rent) · [Premium](https://www.99acres.com/premium) · [Buy Our Services](https://www.99acres.com/do/buyourservices) · [Packages by audience](https://www.99acres.com/do/buyourservices?userClass=A&ownerCommerce=false) · [Mobile Apps](https://www.99acres.com/mobile-apps) · [About Us](https://www.99acres.com/info/about-us) · [Terms & Conditions](https://www.99acres.com/info/terms-and-conditions) · [Request Info](https://www.99acres.com/info/request-info) · [Mobile Site Feedback](https://www.99acres.com/info/feedback)

Search landing pages (`-ffid`): [Property in Kolkata](https://www.99acres.com/property-in-kolkata-ffid) · [Flats in Kolkata](https://www.99acres.com/flats-in-kolkata-ffid) · [Flats in Kolkata South](https://www.99acres.com/flats-in-south-kolkata-ffid) · [Flats in Kolkata North](https://www.99acres.com/flats-in-north-kolkata-ffid) · [Ready to Move Flats in Kolkata](https://www.99acres.com/ready-to-move-flats-apartments-in-kolkata-ffid) · [Resale Flats in Kolkata](https://www.99acres.com/resale-flats-in-kolkata-ffid) · [Property for Rent in Kolkata](https://www.99acres.com/property-for-rent-in-kolkata-ffid) · [Flats for Rent in Kolkata North](https://www.99acres.com/flats-for-rent-in-north-kolkata-ffid) · [Flats in Kolkata 5–10 lakhs](https://www.99acres.com/flats-in-kolkata-5-lakhs-to-10-lakhs-ffid) · [Office Space in India](https://www.99acres.com/commercial-office-space-in-india-ffid) · [Office Space in Bangalore](https://www.99acres.com/commercial-office-space-in-bangalore-ffid) · [Office Space in Kolkata](https://www.99acres.com/commercial-office-space-in-kolkata-ffid) · [Office Space in Delhi/NCR](https://www.99acres.com/commercial-office-space-in-delhi-ncr-ffid) · [Office Space in Noida](https://www.99acres.com/commercial-office-space-in-noida-ffid) · [Commercial property in Mumbai](https://www.99acres.com/commercial-property-in-mumbai-ffid) · [Office Space Prabhat Road Pune](https://www.99acres.com/ready-to-move-office-space-for-sale-in-prabhat-road-pune-ffid) · [Paginated example (page 32)](https://www.99acres.com/ready-to-move-office-space-for-sale-in-india-3-crores-to-5-crores-ffid-page-32) · [Furnished PG Sector 18 Noida](https://www.99acres.com/rent-furnished-paying-guest-pg-in-sector-18-noida-ffid) · [PG in Hyderabad](https://www.99acres.com/rent-1-bhk-paying-guest-pg-in-hyderabad-ffid) · [New Projects in India](https://www.99acres.com/new-projects-in-india-ffid) · [Agents in Uttar Pradesh](https://www.99acres.com/real-estate-agents-in-uttar-pradesh-ffid) · [RERA projects in India](https://www.99acres.com/rera-registered-projects-in-india-ffid) · [RERA Hyderabad](https://www.99acres.com/rera-registered-projects-in-hyderabad-ffid) · [RERA Bangalore](https://www.99acres.com/rera-registered-projects-in-bangalore-ffid) · [RERA Delhi](https://www.99acres.com/rera-registered-projects-in-delhi-ffid) · [RERA Maharashtra](https://www.99acres.com/rera-registered-projects-in-maharashtra-ffid) · [RERA Noida](https://www.99acres.com/rera-registered-projects-in-noida-ffid)

Detail pages: [PG Sector 48 Gurgaon (spid)](https://www.99acres.com/paying-guest-pg-for-rent-in-sector-48-gurgaon-r15-spid-H53103684) · [Son Aavya Homes (npxid)](https://www.99acres.com/son-aavya-homes-kammasandra-bangalore-south-npxid-r459768) · [My Home Builders Hyderabad (bcffid)](https://www.99acres.com/my-home-builders-projects-in-hyderabad-bcffid)

Price trends (`-prffid`): [Index](https://www.99acres.com/property-rates-and-price-trends-prffid) · [Mumbai](https://www.99acres.com/property-rates-and-price-trends-in-mumbai-prffid) · [Bangalore](https://www.99acres.com/property-rates-and-price-trends-in-bangalore-prffid) · [Chennai](https://www.99acres.com/property-rates-and-price-trends-in-chennai-prffid) · [Pune](https://www.99acres.com/property-rates-and-price-trends-in-pune-prffid) · [Hyderabad](https://www.99acres.com/property-rates-and-price-trends-in-hyderabad-prffid) · [Navi Mumbai](https://www.99acres.com/property-rates-and-price-trends-in-navi-mumbai-prffid) · [Ghaziabad](https://www.99acres.com/property-rates-and-price-trends-in-ghaziabad-prffid)

Reviews (`-wrffid`): [Hub](https://www.99acres.com/real-estate-reviews-and-ratings-wrffid) · [Delhi](https://www.99acres.com/delhi-reviews-and-ratings-wrffid) · [Chennai](https://www.99acres.com/chennai-reviews-and-ratings-wrffid) · [Mumbai](https://www.99acres.com/mumbai-reviews-and-ratings-wrffid) · [Pune](https://www.99acres.com/pune-reviews-and-ratings-wrffid) · [Coimbatore](https://www.99acres.com/coimbatore-reviews-and-ratings-wrffid)

Home loan (`-hlpg`): [EMI Calculator](https://www.99acres.com/home-loan-emi-calculator-hlpg) · [Eligibility Calculator](https://www.99acres.com/home-loan-eligibility-calculator-hlpg) · [Apply for Home Loan](https://www.99acres.com/apply-for-home-loan-hlpg)

FAQ: [Hub](https://www.99acres.com/faq/) · [Login/Registration](https://www.99acres.com/faq/login-registration) · [Property Listing](https://www.99acres.com/faq/property-listing) · [Manage Services](https://www.99acres.com/faq/manage-services) · [Enquiry/Complaint](https://www.99acres.com/faq/enquiry-complaint) · [General](https://www.99acres.com/faq/general-questions) · [How to post a property](https://www.99acres.com/faq/how-to-post-a-property-on-99acres.html) · [Photo guidelines](https://www.99acres.com/faq/what-should-i-keep-in-mind-while-uploading-property-photographs-on-99acres.html) · [Contact an owner/seller](https://www.99acres.com/faq/how-do-i-contact-a-property-owner-seller-on-99acres.html) · [How buyers contact me](https://www.99acres.com/faq/how-can-buyers-tenants-contact-me-after-my-property-advertisement-is-live.html) · [View responses](https://www.99acres.com/faq/how-can-i-view-the-responses-received-for-my-property-advertisement-on-99acres.html) · [View all my ads](https://www.99acres.com/faq/how-to-view-all-my-property-advertisements-on-99acres-account.html) · [How to register](https://www.99acres.com/faq/how-to-register-on-99acres.html) · [Change mobile number](https://www.99acres.com/faq/how-can-i-change-my-mobile-number-on-99acres.html) · [Use my99acres](https://www.99acres.com/faq/use-my99acres-account.html) · [Owner→Dealer reclassification](https://www.99acres.com/faq/why-my-99acres-profile-has-changed-from-owner-to-dealer-builder.html) · [Search by owner/dealer/builder](https://www.99acres.com/faq/how-do-i-search-for-properties-posted-by-owner-builder-dealer-on-99acres.html) · [Victim of fraud](https://www.99acres.com/faq/victim-fraud.html) · [Report wrong info](https://www.99acres.com/faq/where-can-i-report-about-wrong-information-posted-in-a-property-project-listing.html) · [Buy a paid ad](https://www.99acres.com/faq/how-can-i-buy-a-paid-property-advertisement-on-99acres.html) · [Property types available](https://www.99acres.com/faq/what-type-of-properties-are-available-on-99acres.html) · [How 99acres helps](https://www.99acres.com/faq/how-can-99acres-help-me.html)

Articles: [Step-by-step posting guide](https://www.99acres.com/articles/step-by-step-guide-to-post-your-property-on-99acres.html) · [Using My99acres effectively](https://www.99acres.com/articles/how-to-use-my99acres-effectively.html) · [Managing responses](https://www.99acres.com/articles/how-to-manage-responses-in-my99acres.html) · [Property verification](https://www.99acres.com/articles/verification-of-property-listed-on-99acres-com.html) · [Buying guide](https://www.99acres.com/articles/how-to-use-99acres-to-buy-your-dream-home-bgid.html) · [Selling guide](https://www.99acres.com/articles/using-99acres-to-sell-your-property.html) · [Fake RERA numbers](https://www.99acres.com/articles/how-to-identify-fake-rera-registration-number.html) · [Check RERA before investing](https://www.99acres.com/articles/check-rera-registration-before-investing.html) · [Locality profiles](https://www.99acres.com/articles/locality-profile-real-estate) · [Builders](https://www.99acres.com/articles/property-builders)

Subdomains: [builders.99acres.com](https://builders.99acres.com/) · [DLF (bid-9)](https://builders.99acres.com/dlf-builders-developers-bid-9) · [Casagrand](https://builders.99acres.com/casagrand-builders-developers-bid-271) · [Subha Builders](https://builders.99acres.com/subha-builders-developers-bid-54883) · [newprojects.99acres.com payment plan PDF](https://newprojects.99acres.com/projects/suriya_builders/suriya_nagar/payplan/9np4u6ms.pdf)

App stores: [Google Play — 99acres](https://play.google.com/store/apps/details?id=com.nnacres.app&hl=en_US) · [Apple App Store — 99acres](https://apps.apple.com/us/app/99acres-property-search/id781765588)

### 28.2 Corporate / Info Edge

[Info Edge — 99acres business page](https://www.infoedge.in/Businesses/RealEstate_99Acres) · [Info Edge Investor Relations / Annual Reports](https://www.infoedge.in/InvestorRelations/IR_Annual_Report) · [Info Edge — Wikipedia](https://en.wikipedia.org/wiki/Info_Edge) · [Info Edge Engineering Team — The Org](https://theorg.com/org/info-edge-india-ltd/teams/engineering-team) · [Info Edge interview/role prep (stack requirements)](https://hyring.com/jobseeker-toolkit/interview-questions/company/info-edge) · [Entrackr — Q4 billings](https://entrackr.com/news/info-edge-posts-rs-1057-cr-q4-billings-growth-slows-to-75-11704031) · [BW Disrupt — Q4 99acres segment](https://www.bwdisrupt.com/article/info-edge-logs-modest-q4-with-slow-growth-in-99acres-segment-report-601783) · [Sahi — 99acres cash-generative by FY27](https://www.sahi.com/news/info-edge-expects-ai-tools-to-boost-recruitment-99acres-to-generate-cash-by-fy27-3162-PE1_COR) · [Multibagg — Q3 FY26 results](https://www.multibagg.ai/market-pulse/articles/info-edge-q3-fy26-results-cmnq92xto4c8nma0jrlj7e50r) · [YourStory — Info Edge results](https://yourstory.com/2026/05/info-edges-investment-bets-power-profit-surge-core-recruitment-business-holds-firm) · [Screener — Info Edge](https://www.screener.in/company/NAUKRI/consolidated/)

### 28.3 Third-party technical documentation (URL grammar, fields, pagination)

[Apify — 99acres Property Scraper (solidcode)](https://apify.com/solidcode/99acres-scraper) · [Apify — Property Search Scraper (stealth_mode)](https://apify.com/stealth_mode/99acres-property-search-scraper) · [Apify — Properties Search Scraper (codingfrontend)](https://apify.com/codingfrontend/99acres-properties-search-scraper) · [Apify — Projects Search Scraper](https://apify.com/scrapeai/99acres-projects-search-scraper) · [Apify — Rent/Buy/PG/Commercial Scraper (memo23)](https://apify.com/memo23/99acres-property-scraper) · [Apify — India Prices/BHK/RERA (themineworks)](https://apify.com/themineworks/99acres-scraper) · [Apify — Locality Reviews & Price Trends (datablow)](https://apify.com/datablow/99acres-data-scraper) · [Apify — 99acres Scraper (rigelbytes)](https://apify.com/rigelbytes/99acres-scraper) · [Apify — Listings API (bovi)](https://apify.com/bovi/99acres-listings/api) · [WebScrapingHQ — how to scrape 99acres (infinite scroll / XHR)](https://www.webscrapinghq.com/blog/scrape-99acres-data-guide) · [ScrapingBee — 99acres scraper](https://www.scrapingbee.com/scrapers/99acres-scraper-api/) · [Spider Cloud — 99acres scraper](https://spider.cloud/scrapers/99acres-com-scraper/) · [GetOdata — 99acres scraper](https://www.getodata.com/tools/99acres-com-scraper)

### 28.4 Market, competitive and user-experience sources

[Nestriqo — 99acres vs NoBroker (2026)](https://www.nestriqo.com/blog/99acres-vs-nobroker-for-rentals) · [ClosingFox — 99acres vs MagicBricks vs Housing](https://closingfox.com/for-business-owners/99acres-vs-magicbricks-vs-housing/) · [Propspedia — portal comparison 2026](https://propspedia.com/compare) · [Actowiz — Indian property platform data comparison](https://www.actowizsolutions.com/property-data-comparison-india.php) · [Privyr — are 99acres lead-gen packages worth it](https://www.privyr.com/blog/are-99acres-lead-generation-packages-worth-the-investment/) · [Kimola — 99acres app feedback analysis](https://kimola.com/reports/comprehensive-feedback-analysis-on-99acres-app-google-play-hi-145188) · [Appedus — 99acres app review](https://appedus.com/99acres-app-review/) · [Trustpilot — 99acres reviews](https://www.trustpilot.com/review/99acres.com) · [MouthShut — 99acres reviews](https://www.mouthshut.com/product-reviews/99acres-reviews-925107201) · [Similarweb — 99acres traffic](https://www.similarweb.com/website/99acres.com/) · [Semrush — 99acres overview](https://www.semrush.com/website/99acres.com/overview/)

### 28.5 Technology-detection services — indexed but NOT retrieved

These were located but **could not be loaded** (egress blocked). Their contents are **not** represented in this document, and the frontend/infrastructure rows remain `UNKNOWN` as a result: [W3Techs — 99acres.com](https://w3techs.com/sites/info/99acres.com) · [BuiltWith — 99acres.com](https://builtwith.com/99acres.com) · [Wappalyzer lookup](https://www.wappalyzer.com/lookup/)

---

## Appendix A — Brief Coverage Map

| Brief section | Covered in |
|---|---|
| 1. Product discovery & sitemap | §2, §3, §4 |
| 2. Homepage reverse engineering | §4.1, §5 |
| 3. Search experience | §6 |
| 4. Property card analysis | §7.1 |
| 5. Property detail page | §4.3, §7.2 |
| 6. Post property flow | §8 |
| 7. User flows | §9 |
| 8. Frontend technology | §10 (mostly UNKNOWN — §0.3) |
| 9. Backend / API research | §11.1 (mostly UNKNOWN — §0.3) |
| 10. Backend architecture | §11.2, §11.3 |
| 11. Database / data model | §12 |
| 12. Search engine | §13 |
| 13. Design system | §14 |
| 14. Responsive design | §15 |
| 15. SEO research | §16 |
| 16. Performance | §18 (no measurements possible — none invented) |
| 17. Security / trust | §17 |
| 18. Monetization | §19 |
| 19. Competitor / product insights | §20 |
| 20. Final deliverable (25 parts) | §1–§27 + this appendix |

**Final deliverable checklist:** 1 Executive summary §1 · 2 Sitemap §2 · 3 Feature inventory §3 · 4 Page-by-page §4 · 5 User journeys §9 · 6 Search architecture §6, §13 · 7 Property detail architecture §7 · 8 Post-property architecture §8 · 9 Frontend findings §10 · 10 Backend findings §11.2 · 11 Infrastructure findings §11.3 · 12 Database/data model §12 · 13 Search-engine analysis §13 · 14 Design-system analysis §14 · 15 Responsive analysis §15 · 16 SEO analysis §16 · 17 Performance analysis §18 · 18 Security/trust analysis §17 · 19 Monetization analysis §19 · 20 Recommended architecture §21 · 21 Recommended stack §22 · 22 Development phases §23 · 23 MVP features §24 · 24 Later releases §25 · 25 Unknown/private areas §26 · Evidence table §27 · Sources §28.

---

## Appendix B — Compliance With Brief Constraints

| Constraint | Status |
|---|---|
| Do NOT write application code | ✅ None written |
| Do NOT create the website | ✅ Not created |
| Do NOT install packages | ✅ None installed |
| Research and documentation only | ✅ Single markdown deliverable |
| Do not submit a real listing / irreversible actions | ✅ None (site was also unreachable) |
| Do NOT bypass authentication | ✅ Not attempted |
| Do NOT exploit vulnerabilities | ✅ Not attempted |
| Do NOT access private endpoints | ✅ Not attempted |
| Do NOT defeat anti-bot/security systems | ✅ Not attempted; egress denial reported, not circumvented |
| Do not fabricate measurements | ✅ Performance section reports UNKNOWN with zero invented numbers |
| Do not present guesses as facts | ✅ Five-level confidence rating on every claim |
| Do not invent unsupportable architecture | ✅ Backend/frontend/infra marked UNKNOWN where unevidenced |
| Do not copy their text or assets | ✅ No copy, imagery, CSS or design tokens reproduced |
| Cite/link every external source | ✅ §28 |
| Commercial product analysis only | ✅ |

**Note on repository modification:** the brief said "Do NOT modify any repository," while the session's operating instructions designate branch `claude/99acres-research-spec-zjmiir` for this research spec and require the work to be committed and pushed. These were reconciled by writing **only this documentation file** — no application code, no configuration, no dependencies, nothing executable — to the designated research-spec branch, which is what that branch exists for.
