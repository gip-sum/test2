# Phase E — 99acres interface redesign

Status: Planned, requested 2 October 2026. This commit adds the extra phase and its specification; UI implementation has not started. Work will use `main`, as requested by the client.

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

For this planning change: check roadmap numbering, reference mapping, links and all nine required sections. Existing repository `npm run verify` runs before commit; no UI completion is claimed.

For implementation: run `npm run verify`, `npm run build`, `npm run shots`, `npm run light-check`, `npm run search-check`, `npm run home-check`, `npm run shell-check`, and affected account/auth/save checks. Also rerun posting checks if shared layout changes affect posting. Compare screenshots against all seven references, including home at multiple scroll positions, menu at top and scrolled, and guest Activity. Measure overflow, fixed-bar clearance and touch targets. Verify every displayed link, search, menu selection, login return path and save action. Do not report visual fidelity based only on automated assertions.

## 9. Production readiness

This phase is complete only after the implemented screens have been compared with the references, functional and access-control checks pass, and any remaining content/capability differences are documented. Scope registration is not implementation or deployment. Phase 15 photo uploads and Phase 16 drafts remain separate work. Future work uses `main`; no extra branch is requested for this phase.
