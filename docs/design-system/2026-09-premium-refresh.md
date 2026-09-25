# GharBazaar visual refresh — September 2026

User-requested design refinement before the next roadmap phase.

## Scope
Homepage composition and shared navigation, property cards, surface palette and footer. Existing search, account, saved property and enquiry behaviour stays connected to its current data layer.

## UX
A framed photographic hero, expressive serif accent, frosted search, neighbourhood illustrations, three recent listings with photos, and a forest-green seller invitation. Mobile keeps visible Home navigation and large listing photography. Sample content remains labelled.

## Technical
Server-rendered presentation components; existing search interaction model. Shared CSS tokens, local media, no new runtime dependency. Save button anchored in its own overlay wrapper to avoid conflicting position utilities.

## Data
`getRecentListings` supports an optional photo filter for the homepage. Listings without photos remain available in searches. No database changes. Sample stock interiors are explicitly illustrative, not photos of the fictional listings.

## Edge cases
No-photo placeholders and failed-image recovery remain. Long property titles clamp. Localities without inventory link to their normal route. Search suggestions must render above following sections.

## Accessibility
Semantic headings, labelled navigation and controls, visible keyboard focus, reduced-motion and reduced-transparency support. Text contrast on the intentionally inverted seller band is tested separately from the light page surfaces.

## Responsive
Review at 390, 412, 768 and 1280 CSS pixels. No horizontal overflow. Search fields stack on phones, neighbourhoods use two columns, and listings use full-width mobile cards.

## Verification
Run verify, production build, shots, light-check and search-check. Review rendered homepage and shared listing cards. Record completed results below before publishing.

## Production readiness
This is a visual refresh, not completion of later roadmap features. Sample inventory remains fictional. `/post` and locality-directory routes are existing future-phase destinations; this refresh does not implement their workflows.

## Sample photography sources
Downloaded 24 September 2026 under the Unsplash license (https://unsplash.com/license). Locally hosted WebP copies avoid third-party image requests. These are illustrative interiors, not the listed homes.

- living-warm.webp: https://images.unsplash.com/photo-1600210492486-724fe5c67fb0
- living-cool.webp: https://images.unsplash.com/photo-1600607687920-4e2a09cf159d
- living-green.webp: https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea

## Completed checks
- Lint, TypeScript and 173 unit tests passed.
- Production build passed.
- Eight routes checked at 390 / 412 / 768 / 1280: no horizontal overflow.
- Light-theme assertions passed, including contrast checks for the forest-green seller section.
- Search browser checks: 64 passed, 0 failed.
- Homepage reviewed visually at phone and desktop sizes. Sample photo selection uses distinct covers; save buttons remain over the photo.
