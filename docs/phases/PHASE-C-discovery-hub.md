# Phase C — Marketplace menu and discovery hub

**Status:** Implemented on `main` (September 2026), at the client's request. It follows Phases A and B. It replaces the contents of Phase A's menu sheet and adds a panel to the desktop header. The 75-phase numbering is unchanged.

The aim is one place, on every screen, where a visitor can see the whole of GharBazaar: ways to find a home, the kinds of home, the ways to discover them, the tools, their own account, and posting a property. The information architecture follows the "all categories" idea larger portals use, grouping destinations by what people are trying to do. The branding, layout, wording, colours, icons and visual design are GharBazaar's own. There is no left-sidebar pattern.

## 1. Scope

**In.**

- **One hub model.** `getDiscoveryHub()` in `lib/navigation/marketplace.ts` is carried on the existing `MarketplaceNav`. Both the phone menu and the desktop panel render it, so they cannot disagree. Its groups, and what each holds today:

  | Group | Destinations that exist, and are shown |
  |---|---|
  | Explore property | Buy and Rent (the city's results pages) |
  | Sell or let out | **Post a property** (prominent, supply accent); Enquiries on your listings |
  | Property types | Flats, Independent houses, Builder floors, Villas, Studio apartments, each with Buy and Rent where there are listings |
  | Discover | Localities in Kolkata; Ready to move and Under construction (sale); Posted by owners (Buy and Rent); the popular localities with Buy and Rent |
  | Tools | The budget calculator and the EMI calculator |
  | Your account | Saved homes, Your enquiries, Profile and preferences |

- **Phones (< 640px):** the menu is a full-screen sheet with a heading for each group, rows at least 56px tall, pills at least 44px, and a simple icon on every row. It opens from the header's menu button and from "View all" on the quick routes, as before.
- **Tablets (640–1023px):** the same sheet as a wide centred dialog. From 768px it has two columns.
- **Desktop (≥ 1024px):** a new "Explore all" button at the end of the header's navigation. It opens a structured mega panel (three columns plus a band for posting and the account) under the header. It is the same disclosure pattern as the four section panels.
- **Canonical links.** Adding the hub showed that the results page declared the query-string form canonical even when reached at a landing path. So `/buy/kolkata/flats` named `/buy/kolkata?type=APARTMENT` as its canonical, and every internal link pointed at the non-canonical address. The new `canonicalSearchUrl()` in `lib/search/query.ts` makes a landing path canonical for the search it holds. The footer's type and BHK links move to the landing form, so it no longer links a second address for the same page.

**Out. Hidden, not shown as "Coming soon".** A "Coming soon" row would put an unusable destination in the one place meant to show what is usable, and it would fix a promise in the interface ahead of the client's roadmap. Each item below is listed in "Navigation destinations waiting on their phase" in `docs/ROADMAP.md`, and becomes one entry in the hub when its phase ships.

- **Commercial property.** There is no commercial type or intent, and it is not in `Phases.txt`. It needs a roadmap decision.
- **Residential land and plots.** There is no property type. It needs a roadmap decision, as recorded in Phase B.
- **Projects, Builders and Agents** (Phases 44–45, 43 and 41). The Discover group offers "Under construction" *listings* and "Posted by owners", which are real filters. They are never labelled as projects or agents.
- **Property comparison** (Phase 40), **price trends and insights** (49–51).
- **Resources: buying, renting and locality guides, and FAQs** (Phases 54 and 53). No editorial content exists, so the group is absent altogether. It does not appear as an empty heading.
- **My properties.** A seller's own listings belong to the seller dashboard (Phase 19). What an advertiser has today, the enquiries on their listings, is offered.
- **Counts in the menu.** The homepage shows real counts (Phase B). The menu is for finding your way, and it is rendered on every page. A Buy or Rent pill is simply absent where the count is zero.

## 2. UX requirements

- **Real destinations only.** Every row and pill opens a page that exists. A type or collection pill appears only for an intent with listings. A type or collection with no listings for either intent is not offered.
  - A popular locality with nothing listed keeps a single "Explore" link, whose results page suggests nearby places, as on the homepage.
- **Buy and Rent first**, as two large tiles: that is what most visits are for. **Post a property comes next**, as a supply-tinted card with a filled supply icon. It is visually distinct from every buyer-side row, but it is not a second orange button competing with the bottom bar's.
- **One pattern for "which intent?"** A name followed by Buy and Rent pills: "Flats — Buy · Rent", "Salt Lake — Buy · Rent". The name is never a link that silently chooses one intent.
- **Where you are:** a row for the current page, or the section you are in, shows "You are here" in words and a tint. A pill for the current page is filled. `aria-current` is set on both.
- **Every link closes the menu or panel** as it navigates, including `/#localities` on the homepage.
- **Desktop panel:** it opens on click or Enter, never on hover. It closes on Escape (focus returns to "Explore all"), on a click outside, when focus leaves the navigation, when another panel opens, and on navigation. It is short enough to sit below the header at 1024×768 without the page scrolling.
- **The bottom bar is unchanged:** Home, Search, Saved, Post, Enquiries, Account. The menu supplements it.

## 3. Technical requirements

- **`lib/navigation/types.ts`** adds `HubEntry` and `DiscoveryHub`. It is still types only, safe to import on the client.
- **`lib/navigation/marketplace.ts`:**
  - `getDiscoveryHub(city, { corpus? })` builds from `FILTER_SLUGS`, `buildLandingUrl`, `getPopularLocalities`, `searchProperties` (inventory) and the calculators' catalogue. `getMarketplaceNav()` carries it as `hub`.
  - Nothing is hand-written as a query string.
- **`components/navigation/hub.tsx`:** the shared rendering: rows, pill rows, the sell card and icons by entry id. `MarketplaceMenu` lays it out as a sheet, and `HeaderNav` as a panel.
- **`Sheet`** gains `size="wide"` for the tablet dialog. Its focus trap, Escape, scroll lock, `inert` background and focus return are unchanged.
- **`lib/search/query.ts`:**
  - `landingSlugFor(patch)` moves here from `lib/home/discovery.ts`, so there is one definition.
  - `canonicalSearchUrl(query)` is used by the results page's metadata.
- **The data seam is unchanged.** No component imports a fixture. The hub is built on the server and passed down as plain data.

## 4. Data requirements

No new entity, table or fixture. The hub reads the location tree, the property corpus and the calculators' catalogue through their existing seams. The catalogue gains a one-line `summary` per calculator for the menu.

The destinations this phase leaves out are recorded against the phases that introduce their models: `project`, `builder` and `agent` in the deferred model register, and commercial, plots, comparison, guides, FAQs and a seller's listings in the navigation register.

## 5. Edge cases

- **Nothing listed at all:**
  - Property types and the collections disappear.
  - Buy, Rent, the localities index, the tools, the account and posting remain.
  - Each popular locality keeps "Explore". This is covered by a unit test on an empty corpus.
- **An intent with nothing for a type:** only the other pill shows. For example, a type listed only for sale has a single Buy pill.
- **Rent and construction status:** Ready to move and Under construction are offered for sale only. Every rental is ready to move into, so a Rent pill there would duplicate all rentals under a misleading name.
- **Long names:** a row's label wraps rather than pushing its pills off the row, and the pills never shrink below 44px.
- **Signed out:** account rows go to pages that already send a visitor to sign in and back (`/login?next=…`). The menu does not guess at sign-in state.
- **Pages without a bottom bar** (`/post`, `/login`, `/property/*`): the header menu button still opens the whole hub below 1024px.
- **JavaScript off:** the menu and panels need JavaScript. The header's top-level links, the quick routes and the bottom bar still work, as in Phase A.
- **A deep link into a section** (`/buy/kolkata/2-bhk`): the Buy tile is marked as the section you are in.

## 6. Accessibility requirements

- **Menu dialog (phones and tablets):**
  - Modal, titled "Explore GharBazaar", with the rest of the page `inert` while it is open.
  - Tab and Shift+Tab stay inside it.
  - Escape closes it and returns focus to the control that opened it: the menu button or "View all".
- **Headings:** the dialog's title is an `h2`, each group is an `h3`, and "Popular localities" is an `h4`. No level is skipped.
  - In the desktop panel, groups are `h2`: the panel sits in the page's own outline, beneath its `h1`.
- **Accessible names:**
  - A pill's name completes itself: "Buy flats", "Rent in Salt Lake", "Buy homes under construction". This is what a screen reader's links list shows, where a bare "Buy" repeated 15 times would be useless.
  - The visible text is always contained in the name (WCAG 2.5.3).
- **Targets:** every row, pill, tile and button in the hub is at least 44×44px.
- **Focus:** every control shows the global `:focus-visible` ring.
- **Current place:** shown by `aria-current`, plus words or a filled shape, never colour alone.
- **Desktop disclosure:** the "Explore all" button carries `aria-expanded` and `aria-controls`. The closed panel is `hidden`, so it is out of the tab order and the accessibility tree.
- **Icons** are decorative (`aria-hidden`). Every label is text.

## 7. Responsive requirements

At 390, 412, 768, 1024 and 1280, plus 360:

- no horizontal overflow, with the menu open or closed;
- the header stays one row, with no label broken over two lines;
- the menu fills a phone screen, and is a centred dialog from 640px with two columns from 768px;
- the desktop panel fits beneath the header at 1024×768 and 1280×800, and never extends past the viewport's width.

## 8. Verification

- `npm run verify` (lint, typecheck, unit tests), including:
  - `lib/navigation/marketplace.test.ts`:
    - routes exist;
    - nothing unbuilt is offered;
    - every search link is its own canonical URL;
    - every pill has listings;
    - pill names are complete;
    - construction status is for sale only;
    - the empty corpus.
  - `canonicalSearchUrl` and `landingSlugFor` in `lib/search/query.test.ts`.
- `npm run build`.
- `npm run shell-check`, extended for the hub:
  - its groups and headings in order;
  - pill names;
  - 44px targets inside the menu and the panel;
  - the desktop panel's keyboard behaviour (Enter, Escape returns focus, focus-out and click-outside close it), its height at 1024×768, and no overflow;
  - "You are here" in both;
  - no unbuilt destination (commercial, plots, projects, builders, agents, comparison, price trends, insights, guides, FAQs);
  - every hub link resolves and its page's canonical is that same URL.
- `home-check`, `search-check`, `post-check`, `calculator-check`, `light-check` and `shots`, re-run against the change.
- Before-and-after screenshots at 390, 412, 768, 1024 and 1280.

## 9. Production readiness

- **Adding a destination** is one entry in `getDiscoveryHub()`, which reaches the phone menu and the desktop panel together. The navigation register in `docs/ROADMAP.md` lists what joins, and when:
  - Projects: 44–45;
  - Builders: 43;
  - Agents: 41;
  - comparison: 40;
  - insights and price trends: 49–51;
  - guides: 54;
  - FAQs: 53;
  - a seller's listings: 19;
  - commercial and plots: pending a roadmap decision.
- **Resources group:** it appears when Phase 53 or 54 ships its first page. Until then there is no empty heading.
- **Sitemap:** there is none yet. When one is generated (the SEO platform phases), it should list `canonicalSearchUrl` outputs, so the sitemap, the canonical tags and the internal links all name the same address.
- **Localities** points to `/#localities` until the city hub (Phase 29) exists.
