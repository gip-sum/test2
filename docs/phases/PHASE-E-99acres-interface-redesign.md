# Phase E — 99acres interface redesign

Status: Implemented and verified locally on `main`, 2 October 2026. Production publication is pending. No feature branch was created.

## 1. Scope

The client clarified that the request is an extra interface phase, not Phase 15 property photo upload. Match the supplied 99acres mobile interface as closely as possible in layout, proportions, typography, colour, spacing and controls. Keep GharBazaar's name and use its content. This phase revisits the existing homepage, marketplace menu, Activity page and bottom navigation from Phases A–D. The numbered 75-phase roadmap remains intact.

The seven reference images were visible in the conversation even though their supplied scratch paths were unavailable. Their filenames and observed content are recorded below so the scope does not depend on access to the reference website, which returned Access Denied.

| Reference | Visible interface to reproduce |
|---|---|
| 1000109052.jpg | Home: brand/post-property header, horizontal icon categories, wide banner carousel and dots, overlapping search, horizontal property cards, fixed six-item bottom bar |
| 1000109058.jpg | Home: horizontally scrolled categories and banner; search placement, property image aspect ratio, save icon and possession overlay |
| 1000109057.jpg | Scrolled home: sticky rounded search; cream bands with an illustrated left heading and horizontally scrolling BHK/seller cards; possession section |
| 1000109056.jpg | Scrolled home: locality ranking card layout; pale-blue tools section, heading/action row and large calculator cards |
| 1000109053.jpg | All Categories: centred title, narrow grey left category rail, blue active indicator, right-side welcome/login panel, video tile and property-type grid |
| 1000109054.jpg | Scrolled category menu: two-column rounded tiles, full-width final tile, bottom feedback row and fixed bottom bar |
| 1000109055.jpg | Guest Activity: pale-blue welcome, full-width blue login button, three-part summary, horizontal compact property cards and bottom feedback row |

The screenshots show mobile surfaces only. Desktop adaptation is part of this phase but cannot be called an exact copy of an unseen desktop screen. Browser address bars, phone status bars and Android gesture indicators are not website content.

## 2. UX requirements

- Home uses a compact white header, brand at left, outlined rounded post-property action at right, then a swipeable row of icon shortcuts.
- Match the banner's width and height, carousel indicators and the white search box overlapping its lower edge. Give search a pale-blue border and restrained shadow. When scrolled, use the compact rounded search treatment seen in the references.
- Property rails expose part of the next card to signal horizontal scrolling. Match image rounding, title/subtitle hierarchy, save control placement and lower-image overlays.
- BHK and seller-type sections use cream backgrounds, a left illustration/title area and white cards sliding horizontally alongside it. Match the possession-card and pale-blue calculator-section layouts.
- Menu uses the screenshot's split layout: a roughly 29% left category rail and 71% right content panel on phones, with a blue strip marking the selected category. The right panel contains welcome/login, section labels and two-column tiles. Scrolling must not bury the bottom navigation.
- Guest Activity is a real accessible landing screen, with the reference's welcome/login structure and a compact property rail. Personal saved/enquiry data remains authenticated. A guest landing must not expose another user's data or misrepresent unavailable history as zero.
- Bottom navigation follows Home, Search, Sell/Rent, Videos, Activity, Menu. Match the reference's white surface, top separator, grey inactive icons and filled dark active icon. Preserve GharBazaar naming rather than the reference's branded video name.
- Match the reference blue actions, navy headings, white surfaces, pale-blue tiles, cream discovery bands and modest borders/shadows. These explicit reference choices supersede conflicting visual styling in A–D for the affected surfaces.
- All displayed actions must work. App-install prompts, voice search, rating, advertising badges and unsupported categories require real destinations or capabilities; record any necessary departure from the reference instead of shipping inert controls.

## 3. Technical requirements

Reuse the existing components and routing: `AppHeader`, `BottomNav`, `MarketplaceMenu`, its hub and navigation model, home discovery components and `/account/activity`. Avoid parallel navigation systems. Update design tokens instead of hardcoding colours in components.

Keep searches and filters in the URL. Use existing query seams for listing data and counts. If guest Activity requires adjusting its route guard, preserve server-side protection for all private queries and account actions. Keep server-rendered content where possible and limit client code to interaction, carousel behaviour and menu state. Existing property posting through Phase 14 remains functional.

## 4. Data requirements

Use GharBazaar's Kolkata inventory and locations, with development data labelled. Do not copy Bangalore listing identities, photographs, advertisers, QR codes, prices, RERA badges, demand percentages or property counts from the screenshots into the product.

Project recommendations, ranking percentages, viewed/contacted history and other unavailable datasets retain their existing roadmap dependencies. Match the component layout using supported content and accurate labels; document those differences explicitly. A count of zero must reflect a known empty result, not missing data. No new business entity is introduced merely to decorate a reference card.

## 5. Edge cases

Cover empty inventory, long names, broken images, failed count queries, signed-out and signed-in states, unavailable authentication, zero saved listings, unknown activity history, browser back/forward, rapid category changes, small screens and large text. Carousels must allow normal vertical page scrolling and have no automatic motion under reduced-motion preferences. A failed query must not appear as a verified zero.

## 6. Accessibility requirements

Use labelled navigation landmarks, one h1, logical section headings, at least 44px touch targets and visible keyboard focus. Convey selected category/current destination through shape or weight as well as colour. Menu focus must remain predictable with Escape/close returning to its trigger if presented as a dialog. Provide accessible carousel controls and labelled save buttons. Decorative art is hidden from assistive technology. Keep readable contrast despite the muted reference colours.

## 7. Responsive requirements

Prioritise the supplied mobile references. Compare the actual website area after excluding browser/OS chrome and accounting for screenshot scaling; source image pixels are not assumed to be CSS pixels. Verify 390, 412, 768 and 1280px plus a 360px stress check. Match phone proportions, card widths, section gaps, sticky search and bottom-bar height. Use safe-area padding. Only intended rails scroll horizontally; the document must not overflow. Adapt tablet/desktop to available width without enlarging the phone interface like a zoomed image.

## 8. Verification

The implementation passed:

| Check | Result |
|---|---|
| `npm run verify` | Lint, strict types and 329 unit tests pass |
| `npm run build -- --webpack` | Production build passes |
| `npm run shots` | No document overflow at 390 / 412 / 768 / 1280 across the existing route suite |
| `npm run light-check` | All measured surfaces retain the light product under a dark browser preference |
| `npm run home-check` | 122 assertions; all 61 displayed counts agree with their results; all 112 home links resolve |
| `npm run shell-check` | 353 assertions; mobile targets, category state, keyboard/focus, guest/private boundaries, desktop panels and canonical destinations |
| `npm run phase-e-check` | 44 assertions; banner destinations, nested dialog focus/inert state, compact sticky search, independent menu scroll and reference-section overflow |
| `npm run search-check` | 64 assertions |
| `npm run post-check` / `pricing-check` | 87 / 46 assertions; posting and pricing preserved |
| `npm run auth-check` / `saved-check` | 38 / 14 assertions against isolated local provider simulators |
| `npm run calculator-check` / `notfound-check` / `login-check` | 43 / 36 / 117 assertions |

Visual inspection covered home at the top and the discovery/locality/tool sections, menu at the top and scrolled, and guest Activity. Screenshots were captured at 360, 390, 412, 768 and 1280 CSS pixels. The shared header and bottom bar clear the page; only intended rails scroll horizontally. The default build environment blocked child-process execution, so local production verification used the supported Webpack build outside that process sandbox. Browser verification used Chromium 154, including the agent-browser smoke check; Safari and Firefox were not tested.

The old home/shell/theme assertions were updated for the new presentation. Existing desktop keyboard/pointer and canonical-link checks remain, and the reference-specific regression is included in CI. The implementation also fixes nested Sheet inert locks and provides enough desktop search-dialog space for the locality dropdown.

## 9. Production readiness

The implemented interface is ready for publication after client review. The production site is not changed by the local implementation commit. Phase 15 photo uploads and Phase 16 drafts remain separate work.

Reference differences are deliberate and reflect the available product:

- GharBazaar branding, its existing Kolkata imagery and labelled sample listings replace 99acres branding, advertisers and Bangalore projects. Rails say latest homes rather than implying recommendations. Prices and factual listing labels replace unsupported RERA and possession-date badges.
- The banner has manual, accessible slide buttons and real search/calculator destinations. No advertising, app-install, voice-search, FREE or rating claims are displayed without those capabilities.
- BHK, seller and construction cards use query-derived counts. Locality panels show inventory counts, not invented demand percentages or rankings. Future possession-year filters are not implied.
- The menu contains supported residential types, localities, calculators and account destinations. Commercial, land, PG and other unsupported categories are omitted. Videos retains its existing honest availability page; this phase does not add media infrastructure.
- Guest Activity uses sign-in prompts for unavailable private data and an unpersonalised latest-listing rail. Viewed/contacted history and rating/feedback actions await their own features. Signed-in Activity retains its existing private queries and counts.
- Touch controls are at least 44px, the menu has an explicit accessible close action, and tablet/desktop layouts adapt to their width. This is a close reproduction of the supplied mobile layout, not a claim of identical content or an unseen desktop design.
