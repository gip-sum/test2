# UI-08 — Special interactions and animation evaluation

Status: complete, 18 October 2026, on `main`. Builds on UI-01 to UI-07
([UI-07](UI-07-auth-ui.md)).

UI-08 looked for places where movement would help someone understand what
just happened, and found four. Each is built in the lightest tool that
does the job.

| Interaction | What it fixes | Built with |
|---|---|---|
| **Photo reorder** (posting) | A moved photo jumped to another grid cell with nothing to follow. Every move dropped keyboard focus to `<body>`. | Web Animations FLIP (`lib/motion/flip.ts`) |
| **Gallery direction and thumbnails** | No sense of direction on a swipe or arrow. The current thumbnail could sit out of sight. | CSS keyframes, plus a scroll of the strip |
| **Save confirmation** | No moment of confirmation when a save landed. The busy heart dropped focus. | CSS keyframes |
| **Posting progress fill** | A new step did not visibly fill the bar. | CSS transition |

The decisions:
- **Motion:** measured against the FLIP on the one candidate where it could
  matter (layout animation). It lost on bytes, click-to-paint and long
  tasks. **Motion still ships nowhere.**
- **Anime.js:** no candidate needs a timeline. **Not installed.**
- **Kokonut UI:** reviewed again; nothing shipped.
- **Login and 404 scenes:** untouched.
- **Bundle:** Property +0.87 KB, the photos route +0.99 KB, every other route
  +0.08 KB or nothing.

---

## 1. Scope

**In:**
- an audit of interaction candidates;
- the four interactions above, with their accessibility fixes;
- the Motion and Anime.js decisions, measured;
- tests and measurements.

**Out:**
- Page redesigns.
- Authentication.
- Bklit UI.
- The login and 404 scenes.
- Upload, ordering and saving logic. The reorder now updates the screen
  before the save (and puts it back if the save fails), but the request is
  unchanged.
- Drag-and-drop reordering. It is a new input method, not an animation, and
  touch drag on Android needs its own design.

## 2. Candidates and scoring

| Candidate | User problem | Proposed | CSS enough? | Motion advantage? | Anime.js needed? | A11y / reduced motion | Cost / mobile risk | Decision |
|---|---|---|---|---|---|---|---|---|
| **Photo reorder** (`PhotoManager`) | A moved photo jumps cells with nothing to follow. Every move disabled the focused button, so focus fell to `<body>`; "Make cover" unmounted it. | Optimistic move, FLIP from the old cell, removal reflow, focus kept or handed on | No: CSS cannot transition between grid cells | `layout` does FLIP, but needs `domMax`. **Measured below: worse.** | No | Focus fixes are the bigger win. Reduced motion: no movement. | WAAPI: ~1 KB on one route | **Shipped (WAAPI)** |
| **Gallery** (`Gallery`) | A swipe or arrow gives no sense of direction. With many photos, the current thumbnail can be out of view. | 16px directional arrival; current thumbnail kept in view | Yes | None | No | Status and counter unchanged. Reduced motion: no slide; the strip jumps. | 0.3 KB | **Shipped (CSS)** |
| **Save / unsave** (`SaveButton`) | No moment of confirmation (the state is honestly not optimistic). The busy heart was `disabled`, so focus fell to `<body>`. | One swell when the server confirms; aria-disabled while busy | Yes | None | No | State in `aria-pressed`, the label and the fill. Reduced motion: no swell. | ~0.1 KB of code (0.6 KB measured on Property with the chunk split, §6) | **Shipped (CSS)** |
| **Posting progress** | Moving to the next step does not visibly fill the bar | Track and fill; the entered step fills from the left | Yes | None | No | "Step N of 8" text unchanged. Reduced motion: instant. | 0 KB JS | **Shipped (CSS)** |
| Posting step transitions | — | Animate step content | Yes | None | No | Would delay a form people are filling in | — | **Rejected** ("do not animate every step") |
| Success confirmations (draft saved, review confirmed, withdrawn, decision recorded) | Already clear, announced text | Checkmark or toast animations | — | — | — | An animation adds no information; a toast would interrupt | — | **Rejected**: the text statuses are right as they are |
| Saved list, remove a home | The grid reflows after `router.refresh()` | FLIP the server-rendered grid | — | — | — | Needs a client wrapper around server cards | Medium | **Deferred** (§11) |
| Filters | Done in UI-06 (chip and results entrance) | — | — | — | — | — | — | Not repeated |
| Dashboard / admin actions (withdraw, renew, review) | Text status, server refresh | — | — | — | — | — | — | **Rejected**: no spatial change to explain |
| Map interactions | No map exists ("no map position is invented") | — | — | — | — | — | — | N/A |
| Upload completion | The phase text and `<progress>` already say it | — | — | — | — | — | — | **Rejected** |

## 3. What shipped

### Photo reorder: continuity and focus

**Optimistic move.** The photo is in its new place in the DOM from the first
frame, then the order is saved.
- If the save fails, the photo travels back.
- The notice says why and where it is ("… The photo is back in position 2.").
- The ordering request is the same PATCH as before.

**FLIP** (`lib/motion/flip.ts`, 50 lines):
- **Measure:** `measure()` records each `[data-flip-key]` box before the
  change.
- **Play:** `play()` runs in `useLayoutEffect` after React commits. Each item
  that moved animates from its old box with one `transform`.
- **Timing:** `--duration-base` (200ms) on `--ease-standard`, read from the
  tokens.
- **Lead item:** the photo that was moved travels above the others
  (`z-index` for the flight).
- **Interrupted moves:** a move interrupted mid-flight starts from where the
  photo is drawn.
- **Removal:** the photos after a removed one slide up into the gap.

**Focus.** This is the bigger fix of the two.
- Busy controls are `aria-disabled`, not `disabled`, so the pressed button
  keeps focus while the order saves (the UI-07 Button rule, applied to the
  photo tools).
- At either end of the list, focus moves to the control that still applies:
  Earlier → first place hands focus to Later. "Make cover" unmounts, so focus
  goes to Later on the cover photo.
- After a removal, focus goes to the photo that took its place, else the one
  before, else the file picker.

**Reduced motion:** the order changes at once. The Web Animations API is not
reached by the global CSS rule, so `play()` checks the preference itself.

### Gallery: direction and thumbnails

- **Direction.** A changed photo arrives 16px from the side it came from:
  - Next and swipe-left come from the right;
  - Previous comes from the left;
  - a thumbnail further along comes from the right.

  It runs for 200ms on `--ease-enter`, transform only, inside the frame's
  overflow. It composes with the UI-04 fade (a still-loading photo stays
  transparent and fades as before). The frame has no direction until the
  first change, so the first photo never slides. It applies to the lightbox
  too.
- **Thumbnails.** On every change the current thumbnail is scrolled into view
  within its strip: the strip's own `scrollBy`, smooth unless reduced motion.
  `scrollIntoView` was rejected because it scrolls the page when the strip is
  off screen. With four photos at 390px the strip moved 18px; before, the
  last thumbnail stayed clipped.

### Save confirmation

- **Busy:** while the request is in flight the heart is `aria-busy` and
  `aria-disabled`, not `disabled`, and keeps focus.
- **Saving:** when the server confirms, the heart fills and swells once:
  0.85 → 1.12 → 1 over 200ms.
- **Unsaving:** settles from 0.9 over 150ms.
- **When it plays:** only on a change confirmed through *this* button. The
  kind is recorded at confirmation and the icon is re-keyed. Saved state
  loading, or the same listing saved through another heart, never animates.
  A page of saved homes does not throb on arrival.
- **Not optimistic.** The heart changes when the server confirms, as before:
  nothing claims a save it does not have.

### Posting progress fill

- Each segment is a track (`surface-200`) with a fill (`brand-600`) scaled
  from its left edge.
- On a client-side step change the entered segment keeps its element, so
  its fill sweeps in over 300ms on `--ease-standard`. Going back empties it.
- A full page load draws the segments at rest, pixel-identical to the old
  bars (style-diff, §7).
- `.progress-fill` uses `transform` directly. Tailwind v4's `scale-x-*`
  writes the separate `scale` property, which the motion guard and the
  transition would not cover.

## 4. CSS vs Motion, measured

The one candidate where Motion's capability is relevant is layout
animation. I built `PhotoManager` with `m.li layout` inside
`LazyMotion features={domMax}` (a features module exporting only `domMax`)
and ran it against the shipped FLIP on the same page:
- six photos, 390px, 4× CPU, 7 runs;
- the same Auth/REST stand-in for both.

| `/post/photos` | WAAPI FLIP (shipped) | Motion `layout` |
|---|---|---|
| JS in the HTML (gzip) | 173.6 KB | 188.1 KB (**+14.5**) |
| All JS by idle | 185.0 KB | 227.6 KB (**+42.6**, the `domMax` chunk) |
| "Later" click → next paint | **72 ms** | 108 ms |
| Longest task during the move | **51 ms** | 82 ms |
| Worst frame | **117 ms** | 133 ms |
| Reduced motion | `matchMedia` check | `MotionConfig` user preference |
| Hydration | no client boundary per item | a client `m.li` per photo |
| Code | 50 lines, no dependency | a second feature loader, `LazyMotion` wrapper |

A first variant that imported `domMax` from the `motion/react` barrel
loaded 255 KB by idle (+70 KB). That is the hoisting UI-02 warned about.

For the three CSS candidates Motion offers nothing: they are single
transforms on elements React already renders.

**Motion still has no production consumer.** `lib/motion` presets,
`<Presence>` and `MotionFeatures` remain ready, and unused.

## 5. Anime.js decision gate

None of the candidates needs what Anime.js is for:
- no multi-step coordinated timeline;
- no SVG path or morph sequence;
- no many-element choreography;
- no number or text sequencing;
- no imperative timeline control.

The reorder is one transform per moved item, and the rest are single
keyframes. **Anime.js was not installed.** It stays approved for the first
real sequence (UI-01 §7). The login and 404 scenes stay CSS: moving them
would add client JavaScript and hydration dependence for no visible gain,
as UI-01 found.

## 6. Bundle (gzip, vs UI-07)

| Route | KB | Δ | Pays for |
|---|---|---|---|
| Home | 177.0 | +0.08 | SaveButton (shared chunk) |
| Search (buy / rent / filtered) | 178.7 | +0.08 | SaveButton |
| Property details | 177.1 | **+0.87** | gallery (0.3, measured alone), SaveButton (0.1 code plus a webpack chunk split, §6.1) |
| Post photos (manifest upper bound) | 185.7 | **+0.99** | reorder: FLIP helper, focus handling, rollback |
| Post property | 169.3 | 0 | progress fill is CSS |
| Login | 170.5 | 0 | — |
| EMI calculator | 172.4 | 0 | — |
| Activity (guest) | 167.8 | +0.08 | SaveButton |
| Not found | 177.0 | +0.08 | SaveButton (shared chunk) |
| Seller dashboard (upper bound) | 180.2 | +0.08 | SaveButton (shared chunk) |
| Admin overview (upper bound) | 178.3 | +0.08 | SaveButton (shared chunk) |

No Motion code and no Anime.js anywhere. The FLIP helper is in none of
Home, Search, Property, Login or 404 (checked by searching each route's
chunks). It ships only with the photo manager.

### 6.1 The property page's 0.6 KB for the heart

The SaveButton module grew by 110 bytes gzip. On Property, webpack moved
it into a separate shared chunk: 13 → 14 files, +0.6 KB in all.
- I measured it in isolated builds: gallery alone, gallery plus SaveButton.
- A variant that restarts the animation through a ref instead of React
  state measured the same, so the split is not caused by the state hook.
- The idiomatic version shipped.

## 7. Intentional visual changes (style-diff UI-07 → UI-08)

58 screens. The raw report shows 5 distinct changes on 30 element-properties,
36 structural notes, and the protected scenes unchanged.

| Change | Where | Measured |
|---|---|---|
| Progress segments are a track with a fill | `/post`, posting steps | Filled segments: same box and colour as the old bars (e.g. 37,346 74.5×6, `rgb(17,119,68)`). Empty segments: the track in the old empty colour, fill scaled to 0. The colour "changes" are the old bar's path now pairing with the track. |
| — | admin moderation @390 | Wait-time caption rewraps: a clock-dependent duration (explained in UI-07 §16), not UI-08 |

Everything else in UI-08 is not a static change and shows no static
difference: Property, Home, Search and the cards are identical. That covers
the direction attributes, the heart's `data-heart`, aria-disabled (an
attribute change at rest), and the photo manager's layout, which is the
same at rest.

## 8. Reduced motion

| Interaction | Without reduced motion | Reduced motion | Verified by |
|---|---|---|---|
| Photo reorder | 200ms FLIP | order changes at once; focus behaviour identical | `photo-check` |
| Gallery direction | 16px arrival | the photo changes in place | `motion-check` |
| Thumbnail strip | smooth scroll | instant scroll | by construction (`behavior: 'auto'`) |
| Save | one swell | state change only | `auth-check` |
| Progress | 300ms fill | ≤0.01ms (global rule) | `motion-check` |

No content is hidden waiting for any of it:
- server HTML carries no direction, heart mark or flip state;
- without JavaScript the gallery, the progress bar and the hearts render at
  rest;
- the photo manager already required JavaScript (its own `<noscript>`).

## 9. Mobile and performance

**Widths:**
- the photo manager has no overflow at all eight widths;
- at 320px the page does not scroll sideways while a photo travels
  (checked mid-flight);
- 44px targets at all eight;
- the gallery strip scrolls without moving the page;
- `shots` passes.

**390px, 4× CPU, 11 interleaved runs, UI-07 vs UI-08:**

| | UI-07 | UI-08 |
|---|---|---|
| Search load, total blocking time | 558 ms | 528 ms |
| Search CLS | 0 | 0 |
| Property load, total blocking time | 398 ms | 417 ms |
| Gallery Next: event duration | 72 ms | 80 ms |
| Gallery Next: worst frame | 67 ms | 67 ms |
| Property CLS | 0 | 0 |
| Posting step: event duration | 56 ms | 56 ms |
| Posting step: worst frame | 83 ms | 83 ms |

All within run-to-run noise. No new long task, no layout shift, no
temporary overflow. Every animation is transform-only and runs on the
compositor.

## 10. Verification

| Check | Result |
|---|---|
| `npm run verify` | 641 tests (the motion-CSS guard covers the new keyframes and transitions: tokens only, transform/opacity only) |
| `npm run build` | passes |
| `motion-check` | **101** (UI-07: 89). New: gallery first-photo, Next, Previous, swipe, thumbnail in view without page scroll, progress fill and Back, reduced motion for both |
| `photo-check` | **48** (UI-07: 31). New: FLIP plays with the lead raised; busy controls keep focus; end-of-list focus hand-off; rollback on a failed save; keyboard-only reorder; reduced motion; Make cover focus; removal focus; eight widths; no overflow mid-flight at 320 |
| `auth-check` | **48** (UI-07: 42). New: no animation as saved state loads; busy heart keeps focus; confirmed save swells (`animationstart`, 200ms); Space unsaves with the settle; already-saved hearts are still; reduced motion |
| full suite | all pass with unchanged counts: phase-e 64, moderation 34, users 92, listing 23, dashboard 72, performance 102, admin 124, description 28, preview 24, shots (no overflow at any width), light-check, search 64, calculator 43, shell 355, ui 128, pricing 46, post 87, draft 27, login 117 / 179 with auth |
| login and 404 | no scene file in the diff; `protected-scenes.test.ts` fingerprints unchanged; style-diff reports the login and 404 scene markup and every non-UI keyframe identical on every login screen and the 404 page; `login-check` (117, and 179 with auth, timing beats included) and `notfound-check` (36) pass |

**A race in the new heart check, found by CI.** The first CI run (#85)
failed the unsave step of `auth-check`. Two causes, both in the test:
- it located "the first heart labelled Save…", and the property page has
  other hearts (similar homes), one of which matched before ours updated;
- it read the `animationstart` record in the frame the confirmed state
  rendered, while the swell starts one frame later.

Locally both passed by timing. The check now holds the button element
itself (it stays mounted; only its icon is re-keyed) and waits for the
swell to start before asserting. It passed 5 of 5 runs, and it still fails
if no swell plays.

**Known failures:** identical failure points to UI-07, compared line by line — `home-check` (locally; `home-check.mjs:200`, passes in CI), `property-check` (the same two assertions), `media-check` (the same fallback case), `lead-check` (`lead-check.mjs:70`), `saved-check` (`saved-check.mjs:61`: it defaults to the public server, which has no Auth backend, and is not in CI). None was modified.

## 11. Remaining risks

- **Optimistic reorder.** On a failed save the photo shows in its new place
  for one request's time, then travels back with a notice. This is
  deliberate (responsiveness), and the failure is explicit.
- **The FLIP helper is the one hand-written animation** outside CSS. It is
  tested in `photo-check`; if a second consumer appears, give it unit tests
  with a DOM.
- **The 0.6 KB chunk split on Property** is webpack's grouping, not code;
  watch it in `bundle-report`.
- **Saved list reflow** after removing a home is still abrupt (deferred:
  server-rendered cards need a client wrapper to FLIP).
- **Drag reorder** does not exist; the buttons are the input. Touch drag is a
  future feature.

## 12. Recommendation for UI-09 — Seller workspace

UI-01 §6 item 9:
1. **Seller dashboard and listings.**
   - Apply the rules UI-05 to UI-08 set: `StatusBadge`, busy controls that
     keep focus, `EmptyState` / `ErrorState`.
   - Finish the 57 handwritten buttons in the workspace (the neutral-border
     brand-text group from UI-06 needs its design decision).
   - Move the posting forms onto shared field parts, following UI-07's
     `AuthField`.
2. **Lifecycle actions** (withdraw, renew, publish): the same
   optimistic-with-rollback and focus rules the photo manager now follows.
3. **Analytics charts stay for UI-10 (Bklit UI)**, on measured data only.
   UI-09 should leave the performance page's numbers as they are.
4. CSS first; Motion only if a workspace interaction needs layout or gesture
   and wins a measurement like §4.

Out of UI-09: charts (UI-10), Anime.js, the login and 404 scenes.
