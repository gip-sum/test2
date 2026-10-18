# UI-06 — Search results & property cards

Status: complete, 18 October 2026, on `main`. Builds on UI-01 to UI-05
([UI-05](UI-05-core-components.md)).

UI-06 is the first page-level stage. Its focus is search and the shared
property cards, and it changes how the page is built rather than how it
looks:
- **Without JavaScript:** search now works fully.
- **One card per listing:** each result is rendered once instead of twice.
- **Shared card parts:** both public cards draw on one set of rules.
- **Arrivals:** new results and filter chips arrive with a restrained CSS
  entrance.
- **Gallery:** a new gallery photo fades into its frame.
- **Buttons:** the brand-outline button became a shared `Button` variant.

**Motion did not ship.** It was built and measured against the CSS version:
+17.9 KB gzip up front on search plus a 28.4 KB lazy chunk, for the same
effect. Kokonut was reviewed again and no second component qualified.

Two performance regressions surfaced in UI-06's own measurements and were
fixed before shipping (below). The login and 404 scenes are untouched.

---

## 1. Scope

**In:** search results (filters, chips, sort, count, loading, empty, cards,
mobile layout), search without JavaScript, the property-card system, the
results entrance and chip transitions (CSS first, Motion measured), card
image and gallery transitions, the modal-open recalculation experiment, an
outline Button variant and its migration, a Kokonut review.

**Out:**
- Home, property page and dashboard redesigns. They change only where a
  shared card or button changed.
- How search queries and filters work, and the URL state.
- Anime.js and Bklit UI.
- The login and 404 scenes.

## 2. UX requirements

- Search opens with its results, heading and controls, also with
  JavaScript off, slow or failed. Without JavaScript:
  - removing a filter chip works;
  - Clear all works;
  - sorting works through a Sort button that exists only then;
  - pagination works.
- With JavaScript, filters, chips and sort behave exactly as before: they
  apply in place, with the results dimmed while the new URL loads.
- Results that arrive after a filter change or page turn fade in. Results
  the server rendered are never hidden for animation. Reduced motion means
  no movement.
- Cards read: price; configuration and area; title; location (now with a
  pin); attributes; seller and age. The title underlines on hover where
  hovering exists. Tapping a card never leaves it raised (UI-04).

## 3. Technical requirements

### Search without JavaScript

The search page awaits its `params`, so the route's `loading.tsx` boundary
streams the skeleton first. The finished page follows in the same response
as a hidden segment (`<div hidden id="S:0">`), and a script swaps it in.
Without that script the page stayed a skeleton (a UI-04 risk).

- `SearchLoadingState` carries a `<noscript><style>`, which a browser with
  JavaScript treats as inert text. It hides the skeleton
  (`[data-search-fallback]`) and shows the streamed segment. The segment
  holds the complete page and is last in `<body>`, so it renders in order.
- Tailwind's preflight hides `[hidden]` with `!important` in `@layer base`,
  and a layered `!important` beats an unlayered one. So the reveal sits in
  `@layer theme`, which is declared before `base`. The first version, without
  the layer, hid the skeleton and showed nothing; `ui-check` caught it.
- React's segment markup is an implementation detail. `ui-check` loads
  search with JavaScript disabled and fails loudly if it changes. A unit test
  pins the fallback's markup.
- **Filter chips and Clear all** are now links to the URL without that
  filter (`Chip` `removeHref`). A plain click still runs the in-place
  transition; a modified or middle click opens a new tab; with no JavaScript
  it is ordinary navigation.
- **Sort** is a GET form to this search's URL at page 1, with the other
  parameters as hidden fields. Its Sort button is inside `<noscript>`; with
  JavaScript the select applies on change as before.

### One card per listing

`ResultsList` rendered every listing twice: a horizontal list for phones and
a grid for wider screens, one hidden by CSS. `SimilarProperties` did the
same. That doubled the DOM a sheet opening restyles. It also preloaded the
grid's three priority photos on phones, which never showed that grid.

| `/buy/kolkata` HTML | UI-05 | UI-06 |
|---|---|---|
| Tags | 2,545 | 1,988 |
| `<article>` cards | 48 | 24 |

`PropertyCard` gains `layout="responsive"`: horizontal below 768px and
vertical in the grid from 768px.
- `PropertyImage` gains a `responsive` mode: `fill` below 768px, `ratio`
  from 768px.
- The photo's 1.55:1 ratio moves out of the global
  `.property-card .aspect-[4/3]` override and into the card.
- One save heart, last in the DOM (listing first, then its save action),
  placed in the card's top-right corner by CSS: beside the price on a phone,
  on the photo in the grid.
- The skeleton follows the same responsive layout. `SimilarProperties` is
  one list: a swipeable row on phones, a grid from 768px.

### Shared card parts

| Repeated in both cards before | Now |
|---|---|
| Badge rules (New, Price reduced, Under construction for rails), max two | `listingBadges()` in `lib/property/badges.ts` (unit-tested) |
| Stretched title link (`after:absolute inset-0`) | `CardTitleLink` |
| Badge overlay | `CardBadges` |
| Card focus ring | `CARD_FOCUS`: lights only when the link is focused. PropertyCard used `focus-within`, which also lit the whole card for the heart. |
| `formatAreaCompact()` called directly | `AreaDisplay` (same formatter, the shared component) |

Deliberate differences remain:
- **CompactPropertyCard** (home rails, guest activity) is a browsing card,
  with the price on the photo and fewer attributes.
- **PropertyCard** is the comparison card.
- **The dashboard card** is the seller's card, with status and actions. It
  is a different job and is untouched apart from its outline action.

**Save heart.** It is now a 44px square with the visible 44px circle inside
it (`visualClassName` styles the circle), because hit-testing follows
`border-radius`. `ui-check` hit-tests its corners at every width.

### Results entrance and chip transitions — CSS vs Motion

**CSS (shipped).** Results and chips that arrive after the page is
interactive fade in using `@starting-style`:
- **Timing:** 200ms on `--ease-enter`, with a 6px rise for results and a
  0.96 scale for chips.
- **Stagger:** results are staggered by `--stagger-step` (30ms), capped at
  180ms from the seventh item on, through `:nth-child` rules.
- **Properties:** opacity and transform only, so chips wrap where they will
  end up and cards are clickable from the first frame.
- **Gate:** an effect sets `data-enter` on the search frame after
  hydration. `@starting-style` applies only to elements first rendered
  after that, so server-rendered results never start invisible.
- **Removal:** a removed chip disappears when the new URL renders. URL
  updates are never delayed.
- **Reduced motion:** the rules live under
  `prefers-reduced-motion: no-preference` and do not exist otherwise. The
  global reduced-motion rule shortens durations but not delays, so a
  staggered delay would have held items invisible.

**Motion (built, measured, not shipped).** For the same effect, the Motion
version used:
- an `m.li` per result with `PRESETS.item` and `stagger()`;
- `AnimatePresence mode="popLayout"` with `layout` animation for chips (exit
  and reflow, which needs `domMax`).

| | CSS | Motion |
|---|---|---|
| Search first load (gzip, vs UI-05) | +0.4 KB | **+17.9 KB** |
| Lazy Motion chunk (`domMax`) | none | **28.4 KB** gzip |
| Home / Login / 404 / dashboard | +0.0–0.2 | +0.2–0.3 (the shared changes; Motion stayed on search) |
| Load blocking time, 390px, 4× CPU (7 runs) | 606 ms | 600 ms |
| Filter click → next paint, 4× (7 runs) | 168 ms | 152 ms |
| Reduced motion | rules absent | `MotionProvider` drops transforms |
| Server render | untouched | needs an `initial={false}` gate per item |
| Hydration | no client component per item | 24 client `m.li` boundaries |
| Code | ~20 lines of CSS | two client wrappers, a second feature loader |

The runtime figures are within run-to-run noise (load 509–1,163 ms, clicks
120–200 ms). Motion's only real advantage is animated removal and reflow of
chips. That isn't worth 46 KB on the most-used route, and it would stretch
the moment the URL is the truth. **CSS ships; Motion still has no
production consumer.**

### Two regressions found and fixed in UI-06

UI-06's first build was slower than UI-05, measured on the same machine
with UI-05 rebuilt in a worktree on port 3200:

1. **Opening the Filters sheet: 88 ms against UI-05's 58 ms**, with style
   recalculation at 55 ms against 25 ms.
   - Bisected in the page. Removing the `:has()` focus rules and the
     entrance rules changed nothing.
   - Removing the inline `style="--i: n"` each result carried for its
     stagger brought style recalculation from 52 to 27 ms.
   - Cause: a custom property inherits, so every element of every card held
     a different value, and Chrome could no longer share computed styles
     between cards.
   - Fix: the stagger moved to `:nth-child` rules. Now 58.6 ms against
     UI-05's 59.7 ms.
2. **Search load: 626 ms of blocking time against UI-05's 529 ms** (4×
   CPU).
   - `useHydrated` (a `useSyncExternalStore` with different server and
     client snapshots) made React re-render `SearchLayout`, filter rail
     included, right after hydration, only to set `data-enter`.
   - Fix: an effect sets the attribute on the element, which React does not
     manage, and the hook was removed.
   - Now **500 ms against UI-05's 559 ms** (11 runs each). Search loads
     faster than before, thanks to the halved DOM.

### Card image and gallery transitions

- **Card photos** already fade into their reserved box with the UI-04
  system (`data-fade`), so nothing new was invented. Failure still shows
  "Image could not load" (`motion-check` covers cards and gallery).
- **Gallery.** The main photo and the lightbox photo are keyed by photo. A
  new photo mounts fresh and fades into the frame when it arrives, instead
  of the previous photo staying on screen under a counter and a
  screen-reader status that already name the next one (`motion-check`
  holds `/_next/image` back to prove it).
- Swipe, arrow keys and the lightbox are unchanged. There is no slider, no
  blur and no new dependency.

### Outline Button variant

| Pattern found | Uses | Decision |
|---|---|---|
| Brand outline (`border-brand-700`, `text-brand-700`, hover `bg-brand-100`) | 4 buttons + 3 links (description assistant ×3, Update status, Review ×2, dashboard primary action) | **`outline` variant added**; buttons use it, links use `buttonClassName({ variant: 'outline' })` |
| Danger outline | 1 (Delete listing) | no variant: one use is not a pattern |
| Neutral border, brand text | 7 (posting photo tools, Withdraw listing) | left for the posting stage: is it `secondary` (ink text)? |

| Handwritten `<button>` | Count |
|---|---|
| UI-05 baseline | 62 |
| Migrated to `Button` (outline) | 4 |
| Became links (Clear all, now navigation) | 1 |
| Remaining | **57** |

Navigation, tabs, toggles and icon controls were not converted.

### Kokonut UI — evaluated, none shipped

From the same pinned commit `bb9120f`:

| Component | Against | Verdict |
|---|---|---|
| `lightbox-grid` (725 lines, `motion.*`) | our Radix lightbox | rejected: replaces Radix's focus management with its own dialog and adds Motion for a fade we already have |
| `carousel-cards` (1,216 lines, lucide) | listing rails, gallery | rejected: a mouse "momentum rail"; native scroll-snap is better on touch and costs nothing |
| `action-search-bar` (⌘K palette, Motion) | search | rejected: a command palette, not URL-driven search |
| `undo-button` (Motion) | chip removal | rejected: browser history is the undo |
| `toolbar` (tool dock) | filters | rejected: unrelated |

SmoothTabs stays the only Kokonut component.

### Client/server boundaries

`ResultsList`, `PropertyCard` and the card parts stay server components. The
only client additions are `Chip`'s link handler and the sort form inside the
existing client `SearchLayout`. No page became a client component.

## 4. Data requirements

None. Property data, queries and URL state are unchanged.

## 5. Edge cases

| Case | Behaviour | Verified by |
|---|---|---|
| JavaScript off, slow or failed | streamed page shown, skeleton hidden | ui-check (no JS) |
| No-JS chip removal / sort / page | links and a GET form | ui-check |
| Modified click on a chip | browser default (new tab) | by construction |
| Filter change | new items fade in, kept items do not re-animate | motion-check |
| Server render | no entrance, opacity 1 | motion-check |
| Reduced motion | no entrance, no stagger delay | motion-check |
| Slow gallery photo | old photo gone, new one transparent in the frame until it loads | motion-check |
| Failed photo | fallback text, cards and gallery | motion-check |
| Rent card at 390px | 16px shorter (no button-height price row) | style-diff |

## 6. Accessibility requirements

- **Card links:** one stretched link per card and the save heart as a
  separate control after it (no nested interactive elements). The card ring
  lights only for the link.
- **Keyboard:** Tab moves from a card's link to its heart (`ui-check`).
- **Chips:** links named "Remove filter: …" with 44px targets. Clear all is
  a 44px link.
- **Touch targets:** the save heart is 44px by hit-testing at every width.
- **Images:** alt text comes from the listing's photo or title, as before.
  Decorative thumbnails are unchanged.
- **Reduced motion:** asserted in `motion-check`.

## 7. Responsive requirements

`shots`: no overflow and the bottom bar inside the viewport at all eight
widths. `ui-check` at 320/360/375/390/412/430/768/1280 checks:
- every result is rendered once and is visible;
- the card is horizontal below 768px and vertical from 768px;
- the 44px heart;
- no overflow.

The entrance moves only opacity and transform, so it causes no temporary
overflow. The Sort-overflow fix from UI-02 holds.

## 8. Verification

| Command | Result |
|---|---|
| `npm run verify` | lint, types, **635** tests in 71 files (new: badges 2, search components 4) |
| `npm run build` | passes |
| `npm run shots` | no overflow at any width |
| `npm run ui-check` | **128** (UI-06 adds the no-JS path, the single list at 8 widths, the heart target and card focus) |
| `npm run motion-check` | **89** (UI-06 adds the results entrance, chips, reduced motion and the gallery) |
| `search-check` / `light-check` / `shell-check` / `phase-e-check` | 64 / pass / 355 / 64 |
| workspace checks (moderation, users, listing, dashboard, performance, admin, description, preview) | pass |
| `calculator`, `pricing`, `post`, `draft`, `photo`, `auth` | pass |
| `login-check` (117 / 138 with auth), `notfound-check` (36) | pass |
| style-diff UI-05 → UI-06 | 42 grouped changes, protected scenes unchanged (below) |

**Checks adjusted.** On the results page the chip remove controls and Clear
all are links now. `search-check`, `light-check`, `home-check` and
`ui-check` select them by their new role or element, and assert the same
things. `home-check`'s home search panel chips stay buttons.

**Known failures (pre-existing, identical failure points to UI-05):**
- `home-check` locally: the same step (now at line 200 because of two
  comment lines). It passes in CI.
- `property-check`: the same two assertions.
- `media-check`: the same fallback case.
- `lead-check`, `saved-check`: identical timeouts.

## 9. Production readiness

Ready. Search degrades to a complete server-rendered page, the one CSS hook
it depends on is guarded in CI, and bundle growth is 0.0–0.4 KB gzip.

---

## Bundle (gzip, vs UI-05)

| Route | KB | Δ |
|---|---|---|
| Home | 176.9 | +0.2 |
| Search (buy / rent / filtered) | 178.5 | +0.4 |
| Property details | 176.1 | +0.1 |
| Login | 169.2 | +0.0 |
| Not found | 176.9 | +0.2 |
| Seller dashboard (upper bound) | 180.0 | +0.2 |
| Admin overview (upper bound) | 178.2 | +0.2 |

Search gains 0.4 KB of client JavaScript (the chip link handler and the sort
form). No Motion code ships anywhere; no Motion chunk is emitted.

## Performance (390px)

| Same machine, 11 runs | UI-05 | UI-06 |
|---|---|---|
| Search load, total blocking time, 4× CPU | 559 ms | **500 ms** |
| Filter change, click → next paint, 4× CPU | 144 ms | 144 ms |
| Filters sheet open, click task (trace) | 59.7 ms | 58.6 ms |
| Filters sheet, click → next paint | 80 ms | 80 ms |
| Menu sheet (home), click task | 74.7 ms | 80.0 ms (noise: 61–80 ms across runs) |

`motion-perf` at 4× slowdown (7 runs, median):
- **Filters open:** one long task, 337 ms on UI-05 and 362 ms on UI-06.
- **Menu open:** 360 ms and 347 ms.
- **Card press, skeleton and photo fade:** 16.7 ms frames on both.

### Modal-open recalculation: `content-visibility` experiment

`content-visibility: auto` (with `contain-intrinsic-size: auto 260px`) was
applied in the page to the result items, home sections and rail items:

| | Base | With content-visibility |
|---|---|---|
| Menu open, click task (UI-06) | 80 ms | 63 ms |
| Menu, click → next paint | 104 ms | 88 ms |
| Filters open, click task | 58.6 ms | 53.1 ms |
| CLS scrolling through home, 390px | 0.009 | **0.40** |

The gain is real on home (about 16 ms, one frame) and small on search. But
the rail items' estimated sizes shift the page as they render: CLS 0.40, a
visible regression. **Not shipped.** The structural win in this stage is
the halved search DOM. Tuning `contain-intrinsic-size` per element is the
way to revisit it.

## Intentional visual changes (style-diff UI-05 → UI-06)

All in search, cards and the migrated buttons:

| Change | Where |
|---|---|
| Duplicate result list gone (thousands of "element removed" notes; each card once) | search at 390 and 1280 |
| Cards: location pin, 4px gap; price row reserves 40px for the corner heart on phones | search, saved, similar, rails |
| Rent cards 16px shorter on phones (e.g. 228 → 212px). UI-05's phone price row was a flex row holding the 44px heart (`-mt-1`, so 40px tall); a one-line rent price is 24px. The heart now sits in the corner, so the row is the price's height. Buy rows carry the rate line (at least 40px) and are unchanged. Accepted: the extra 16px was the button's, not the content's. | search rent at 390 |
| Save heart: border, fill and shadow move to the inner circle; the button is a square | all cards |
| Results and chips get entrance transitions (computed transition values) | search |
| Outline buttons and links: shared Button classes (gap, colour transition, standard curve) | dashboard, enquiries, admin listings and moderation |
| `guest-activity` computed margin reported as 190px → 0 at 1280px; its box is identical (190, 81, 900 × 672). Its rule (`.guest-activity { margin: auto }`) and its markup are not in the UI-06 diff. The figure is Chrome's resolution of `auto`, which it does not report consistently. Not a visual change. | activity |

Home and the Phase E screens change only through the shared CompactPropertyCard
(heart structure, shared parts). No colour, radius or type token changed.

## Protected areas

Login street and 404 scenes:
1. no file in the UI-06 diff;
2. `protected-scenes.test.ts` fingerprints match;
3. style-diff reports the scene markup and every non-UI keyframe
   identical;
4. `login-check` (117 / 138) and `notfound-check` (36) pass.

Anime.js is not installed, and Bklit UI is not used.

## Files

- **New:** `lib/property/badges.ts` (+ test), `components/property/CardParts.tsx`,
  `components/search/search-components.test.ts`.
- **Cards:** `PropertyCard`, `CompactPropertyCard`, `PropertyImage`,
  `PropertyCardSkeleton`, `SimilarProperties`, `SaveButton`, `Gallery`.
- **Search:** `ResultsList`, `SearchLayout`, `SearchLoadingState`,
  `components/ui/Chip.tsx`.
- **Buttons:** `components/ui/Button.tsx` (outline), `DescriptionAssistant`,
  dashboard enquiries, `ListingRows`, dashboard `PropertyCard`.
- **CSS:** `app/globals.css` (entrance rules, `--stagger-step`, removed card
  ratio override).
- **Checks:** `ui-check`, `motion-check`, `search-check`, `light-check`,
  `home-check`.

## Remaining risks

- **React's streamed-segment markup** (`S:` ids) is relied on for the no-JS
  reveal. It is guarded by `ui-check`, but a React upgrade could require
  adjusting the selector.
- **No-JS search** covers results, chip removal, sort and pagination. The
  filter rail and sheet still need JavaScript.
- **Home menu open** stays around 60–80 ms (structural: a whole-document
  restyle on modal open). `content-visibility` needs per-element intrinsic
  sizes to be safe.
- **Motion** still has no justified consumer.
- **57 handwritten buttons** remain; the neutral-border brand-text group
  awaits a design decision.

## Recommendation for UI-07 — Auth UI

Following UI-01 §6 item 7, on the frozen scene:

1. **Login and register form states and transitions:** inline validation,
   busy and error states on the shared `Button`, `ErrorState`/`EmptyState`
   where they apply. The login scene must not change: its fingerprints,
   timing checks and `login-check` stay green.
2. Touch targets and focus order on the auth forms, verified by `ui-check`
   hit-testing.
3. **Progressive enhancement:** the forms already post without JavaScript
   in places; confirm every auth step does, as search now does.
4. If any transition is added, CSS first, measured, as in UI-05/06.

Out of UI-07: the seller workspace and charts (UI-09/10), Anime.js, and any
change to the login or 404 scenes.
