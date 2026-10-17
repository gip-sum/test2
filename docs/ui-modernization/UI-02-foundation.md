# UI-02 — Foundation

Status: complete, 17 October 2026, on `main`. Builds on the approved
[UI-01 audit](UI-01-audit.md); its decisions are final for this stage.

UI-02 is infrastructure, safeguards and one measured mobile fix. It adds no
animation, no Kokonut UI component, no Bklit chart and no redesign, and does
not touch auth, the Python processor, the login and 404 scenes, URL-driven
search state, modal accessibility, `PriceDisplay`/`AreaDisplay`, the approved
workspace or the Phase E layout.

---

## 1. Scope

**In**
- A JavaScript baseline per route, recorded before any library landed.
- Motion installed at an exact version; a reduced-motion provider; a lazy
  feature boundary for future animated leaves; an import guard.
- One timing scale shared by CSS and Motion.
- `cn()` on `clsx` + `tailwind-merge`, configured for the project's tokens.
- `components.json` for the Kokonut UI and Bklit UI registries.
- An automated guard against raw colours.
- The search sort-control overflow below ~350px (UI-01 P1), and a second
  search overflow the corrected harness exposed.
- `shots` at 320/360/375/390/412/430/768/1280, measuring streamed pages
  after their content arrives.
- Deleting the stray `ccr-a0512092-8x9f38` branch (no unique commits).

**Out:** Anime.js (decision 1), any visible animation, Kokonut components,
Bklit charts and their dependencies, redesigns, the CSS literal clean-up
(UI-03), roadmap renumbering, backend changes, phone OTP.

## 2. UX requirements

No visible change except where a defect was fixed:
- On phones narrower than ~350px, search results no longer scroll sideways
  and the bottom bar stays on screen. The sort control moves to its own line
  at full width there instead of being squeezed; it keeps its 44px height
  and full labels. At 360px and wider nothing moves.
- The search loading skeleton matches the toolbar's real widths and wraps
  the same way, so small phones do not jump a row when results arrive.
- Loading skeletons now render the corner radius their callers specify (a
  side effect of `cn()` merging; see §3).

## 3. Technical requirements

### Motion version: 14.1.1

Checked against the official changelog (read from the Motion repository's
`CHANGELOG.md`) and the npm registry on 17 October 2026:

| Version | Released | Relevant |
|---|---|---|
| 12.43.0 | 27 Jul | Last 12.x. Both registries were written against `^12` |
| 13.0.0 | 5 Aug | Only breaking change: optional `@emotion/is-prop-valid` removed (we use neither Emotion nor styled-components) |
| 14.0.0 | 2 Oct | Removes *internal* APIs only; from here `motion` pins `framer-motion`, `motion-dom` and `motion-utils` exactly |
| 14.1.0 / 14.1.1 | 9 / 13 Oct | Fixes: `whileHover`/`whileTap` stuck, `useTransform` desync under Strict Mode (this app runs `reactStrictMode`), `AnimatePresence`, animation start when the main thread is busy |
| 14.2.0 | 13 Oct | New pipeline: hardware-accelerated independent transforms |
| 14.3.0 | 15 Oct | Fixes immediately following 14.2 |

**14.1.1** is the current major (no upgrade debt), has the Strict Mode and
interaction fixes, and stops before 14.2's brand-new acceleration pipeline,
which had follow-up fixes within two days. Its whole tree is pinned:
`motion 14.1.1 → framer-motion 14.1.1 → motion-dom/motion-utils 14.1.1`.
Peer range `react ^18 || ^19` covers React 19.3; Next 16.3 is supported as a
client-component library. Both registries import only the public
`motion/react` API (131 imports, no internals), which 13 and 14 kept intact,
so their code is compatible. Upgrading past 14.1 is a deliberate later
decision, re-measured with the bundle report.

### Dependency changes

| Package | Version | Why |
|---|---|---|
| `motion` | 14.1.1, exact | Primary React animation library |
| `tailwind-merge` | 3.7.0, exact | `cn()` conflict resolution (released 12 Sep, five weeks of use) |
| `clsx` | 2.1.1, exact | `cn()` input handling; the registries' convention |

Nothing removed. No Anime.js, `lucide-react`, visx, d3, `vaul` or shadcn
packages.

### Reduced-motion architecture

- **CSS:** unchanged. The base-layer rule in `globals.css` still collapses
  every CSS animation and transition under `prefers-reduced-motion`.
- **Motion:** `components/motion/MotionProvider.tsx`, mounted once in
  `app/layout.tsx`, wraps the app in `MotionConfig reducedMotion="user"`.
  With the OS setting on, every Motion component skips transform and layout
  animation (jumping to the end state) and keeps opacity/colour fades, so no
  later component has to remember. The CSS rule cannot do this: Motion
  animates from JavaScript. Custom non-Motion animation reads
  `useReducedMotion()`.
- The provider is configuration only: no DOM, no animation code.

### Motion and the client boundary

- `MotionProvider` is the only client wrapper at the root; a client
  component may take server components as `children`, so every page stays
  server-rendered (no page file gained `'use client'`).
- `components/motion/MotionFeatures.tsx` is the boundary each future animated
  leaf sits in: `LazyMotion strict` with features loaded by dynamic import
  (`components/motion/features.ts`, `domAnimation`). Pages that animate
  nothing download no animation code; `strict` throws in development if a
  `motion.*` component (typical of registry code) slips through.
- **Leaves import `m` as `import * as m from 'motion/react-m'`.** Measured
  with a temporary probe page: importing `m` from the `motion/react` barrel
  made webpack hoist the features into the first-load chunk (38.6 KB gzip;
  the "lazy" chunk was a 0.2 KB stub, and the in-view, hover and tap code
  sat in the synchronous chunk). Through `motion/react-m` the animating page
  loads 14.5 KB up front and the 14.2 KB of features in a separate chunk
  after hydration. ESLint now rejects `m` from `motion/react`.
- The pattern: wrap the smallest thing that moves in a client leaf; pass
  server-rendered content in as `children`. Never animate above-the-fold
  content in from invisible.

### Import guard (`eslint.config.mjs`)

`no-restricted-imports` rejects `framer-motion` (and subpaths), the bare
`motion` entry (vanilla JS API), `motion` and `m` from `motion/react` (use
`import * as m from 'motion/react-m'`), `motion/react-client`, and
`animejs` (approved, not installed). Negative controls: scratch files with
each form produced one error per forbidden import, while `AnimatePresence`
from `motion/react` and the `motion/react-m` namespace import passed.

### Shared timing structure

`lib/motion/tokens.ts` holds the scale; `globals.css` mirrors it in an
`@theme static` block (static so the variables exist before any rule uses
them, and Tailwind generates `ease-standard|enter|exit`).

| Token | Value | Role |
|---|---|---|
| `instant` | 100ms | press feedback |
| `fast` | 150ms | hover/focus colour, icon turns, exits |
| `base` | 200ms | menus, dropdowns, tabs, list items; MotionConfig default |
| `slow` | 300ms | dialogs, drawers, sheets arriving |
| `deliberate` | 450ms | the ceiling: image zoom, rare page entrance |
| `standard` | cubic-bezier(0.2, 0, 0, 1) | moving while on screen |
| `enter` | cubic-bezier(0, 0, 0.2, 1) | arriving (decelerate) |
| `exit` | cubic-bezier(0.4, 0, 1, 1) | leaving (accelerate) |

`TRANSITION` names roles for Motion: `base`, `press`, `hover`, `enter`,
`exit`, `overlayEnter`, `overlayExit`, and `layout` (a spring with no
bounce). `lib/motion/tokens.test.ts` fails if CSS and TypeScript disagree,
if a preset uses an off-scale value, if anything exceeds 450ms, or if an
exit is not faster than its entrance. Existing literal durations (100,
120, 150, 200, 250, 450, 500ms) are mapped onto the scale in UI-03.

### `cn()` and tailwind-merge

`lib/cn.ts`: `cn(...parts) = merge(clsx(parts))`. The signature accepts
everything the old join did, plus clsx arrays/objects.

**Default tailwind-merge breaks this app.** It knows only Tailwind's
default sizes and files every other `text-*` as a colour, so
`cn('text-body-sm', 'text-ink-700')` returned `text-ink-700` — the size
silently dropped, on nearly every text element. Measured before configuring.

Custom configuration (`extendTailwindMerge`):
- `theme.text` = the 13 type tokens; `theme.shadow` = `e0`–`e3`;
  `theme.font` = `sans`, `display`.
- `conflictingClassGroups['font-size'] = []`: tailwind-merge would drop an
  earlier `leading-*` when a text size follows, but Tailwind v4 compiles each
  type token to `line-height: var(--tw-leading, …)`, so an explicit
  `leading-*` wins in any order. Removing it would change rendering.
- Colours keep the default "any value" rule; radius tokens (`sm`/`md`/`lg`/
  `full`) already match tailwind-merge's scale; unknown project classes
  (`tabular`, `bar-item`, `glass-card`) pass through untouched.

`lib/cn.test.ts` (17 tests) reads the token names from `globals.css` and
asserts: every type token survives beside every colour token in both
orders (13 × 41 pairs); type tokens survive beside weight, family, leading,
tracking and alignment; colour tokens survive across properties; border
width + colour; variants and breakpoints; genuine conflicts resolve to the
last class for type, colour, shadow, radius, family and spacing; the config
lists exactly the `@theme` type, shadow and font tokens (so a new token
without config fails); and backward compatibility. Negative controls: with
the default merge three tests fail; without the leading override one fails.

**Existing call sites.** `cn` was temporarily instrumented to log every
call whose merged output differed from the old join, with a liveness marker
(the first attempt reported zero differences because a stale server was
answering; the marker exposed it). 31 routes × 390/1280px, 62 instrumented
page loads, server and browser, plus a static review of every `className`
pass-through and the signed-in screens the crawl cannot reach. For each
difference the old effective rendering was read from compiled CSS order:

| Call site | Before (CSS order) | Merged | Action |
|---|---|---|---|
| Card focus ring `outline outline-2` | 2px | 2px | none |
| Save button `border`/`border-0`, `bg-surface-000/95`/`bg-transparent` | 0, transparent | same | none |
| Calculator error `border`→`border-2`, `px-3`→`px-[11px]` | 2px, 11px | same | none |
| Horizontal card save button `size-11` + `size-9` | **44px** | 36px | dropped `size-9`: keeps the 44px target |
| Performance listing link `inline-flex` + `flex` | **inline-flex** (approved workspace) | flex | dropped `flex`: keeps the approved render |
| Skeletons `rounded-sm` + `rounded-none`/`rounded-lg` | 4px | 0 / 20px | kept: the callers' stated intent, and Skeleton's rule that it match the real element |

The instrumentation was removed before commit.

### Registry configuration

`components.json` declares `@kokonutui` and `@bklit` registries and aliases
into our tree, with `utils` → `@/lib/cn` (so adapted code that imports
`cn` gets the token-aware merge) and no Tailwind v3 config.
`lib/design/registry-config.test.ts` checks every alias resolves, the utils
alias, the exact two https registries, and the stylesheet path.

**Strategy.** This environment's network policy blocks `kokonutui.com` and
`ui.bklit.com`; GitHub is reachable. Components are therefore adapted by
hand from each project's official GitHub repository at a pinned commit,
never from mirrors and never by letting the CLI write into the repository
(it would inject shadcn's theme variables into `globals.css`):

| Source | Pinned at | Licence |
|---|---|---|
| github.com/kokonut-labs/kokonutui | `bb9120f8711b63eb5a7545976cac7493d49e616c` (17 Oct 2026) | MIT |
| github.com/bklit/bklit-ui (`packages/ui`) | `7167844902bf81afd43c52f223a04f40f6b03159` (15 Oct 2026) | MIT (charts); Studio is proprietary and not used |

Each adaptation records its source path and commit in a header comment,
re-tokenises colours (the raw-colour guard enforces it), converts `motion.*`
to `m.*` inside `MotionFeatures`, replaces `lucide-react` icons with
`components/ui/icons.tsx` where an equivalent exists, and passes an
accessibility review. If the registry hosts are later allowed, the CLI's
read-only inspection may be used to compare, but the pinned GitHub source
stays the record.

### Raw-colour enforcement

`lib/design/raw-colour.ts` + `.test.ts` scan every TS/TSX file in `app/`,
`components/` and `lib/` (not just new folders: the legacy count was low
enough to enforce everywhere from day one). Flagged: Tailwind default
palette steps used as colours unless the name is a GharBazaar token
(`neutral-100`/`neutral-600` are), `white`/`black`, arbitrary colour values
(`bg-[#fff]`, `rgb()`, `oklch()` …) and string literals that are a hex
colour. Comments are ignored.

- **Legacy (to remove):** `components/search/SearchPanel.tsx`
  `border-white/80` — UI-03 tokenises glass edges.
- **Permanent, reasoned:** `viewport.themeColor` `#ffffff` in
  `app/layout.tsx` (browser chrome; must be a literal), and `#ffffff` as the
  image-flattening background in `lib/media/compress.ts` and
  `lib/media/image.ts` (image processing, not interface).

The scan must equal the legacy list exactly, so the list can only shrink;
a permanent exception that stops being used fails too. Negative control: a
planted `bg-white dark:bg-zinc-900` in `components/motion/` failed the test.
CSS is out of scope here (`globals.css` is the token layer and holds ~86
legacy literals); UI-03 extends the guard to CSS once those are tokenised.

## 4. Data requirements

None. No entity, migration, fixture or query changes. The bundle baseline
is a measurement file, not application data.

## 5. Edge cases

- Sort labels longer than today's: `min-w-0` lets the control shrink inside
  its own line rather than overflow.
- Long, unbreakable card text in the mobile results list: the column is
  `minmax(0, 1fr)`; text inside the card was measured for clipping at 320
  and 360px on four search routes and none is clipped.
- JavaScript disabled or slow: no content depends on Motion; the provider
  renders nothing of its own.
- Registry code using `motion.*`, `framer-motion` or raw colours: rejected
  by ESLint, by `LazyMotion strict` and by the colour test.
- A new type, shadow or font token without matching `cn()` config: fails
  `lib/cn.test.ts`.
- A streamed segment that never arrives: `shots` times out loudly.

## 6. Accessibility requirements

- Reduced motion applies to every Motion component through one provider,
  verified in a browser (§8) and by `components/motion/MotionProvider.test.ts`,
  which reads Motion's own context from inside the real provider.
- The CSS reduced-motion rule is unchanged and re-verified.
- The sort control keeps a 44px target and its accessible name at every
  width; the horizontal card's save button keeps its 44px target.
- Wrapping, not shrinking, keeps every sort label legible.

## 7. Responsive requirements

320, 360, 375, 390, 412, 430, 768 and 1280px across the 26 `shots` routes,
plus the search routes measured separately for card clipping. Desktop is
unchanged: the toolbar does not wrap at 768 or 1280, and the mobile list
change is `md:hidden`.

## 8. Verification

Run on this container against production builds, with CI's two-server
arrangement (3100, and 3101 against the Auth/REST simulator) and
`CHROME_PATH` set to the installed Chromium. Final build `hqECGU8WfhiHqwGoRH0Wh`.

| Check | Result |
|---|---|
| `npm run verify` (lint, strict types, Vitest) | pass — 60 files, 590 tests (551 before UI-02; +39 new: cn 17, raw colour 8, timing tokens 6, provider 4, registry config 4) |
| `npm run build` | pass |
| `shots` (26 routes × 8 widths) | pass — no overflow, bottom bar inside the viewport; ~2 min |
| `light-check` | pass |
| `search-check` | 64 passed |
| `phase-e-check` / `shell-check` | 64 / 355 passed |
| `login-check` (public / simulator) | 117 / 138 passed — scene timing unaffected |
| `notfound-check` | 36 passed |
| `calculator-check` / `pricing-check` / `post-check` | 43 / 46 / 87 passed |
| `dashboard-check` / `performance-check` / `admin-check` | 72 / 102 / 124 passed |
| `moderation-check` / `users-check` / `listing-check` | 34 / 92 / 23 passed |
| `description-check` / `preview-check` / `draft-check` / `photo-check` / `auth-check` | 28 / 24 / 27 / 31 / 38 passed |

**Pre-existing failures in this container, not caused by UI-02.**
`home-check`, `property-check` (2 of 67: enquiry storage-unavailable and
no-JavaScript submission), `media-check` (1 of 26: failed-image fallback),
`lead-check` and `saved-check` fail. A detached worktree build of `f1861f6`
(before any UI-02 change) fails all five at the same assertions. `home-check`
is in CI and passed there on `f1861f6`: here, one Escape closes the whole
search dialog instead of only the nested property-type sheet, which points
to the container's Chromium 141 (CI installs the newer build
`playwright-core` 1.63 expects). The other four are not in CI. They need
their own investigation outside this stage.

**Reduced motion, by temporary injection (reverted).** A probe `m.div`
animating `x` 0→200 and opacity 0.2→1 over 3s inside `MotionFeatures` was
added to `/videos`, built, and measured ~0.7s in:

| Browser preference | `x` | opacity | CSS transition (bottom-bar pill) |
|---|---|---|---|
| no-preference | 49px (mid-animation) | 0.40 | 0.15s, 0.1s |
| reduce | 200px (jumped to end) | 0.39 (fade kept) | 0.01ms (global rule intact) |

`--duration-base` and `--ease-enter` resolved at runtime in both. The same
injection measured the lazy-loading split described in §3, and confirmed
that `/calculators` (no animation) downloads no Motion feature code while
the detector found it on `/videos` (positive control). The probe file and
page edit were removed and the final build made without them.

## 9. Production readiness

Shippable: the change is additive infrastructure plus two layout fixes,
with every existing check passing. The +≈9.7 KB gzip of first-load JS per
route is almost all `tailwind-merge` (the approved `cn()` decision); Motion
itself costs 0.9 KB until something animates. Upgrading Motion, allowing the
registry hosts, and extending the colour guard to CSS are follow-ups, not
blockers.

---

## Bundle baseline and comparison

**Method** (`scripts/bundle-report.mjs`, `npm run bundle-report`): build,
`npm run start`, then for each route fetch the server HTML and sum the
`<script src>` files it loads (raw, gzip -9, brotli -11, read from
`.next/static`), excluding the `nomodule` polyfill. This is the first-load
cost. Signed-in routes redirect without a session, so they fall back to the
route's client-reference manifest and are labelled **upper bound** (every
chunk the route *could* load), never mixed with first-load figures; pass
`COOKIE` to measure them from HTML. The manifest was rejected for public
routes because it over-counts lazily loaded chunks.

Baseline: `bundle-baseline.json`, recorded at `f1861f6` (before any UI-02
dependency) and committed first. Compare with
`npm run bundle-report -- --compare docs/ui-modernization/bundle-baseline.json`.

**Results** (production build `hqECGU8WfhiHqwGoRH0Wh`, gzip -9 KB):

| Route | Baseline | UI-02 | Δ |
|---|---|---|---|
| Home | 165.7 | 175.4 | +9.7 |
| Search (buy / rent / filtered) | 167.9 | 177.8 | +9.9 |
| Property details | 166.0 | 175.9 | +9.8 |
| Login | 159.4 | 169.1 | +9.7 |
| Post property | 159.1 | 168.8 | +9.7 |
| EMI calculator | 162.2 | 172.0 | +9.7 |
| Activity (guest) | 157.8 | 167.5 | +9.7 |
| Not found (404) | 165.7 | 175.4 | +9.7 |
| Seller dashboard (upper bound) | 168.6 | 178.0 | +9.3 |
| Seller performance (upper bound) | 170.0 | 179.3 | +9.3 |
| Admin overview (upper bound) | 167.4 | 176.8 | +9.3 |

**Attribution.** About 8.8 KB is `tailwind-merge` + `clsx` in the shared
chunk (`cn()` runs in client components such as Sheet and the header), and
0.9 KB is Motion — the root layout's `MotionConfig` provider, its only
first-load code; no animation features ship to any route. That is the cost
of the approved `cn()` decision; a future page that animates adds roughly
14.5 KB up front and 14.2 KB lazily (§3).

## Mobile overflow: root cause and fix

**Root cause (corrected from UI-01).** A native `<select>` is as wide as
its longest option ("Price per sqft: low to high"), whichever option is
selected — 195px. Beside the 126px Filters button and the 12px gap the
toolbar needs 333px, more than the 288px row at a 320px viewport, and the
label was `shrink-0`. UI-01 attributed the overflow to hydration; it is
present from first layout. UI-01's "0px at load" reading came from
measuring before streamed content was revealed (see Browser coverage).

**Fix** (`components/search/SearchLayout.tsx`): the toolbar row wraps;
the label and select are `min-w-0` and the label `max-w-full`; `shrink-0`
is gone. Flex wrapping breaks lines on full content width, so where both
controls cannot fit the sort control takes its own line at full width;
otherwise nothing moves. No `overflow-x: hidden`, no functionality or URL
behaviour change. The loading skeleton (`SearchLoadingState.tsx`) now uses
the real controls' widths and wraps the same way.

**Second overflow, found by the corrected harness.** `/buy/kolkata/new-town`
overflowed 8px at 320px: the mobile results list was `grid` with an
implicit `auto` column, which never shrinks below a card's min-content
(a price row that could not break further). `ResultsList.tsx` now uses
`grid-cols-1` (`repeat(1, minmax(0, 1fr))`).

## Browser coverage changes

- `shots` widths: 320, 360, 375, 390, 412, 430, 768, 1280 (390/412/768/1280
  kept). Run time on this machine: about two minutes.
- New assertion: the fixed bottom bar's right edge is inside the viewport.
- **Harness defect fixed.** Search routes stream: at the `load` event the
  real results still sit in hidden Suspense segments that React reveals in
  throttled batches, so `shots` had been measuring the search *skeleton*
  (`main` 0px tall) and could pass a broken page. It now waits until no
  hidden segment remains plus one painted frame, and times out loudly if one
  never arrives.
- Negative control: the corrected `shots` run against the pre-fix build
  failed at 320px with the sort label, select and bottom bar named.

## Deferred

- Anime.js — installed with the first feature that needs a timeline.
- Kokonut components and Bklit charts — UI-05 and UI-10.
- Migrating existing CSS durations and literals onto the scales, and the
  colour guard for CSS — UI-03.
- Motion beyond 14.1.1 — a later, measured upgrade.
- Registry host access in the environment — optional; the GitHub strategy
  does not need it.

## Proposed scope for UI-03 — GharBazaar Design System

UI-03 changes real pixels across many screens, so it starts by building the
net that makes those changes reviewable, then moves every literal onto a
named scale. No component consolidation (UI-05), no animation (UI-04), no
page redesign.

**In**
1. **Computed-style diff harness** (`scripts/style-diff.mjs`): for the
   `shots` routes at 390 and 1280, record colour, background, border,
   radius, shadow, font size/weight/line height, letter spacing and
   transition of every visible element; compare two builds and list every
   difference. Each stage of UI-03 must show only intended differences.
2. **Token inventory** in the UI-03 spec: every literal in `globals.css`,
   `way-home.css` excluded (illustration palette, untouched), classified as
   map-to-existing, new token, or dead.
3. **Colour:** fold the `--home-*` and `--reference-*` palettes into named
   tokens in `@theme` (forest, mint, the discovery tints, the reference
   neutrals), remove Phase D rules that Phase E overrides later in the file
   (proved dead by the diff harness), and give glass edges a token, which
   empties the raw-colour LEGACY list.
4. **Radius:** move the 16 literal radii and `rounded-[22px]`/`[24px]` onto
   the scale, adding at most one step if the inventory shows a real role
   (e.g. 8px for compact controls).
5. **Type:** replace literal font sizes (the 9px hero eyebrow, 12.5px,
   `text-[40px]` …) with type tokens; anything that grows past the 12px floor
   is a listed visible change for approval.
6. **Timing:** move every CSS duration onto `--duration-*`/`--ease-*`
   (120ms→fast, 250ms→base or slow by role, 500ms→deliberate), so CSS and
   Motion share one clock in practice, not only in tokens.
7. **Status colours:** one listing-status token set (draft, review, live,
   changes requested, rejected, expired, withdrawn, removed) that UI-05's
   single StatusBadge will use.
8. **Guards:** extend the raw-colour guard to CSS outside the token blocks,
   ratcheted like the TS/TSX one; add a radius/type literal ratchet.
9. **Docs:** correct `docs/design-system/README.md` (green, IBM Plex Sans)
   and document the final scales.

**Out:** component APIs and consolidation, Kokonut components, any Motion
usage, the login and 404 scenes, workspace and Phase E layouts (tokens only,
no re-layout), backend.

**Acceptance:** the four CLAUDE.md commands plus every browser check that
passes today, the style-diff report showing only listed changes, and a
bundle report with no regression (CSS-only work should be ±0 JS).
