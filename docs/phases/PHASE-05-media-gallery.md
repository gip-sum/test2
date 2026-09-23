# Phase 5 — Property gallery and media system

**Status:** COMPLETE
**Source:** `Phases.txt`, Phase 5. Phase 4's property page is the host surface.

## 1. Scope

Deliver an image gallery that works with one, many, missing and failed images.
The supplied GharBazaar page mockup informs the desktop composition (large
lead image and smaller previews) and mobile image-first layout. Its green
palette is a separate branding decision; this phase uses the app's current
tokens. No synthetic verification badge, invented image count, video or floor
plan tab is introduced. Seller upload belongs to Phase 15.

## 2. UX requirements

- The lead image is visible in a reserved frame. On wide screens, listings
  with at least five photos also show four previews in a mosaic. Clicking
  a preview opens the full-screen viewer at that image.
- A clearly named control opens the full-screen viewer for a one-photo or
  multi-photo listing. The viewer starts on the currently selected image.
- Both viewers show the correct image position when there are multiple
  images. Next/previous wrap around; the thumbnail strip exposes all photos.
- A horizontal touch swipe changes the image. A vertical gesture continues
  to scroll the page. Closing the viewer returns focus to its opener.
- Each generated development illustration retains its visible sample label.

## 3. Technical requirements

- Keep gallery interaction inside `components/property/Gallery.tsx` and media
  identity in `PropertyMedia`. Use the existing Radix dialog dependency for
  focus trapping, Escape and scroll lock. No new runtime dependency.
- Render one active full-size image in each viewer, using Next Image's `fill`
  and accurate `sizes`. Thumbnails use small `sizes` and lazy loading. The
  first lead image is eager; later full-size images load on selection.
- A failed image changes to an explicit fallback for that media ID, without
  hiding the rest of the gallery or retrying indefinitely.
- The full-screen viewer is mounted only while open. The property route
  remains server rendered without the automatic `loading.tsx` boundary,
  preserving the JavaScript-disabled enquiry form from Phase 4.

## 4. Data requirements

- Keep ordered media records with stable IDs, URL and descriptive alt text.
  Add an optional `isSample` flag so the sample marker is tied to a media
  item and future seller photos are not mislabelled.
- The fixture provides 0, 1, 6 and 12-image examples. Null URLs are ignored
  in gallery navigation. A test fixture with a broken URL exercises fallback.

## 5. Edge cases

- Zero usable images: the existing no-photo placeholder, with no viewer.
- Exactly one: full-screen works, with no misleading navigation or `1 / 1`.
- Twelve: strip scrolls and counter stays accurate, including wraparound.
- Broken image: fallback says the image could not load; next still works.
- Mixed null URL and usable media: the counter counts usable items only.
- Touch vertical scroll, small accidental movements, and swipe at both ends.
- Resize or rotate while dialog is open; close through button, Escape or
  overlay; navigating away unmounts the dialog cleanly.

## 6. Accessibility requirements

- The viewer has a name, description, labelled controls and a live region
  that announces the selected image. Images have descriptive alt text.
- Dialog traps focus while open, closes with Escape, restores focus, and
  remains operable by keyboard arrows and Tab.
- Controls are at least 44 CSS px. Focus rings remain visible on light and
  dark gallery surfaces. Reduced-motion users see no forced animation.

## 7. Responsive requirements

- Verify 360, 390, 412, 768 and 1280 CSS px. Mobile has a 4:3 lead image,
  swipe support and horizontal thumbnails. Desktop with five or more
  images adds the mosaic; the full-screen image uses `object-contain`.
- Gallery and dialog fit the viewport without horizontal overflow. Dialog
  close and navigation controls respect safe-area insets.

## 8. Verification

- `npm run verify` and `npm run build`.
- New `scripts/media-check.mjs` tests zero, one and twelve images, mosaic,
  click-to-open at a chosen image, counter, wraparound, keyboard, Escape,
  focus restoration, mobile touch swipe, vertical gesture, failed image,
  responsive image source sizes and no overflow.
- Existing `property-check`, `search-check`, `shots` and `light-check` still
  pass. Update their gallery selectors only where the UI intentionally
  changes. Inspect screenshots at mobile and desktop sizes.

## 9. Production readiness

- [x] Full-screen and inline galleries pass the browser assertions.
- [x] Missing and broken images expose an understandable fallback.
- [x] Sample media cannot appear as an unmarked real property photo.
- [x] Keyboard and touch paths work without focus loss or scroll traps.
- [x] Responsive sources and lazy loading are verified in the browser.
- [x] Standing verification suites and production build pass.
- [x] Roadmap and project context updated after verification.

Verification: `npm run verify` (176 tests), `npm run build`, `media-check`
(26/26), `property-check` (67/67), `search-check` (64/64), `light-check`
and responsive `shots` all passed. Desktop and mobile gallery captures were
visually inspected.
