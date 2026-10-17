# UI-05 — Core component modernization

Status: complete, 17 October 2026, on `main`. Builds on
[UI-01](UI-01-audit.md), [UI-02](UI-02-foundation.md),
[UI-03](UI-03-design-system.md) and [UI-04](UI-04-animation-system.md).

UI-05 starts modernizing GharBazaar's reusable components. It consolidates
the listing status badge, adds shared empty and error states, moves a first
group of handwritten buttons onto the shared `Button`, brings the audit's
undersized controls to 44px touch targets, and ships the first
Kokonut-derived component: **SmoothTabs**, adapted from Kokonut UI
`smooth-tab` at commit `bb9120f`, now the Buy / Rent tabs.

**Motion still has no production consumer.** Kokonut's tabs drive their
indicator with Motion. That version was built and measured at **+20.5 KB
gzip on Home's first load**, leaking onto the 404 page and the
dashboard/admin estimates. All it would add over a CSS transition is spring
overshoot, which GharBazaar's motion language rules out. The shipped tabs
keep Kokonut's structure and move the indicator with a CSS transition:
**+1.1 KB** on Home.

No page was redesigned. The login street and 404 scenes are untouched and
measured identical.

---

## 1. Scope

**In:** one `StatusBadge` for the listing lifecycle; `EmptyState` and
`ErrorState` primitives and their real call sites; a first, low-risk group
of `Button` migrations; 44px targets for filter-chip remove buttons, Clear
all, calculator fields and breadcrumbs; Kokonut `smooth-tab` evaluated,
adapted and shipped as `SmoothTabs`; the Sheet open-delay investigation;
`ui-check` in CI and tab coverage in `motion-check`.

**Out:** page redesigns (Home, search, property, login, dashboard, Phase E,
404, navigation), Anime.js, Bklit UI, any other Kokonut component, migrating
every handwritten button, and changing listing business logic.

## 2. UX requirements

- A listing status reads and looks the same on every screen. The colour
  follows the status, and the label carries the meaning.
- An empty section says what is missing and what to do next. A failed
  section says it could not load and how to recover, never as if it were
  empty.
- Small controls keep their look but are 44×44 to the finger.
- Buy / Rent: 44px tabs whose indicator glides to the chosen tab (instantly
  under reduced motion). Arrow keys, Home and End work. The active tab is
  visible from the first frame.

## 3. Technical requirements

### Status badge consolidation

| Before | After |
|---|---|
| `components/dashboard/StatusBadge` (3 importers), on the UI-03 tone map | `components/ui/StatusBadge.tsx`, same classes, both vocabularies |
| `components/ui/StatusPill` — **zero importers**, its own colours, a stale status set (`SOLD_OR_RENTED`, "Being reviewed", "Needs changes") | deleted after verifying no import anywhere (code, scripts, tests) |
| Moderation review page: a hand-made brand-green pill showing `STATUS_LABEL` for any status | `<StatusBadge role="status">`, coloured by status |

`lib/listings/status-tone.ts` now types its tone map over
`BadgeStatus = DashboardStatus | ListingStatus`, the two real vocabularies:
- **the stored lifecycle**, including `DELETED`;
- **the seller and staff view**, which splits deletion into `WITHDRAWN` and
  `REMOVED`.

It also exports `STATUS_BADGE_LABEL`, the union of the two label maps. A
test checks that the two maps agree wherever they overlap. No status was
invented. The badge keeps the hidden "Status:" prefix except as a
`role="status"` region, which is already announced as a status.

Left alone deliberately: the publishing-status page's large "Listing status"
heading and the submitted-copy banner's inline text. Those are page-level
statements, not badges, and changing them would redesign those pages.

### Empty and error states

`components/ui/EmptyState.tsx`: a heading, a short explanation, an optional
action and an optional decorative icon (aria-hidden, 32px, brand). It comes
in two surfaces: `glass` for the buyer's account pages and `workspace` for
the seller and staff workspace.

`components/ui/ErrorState.tsx`: the same structure with a warning glyph. It
is `role="alert"` by default (`role={null}` to opt out) and uses the
`glass`, `workspace` or `inline` surface. It renders only the copy it is
given; error messages, codes and stacks stay in the server log.

Both are server components with no new dependency or icon library; icons
come from the existing `components/ui/icons.tsx`.

| Call site | Became |
|---|---|
| Account › Enquiries: none yet / unavailable | EmptyState / ErrorState |
| Account › Saved: shortlist empty / unavailable | EmptyState (action now the shared primary Button style) / ErrorState |
| Dashboard: no properties / could not be loaded | EmptyState / ErrorState |
| Dashboard › Enquiries: none received / unavailable | EmptyState / ErrorState |
| Dashboard › Performance: no listings to measure / could not load or not ready | EmptyState / ErrorState |
| Drafts: none yet / could not be loaded | EmptyState (gains a "Post a property" supply action) / ErrorState with Try again |
| Admin `Unreadable` (six admin pages) | ErrorState, inline |
| `app/listing/[id]/error.tsx`, `app/post/drafts/[id]/submitted/error.tsx` | boundaries kept; ErrorState with a shared Button Retry |

Every user-facing sentence is unchanged; the browser checks assert on them.
Search's zero-result screen, the property and search error boundaries, and
the dashboard's one-line "No properties have this status" filter result
keep their own, richer treatments.

### Button migration

| | Count |
|---|---|
| Handwritten `<button>` before (UI-01 / 20e1e80) | **77** in 33 files |
| Migrated to the shared `Button` | **14** |
| Removed as duplicates (locality chip → shared `Chip`) | 1 |
| Handwritten `<button>` after | **62** in 27 files |
| `<Button>` elements | 17 → 31 |

Migrated (each already matched a Button variant):
- **Primary:**
  - the two error-boundary Retry buttons;
  - admin "Search accounts";
  - the review decision submit;
  - "Save account change";
  - "Save as draft";
  - "Submit / Re-submit for review";
  - "Confirm review".
- **Danger and secondary:** the withdraw confirmation's "Yes, withdraw" and
  "Cancel".
- **Primary, large:** the two no-JavaScript calculator submits, the locality
  picker's "Done" and the home filter sheet's "Show properties".

`Button`'s sizes became **minimum** heights (`min-h-8/11/12`), so a long
busy label ("Validating photos and submitting…") wraps inside the button at
320px instead of overflowing. Single-line buttons are unchanged in height.

Intentionally left alone (62):

| Category | Why |
|---|---|
| Text-link buttons (Sign out, Refresh, Retry save, Copy link, Withdraw link, Try again, …) | underlined text actions; `tertiary` is a filled-hover button, not a link |
| Outlined brand-text and outlined danger buttons (Withdraw/Delete listing, photo and description tools, enquiry follow-up) | no matching variant; adding one is a design decision for a later stage |
| Shell and navigation controls (bottom bar, Menu, header toggles, search trigger) | specialised, styled by the shell's CSS |
| Toggles and tabs (filter options, gallery thumbnails, banner dots, Save heart, SmoothTabs) | `aria-pressed` / `role="tab"` controls, not buttons in the Button sense |
| Icon buttons (chip remove, gallery arrows, close) | icon-only controls with their own hit areas |
| The search submit with its icon and shadow, "More filters", zero-result suggestions | bespoke compositions |

### Touch targets

The visible control keeps its size. The interactive element grows to at
least 44px and gives the space back to the layout with equal negative
margins. Every result is verified by hit-testing (`elementFromPoint` at the
corners of a 44px square around the control's centre) in `ui-check`.

| Control (UI-01 P3) | Before | After |
|---|---|---|
| Filter-chip remove buttons (`Chip`) | 24×24 | 44×44 around the same 24px circle. Square, because Chrome hit-tests follow `border-radius` (a round 44px button failed the corner test). Focus ring on the visible circle. |
| Locality chips in the picker | own 24px copy of the chip | the shared `Chip` |
| Clear all (beside chips) | 32px tall | 44px tall, pill stays 32px |
| Clear all (filter sheet) | 36px | 44px |
| Calculator inputs | 26px input in a 48px box (taps on the padding missed) | input fills the box: 46px |
| Calculator slider | 28px | 44px band, track and layout where they were |
| Breadcrumb links | 20px | 44px tall to the finger, 20px to the layout. Measured: no two targets overlap at 320 or 390. |
| Buy / Rent tabs | 40px | 44px |

Where chips wrap, the row gap is now 12px (was 8px), so the 44px targets of
two rows never overlap. That is the one layout change touch targets make; it
only appears on wrapped chip rows.

### Kokonut Tabs — evaluation

**Source:** github.com/kokonut-labs/kokonutui at
`bb9120f8711b63eb5a7545976cac7493d49e616c` (17 Oct 2026, the commit pinned in
UI-02), `components/kokonutui/smooth-tab.tsx`, "Swipe Tabs" v2.0.0 by
@dorianbaffier, MIT License, Copyright (c) 2025 kokonutUI. It was fetched
from GitHub because the registry host is blocked here. The attribution and
licence note are in the adapted file's header.

| Inspected | Finding |
|---|---|
| Dependencies | `motion` (imperative `animate` and `useMotionValue` from `motion/react`, no `motion.*` components) and `lucide-react` (icon type only) |
| Accessibility | correct tablist / tab / tabpanel roles, `aria-selected`, `aria-controls`, roving tabindex, inert off-screen panels |
| Keyboard | Left/Right wrapping, Home/End, selection follows focus, held keys jump |
| Motion usage | a spring (stiffness 420, damping 38) on a motion value that paints the indicator imperatively; drag physics for swiping panels |
| Reduced motion | still animates (a 150ms ease) — movement remains |
| Server render / no JS | the indicator is clipped to nothing until measured, and the selected tab has no style of its own — **the active tab is invisible before hydration** |
| Responsive | ResizeObserver measurement with a correction for a transformed ancestor; a swipe track rendering every panel side by side |
| Styling | zinc palette, `dark:` variants, demo content (stats, activity, members, billing) |
| Motion 14.1.1 | the API it uses exists unchanged in 14.1.1; the measured variant built and ran |

Verdict: **adopt, adapted.** Its keyboard model, measurement and indicator
technique (labels drawn a second time in the active colour and clipped to
the indicator, so every label is exactly right during the slide) are better
than our `IntentTabs`, which had no arrow keys, no roving tabindex and 40px
tabs. Its swipe-panel track does not fit: Buy / Rent changes one form, not
separate panels, and a horizontal swipe would fight the inputs. Its spring,
pre-hydration invisibility, demo styling and dependencies are unacceptable
as they stand.

**Adaptations** (`components/ui/SmoothTabs.tsx`, about 190 lines from 642):
- **Kept:**
  - the keyboard model;
  - ResizeObserver measurement with the transform correction, which is
    needed because our Sheet scales from 0.97 while the tabs are measured;
  - the clipped label layer.
- **Colour and type:** `bg-surface-200` track, `bg-brand-600` pill,
  `text-on-brand` labels and `text-ink-700` for the others; `rounded-full`,
  `text-label`, 44px tabs, `px-6` and the phone `fullWidth` layout.
- **Shadow:** a separate pill carries `shadow-e1`, which a clip-path would
  cut off.
- **Motion:** a CSS transition of `transform`, `width` and `clip-path` on
  `--duration-base` and `--ease-standard`. It is enabled only after the user
  changes tab, so measuring on resize or after a font swap never animates.
- **Before measurement:** the selected tab paints its own `bg-brand-600`
  pill. Server HTML, a slow device and the first frame all show the active
  tab, and the pill takes over once measured (`data-indicator`).
- **Removed:** the panel track and drag physics, icons and `lucide-react`,
  demo content, zinc colours, every `dark:` class, the Motion import.
- **Reduced motion:** the global reduced-motion rule collapses the
  transition; the indicator jumps.

`IntentTabs` keeps its API and now renders `SmoothTabs`, so `SearchPanel` is
unchanged. A unit test checks the provenance header and that no `dark:`,
zinc, lucide or Motion code survives in the component.

### Motion: the measured decision

| Build | Home first load (gzip) | Leak |
|---|---|---|
| UI-04 | 175.6 KB | — |
| SmoothTabs driven by Motion (Kokonut's `animate` + `useMotionValue`, spring) | 196.1 KB (**+20.5**) | 404 +20.5, dashboard and admin estimates +20.5 to +21.1 |
| SmoothTabs driven by CSS (shipped) | 176.7 KB (**+1.1**) | none |

Motion's imperative `animate` is not covered by the lazy `MotionFeatures`
split: it imports the animation engine directly, so it lands in the chunk
that holds `SearchPanel`. It would buy only a spring, which our tokens
reject ("nothing overshoots", UI-04). **Motion therefore still ships on no
route, and its async features chunk is still not emitted.** The first
justified consumer remains open, and the UI-04 cost table still applies:
about 14.5 KB up front plus 14.2 KB lazy, through `<MotionFeatures>`.

### Client/server boundaries

`StatusBadge`, `EmptyState` and `ErrorState` are server components and add
no JavaScript to the pages that use them. `SmoothTabs` is a client leaf
inside the existing client `SearchPanel` (it already was: `IntentTabs` was
`'use client'`). No page became a client component.

## 4. Data requirements

None. No entity, field, migration or fixture changes. The status badge
reads the existing status vocabularies.

## 5. Edge cases

| Case | Behaviour | Verified by |
|---|---|---|
| Long busy label on a migrated button at 320px | wraps inside a `min-h-11` button | Button unit test; shots |
| Tabs before JavaScript or measurement | selected tab paints its own pill | SSR unit test |
| Tabs inside the scaling Sheet | measured through the 0.97 transform | ui-check at 8 widths (indicator exactly on the tab) |
| Resize or font swap | indicator repositions without gliding | motion-check (no animation on first paint) |
| Chips wrapping onto several rows | 12px row gap; targets do not overlap | ui-check hit tests |
| Status in a `role="status"` region | no doubled "Status:" | unit test; moderation-check |
| Data outage vs empty | ErrorState (alert) never reads as EmptyState | dashboard, performance, draft, saved, admin checks |
| Failed load copy | only the given sentence | unit test |

## 6. Accessibility requirements

- **Tabs:**
  - tablist / tab roles with `aria-selected` and roving tabindex;
  - Left/Right wrap and Home/End move focus and selection;
  - Tab leaves the list in one stop;
  - the focus ring is unchanged (global `:focus-visible`).

  All asserted at 390 and 1280 (`ui-check`) and again under reduced motion
  (`motion-check`).
- Touch targets ≥ 44×44 by hit-testing; focus rings on the visible element.
- Status: label first, tone second, with a hidden "Status:" outside status
  regions.
- Error states are alerts. Empty states are headings with an explanation.

## 7. Responsive requirements

`npm run shots`: no horizontal overflow and the bottom bar inside the
viewport at 320/360/375/390/412/430/768/1280. `ui-check` puts the Buy / Rent
tabs through all eight widths: inside the viewport, the indicator exactly on
the selected tab and never clipped, no overflow. Touch targets are checked at
320 and 390, the filter sheet at 320 and 390. The tabs are 125px each at
320, so nothing is cramped. No hover state sticks on touch: Tailwind v4's
`hover:` only applies under `(hover: hover)`, and `ui-check` taps a tab and
checks the one left behind has no background.

## 8. Verification

| Command | Result |
|---|---|
| `npm run verify` | lint, types, **629** unit tests in 69 files (new: primitives 8; status tone +1) |
| `npm run build` | passes |
| `npm run shots` | no overflow at any width |
| `npm run ui-check` (new, in CI) | **89** pass |
| `npm run motion-check` | **81** pass (8 new tab assertions, 5 of them under reduced motion) |
| `npm run light-check` | passes (probe updated, below) |
| `shell-check` / `phase-e-check` / `search-check` / `calculator-check` | 355 / 64 / 64 / 43 |
| workspace checks (moderation, users, listing, dashboard, performance, admin, description, preview) | pass |
| `login-check` (both modes), `notfound-check` | 117 and 138 / 36 |
| `pricing`, `post`, `draft`, `photo`, `auth` | pass |
| style-diff UI-04 → UI-05 | 40 grouped changes, 120 structural notes (all new inner elements), protected scenes unchanged |
| bundle-report | below |

### Checks adjusted

- **`light-check`** measured the "active tab" colour on the selected tab
  button. With SmoothTabs the button is transparent once the indicator is
  measured, and the pill under it paints the brand colour. The probe now
  reads the pill (or the tab before measurement). The assertion is
  unchanged: the active tab must stay saturated under a dark-mode browser.
  It reads `rgb(17, 119, 68)` at all four widths.

No other check's assertion changed.

### Remaining failures (pre-existing, compared with the UI-04 logs)

- `home-check` locally: stops at the same step as UI-04 (Escape does not
  close "More filters" in this container's Chromium). It passes in CI.
- `property-check`: the same two assertions (storage-outage copy, no-JS
  submission).
- `media-check`: the same "failed image shows clear fallback — blocked 0
  requests". Its "Escape closes dialog" failure in the UI-04 log was fixed
  in UI-04.
- `lead-check`, `saved-check`: identical timeouts.

## 9. Production readiness

Ready. The primitives add no dependency. Bundle growth is 0–1.7 KB gzip.
Every change is covered in CI (`ui-check`, `motion-check`, the unit tests and
the existing workspace checks), and the protected scenes are pinned by
fingerprint.

---

## Bundle impact

First-load client JavaScript, UI-05 vs UI-04 (gzip):

| Route | KB | Δ |
|---|---|---|
| Home | 176.7 | +1.1 |
| Search (buy / rent / filtered) | 178.1 | +0.2 |
| Property details | 176.1 | +0.0 |
| Login | 169.1 | +0.0 |
| Post property | 169.3 | +0.4 |
| EMI calculator | 172.4 | +0.4 |
| Activity (guest) | 167.7 | +0.0 |
| Not found (shares Home's client chunks) | 176.7 | +1.1 |
| Seller dashboard / performance (manifest upper bound) | 179.8 / 181.2 | +1.7 |
| Admin overview (upper bound) | 178.0 | +1.1 |

Home's +1.1 KB is SmoothTabs' measurement and keyboard code. The others are
shared Button and Chip class strings. No Motion code ships anywhere.

## Sheet open delay — investigation

UI-04 measured one 60–80ms main-thread task when a sheet opens. A Chromium
trace of the click task at 390px (median of 5, unthrottled) breaks it down:

| | Filters sheet (search) | Menu sheet (home) |
|---|---|---|
| Click task | 70.7 ms | 78.8 ms |
| of which style recalculation | 29.3 ms | 42.4 ms |
| layout | 4.4 ms | 6.9 ms |
| paint | 2.2 ms | 3.2 ms |
| script (React commit, Radix) | ≈ 35 ms | ≈ 26 ms |

**Where it comes from.** The style passes are whole-document
recalculations: 700–1,300 elements, three per open, forced synchronously
from script. Two document-wide changes cause them. Timed in isolation on the
same pages:
- **`inert` on the app root** (Sheet, to hide live regions from screen
  readers): 6–13 ms.
- **`pointer-events: none` on `<body>`** (Radix's modal layer, inherited by
  every element): 6–11 ms.

Radix then reads style — Presence's `getComputedStyle` for the animation
name, FocusScope's visibility checks and `focus()` — which forces the
recalculation in the click task. A CPU profile attributes 34–43 ms to the
Radix chunk (mostly those forced recalculations), 19–31 ms to react-dom, and
33–40 ms to native `focus()`. Data preparation is negligible: the sheet
content is already in memory.

**Tried: applying `inert` one frame later**, so it joins the frame's normal
style pass:

| | Unchanged | Deferred inert |
|---|---|---|
| Click task, Filters / Menu (trace, 1×) | 71 / 79 ms | 55 / 62 ms |
| Click to next paint (Event Timing), 1×, 9 runs | 96 / 104 ms | 96 / 104 ms |
| Click to next paint, 4× CPU, 9 runs | 504 / 648 ms | 456 / 552 ms |
| Click to next paint, 4× CPU, 15 runs | 464 / 576 ms | 584 / 688 ms |

The click task shrinks, but the work moves into the next frame. What a
person feels — click to next paint — is unchanged unthrottled and noise on a
throttled CPU (better in one 9-run sample, worse in a 15-run one). It was
**not shipped**: it is not a reliable improvement, and it would leave the
page behind briefly not inert. Sheet is unchanged, so the before/after open
delay is the same: about 71 ms (Filters) and 79 ms (menu) of main-thread
work and about 96–104 ms click to next paint, unthrottled.

**What would help** is fewer elements behind the sheet, not a different
component. The home page has 1,800 elements and search about 2,450, and
every modal open recalculates all of them. Candidates for the page stages:
`content-visibility: auto` on long off-screen sections (which Chrome skips
during style recalculation) and lighter result lists.

## Intentional visual changes (style-diff UI-04 → UI-05)

50 captures, 918 changed element-properties in 40 groups, protected scenes
unchanged:

| Change | Where |
|---|---|
| Buy / Rent tabs 40 → 44px; pill and label layer added; selected button transparent once measured | home search sheet (content below +4px) |
| Chip remove buttons 24 → 44px boxes (square, negative margins), visible circle as an inner span | search filtered, locality, zero results, home search |
| Wrapped chip rows: 8 → 12px row gap | filtered search at 390 (+8px below), zero results at 390 (+4px) |
| Clear all: 44px button around the 32px pill | search with filters |
| Breadcrumb links: 12px padding with −12px margins (boxes 44px, layout unchanged) | property, calculators |
| Calculator input fills its field; slider is a 44px block band | EMI calculator (no element after them moves) |
| "Save as draft" on the shared Button: label line height 20 → 16px, label letter-spacing, transparent 1px border, standard colour transition | post, post details |

The calculator first measured 273 elements 32px lower: an inline slider
ignores a negative bottom margin. That was fixed and re-measured to zero
cascade before committing. No colour, radius or type token changed. No
element of the login or 404 scene changed.

## Protected areas

The login street and 404 scenes:
1. No file of either scene is in the UI-05 diff.
2. `lib/design/protected-scenes.test.ts` fingerprints match.
3. style-diff reports the scene markup identical (614, 621 and 88 elements)
   and every non-UI keyframe unchanged.
4. `login-check` (117 / 138) and `notfound-check` (36) pass.

Anime.js is not installed, Bklit UI is not introduced, and no other Kokonut
component was taken.

## Files

- **New:** `components/ui/StatusBadge.tsx`, `EmptyState.tsx`,
  `ErrorState.tsx`, `SmoothTabs.tsx`, `primitives.test.ts`;
  `scripts/ui-check.mjs`.
- **Removed:** `components/ui/StatusPill.tsx`,
  `components/dashboard/StatusBadge.tsx`.
- **Changed primitives:** `Button.tsx` (minimum heights), `Chip.tsx`,
  `components/navigation/Breadcrumbs.tsx`,
  `components/calculators/CalcField.tsx`, `components/search/IntentTabs.tsx`,
  `app/globals.css` (calculator slider).
- **Call sites:**
  - account (enquiries, saved);
  - dashboard (home, enquiries, performance);
  - drafts, moderation review, admin users and `AdminShell`;
  - the two error boundaries;
  - the admin, draft, listing, preview and withdraw action components;
  - the calculators;
  - the search layout, panel and locality field.
- **Status map:** `lib/listings/status-tone.ts` (+ test).
- **Checks:** `scripts/motion-check.mjs`, `scripts/light-check.mjs`,
  `package.json`, `.github/workflows/verify.yml`.
- **Docs:** this record, the roadmap, README, CLAUDE.md, and the
  design-system StatusPill and EmptyState pages.

## Remaining risks

- **Motion's first production consumer is still open.** Reduced-motion
  browser coverage for Motion itself waits for it; the CSS layer and the tabs
  are covered.
- **62 handwritten buttons remain**, most for good reasons (table above).
  The outlined brand and outlined danger styles recur often enough to
  justify a variant decision.
- **Sheet open cost** is structural (whole-document style recalculation on
  modal open) and scales with page size.
- **Tabs indicator measurement** depends on layout effects. A tab whose
  label changes length without a resize would need a re-measure; the
  ResizeObserver covers every case today because the labels are fixed.
- The hit-test assertions use Chromium's hit-testing. Safari is not
  exercised here.

## Recommendation for UI-06 — Search & cards

Following UI-01 §6 item 5, on this baseline:

1. **Results list entrance and filter-chip layout motion.** This is the
   first candidate where Motion's features (layout and presence for chips
   added and removed) may be justified. Measure it against a CSS
   `@starting-style` version first, as UI-05 did. If Motion ships, keep it
   behind `<MotionFeatures>` on the search route only and extend
   `motion-check`'s reduced-motion coverage to it.
2. **Card and gallery transitions** on the UI-04 language (the hover/touch
   fix and image fade are done).
3. **Reduce what a modal open recalculates on search and home:**
   `content-visibility: auto` on off-screen sections, measured with the
   Sheet trace and Event Timing scripts from this stage.
4. **The outlined button variant decision** (brand-outline and
   danger-outline), then migrate the next button group.
5. **Search's no-JavaScript skeleton** (UI-04 risk): a streamed fallback
   that renders results without JavaScript.

Out of UI-06: dashboards and charts (UI-09/10), auth UI (UI-07), Anime.js,
and the protected scenes.
