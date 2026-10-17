# UI-04 — GharBazaar animation system

Status: complete, 17 October 2026, on `main`. Builds on [UI-01](UI-01-audit.md),
[UI-02](UI-02-foundation.md) and [UI-03](UI-03-design-system.md).

UI-04 gives GharBazaar one motion language and applies it where motion helps
someone use the product: sheets and dialogs, the header menus, the photo
lightbox, touch feedback on property cards, loading skeletons and photos
arriving. It is not a redesign: nothing moves position at rest, nothing new
appears, and the login street scene and the 404 scene are untouched and
measured identical.

The main decision: **the global surfaces are animated in CSS, not Motion.**
A Motion-driven Sheet was built and measured at **+16.6 KB gzip on every
route**, because Sheet is in the header menu. Radix Dialog already keeps a
closing dialog mounted until its CSS exit animation ends, so CSS gets the
same enter and exit with no JavaScript, and Radix keeps full control of
focus, Escape and unmounting. Motion is kept for React-driven content
through a small preset set and `<Presence>`. **Neither has a production
consumer yet, so neither adds any page-level JavaScript** — UI-05 starts
from a clean performance baseline.

---

## 1. Scope

**In:** CSS motion primitives and easing roles; Sheet enter/exit (rise on
phones, fade and scale from 640px); header panel entrance; lightbox fade;
the property card's Android stuck-hover fix with touch press feedback;
skeleton shimmer; photo fade-in into reserved space; Motion presets,
`stagger()` and `<Presence>`; a permanent reduced-motion browser test
(`motion-check`, in CI); a throttled animation-performance measurement
(`motion-perf`); guards for the motion CSS and for the protected scenes.

**Out:** Kokonut UI and Bklit UI components, Anime.js (not installed), new
swipe gestures, layout animation (`domMax`), results-list entrances (UI-06),
page redesigns, and any change to the login or 404 scenes.

## 2. UX requirements

- A sheet arrives as a short rise from below on phones (300ms) and leaves
  faster (200ms); from 640px, where it is a centred dialog, it fades and
  scales from 0.97. No bounce, nothing overshoots.
- Desktop header panels feel instant: a 150ms fade with a 4px drop on the
  way in, gone at once on Escape, outside click or switching panel.
- A tapped property card gives a brief press (scale 0.985) while the finger
  is down and is flat again on release, after navigation and after Back.
  A mouse still gets the 3px lift and photo zoom.
- Skeletons carry one slow, low-contrast sweep (1.6s) on a box whose size
  never changes.
- A photo that arrives after the page is interactive fades into the space
  already reserved for it; a photo that fails still shows "Image could not
  load".
- With *reduce motion* set in the OS, all of it is effectively instant and
  still fully usable.

## 3. Technical requirements

### Architecture: two layers, one language

| | CSS motion layer | Motion presets |
|---|---|---|
| Where | `app/globals.css`, section "Motion layer (UI-04)" | `lib/motion/variants.ts`, `components/motion/Presence.tsx` |
| For | Radix dialogs, `hidden` panels, pseudo-elements, images | content React mounts and unmounts from its own state |
| JS cost | none | Motion core on that route (UI-02: ~14.5 KB gzip up front, ~14.2 KB features after hydration) |
| Reduced motion | the base-layer rule collapses durations to 0.01ms | `MotionProvider reducedMotion="user"` drops transforms, keeps fades |
| Consumers today | Sheet, header panels, lightbox, property card, Skeleton, PropertyImage, Gallery | **none** |

Both read the same tokens: `--duration-*` / `--ease-*` in CSS and
`DURATION` / `EASE` / `TRANSITION` in `lib/motion/tokens.ts` (kept equal by
`tokens.test.ts` since UI-02).

### Primitives

CSS keyframes (transform and opacity only, so the compositor runs them):

| Keyframes | Used by | Duration / curve |
|---|---|---|
| `motion-fade-in` / `motion-fade-out` | sheet overlay, lightbox | slow or base in, enter curve; base or fast out, exit curve |
| `motion-sheet-in` / `motion-sheet-out` | Sheet below 640px (translateY 24px in, 16px out) | slow / base |
| `motion-pop-in` / `motion-pop-out` | Sheet from 640px (scale 0.97 in, 0.98 out) | slow / base |
| `motion-shimmer` | `.skeleton::after` | `--loop-shimmer` (1600ms), standard curve, infinite |

Plus two non-keyframe primitives: the header-panel entrance
(`@starting-style` + transition) and the image fade (`data-fade`, below).

Motion presets (`PRESETS` in `lib/motion/variants.ts`): `fade`, `fadeScale`
(0.97 → 1, out to 0.98), `menu` (4px drop), `sheet` (24px rise, overlay
timings), `item` (8px rise, for lists); `stagger(index)` caps the delay at
`base` (200ms) so a long list never crawls. `<Presence show preset>` wraps
`AnimatePresence initial={false}` + `m.div` inside `<MotionFeatures>`, so
content present on first render — including all server HTML — is rendered
in its final state, never transparent.

"Drawer" is the same Sheet: the marketplace menu, filters, the locality
picker and the home search are all `components/ui/Sheet.tsx`, so they share
one motion with no per-surface code. No swipe gesture was added and no
navigation logic changed.

### Easing roles

Three roles, unchanged from UI-02: `standard` (moving while on screen),
`enter` (arriving, decelerate), `exit` (leaving, accelerate). There is
deliberately **no "emphasis" curve**: nothing in the product overshoots, and
a curve with no user invites decoration (recorded in `lib/motion/tokens.ts`).

- Every CSS `transition` part now names its curve; before UI-04 they took
  the browser default `ease`. Entrances use `enter`, `[data-hidden]` /
  `[hidden]` exits use `exit` (the calculator peek bar).
- Tailwind's `--default-transition-timing-function` is set to
  `var(--ease-standard)`, replacing Tailwind's own
  `cubic-bezier(0.4, 0, 0.2, 1)`, so utility transitions and CSS rules move
  alike.
- `lib/design/motion-css.test.ts` fails on a `motion-*` keyframe touching
  anything but transform/opacity, a UI transition without a duration and a
  curve token, an animation not on the tokens, or any `cubic-bezier(` /
  `steps(` outside the token layer (CSS) and any `ease-[…]` / `cubic-bezier`
  in TSX. Its negative control failed as expected.

### Sheet, lightbox

`Sheet.tsx` gives its overlay the `sheet-overlay` class; the content already
carried `data-sheet`. Radix sets `data-state="open|closed"`; the CSS above
does the rest. While closing, both layers get `pointer-events: none` so a
click goes through to the page. Focus trap, `inert` lock, Escape layering,
focus return, outside click and the dialog semantics are Radix's and
Sheet's existing code, unchanged — with one fix:

**Escape during a child's exit.** The locality picker opens on top of the
home search sheet. A closing child stays mounted for 200ms and still holds
focus; Sheet's Escape handler only accepted a target inside the current top
sheet or `body`, so a second Escape pressed in that window was swallowed.
The handler now also accepts a target inside a `[data-sheet][data-state=
"closed"]` layer. `motion-check` asserts it; it failed on the build before
the fix.

The lightbox (`Gallery.tsx`) adds `lightbox-layer` to its overlay and
content: a plain fade, because the photo is the content and should not move.

### Header menus

Phones: the header menu is a Sheet, above. Desktop panels (`HeaderNav`,
toggled by the `hidden` attribute) enter with a 150ms opacity + 4px
transform transition from `@starting-style`, and leave instantly. An exit
transition (`display … allow-discrete`) was built and rejected: it kept a
dismissed panel on screen for 150ms after Escape — exactly when a menu has
to be gone — and would overlap the next panel when moving from Buy to Rent.
Browsers without `@starting-style` show the panel instantly, as before.

### Property card: the Android stuck-hover fix

UI-01 P4: the lift and photo zoom sat under `:hover`, which Android applies
on tap and keeps until the next tap elsewhere — so a tapped card stayed
raised, including on the page you came Back to. Now:

- `.property-card:hover` (lift, `shadow-e2`) and the photo zoom apply only
  in `@media (hover: hover) and (pointer: fine)`. `.rail-end-card` and
  `.seller-link` had the same ungated pattern and get the same gate;
  `.compact-card`, already under `(hover: hover)`, gains `pointer: fine`.
- `@media (hover: none)` gives `:active` a `scale(0.985)` at
  `--duration-instant`; it exists only while the finger is down.
- Reduced motion removes the press too.

Measured on the UI-03 build vs UI-04 at 390px with touch emulation, after a
tap leaves `:hover` set: UI-03 card `matrix(1, 0, 0, 1, 0, -3)`, photo
`scale(1.035)`, shadow changed, **one card still transformed after Back**;
UI-04 `none`, `none`, shadow unchanged, **zero cards transformed after Back**.

### Skeleton

`Skeleton` swaps Tailwind's `animate-pulse` (an opacity loop on the whole
box) for `.skeleton`: `overflow: hidden` and an `::after` gradient moving
by `transform` — no repaint of the box, no size change. Under reduced
motion the sweep runs once in 0.01ms and rests outside the box: a plain,
still block.

### Photo fade-in

`lib/motion/image-fade.ts`: `markPendingImage` (a ref callback) marks an
`<img>` `data-fade="pending"` only if it has not loaded when React attaches;
`revealImage` (onLoad) flips it to `in`, which transitions opacity over
200ms. Wired into `PropertyImage` and the gallery's `MediaPhoto`.

- Server HTML never carries the mark, so with no JavaScript — or before
  hydration — photos show the moment they load.
- The box is reserved by `fill` and its sized parent, so arrival cannot
  shift layout (measured CLS < 0.01 with photos held back).
- On error both components already replace the `<img>` with the "Image
  could not load" block, so a failed photo is never left transparent.
- An off-screen lazy photo (for example thumbnail 12 in the property page's
  horizontal strip) correctly stays pending until it is scrolled to; that is
  the one `opacity 1 → 0` in the style comparison.

### Progressive enhancement and client/server boundaries

No page or server component became a client component. Everything animated
was already a client leaf (`Sheet`, `Gallery`, `PropertyImage`, `HeaderNav`)
or is pure CSS (`Skeleton`, cards). `Presence` is a `'use client'` leaf for
future use. Nothing in server HTML starts invisible: keyframe entrances run
only on surfaces the user just opened, `@starting-style` only on a panel the
user just un-hid, and `data-fade` only on images still loading after
hydration.

### Tools changed

- **style-diff** finishes UI animations and transitions before reading and
  pauses scene loops at t=0. It fingerprints every `@keyframes` rule except
  the UI layer's `motion-*` rules, which are reported once as "UI keyframes
  added/changed/removed". Two captures of the same build compare identical;
  a copy with one `nf-eyes` keyframe percentage altered reports "protected
  scenes CHANGED" and exits 1.
- **`lib/design/protected-scenes.test.ts`** hashes the scene files
  (`WayHomeScene.tsx`, `StreetPeople.tsx`, `ScenePlayback.tsx`,
  `way-home.css`, `LostScene.tsx`) and the protected declarations in
  `globals.css` and `login.css`, against values recorded from 0378010.
  Changing `nf-walk 10s` to `11s` fails it.

## 4. Data requirements

None. UI-04 adds no entity, field, migration or fixture.

## 5. Edge cases

| Case | Behaviour | Verified by |
|---|---|---|
| Second Escape during a child sheet's exit | closes the parent; focus returns to the page | motion-check (failed before the fix) |
| Click during a sheet's exit | goes through to the page (`pointer-events: none`) | motion-check |
| Escape on a header panel | gone immediately, focus on its toggle | shell-check, motion-check |
| Tap, navigate, Back on a card (touch) | no card transformed or lifted | motion-check |
| Photo still loading at hydration | transparent in its box, fades in on load | motion-check (photos held) |
| Photo fails | fallback text visible (cards and gallery) | motion-check |
| JavaScript off | home and property photos at full opacity, heading visible | motion-check |
| Slow RSC response on navigation | skeleton shimmers, every block keeps its box | motion-check (RSC held) |
| Off-screen lazy photo | stays pending until scrolled to | style-diff |
| Browser without `@starting-style` | panels appear instantly | by construction |

## 6. Accessibility requirements

- Sheet keeps: focus moves in on open; Tab stays inside (8 presses checked);
  the app root is `inert` while open; Escape closes only the top layer;
  focus returns to the trigger after the exit; outside click closes from
  640px. All asserted at 320, 390 and 768 in `motion-check`.
- While a dialog plays its exit, Radix keeps the page `aria-hidden` until it
  unmounts (200ms). Focus is restored only after unmount, so assistive
  technology lands on the page once it is exposed again.
- Reduced motion (`prefers-reduced-motion: reduce`): every running animation
  and transition on the page measures ≤ 0.01ms; sheets are opaque on their
  first frames; Escape and focus return still work; the card press is
  removed; the skeleton is still. Asserted in `motion-check`.
- Touch targets are unchanged (shell-check's 44px assertions pass).

## 7. Responsive requirements

`npm run shots`: no horizontal overflow and the bottom bar inside the
viewport at 320/360/375/390/412/430/768/1280. `motion-check` watches
document width on every frame while a sheet opens and closes at 320, 390 and
768: no temporary overflow. The 24px rise and 0.97 scale never push a sheet
outside the viewport; at 768 the sheet is measured centred after its
entrance. The Sort fix from UI-02 holds (search-check, shots).

## 8. Verification

| Command | Result |
|---|---|
| `npm run verify` | lint, typecheck, 620 unit tests in 68 files pass (new: motion-css 4, protected-scenes 2, variants 4, Presence 2) |
| `npm run build` | passes |
| `npm run shots` | no overflow at any width |
| `npm run light-check`, `search-check` | pass |
| `npm run motion-check` (new, in CI) | 73 assertions pass, five consecutive local runs |
| `npm run shell-check` / `phase-e-check` | 355 / 64 pass |
| `npm run login-check` (both modes), `notfound-check` | 117 and 138 / 36 pass |
| workspace checks (dashboard, performance, admin, moderation, users, listing, description, preview) | pass |
| `pricing`, `post`, `calculator`, `draft`, `photo`, `auth` checks | pass |
| style-diff UI-03 → UI-04 | 9 grouped changes, 7 UI keyframes added, protected scenes unchanged (below) |
| `motion-perf`, bundle-report | below |

**How the states that cannot be provoked from outside were provoked.**
The skeleton: hover a `/buy/kolkata/2-bhk` link until its prefetch settles
(Next aborts a prefetch stream once it holds the loading boundary, so a
settled prefetch is usually a *failed* request), then hold the navigation's
RSC request with a route handler. Photo fade: hold `/_next/image` until the
page is hydrated. Touch press: headless Chromium never sets `:active` from a
synthetic touch — measured with `Input.dispatchTouchEvent` and
`Input.synthesizeTapGesture` on the page and on a bare `<a>` — so the state
is forced with DevTools `CSS.forcePseudoState`, which still runs the real
cascade (the `(hover: none)` gate and the reduced-motion override).

### Existing checks adjusted for intentional animation timing

Three assertions in two existing checks read the DOM on the first frame
after an open or close, which UI-04 deliberately turned into a 150–300ms
animation. Each was changed to **wait for that animation to finish, bounded,
and then assert exactly what it asserted before**. None was loosened,
skipped or given a tolerance:

| Check | Assertion (unchanged) | Change | Why |
|---|---|---|---|
| `home-check` | on a phone the filters open full screen (390×844) | wait for the sheet's own animations to finish before `boundingBox()` | it measured a frame of the 24px rise (y=16.1) |
| `home-check` | the chosen locality shows in the search field | `await picker.waitFor({ state: 'detached' })` after Done | during the picker's 200ms exit Radix keeps the page `aria-hidden`, so a non-waiting role query found nothing (CI run 75) |
| `media-check` | Escape closes dialog (`count() === 0`) | wait up to 1s for the lightbox to detach | the lightbox now fades out over 150ms before Radix unmounts it |

Controls: without the new wait, the locality assertion fails locally with
the exact CI message; with it, all 122 home-check assertions pass (run with
the pre-existing local-only Escape issue below bypassed in a scratch copy
only). CI run 75 (1d77f00) failed on the locality assertion before this
adjustment was made; it was fixed in cfc7662.

### Remaining failures (pre-existing, unchanged)

Compared with the UI-03 logs line by line:

- `home-check` locally: Escape at line 195 does not close "More filters" in
  this container's Chromium, so the next click times out — the same failure
  at the same step as UI-03. It passes in CI.
- `property-check`: "valid enquiry does not claim success when durable
  storage is unavailable" and "form submits without JavaScript" — identical.
- `media-check`: "failed image shows clear fallback — blocked 0 requests" —
  identical. (motion-check separately proves the fallback appears for both
  card and gallery photos.)
- `lead-check`, `saved-check`: identical timeouts waiting for "Enquiry sent"
  and "Remove … from saved".

## 9. Production readiness

Ready. The motion layer adds no JavaScript and no request; it degrades to
the previous instant behaviour where `@starting-style` is unsupported; it is
covered in CI by `motion-check`, the motion CSS guard, the token test and
the protected-scene fingerprints. Before a Motion consumer ships, the
reduced-motion assertions in `motion-check` must be extended to that
component (see risks).

---

## JavaScript and CSS cost

First-load client JavaScript, UI-04 vs UI-03 (`npm run bundle-report --
--compare`, gzip):

| Route | gzip KB | Δ |
|---|---|---|
| Home | 175.6 | +0.1 |
| Search (buy / rent / filtered) | 177.9 | +0.1 |
| Property details | 176.1 | +0.2 |
| Login | 169.1 | +0.0 |
| Post property | 168.9 | +0.0 |
| EMI calculator | 172.0 | +0.0 |
| Activity (guest) | 167.7 | +0.1 |
| Not found | 175.6 | +0.1 |
| Seller dashboard (manifest upper bound) | 178.1 | +0.1 |
| Seller performance (upper bound) | 179.4 | +0.1 |
| Admin overview (upper bound) | 176.9 | +0.1 |

The +0.0–0.2 KB is the image-fade helper and class strings. Main stylesheet:
122,635 → 125,578 bytes raw, 23,017 → 23,508 gzip (+0.5 KB); the utilities
stylesheet shrank by 19 bytes gzip (`animate-pulse` gone).

**Lazy Motion chunk:** none emitted, before or after. No route mounts
`<MotionFeatures>`, so the features chunk does not exist yet, and
`<Presence>` / the presets have **no production consumer — no page pays for
them**. The first consumer will add, on its own route only, Motion's core
(~14.5 KB gzip) up front and the features (~14.2 KB) after hydration, as
measured in UI-02. That is UI-05's baseline.

## Mobile animation performance

`npm run motion-perf`: 390px, Chromium CPU throttled 4×, 7 runs, median run
by p95 frame interval. Frame intervals (ms) from `requestAnimationFrame`;
long tasks > 50ms from `PerformanceObserver`. UI-03 build vs UI-04 build.

| Scenario | UI-03 frames · p95 · long-task ms | UI-04 frames · p95 · long-task ms |
|---|---|---|
| Filters Sheet open | 15 · 400 · 397 | 22 · 117 · 292 |
| Filters Sheet close | 3 · 283 · 299 | 17 · 167 · 341 |
| Header menu open (phone) | 18 · 417 · 365 | 19 · 400 · 365 |
| Header menu close (phone) | 3 · 400 · 417 | 17 · 250 · 403 |
| Card press and release | 24 · 50 · 124 | 23 · 67 · 151 |
| Skeleton shimmer (1.6s) | 97 · 16.7 · 0 | 97 · 16.8 · 0 |
| Photo fade-in | 25 · 33 · 0 | 22 · 50 · 0 |

Unthrottled (5 runs): sheet and menu open each show one long task of
61–83ms in both builds; every other scenario has none and a p95 of 16.7ms.

Reading it: the cost of opening a sheet is **one long task, present in
UI-03 too**: React mounting the sheet's content (filter controls, the
menu's link lists). The CSS animation adds no long task — it runs after that
task, frame by frame (UI-04's frame counts are higher because the window now
contains a 300ms animation, not because work grew). The shimmer and photo
fade hold 16.7ms frames on a 4× slower CPU. Throttled figures vary run to
run by ±100ms on this runner, which is why `motion-perf` is a measurement,
not a CI gate. UI-03's proposed target — no long task over 50ms while a
sheet opens — is **not met**, and not because of animation; it needs the
sheet content to render less on open (recommendation below).

## Intentional changes at rest (style-diff UI-03 → UI-04)

50 captures, 1,092 element-properties, 9 grouped changes, all explained:

| Change | Elements | Cause |
|---|---|---|
| `transitionTimingFunction: ease, ease → cubic-bezier(0.2, 0, 0, 1) ×2` | 403 | CSS transitions now name the standard curve |
| `transitionTimingFunction: ease → cubic-bezier(0.2, 0, 0, 1)` | 372 | same, single-part transitions |
| `transitionTimingFunction: cubic-bezier(0.4, 0, 0.2, 1) → cubic-bezier(0.2, 0, 0, 1)` | 303 | Tailwind's default curve set to the standard role |
| `transitionTimingFunction: ease, ease → cubic-bezier(0, 0, 0.2, 1) ×2` | 1 | calculator peek bar arrives on the enter curve |
| `animationName: none → motion-fade-in` | 2 | open sheet overlay (search dialog, menu captures) |
| `animationName: none → motion-sheet-in` | 2 | open sheet content |
| `animationDuration: 0s → 0.3s` | 4 | same |
| `animationTimingFunction: ease → cubic-bezier(0, 0, 0.2, 1)` | 4 | same |
| `opacity: 1 → 0` | 1 | off-screen lazy gallery thumbnail not yet loaded (pending fade) |

No colour, size, position, radius, type or shadow changed at rest. Seven UI
keyframes were added (`motion-fade-in/out`, `sheet-in/out`, `pop-in/out`,
`shimmer`); no existing keyframes rule changed.

## Protected scenes

Login street and 404 scene, verified four ways:

1. No file of either scene is in the UI-04 diff (`git diff 0378010 HEAD`).
2. `protected-scenes.test.ts`: file and protected-CSS hashes equal the
   values recorded from 0378010.
3. style-diff: `.wh-scene` (614 elements), `.login-art` (621) and
   `.nf-scene` (88) markup identical at 390 and 1280; every non-UI
   `@keyframes` rule identical; no element inside a scene changed (the 1–6
   changed elements on the login screen and 8–9 on the 404 screen are header
   chevrons, buttons and bottom-bar pills taking the standard curve).
4. `login-check` (117 / 138 with auth) and `notfound-check` (36), including
   their markup, timing, keyframe and reduced-motion assertions, pass.

## Files

- CSS: `app/globals.css` (motion layer, easing roles, hover gating).
- Components: `components/ui/Sheet.tsx`, `components/ui/Skeleton.tsx`,
  `components/property/Gallery.tsx`, `components/property/PropertyImage.tsx`,
  new `components/motion/Presence.tsx`.
- Library: new `lib/motion/variants.ts`, `lib/motion/image-fade.ts`;
  `lib/motion/tokens.ts` (easing note).
- Tests: new `lib/design/motion-css.test.ts`,
  `lib/design/protected-scenes.test.ts`, `lib/motion/variants.test.ts`,
  `components/motion/Presence.test.ts`.
- Scripts: new `scripts/motion-check.mjs`, `scripts/motion-perf.mjs`;
  `scripts/style-diff.mjs`; `scripts/home-check.mjs` and
  `scripts/media-check.mjs` (timing adjustments above).
- CI: `motion-check` after `shell-check` in `.github/workflows/verify.yml`.

## Remaining risks

- **Motion's reduced-motion path is not browser-tested yet.** It has no
  consumer; `Presence.test.ts` covers server rendering only. The first
  `<Presence>` consumer must add its reduced-motion assertions to
  `motion-check`.
- **Sheet open long task** (60–80ms unthrottled, 300–550ms at 4×) predates
  UI-04 and is what a slow phone feels, not the animation.
- **Search routes without JavaScript show only their skeleton.** Their
  `loading.tsx` makes the page a streamed Suspense boundary that React swaps
  in with JavaScript. Pre-existing; found while writing the no-JS test, which
  now uses home and property instead.
- **200ms of `aria-hidden` after a dialog closes** (Radix, while the exit
  plays). Focus returns only after it lifts; tests that read the page must
  wait for unmount, as the adjusted checks do.
- **Headless `:active`.** The press is verified through a forced pseudo-state,
  not a real tap; a real-device check on Android is worth doing once.
- `@starting-style` needs Chrome 117, Safari 17.5, Firefox 129; older
  browsers get the previous instant panels.

## Recommendation for UI-05 — Primitives

Follow UI-01 §6 item 4, on this baseline (no Motion on any route):

1. **One `StatusBadge`** in `components/ui` for the full listing lifecycle
   (UI-01 P9: `StatusPill` has zero importers), on the UI-03 status tones.
2. **Button adoption** where raw `<button>`s re-implement it (77 raw
   buttons in 33 files; `.calc-cta`), without visual change.
3. **44px targets** (UI-01 P3): filter-chip remove buttons (24×24), "Clear
   all" (76×32), calculator inputs (26px), breadcrumb links (20px).
4. **Tabs** — evaluate Kokonut `smooth-tab` as the first vendored component,
   per the UI-02 rules (pinned commit, re-tokenised, `m.*`, a11y review,
   provenance). If it ships, it is Motion's first consumer: run
   `bundle-report` against this document's table, add its reduced-motion
   assertions to `motion-check`, and keep it a client leaf.
5. Empty and error states on the same primitives.
6. Measure, and if possible remove, the sheet-open long task (render the
   filter and menu content lazily or memoise it), with `motion-perf` before
   and after.

Out of UI-05: results-list entrance and filter-chip layout animation (UI-06),
charts (UI-10), Anime.js, and the login and 404 scenes.
