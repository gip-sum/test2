# UI-01 — Audit

Status: complete, 17 October 2026, against `main` at `46b8e1a` ("Redesign
admin and owner workspaces"). Nothing was installed into the project and no
application file was changed. This document is the whole output of UI-01.

UI modernization is a separate track (UI-01 … UI-14). It does not renumber
`Phases.txt`; Phase 24 remains unstarted.

**How this was gathered.** Source read directly; class/token usage counted
with `grep`; the production build run (`npm ci && npm run build`, existing
lockfile only); an ad-hoc Playwright probe run against `next start` at
320 / 360 / 375 / 390 / 412 / 430 / 768 / 1280 px over eleven routes,
measuring document overflow, the element causing it, interactive targets
under 40 px and the largest rendered type. Kokonut UI and Bklit UI were
inspected from their GitHub sources (Kokonut `bb9120f`, Bklit `7167844`);
their registry hosts are blocked by this environment's network policy.
Package versions and peers come from the npm registry on the audit date.

---

## 1. Current architecture

| Area | What is there |
|---|---|
| Framework | Next.js 16.3 App Router, React 19.3, TypeScript strict + `noUncheckedIndexedAccess`; production build uses Webpack (`next build --webpack`) |
| Rendering | Server-first. 48 files are `'use client'`; pages, cards, workspace shells, the login scene and the 404 scene are server components |
| Styling | Tailwind v4, CSS-first. One `@theme` token block in `app/globals.css` (1,549 lines) is the token source; feature CSS lives in the same file by section, plus `components/auth/way-home.css` and `app/login/login.css` |
| Theme | Light unconditionally; dark only under `data-theme="dark"`; `prefers-color-scheme` absent (CLAUDE.md rule, enforced by `light-check`) |
| Primitives | `components/ui`: Button, Badge, Chip, Pagination, Select, Sheet (Radix Dialog), Skeleton, StatusPill, inline icons |
| Class helper | `lib/cn.ts` joins truthy strings — deliberately no `clsx`/`tailwind-merge` |
| Auth | Supabase Auth over its HTTP API (`lib/auth/provider.ts`), server-only, no `@supabase/*` SDK. Email + Google (PKCE). `proxy.ts` refreshes tokens |
| Data | Behind `lib/*/queries.ts` seams; URL is the state for search/filter/sort/page |
| Deploy | Vercel services: `frontend` (Next) and `processor` (Python FastAPI, `python/`) |
| Safety net | 40 browser check scripts (`scripts/*-check.mjs`) plus Vitest; `shots` measures overflow at 390/412/768/1280 only |

## 2. Existing relevant dependencies

Runtime UI dependencies are minimal by design: `@radix-ui/react-dialog`
is the only UI library. There is **no** animation library, **no** shadcn
(`components.json` absent), **no** icon package, **no** `clsx`,
`tailwind-merge` or `class-variance-authority`, and no charting library.
Fonts are Archivo (display, prices) and IBM Plex Sans (UI) via `next/font`.

### Existing animation technology (all CSS)

| Where | What | Quality |
|---|---|---|
| Login — `WayHomeScene` + `StreetPeople` + `way-home.css` (≈1,600 lines) | One inline SVG, CSS keyframes, server-rendered, zero JS. `ScenePlayback` pauses every animation when off-screen. The resting frame is the finished picture, so reduced motion loses nothing | Excellent; `login-check` asserts timing (117/138 assertions, <20 ms drift) |
| 404 — `LostScene` (`nf-*` keyframes) | CSS SVG loop, same resting-frame rule | Good; `notfound-check` covers it |
| Cards, tiles, rails | `transition` on border/shadow/transform; hover lift and image zoom | Fine, but see P6 |
| Bottom bar, quick routes | `:active` scale press feedback | Fine |
| Calculator result peek | opacity/translate toggle | Fine |
| Skeleton / button spinner | `animate-pulse`, `animate-spin` | Fine |
| Sheet (every modal/drawer), header nav panels | **No transition at all** — appear/disappear instantly | Highest-value Motion target |
| Reduced motion | Global base-layer rule zeroes CSS animation/transition durations | Good for CSS; **does not govern JS animation** (see §3) |

## 3. Compatibility assessment

### Motion (`motion`, motion.dev) — compatible; becomes the primary engine

- Latest 14.3.0 (15 Oct 2026); 14.0.0 (2 Oct), 13.5.1, 12.43.0. Peer
  `react ^18 || ^19` ✓. Works with the App Router as client components.
- Both registries are written against **Motion 12** (`kokonut ^12.23`,
  `bklit ^12.27`) and import only from `motion/react` (131 imports). The
  official upgrade guide documents 13.0 (removal of the optional
  `@emotion/is-prop-valid`, irrelevant here). I could not confirm 14.0's
  breaking changes; UI-02 must read the 14.0 changelog before choosing the
  pinned version.
- **The global reduced-motion CSS rule does not reach Motion.** JS-driven
  animation must be wrapped in `MotionConfig reducedMotion="user"`.
- Motion components are client-only. Wrapping a server component's markup
  in `motion.div` would push it into the client bundle; animation must be
  done by small client islands that take server-rendered `children`.
- `LazyMotion` + `m` + `domAnimation` (with `strict`) keeps the shared
  bundle small and makes accidental full-`motion` imports a runtime error.

### Anime.js (`animejs`) — compatible; no current use case

- 4.5.0 (22 Jun 2026), ESM, framework-agnostic. `three` is an *optional*
  peer, only for its three.js integration.
- The two complex scenes that exist — login and 404 — are already
  server-rendered CSS with zero JS, off-screen pausing, a complete resting
  frame and timing tests. Moving them to Anime.js would add client JS,
  hydration dependence and test churn for no visible gain. **Recommendation:
  do not migrate either** (UI-08 will confirm).
- No other current screen needs a coordinated timeline. Installing it now
  would add an unused dependency that UI-13 would then flag.

### Kokonut UI — usable as a *source*, not as drop-in components

- Not an npm package: a shadcn registry (`kokonutui.com/r/*.json`) of 80
  copy-in items, MIT. Most are showcase/AI widgets (ai-prompt,
  glitch-text, particle-button, receipt-printer …) with no place in a
  property marketplace.
- Per-item dependencies: `motion` (34 items), `lucide-react` (33), `cva`
  (3); some pull shadcn base components (`button`, `card`, `textarea`,
  `dropdown-menu`, `drawer` → `vaul`). Generated code imports
  `cn` from `@/lib/utils` and uses clsx object syntax with merge semantics.
- **Every inspected candidate hardcodes Tailwind's default palette**
  (`zinc-*`, `white`, `emerald-*`, `black`) and carries 15–53 `dark:`
  variants. That breaks the CLAUDE.md rule that components never hardcode a
  colour. Because `@import "tailwindcss"` still compiles the default
  palette, such classes render without error — silently off-brand.
- Components are large: `action-search-bar` 1,134 lines,
  `profile-dropdown` 1,137, `file-upload` 988, `bento-grid` 1,835.
- **Plausibly useful for GharBazaar** (each needs re-tokenising and an
  accessibility pass): `smooth-tab` (Buy/Rent intent tabs, workspace tabs),
  `action-search-bar` (visual pattern for the locality typeahead, *not* its
  state model), `file-upload` (photo drop zone visuals), `hold-button`
  (deliberate confirm for destructive seller actions), `loader`,
  `switch-button`, `undo-button` (save/unsave), `metric-card` (workspace
  summaries — without invented trend arrows). `smooth-drawer` would
  introduce `vaul` beside the existing Radix Sheet; prefer animating Sheet.
- Registry host blocked here; GitHub source is reachable.

### Bklit UI — compatible; right tool for Phase 20/21 data

- shadcn registry (`ui.bklit.com/r`), 58 items, charts MIT (Studio is
  proprietary and not needed). Built on visx 4.0.0 (peer React 19 ✓),
  `d3-scale/shape/array`, `motion`, `@number-flow/react`, `@base-ui/react`
  (legend only).
- Themed through shadcn CSS variables: `--chart-1…5`, `--chart-grid`,
  `--chart-background`, `--chart-foreground(-muted)`, `--foreground`,
  `--border`, `--muted`, plus a few hardcoded `--color-emerald-500`,
  `--color-red-500`, `--color-zinc-500`. These map cleanly onto a scoped
  alias block over GharBazaar tokens; no collision with the existing
  `--color-chart-1`.
- Charts are client components; they must load via `next/dynamic` on the
  routes that use them, keeping visx/d3 out of public pages.
- **Real data that exists today** (Phase 19/20/21): per-listing daily views
  and enquiries, previous-period totals, enquiry rate (once views are
  meaningful), current saver count, listing counts by status, admin
  queue/user counts. Good fits: daily views and enquiries (replacing
  `DailyColumns`, keeping its table alternative and its "not tracked"
  neutral band), period comparison, status distribution in the workspace.
- **Not to build:** a views → saves → enquiries funnel. Saves are a current
  count, not a period measure, so a funnel would mix time bases and claim a
  conversion that was never measured. No market or comparison charts until
  Phases 50–51 supply the data.

## 4. Problems found

Measured, ordered by user impact.

| # | Problem | Evidence | Stage |
|---|---|---|---|
| P1 | **Sideways scroll on small phones on search results.** The sort `<select>` in `components/search/SearchLayout.tsx:136` is `shrink-0`; after hydration, with a long option selected, it widens the page to 349 px. Below ≈350 px viewports the document overflows (29 px at 320, 9 px at 340) and the fixed bottom bar is pushed off-screen with it — the "zoomed / sideways" effect. Unfiltered `/buy` and `/rent` overflow 1 px at 320 | Probe: 0 px at load, 29 px 300 ms later (hydration); offenders `LABEL.ml-auto…shrink-0`, `SELECT…max-w-[14rem]`, `NAV.app-bar-bottom` | UI-02 (one-class fix + guard) |
| P2 | `shots` never measures below 390 px, which is why P1 shipped | `scripts/shot.mjs` `WIDTHS` | UI-02 |
| P3 | Touch targets under the project's 44 px rule: filter-removal chip buttons 24×24 (one per active filter), "Clear all" 76×32, calculator number inputs 26 px tall, breadcrumb links 20 px tall | Probe at 360 px | UI-05 |
| P4 | Sticky hover on touch: `.property-card:hover` lift and image zoom sit outside `@media (hover: hover)` (unlike `.compact-card`), so a tap on Android leaves the card raised | `app/globals.css:783–786` vs `697–700` | UI-04 |
| P5 | Sheet and header panels open and close with no transition — abrupt on phones, where Sheet is the menu, filters and location picker | `components/ui/Sheet.tsx` has no transition; `HeaderNav` toggles `hidden` | UI-04 / UI-05 |
| P6 | Three visual generations coexist in `globals.css`: Phase 1/A–D tokens; the September refresh's `--home-*` palette, Georgia serif accents and glass; Phase E's `--reference-*` palette, which **re-declares** Phase D rules further down (e.g. `.bar-item` colours at line 1265 override line 237; app-bar shadow removed again). ≈86 raw hex values sit outside `@theme`; some earlier rules are now dead | `app/globals.css` | UI-03 |
| P7 | Radius drift: the token scale is four steps (4 / 12 / 20 / full) but CSS uses 16 literal radii (2, 3, 4, 5, 6, 8, 10, 12, 13, 14, 16, 18, 22, 26, 28, 99 px) plus `rounded-[22px]`/`rounded-[24px]` in TSX | grep | UI-03 |
| P8 | Type drift: a 13-step semantic scale exists, yet home/hero/footer use literal sizes (a 9 px hero eyebrow — below the documented 12 px floor — 12.5, 21, 26, 29, 30 px) and TSX has `text-[40px]` ×7, `text-[10px]`, `text-[11px]` | grep | UI-03 |
| P9 | Duplicate/orphan components: `components/ui/StatusPill` has **zero importers**; `components/dashboard/StatusBadge` is the one used, with a different status set and shape. `Button` is used in 16 files and `buttonClassName` in 4, but there are 77 raw `<button>`s in 33 files and 31 inline `bg-brand-600`; `.calc-cta` re-implements the primary button in CSS | grep | UI-05 |
| P10 | No motion tokens: eight different durations (100, 120, 150, 200, 250, 450, 500 ms …) and no shared easing | grep | UI-03 / UI-04 |
| P11 | Design-system docs drift: `docs/design-system/README.md` still calls `brand-600` "strong blue" and names Instrument Sans; the product is green on IBM Plex Sans | README vs `globals.css`, `app/fonts.ts` | UI-03 |

Not problems (checked): no overflow on any probed route at 360 px and
above; the large type on `/` (140 px) is the decorative seller "orbit"
glyph and on 404 (84–168 px) the deliberate "404" display; glass is
already limited to a few panels and guarded by `@supports` and
`prefers-reduced-transparency`; the app bars are opaque on purpose.

Performance baseline is **not** reported here: the probe's per-route
script byte count raced asynchronous body reads and was unreliable. UI-02
records a proper first-load-JS baseline before anything is added, so every
later stage is measured against it.

## 5. Preserve — do not redesign

- The token architecture, light-only theme, opt-in dark, `supply-600`
  fill / `supply-700` text rule.
- `Sheet`'s focus-return, nested `inert` lock and Escape layering — hard-won
  and covered by `shell-check` / `phase-e-check`. Animate it; do not replace
  it with `vaul` or a Kokonut drawer.
- URL-as-state search, filters, sort and pagination.
- Login scene and 404 scene: CSS, zero JS, tested. Not to be migrated to
  Anime.js or Motion.
- Opaque app bars; the six-slot bottom bar and its structure.
- `PriceDisplay` / `AreaDisplay`, data seams, Supabase HTTP auth adapter,
  email + Google sign-in (no phone OTP).
- Skeletons-not-spinners; the global reduced-motion rule.
- **Workspace shell** (client-selected, shipped 15 Oct): token clean-up and
  motion only, no re-layout.
- **Phase E homepage / menu / activity layout** (client-approved
  reference): refine, do not re-layout.
- The 40 browser checks. Modernization keeps them passing; any assertion
  that changes is changed deliberately and recorded.

## 6. Modernize — prioritized

1. **Foundation** (UI-02): Motion provider, reduced-motion, guards, P1/P2.
2. **Tokens** (UI-03): motion durations/easings; collapse radius and type
   drift onto the scales; fold `--home-*` and `--reference-*` into named
   tokens; delete dead overridden rules; fix doc drift.
3. **Overlays** (UI-04/05): Sheet enter/exit (slide-up on phones, fade/scale
   from 640 px), header nav panels, Marketplace menu.
4. **Primitives** (UI-05): one `StatusBadge` in `components/ui` covering the
   full lifecycle; Button adoption; Chip 44 px target; Select width
   behaviour; tabs (Kokonut `smooth-tab` candidate); empty/error states.
5. **Search & cards** (UI-06): results list entrance, filter chip layout
   animation, card hover guarded by `(hover: hover)`, image fade-in in
   `PropertyImage`, gallery transitions.
6. **Seller workspace & analytics** (UI-09/10): Bklit charts for daily views
   and enquiries and period comparison; status distribution; summary cards.
7. **Auth UI** (UI-07): form states and transitions; scene untouched.

## 7. Recommended installation plan

| Library | When | What | How |
|---|---|---|---|
| Motion | UI-02 | `motion`, exact pin (newest major whose changelog the registry code survives; fallback 13.5.1 or 12.43.0) | `npm install --save-exact` |
| Kokonut prerequisites | UI-02 | `components.json` with `@kokonutui` and `@bklit` registries and aliases into our folders | CLI needs `kokonutui.com` and `ui.bklit.com` allowed in the environment's network settings; otherwise vendor from GitHub at a pinned commit |
| Class merge | UI-02 (decision) | `clsx` + `tailwind-merge` configured with `extendTailwindMerge` for our custom groups, behind the existing `cn` name | Unconfigured, tailwind-merge treats `text-body-sm` (size) and `text-ink-700` (colour) as one group and drops one — a unit test must prove every custom group survives |
| Kokonut components | UI-05, per component | Only items that earn their place; `lucide-react` only if a vendored component needs an icon we lack | Re-tokenise, strip `dark:`, a11y pass, provenance comment |
| Bklit | UI-10 | visx 4.0.0 set, d3 pieces, `@number-flow/react` as the first chart needs them | Scoped chart-token alias block; `next/dynamic` |
| Anime.js | First real sequence (UI-08 or later) | `animejs` exact pin | Client island, dynamic import, reduced-motion = resting frame |

No duplicates: Bklit and Kokonut both depend on `motion`, so one pinned
copy serves all three. `framer-motion` is never imported directly.

## 8. Proposed file and component structure

```
components/motion/MotionProvider.tsx   LazyMotion(domAnimation, strict) + MotionConfig(reducedMotion="user")
components/motion/*.tsx                small client islands (Reveal, Stagger, Presence) — UI-04
lib/motion/tokens.ts                   durations, easings, springs; mirrored as CSS custom properties in @theme
lib/motion/variants.ts                 shared variants — UI-04
components/ui/*                        primitives; Kokonut-derived ones land here, re-tokenised,
                                       with an "Adapted from Kokonut UI <item> @ <commit>, MIT" header
components/charts/*                    Bklit-derived charts + chart-theme.css alias block — UI-10
components/sequences/*                 Anime.js islands, only when one exists
components.json                        registry config (no shadcn base theme imported)
docs/ui-modernization/                 this track: UI-01 audit, then one nine-section spec per stage
```

Product code imports from `components/ui` and `components/charts`; it never
knows whether a component came from a registry.

## 9. Risks

- **Motion 14 is two weeks old**; registry code targets 12. Pin exactly,
  read the changelog, keep a fallback.
- **Client-boundary creep** turns server pages into client bundles. Islands
  take `children`; a check records first-load JS per key route.
- **Content hidden until hydration.** An entrance from `opacity: 0` leaves
  LCP content invisible on a slow mid-range Android or when JS fails. Rule:
  never animate in above-the-fold content from invisible; prefer transform;
  `initial={false}` for server-rendered state.
- **Reduced motion** is not inherited by JS libraries — the provider and a
  browser assertion must enforce it.
- **tailwind-merge with custom tokens** silently drops classes unless
  configured and tested.
- **Vendored code** stops receiving upstream fixes and arrives off-brand and
  dark-variant-laden. A test that fails on raw palette classes
  (`zinc|slate|gray|neutral|stone|emerald|…-\d+`, `bg-white`, `text-black`)
  in `app/` and `components/` makes the token rule enforceable.
- **Sheet + `AnimatePresence`**: exit animation keeps content mounted while
  Radix restores focus on the next frame — the inert/focus logic must be
  re-verified by `shell-check` and `phase-e-check`.
- **Timing-sensitive checks** (`login-check` drift, `phase-e-check`) can go
  flaky if elements they measure start animating. Update deliberately.
- **Network policy** blocks both registry hosts in this environment.
- **Over-animation** against the brief: nothing may delay navigation;
  route changes are not held for exit animations.

## 10. Exact scope proposed for UI-02 — Foundation

Specified first as `docs/ui-modernization/UI-02-foundation.md` with the
nine CLAUDE.md sections. **No visible design change** is the acceptance bar,
except the P1 fix.

**In**
1. Baseline: record first-load JS for `/`, `/buy/kolkata`, a property page,
   `/login` and `/dashboard/performance` before any install (a script, so
   later stages re-run it).
2. Install `motion` (exact pin, version chosen from the changelog).
3. `components/motion/MotionProvider.tsx` mounted once in `app/layout.tsx`
   around server-rendered children; `LazyMotion strict` +
   `MotionConfig reducedMotion="user"`.
4. `lib/motion/tokens.ts` + matching `--motion-*` custom properties in
   `@theme`, with a unit test that the two agree. Existing CSS transitions
   are *not* migrated yet (UI-03/04).
5. `components.json` with the `@kokonutui` and `@bklit` registries pointed at
   our folders; no shadcn base theme or CSS imported.
6. `cn` decision implemented: configured `clsx` + `tailwind-merge`, with unit
   tests covering every custom token group (or, if declined, a documented
   adapter for vendored code).
7. Guards: ESLint `no-restricted-imports` for `framer-motion` and for full
   `motion` outside the provider; a test failing on raw Tailwind palette
   classes in `app/` and `components/`.
8. Fix P1 (sort control may shrink) and add 320 / 360 / 375 / 430 to
   `shots` so it fails loudly on regressions.

**Out:** Kokonut components, Bklit charts and their dependencies, Anime.js,
any page or component restyle, motion on any screen.

**Verification:** `npm run verify`, `build`, `shots` (with the new widths),
`light-check`, `search-check`, `login-check`, `notfound-check`,
`shell-check`, `phase-e-check`; bundle delta recorded against the baseline.

**Decisions needed before UI-02 starts**
- Anime.js: install in UI-02 as asked, or (recommended) at its first real
  use so no unused dependency ships.
- `cn`: adopt configured `tailwind-merge` (recommended — both registries
  assume it), or keep the dependency-free join and adapt vendored code.
- Registry access: allow `kokonutui.com` and `ui.bklit.com` in the
  environment's network settings, or vendor from GitHub at pinned commits.
