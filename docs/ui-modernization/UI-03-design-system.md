# UI-03 — GharBazaar design system cleanup

Status: complete, 17 October 2026, on `main`. Builds on [UI-01](UI-01-audit.md)
and [UI-02](UI-02-foundation.md).

UI-03 normalises the existing visual foundation so later Kokonut UI, Motion
and Bklit work draws from one system. It is not a redesign: no new
component, no new animation, no layout change. The login street scene and
the 404 scene are frozen, and the comparison below shows they are
byte-identical.

---

## 1. Scope

**In:** a style-comparison tool, built first; colour, radius, type, shadow
and transition-timing normalisation; one listing-status tone mapping; the
raw-colour guard extended to CSS; a scale ratchet; dead and shadowed CSS
removal; corrected design-system documentation.

**Out:** component consolidation (the 77 handwritten buttons, the unified
status badge, cards — UI-05), Kokonut components, Bklit charts, Motion
usage, Anime.js, any page redesign, the login and 404 scenes, auth,
search/URL state, `PriceDisplay`/`AreaDisplay`, business logic, APIs, schema.

## 2. UX requirements

Nobody should notice a redesign. Every rendered change is small (corner
radii within 2px, three sub-floor labels 1px larger, one 12.5px count 0.5px
larger, three transitions retimed by 30–50ms, one hover shadow aligned with
its sibling card) and listed in §Intentional visual changes. The login
screen and 404 page render identically except for one header pill whose
computed radius value changed without changing its shape.

## 3. Technical requirements

### The normalisation rule

A rendered value changed only when one of these held, otherwise the literal
was tokenised at its exact value or left and listed as deferred:

- **(a) imperceptible:** an equivalent value, radius within 2px, type within
  0.5px;
- **(b) a documented rule violation:** type below the 11–12px floor;
- **(c) two elements with the same role disagreed:** the property card's
  hover shadow and timings against the compact card's.

### Style comparison (built first)

`scripts/style-diff.mjs` (`npm run style-diff`), with a deterministic
fixture simulator `scripts/style-diff/simulator.mjs` for signed-in screens.

- **capture** records, for every visible element and its `::before`/`::after`
  on 26 screens (50 screen-width captures), 51 computed properties —
  colours, border colours/widths, the four corner radii, box shadow,
  outline, font family/size/weight, line height, letter spacing, text
  transform, padding, margin, gaps, opacity, fill, stroke, backdrop filter,
  transform, transition and animation timing — plus the element's box.
- **Screens:** home (390/1280), the home search dialog and Phase E menu
  (390), search buy / filtered / locality / rent / zero results, two property
  pages, login and register, 404, posting entry and details, calculators
  index and EMI, guest Activity (Phase E), Videos, and, signed in against
  the simulator, the seller dashboard, enquiries and performance and the
  admin overview, listings, moderation queue and system pages.
- **Determinism:** fonts and streamed Suspense content awaited; 300ms of
  network quiet (a response counts as done — Playwright never reports
  completion for an unread 401 body, which first stalled captures); every
  CSS animation and transition paused at t=0. Three captures of the same
  build compared with **zero** differences; an earlier version raced the
  save buttons' saved-state fetch (opacity 0.6 vs 1), which the quiet
  window fixed.
- **Protected scenes** are fingerprinted: a SHA-256 of the `.wh-scene`,
  `.login-art` and `.nf-scene` markup, the text of every `@keyframes` rule,
  and each element's animation properties.
- **compare** groups differences by property and value with counts, screens
  and example elements, lists structural changes, and reports the protected
  fingerprints; `--expect-none` exits non-zero on any difference.
- **Not covered:** hover/focus states (not reached by a static capture) and
  widths between 390 and 1280. Those are covered by construction instead:
  the dead-CSS removal only touches declarations shadowed by an identical
  selector in the identical media context, and every mapping is per
  declaration.

The tool earned its place on the first run: see §Protected login styles.

### Colours normalised

The `--home-*` (17), `--reference-*` (8) and `--chart-interest` palettes,
consumed only by CSS, were folded into `@theme` as role-named tokens at
identical values; the two identical forest greens became one:

| Before | Token |
|---|---|
| `--home-forest`, `--reference-banner` (#103f32) | `--color-forest` |
| `--home-mint` / `-white` / `-overlay` / `-line` | `--color-mint` / `on-forest` / `forest-overlay` / `forest-line` |
| `--home-glass`, glass literals `#ffffff66`, `#ffffff00`, `#ffffff`, TSX `border-white/80` | `--color-glass`, `glass-sheen`, `glass-sheen-end`, `glass-highlight`, `glass-edge` |
| `--home-sand`, `--reference-cream` | `--color-sand`, `--color-cream` |
| `--reference-brand-tint`, `--reference-search-border` | `--color-brand-50`, `--color-brand-200` |
| `--reference-dark`, `--reference-muted`, `--reference-grey` | `--color-graphite`, `graphite-muted`, `surface-grey` |
| `--home-tint-*`, `--home-art-*` | `--color-tint-*`, `--color-art-*` |
| `--chart-interest` | `--color-chart-interest` |

The forest bands keep their own `on-forest` colour rather than borrowing
`ink-inverse`, which flips in the dark theme while the bands stay dark.
The legacy `border-white/80` became `border-glass-edge` at the same value,
emptying the raw-colour legacy list. No Tailwind default palette colour was
introduced; the app stays light-only.

### Radii normalised

Scale unchanged: `sm` 4, `md` 12, `lg` 20, `full`. Equivalent mappings:
`12px`→`md` (11), `4px`→`sm`, `50%`→`full` on elements verified square in
the capture (31), `99px`→`full` on pills (4 rules), the 2–3px indicator bars
`2px`→`full` (both clamp to the same rounded ends), the chart column
`rounded-t-[4px]`→`rounded-t-sm`. Recorded changes (rule a): `3/5/6px`→`sm`,
`10/14px`→`md`, `13px`→`md − 1px` (keeps the inner-border relation),
`18/22px`→`lg`, the hero search panel `rounded-[22px]`→`rounded-lg`.
Pills and circles keep their form. Deferred: 16px tiles (between `md` and
`lg`, a 4px move either way — UI-05 decides the card radius), the approved
workspace's 8px panels (UI-09), two Phase E 8px controls and the seller
band's 26px desktop frame (UI-06), the focus ring's 2px (permanent), and
`rounded-[24px]`/`rounded-2xl` in TSX (login card UI-07, posting UI-05,
Videos UI-05).

### Typography

Equivalent: every CSS font size equal to a scale step now reads it —
`11px`→`--text-overline`, `12px`→`caption`, `13px`→`body-sm`, `15px`→`body`,
`17px`→`body-lg`, `20px`→`heading-3`, `25px`→`heading-2` (size only; weights,
line heights and tracking stay as declared). In TSX the posting progress
labels' `text-[11px]` became `text-(length:--text-overline)`, the size alone
(the full `text-overline` would also change weight and tracking); `cn()`
recognises that form (new test). Recorded changes: below the floor, the
Phase E banner eyebrow and the guest activity summary label 10px→11px, and
the gallery's compact Sample tag 10px→11px (rule b); the quick-route hint
11.5px→12px and the budget/size tile counts 12.5px→13px (rule a).

**The 9px hero label** named in UI-01 turned out not to render: it belonged
to the September 2026 hero (`.home-hero`, `.hero-*`), which Phase E replaced.
No file references those classes and none of the 50 captured screens renders
them, so the whole block was removed (§Removed CSS). Likewise `.quick-label`'s
12.5px never applied — a later Phase E rule set 13px.

Deferred: 14/16/18/19px compact and display sizes and the 21–42px headings
(Phase E reference sizes, the seller band, the calculator figure, workspace
headings), each 1–3px from a step, move with their components in
UI-05/06/09; a 140px decorative glyph stays. Line heights are untouched.
The `text-body-*`, `text-ink-*` and font utilities UI-02 protected in
`cn()` are unchanged and still tested.

### Shadows

Every elevation is now a token. Existing: `e0`–`e3`. Added role tokens, each
at the value it replaced: `float` (the frosted hero search panel),
`panel` (glass panels — account, posting, the login card and the 404 card),
`glass` (glass cards), `tile` (Phase E resting tiles; the discovery band's
`0 2px 5px` became `0 2px 4px`), `raised` (the Phase E sticky search). The
property card's hover `0 12px 32px` became `e2`, the hover shadow the compact
card already uses (rule c) — lighter, never heavier. Flat rings and inset
indicator bars stay written out: they are shapes, not elevation. `cn()`
knows the new names (its test requires it).

### Timing

CSS transitions read the UI-02 scale: `.1s`→`instant`, `.15s`→`fast`,
`.2s`→`base`, `.45s`→`deliberate` (equivalent); the property card's `.25s`→
`base` and its image zoom `.5s`→`deliberate` (rule c, matching the compact
card), the posting chip's `120ms`→`fast`. Tailwind's own default transition
duration is now `var(--duration-fast)`, the same 150ms. Easing curves were
left as declared (UI-04 assigns curves by role). The login and 404 scene
timelines were not touched; the reduced-motion rule's `0.01ms` stays.

### Listing-status mapping

`lib/listings/status-tone.ts` maps every displayed status
(`DASHBOARD_STATUSES`, identical to `ADMIN_STATUSES`) to one of four tones,
named by meaning; each tone is a token pair aliasing the semantic colours,
so the dark theme follows:

| Status | Tone | Tokens (alias of) |
|---|---|---|
| Draft, Expired, Withdrawn, Removed | neutral | `status-neutral` / `-bg` (neutral-600 / 100) |
| Under review, Corrections requested | pending | `status-pending` / `-bg` (warn-600 / 100) |
| Active | live | `status-live` / `-bg` (trust-600 / 100) |
| Rejected | problem | `status-problem` / `-bg` (danger-600 / 100) |

The existing `StatusBadge` now reads the mapping (no visual change — a test
asserts each status resolves to exactly the colours it used before, and
that every pair meets 4.5:1). The unified badge component remains UI-05.

### Raw-colour guard

`lib/design/raw-colour.ts` gained `findRawCssColours`, built on a small
dependency-free CSS reader (`lib/design/css-walk.ts`, tested): in every CSS
file under `app/` and `components/` it flags hex and `rgb()`/`hsl()`/
`oklch()`-family literals, colour keywords and `var(--color-<default palette>)`
in ordinary declarations. Literals remain allowed only in custom-property
declarations (the token layer). The frozen scenes are exempt
(`components/auth/way-home.css`; `.wh-*`, `.login-art*`, `.nf-*`, `.google-*`
rules; their keyframes). The CSS legacy list is **empty**, and so is the
TS/TSX one now; both must match exactly. Positive and negative controls
are recorded in §8.

Added alongside:
- `lib/design/scale-literals.test.ts` — every CSS radius, font size,
  transition duration and blurred shadow comes from a scale or is listed with
  a reason and a stage (52 CSS entries; 17 TSX values in 10 files); the lists can only
  shrink.
- `lib/design/css-vars.test.ts` — no CSS `var()` references a property that
  nothing defines (stylesheets, inline style variables, next/font, Tailwind).

### Removed and deferred CSS

- **Shadowed declarations (28):** a declaration was removed only when every
  selector of its rule is redeclared later with the identical selector, in
  the identical media/layer context — so cascade order alone had decided the
  old outcome. They were Phase D and early-homepage values that Phase E
  restated: the app bars' shadows, the phone bar's colours, pill fill and the
  filled orange Post circle, the quick routes' grid, border, radius and
  icon tiles, `.quick-label`'s 12.5px. Five rules emptied and went. Two
  partial cases (a multi-selector rule where only one selector is
  shadowed) were kept. Comments that described the dead styling were
  corrected.
- **The September hero (27 rules):** `.home-stage`, `.home-hero`, `.hero-copy`,
  `.hero-eyebrow`, `.hero-description`, `.hero-city-note`, `.hero-caption`,
  `.hero-search` and their media rules — no reference in any TS/TSX file,
  test or check script, and not rendered on any captured screen. The hero
  image stays: the Phase E banner uses it.
- **Left in place:** everything else, including rules the static search
  could not prove dead.

## 4. Data requirements

None. No entity, migration, fixture or query change; the style-diff
simulator holds test fixtures only.

## 5. Edge cases

- A new colour, radius, size, duration or shadow literal: fails the guards.
- A removed token still referenced (the UI-03 near-miss): fails
  `css-vars.test.ts`.
- A new `@theme` type, shadow or font token without `cn()` configuration:
  fails `cn.test.ts`.
- Dark theme (opt-in only): the new editorial tokens have no dark values,
  as the palettes they replace had none; status tones alias semantic tokens
  that do.

## 6. Accessibility requirements

Status tone pairs meet 4.5:1 (tested). Every changed label moved up, never
down. Touch targets did not change (§7). Reduced motion is unchanged.

## 7. Responsive requirements

`shots` at 320, 360, 375, 390, 412, 430, 768 and 1280 across 26 routes;
results in §8.

## 8. Verification

Run on this container against production builds with CI's two-server
arrangement (3100, and 3101 against the Auth/REST simulator) and
`CHROME_PATH` set. Final build `vy9u_kM0wCXE_aUdXIhHS`.

| Check | Result |
|---|---|
| `npm run verify` (lint, strict types, Vitest) | pass — 64 files, 608 tests (590 after UI-02; +18: status tones 4, CSS colour guard 5, CSS reader 3, scale ratchet 3, CSS variables 2, `cn` size-only form 1) |
| `npm run build` | pass |
| `shots` (26 routes × 320/360/375/390/412/430/768/1280) | pass — no overflow, bottom bar inside the viewport |
| `light-check` / `search-check` | pass / 64 passed |
| `login-check` (public / simulator) | 117 / 138 passed — scene timing assertions unchanged |
| `notfound-check` | 36 passed |
| `phase-e-check` / `shell-check` | 64 / 355 passed |
| `dashboard-check` / `performance-check` / `admin-check` | 72 / 102 / 124 passed |
| `moderation-check` / `users-check` / `listing-check` | 34 / 92 / 23 passed |
| `description-check` / `preview-check` / `draft-check` / `photo-check` / `auth-check` | 28 / 24 / 27 / 31 / 38 passed |
| `calculator-check` / `pricing-check` / `post-check` | 43 / 46 / 87 passed |
| Style comparison, approved build → UI-03 | 70 distinct changes, all explained below; protected scenes identical; no structural change; full report in [UI-03-style-report.md](UI-03-style-report.md) |
| Touch targets | 2,752 interactive elements compared across the capture: none smaller |

**Pre-existing container failures, unchanged.** `home-check`,
`property-check` (2/67), `media-check` (1/26), `lead-check` and
`saved-check` fail at exactly the assertions they failed on the pre-UI-02
build (recorded in UI-02). `home-check` passes in CI (run #73).

**Guard controls.** CSS colour guard: unit cases flag a hex, an `rgba()`,
`white` and `var(--color-zinc-500)`, and accept tokens, `color-mix` over
tokens, `url()`s, font names and `white-space`; the project scan is empty.
Scale ratchet: a planted `.probe-card { border-radius: 14px; box-shadow: 0
12px 32px … }` failed it and passed once removed; its own pattern initially
let a blurred shadow through as a "spread", which a control case caught.
`css-vars`: removing one protected alias failed it. A note on method:
Vitest swallowed `console.log` from ad-hoc probes in this setup, so probe
results were written to files; a first "zero findings" reading was only
trusted after that and after the asserting tests passed.

## 9. Production readiness

Shippable. The change is CSS tokens, two removed blocks of dead CSS, one
TS mapping and guards; JavaScript is unchanged (§Bundle comparison), every
check that passes on `main` passes, and the login and 404 scenes are
measured identical. Follow-ups, not blockers: the deferred literals (each
with a stage), hover-state capture in the comparison tool, dark values for
the editorial tokens if the dark theme is ever switched on.

---

## Protected login styles

The login street (`components/auth/way-home.css`, `WayHomeScene`,
`StreetPeople`, the `--wh-*` palette), the login art panel (`.login-art*`,
`login-copy` keyframe) and the 404 scene (`.nf-*`, `LostScene`) were not
edited. Excluded from every migration by selector, file and keyframe name.

**What happened.** The first comparison after folding the palettes into
`@theme` reported the login scene's frames, rails, door frames and bags
turning black and the "Welcome home." title changing colour: `way-home.css`
and the art styles in `login.css` read `--home-forest`, `--home-mint` and
`--home-sand`, and removing those names had made their references invalid.
The fix left both stylesheets untouched: `globals.css` keeps those three
names as aliases of the new tokens, at identical values, in a commented
block that explains why. `css-vars.test.ts` now fails if any CSS reference
loses its definition (negative control: removing one alias fails it, naming
both protected files).

**Unchanged, measured:** on the final build, at 390 and 1280 on `/login`,
`/login?mode=register` and the 404, the `.wh-scene` (614 elements),
`.login-art` (621) and `.nf-scene` (88) markup hashes, the full `@keyframes`
text, and every element's computed style including animation name,
duration, delay, timing function, iteration, direction and fill mode all
match the approved build; `login-check` and `notfound-check` timing
assertions pass.

## Intentional visual changes

From the [style report](UI-03-style-report.md); counts are elements across
the 50 captures.

| Change | Where | Rule |
|---|---|---|
| Radius 10px → 12px | menu hub icons, locality/type count links, Phase E discovery links, possession items, tools cards, locality panel | a |
| Radius 14px → 12px; 13px → 11px | quick-route icons, locality tiles, all-localities box and its summary, calculator index icons | a |
| Radius 18px → 20px | calculator form/result panels and index cards, guest Activity compact cards | a |
| Radius 22px → 20px | seller invitation band (phone), hero search panel, guest Activity summary | a |
| Radius 6px → 4px; 5px → 4px; 3px → 4px | workspace skip link, nav links, browse link, form controls, nav count; EMI legend keys; phone-bar Post icon (an svg without background: no visible change) | a |
| Font size 10px → 11px | Phase E banner eyebrow (its 0.15em tracking scales with it), guest Activity summary label, gallery compact "Sample" tag | b |
| Font size 11.5px → 12px | quick-route hint | a |
| Font size 12.5px → 13px | budget/size tile counts (their inner spans inherit; tiles do not move) | a |
| Transition 0.25s → 0.2s, 0.5s → 0.45s | property card lift and image zoom (now equal to the compact card) | c |
| Transition 120ms → 150ms | posting choice chips | a |
| Hover shadow `0 12px 32px` → `e2` | property card (hover only; not captured) | c |
| Shadow blur 5px → 4px | Phase E discovery links (`tile` token) | a |

Representation only (the rendered pixels are the same): `99px` → `9999px`
on pills and `50%` → `9999px` on squares; `2px` → `9999px` on 2–3px
indicator bars (both clamp to the same rounded end); the hero search
panel's border from Tailwind's oklab white at 80% to `rgba(255,255,255,0.8)`.
On the login screen and the 404 page the only changed element is the
header's "Post property" pill (representation only); the 404 page's
phone-bar Post icon also changes radius on a transparent svg.

## Bundle comparison

`npm run bundle-report`, production build, first-load gzip KB:

| Route | UI-01 baseline | UI-02 | UI-03 | Δ vs UI-02 |
|---|---|---|---|---|
| Home | 165.7 | 175.4 | 175.5 | +0.0 |
| Search (buy / rent / filtered) | 167.9 | 177.8 | 177.8 | +0.0 |
| Property details | 166.0 | 175.9 | 175.9 | +0.1 |
| Login | 159.4 | 169.1 | 169.1 | +0.0 |
| Post property | 159.1 | 168.8 | 168.8 | +0.0 |
| EMI calculator | 162.2 | 172.0 | 172.0 | +0.0 |
| Activity (guest) | 157.8 | 167.5 | 167.6 | +0.0 |
| Not found (404) | 165.7 | 175.4 | 175.5 | +0.0 |
| Seller dashboard / performance / admin (upper bound) | 168.6 / 170.0 / 167.4 | 178.0 / 179.3 / 176.8 | 178.0 / 179.3 / 176.8 | +0.0 |

The 0.1 KB on the property page is the gallery tag's longer class string
(`text-(length:--text-overline)` for `text-[10px]`) in its client chunk; the
workspace routes, where the status mapping lives, measure +0.0.

## Remaining risks

- Hover, focus and active states are not captured by the comparison; the
  one deliberate hover change (property card) was reasoned, not measured.
- Widths between 390 and 1280 are covered by `shots` for overflow, not by
  the style comparison.
- 52 CSS literals and 17 TSX arbitrary values remain, each deferred with a
  stage; until then the type scale has visible 1–3px neighbours.
- The editorial tokens have no dark-theme values (as before).
- The CSS reader is purpose-built: nested CSS or semicolons inside strings
  would need it extended.

## Proposed scope for UI-04 — Animation system

UI-04 builds the animation system on the UI-02 foundation and the UI-03
timing tokens. Motion handles React-driven transitions; CSS stays CSS where
it already works. No decorative effects, no Anime.js, no change to the login
or 404 scenes, no redesign.

**In**
1. **Primitives** in `components/motion/` (client leaves, `m` from
   `motion/react-m` inside `MotionFeatures`): `Presence` (enter/exit), a
   transform-only `Reveal` that never starts above-the-fold content from
   invisible, and a list `Stagger` capped so long lists do not delay; shared
   variants in `lib/motion/variants.ts` built from `TRANSITION`.
2. **Overlays first** (UI-01 P5): animate `Sheet` — slide up on phones,
   fade/scale from 640px — with Radix `forceMount` + `AnimatePresence`,
   keeping its focus return, nested `inert` lock and Escape layering exactly
   (verified by `shell-check` and `phase-e-check`); the header nav panels and
   the marketplace menu with the `base`/`fast` presets.
3. **CSS easing by role**: give existing CSS transitions `--ease-enter|exit|
   standard` (UI-03 left curves as declared), and fix UI-01 P4 — the
   property card's hover lift sits outside `(hover: hover)`, so a tap on
   Android leaves it raised.
4. **Loading and images**: skeleton shimmer on the timing tokens; a
   `PropertyImage` fade-in on load that cannot shift layout.
5. **A permanent reduced-motion browser check** (`motion-check`) against a
   real animated component, replacing UI-02's temporary probe: transforms
   jump, fades remain, CSS collapses.
6. **Performance budget**: measure every animated route with the bundle
   report (target: features stay lazy; first-load growth only where something
   animates) and with Chromium CPU throttling at 390px (no long task over
   50ms while a sheet opens); decide `domAnimation` vs `domMax` on that
   evidence before any layout animation.

**Out:** Kokonut components (UI-05), charts (UI-10), page redesigns, the
login and 404 scenes, Anime.js.

**Acceptance:** the CLAUDE.md commands and every passing browser check; the
style comparison showing only listed changes at rest (motion is
time-based, so the at-rest capture must be identical except where a static
value moved); `motion-check`; the bundle and throttled-frame measurements;
login and 404 fingerprints identical.
