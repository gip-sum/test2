# UI-09 — Seller workspace

Status: complete, 18 October 2026, on `main`. Builds on UI-01 to UI-08
([UI-08](UI-08-special-interactions.md)).

UI-09 brings the seller workspace onto the rules the track has set, inside
the approved structure:
- **Same structure.** The status filters, summary counts, sort, cards and
  Removed group are unchanged.
- **Focus kept through every action.** Busy buttons kept their dimensions
  but threw focus to `<body>`, and after an action refreshed the page the
  pressed control was often gone. Focus now stays on the pressed button
  while it works, then moves to the card or status the action changed, and
  the outcome is announced.
- **Canonical status badges.** The publishing and submitted pages show
  status through `StatusBadge`; it was brand-green text for every status,
  removed and rejected included.
- **A new `secondaryBrand` Button.** It is the neutral-bordered,
  brand-text tool button drawn by hand in eleven places. **11 buttons
  migrated**, and a test now pins the remaining count.
- **One field frame for the posting forms.** The three forms wired labels,
  hints, errors and ARIA three ways. Now they share one, and the details
  step's 15px inputs (Safari on iPhone zooms into them) are 16px.
- **Shared states.** The emptied dashboard filter and three page failures
  use `EmptyState` / `ErrorState`.

What did not change:
- **No optimistic actions.** Each seller action changes what the public sees
  or is permanent (§5).
- **No Motion, no Kokonut component, no Bklit.**
- **Bundle:** the dashboard +0.5 KB, public routes +0.0–0.14 KB.
- **The login and 404 scenes and the auth security fix are untouched.**

---

## 1. Scope

**In:**
- the seller workspace: dashboard, enquiries, performance shell, the
  publishing, submitted, preview and draft pages;
- the posting forms (details, location, pricing) and the photo manager;
- the shared `Button` and states.

**Out:**
- the workspace information architecture and navigation;
- the analytics charts (UI-10);
- admin screens (a later stage);
- the public pages, auth, and the login and 404 scenes.

## 2. Status presentation

| Where | Before | After |
|---|---|---|
| Dashboard cards | `StatusBadge` (UI-05) | unchanged |
| Performance page | `StatusBadge` | unchanged |
| **Publishing status page** | large brand-green text for every status (removed and rejected too), `role="status"` | `StatusBadge` in its tone, `role="status"`, focusable from script (focus returns here after an action) |
| **Submitted copy** | "Submitted copy · Active" in brand text | "Submitted copy" plus `StatusBadge` |
| Status history (publishing page) | labels from `STATUS_LABEL` | unchanged: a log, labels only, no colour to drift |

Every status colour on a seller screen now comes from
`lib/listings/status-tone.ts`, through `StatusBadge`. The stored vocabulary
(`DELETED`) and the dashboard's derived one (`WITHDRAWN`, `REMOVED`) both
map there. Unit tests cover live, problem and neutral, including
`DELETED`; `dashboard-check` covers the badge before and after a withdraw.

## 3. Buttons

### The new variant: `secondaryBrand`

The pattern was:
- a neutral border (`border-border-strong`), brand-700 text, transparent;
- drawn by hand in the photo tools, Withdraw to draft, the draft editor's
  Preview and Save & exit, and Restore unsent changes.

It is now `variant="secondaryBrand"`: the existing appearance, plus a
`hover:bg-brand-100` matching `outline`, and the global focus ring.

It is not called `outlineBrand` because `outline` (UI-06) already means a
*brand* border. This one is secondary's neutral border with brand text.

The **danger outline** (Delete listing) still has one use, so no variant.
It keeps its hand-drawn style and now follows the busy rule.

### Button behaviour

- **Caller `aria-disabled`.** `Button` honours an `aria-disabled` passed by
  the caller (it used to overwrite it), refuses the press, and draws it as
  disabled. This is "unavailable but still focusable", for:
  - the other action while one is busy;
  - "Earlier" on the first photo.
- **Busy keeps full colour,** as in UI-07.
- **`SubmitButton`** (client, `useFormStatus`) gives a server-action form
  the same busy state. It is a plain submit before hydration or without
  JavaScript.

### Counts

The earlier count is not reproducible from its record. I count every
`<button` in `app/` and `components/` TSX outside `components/ui`. That
reproduces the history with a constant offset of 4:

| Stage | Recorded | This count |
|---|---|---|
| UI-05 end | 62 | 58 |
| UI-06 end | 57 | 53 |
| UI-08 end (UI-09 baseline) | 57 as reported (56: UI-07 replaced the sign-in reload button) | **52** |
| **UI-09 end** | **45** on the recorded scale | **41** |

**Migrated to `Button` (11):**
- the photo manager's six tools: Earlier, Later, Make cover, Retry upload,
  Remove, Reload photos;
- Withdraw to draft;
- the draft editor's Preview property, Save & exit and Restore unsent
  changes;
- the inbox's Mark notifications read (`SubmitButton`).

**Busy rule applied to existing `Button`s (no count change):**
- withdraw (Yes, withdraw; Cancel);
- Submit / Re-submit for review;
- Save as draft;
- Confirm review;
- Save description, Generate with AI, Use suggestion;
- Update status (`SubmitButton`, now named for its buyer).

**Left alone (41), deliberately:**

| Category | Count | Why |
|---|---|---|
| Navigation and menu toggles (HeaderNav, MarketplaceMenu) | 7 | disclosure semantics, own styles |
| Gallery (prev/next icons, thumbnails, open, close) | 6 | icon and media controls |
| Search panel, location field, filter controls, chips area | 9 | toggles, comboboxes and field controls |
| Save heart, home hero toggles | 3 | specialised controls |
| Text actions inside sentences and alerts ("Withdraw" in a link row, "Copy link", "Reload dashboard", "Retry save", "Discard…", "Keep account version", "Try again", "Reload preview", "Reload status") | 11 | link-styled actions in running text, where a bordered button would break the sentence |
| Delete listing (danger outline) | 1 | one use: no variant |
| Description "show more", zero-results, account access | 2 | public/account, outside the workspace |
| Admin review and account controls | 2 | a later admin stage |

`lib/design/button-count.test.ts` fails if the count rises above 41. Lower
the ceiling when a stage migrates more.

## 4. Busy states and focus

| Action | Busy | After success |
|---|---|---|
| Dashboard **Withdraw → Yes, withdraw** | `loading`: stays focused, refuses a second press (Enter included), "Withdrawing…" announced; Cancel unavailable but focusable | focus moves to the confirmation, then (refreshed page) to **the card's heading**, or the **list heading** if the card left the current filter; announced: "<title> withdrawn. It is no longer public." |
| Publishing **Submit / Re-submit for review** | `loading`; Withdraw and Delete unavailable | focus to **the listing status** (the badge's live region reads the new state) |
| Publishing **Withdraw to draft** | `loading` (`secondaryBrand`) | the same |
| Publishing **Delete listing** | `aria-busy` + `aria-disabled` (hand-drawn) | the same |
| **Confirm review** | `loading` | focus moves to "Review confirmed…" (it replaces the button) |
| **Save as draft** | `loading` | navigates |
| Draft **Preview property / Save & exit** | the pressed one `loading` until the next page; the other unavailable | navigates |
| **Save description / Generate with AI** | the pressed one `loading`, the other unavailable | notice |
| Inbox **Update status / Mark notifications read** | `SubmitButton`: busy while the server action runs | page re-renders in place |

**How focus survives a refresh** (`lib/a11y/after-refresh.ts`):
- The action records the element ids to try, in order, and a sentence,
  then calls `router.refresh()`.
- `<RestoreFocus token>` in the page acts when content from a newer server
  render is on screen. The token is a fresh random id per render.
- Without the token it could act on the old page an instant before the
  refresh removed the card again.
- The state lives at module level, because the component that started the
  action is usually the one the refresh removes.
- Announcements go to a polite live region outside React's tree, cleared
  first so a repeated sentence is heard again.

Programmatic focus targets (card headings, the list heading, the status)
carry `tabIndex={-1}`. They are not in the Tab order.

## 5. Optimistic actions — evaluated, none shipped

| Action | Server semantics | Optimistic? | Why |
|---|---|---|---|
| Withdraw (dashboard and publishing) | takes a live listing out of public view at once; only a new review brings it back | **No** | no undo exists; showing "withdrawn" before the server has done it would claim something false; it stays confirmed first |
| Submit / Re-submit / Renew (expired → re-submit) | validates the photos server-side (up to minutes) and can refuse | **No** | the outcome is not known locally |
| Delete listing | permanent | **No** | stays behind its confirmation checkbox |
| Lead status | reversible, server action | already effectively immediate | the select shows the chosen value; the submit is now busy-aware |
| Photo reorder | reversible | shipped in UI-08 | unchanged |

The photo-manager model (update now, roll back on failure) fits reversible
ordering. Lifecycle actions are neither reversible nor locally decidable,
so they keep "confirm → busy → server result".

## 6. Shared posting fields

`components/ui/FormField.tsx`: `FormField` and `FormFieldset`, server-safe.

| | Before | After |
|---|---|---|
| Wiring | three hand-written versions (`Describe` + `describedBy` in details; inline objects in location and pricing) | one: label, hint, control, error, all in `aria-describedby`; `aria-invalid` on the control, never on a radio |
| Hint | 12px caption span (details), 14px `p` (location, pricing) | 14px `p` everywhere |
| Error | above the control (details), below (location, pricing) | below the control everywhere (as the sign-in form does), with an `Error:` prefix for screen readers |
| Input text / height | **15px / 44px (details)**, 16px / 48px (location, pricing) | **16px / 48px everywhere**, so no iPhone zoom on focus |
| Optional answers | "(optional)" baked into label strings (location) or a prop (details) | `optional` prop, same rendered text and accessible name |
| Ids | `carpet-error`, `city-location-error`, `rent-pricing-error` | **unchanged** (`messageId`), so the error summary's links and the checks still point at them |

**Validation is unchanged.** The forms are server-validated GET forms
(`lib/posting/*`), working without JavaScript:
- after a failed submit the error summary takes focus and links to each
  field;
- entered answers come back filled;
- nothing validates while typing.

No client and server wording to reconcile: there is one validator.

`AuthField` (UI-07) stays separate. It validates in place without a page
load, so its errors are alerts with their own focus handling; posting
errors are announced by the summary. The enquiry and profile forms are
next in line for `FormField`.

## 7. Empty and error states

| State | Before | After |
|---|---|---|
| Dashboard, no properties | `EmptyState` | unchanged |
| Dashboard, outage | `ErrorState` | unchanged |
| **Dashboard, emptied filter** | a hand-styled paragraph | `EmptyState` (h3 under the list heading) titled for the filter ("No drafts", "Nothing under review", "No active listings"…), body "No properties have this status." and "Show all properties" kept |
| Enquiries, empty / failed | shared (UI-05) | unchanged |
| Performance, empty / failed | shared (UI-05) | unchanged |
| **Draft / Preview / Publishing status unavailable** | hand-built `role="alert"` paragraphs | `ErrorState` under the page's h1, wording and reload actions kept |
| **Publishing: preview could not load** | hand-built alert | `ErrorState` (inline) |

No technical detail is shown anywhere.

## 8. Mobile and touch

`dashboard-check` at 320, 360, 375, 390, 412, 430, 768 and 1280:
- the workspace shell assertions: one main, no overflow, skip link,
  keyboard reach;
- every main control is 44px or taller;
- **every card control is hit where it is drawn** (`elementFromPoint` at
  its centre, so nothing overlaps it), and no card is wider than the
  screen.

Status badges are `max-w-full` and wrap with their row; action rows wrap.

Elsewhere:
- **Photo tools:** 44px at eight widths, no overflow mid-move at 320
  (`photo-check`, UI-08).
- **Posting fields:** 16px and 48px (`post-check`).
- `shots` passes.

## 9. Motion, Kokonut, Anime.js, Bklit

- **Motion:** none. Nothing in the workspace needs layout or gesture
  animation. The busy states are the existing CSS spinner; focus moves are
  instant, as they must be.
- **Kokonut** (`bb9120f`), checked for workspace problems:
  - `toolbar` (a floating tool dock) and `profile-dropdown` would change the
    approved navigation;
  - `status-island` is a decorative status widget;
  - `metric-card` and `uptime-card` are analytics display (UI-10's
    question);
  - `file-upload` was rejected in UI-08.
  - None shipped.
- **Anime.js:** not installed. **Bklit UI:** not added.

## 10. Real data available to UI-10

All of it is behind `lib/*/queries.ts`, read with the seller's own session:

| Data | Source | Shape | Honesty rules already in the model |
|---|---|---|---|
| Daily views and enquiries per listing | `rpc/seller_listing_activity` (`p_from`, `p_to`) via `lib/analytics/queries.ts` `loadPerformance` | `ActivityRow { listing_id, day, views, enquiries }` | a day before view counting began is `null`, never 0 (`listing_analytics_meta.views_since`) |
| Current saves per listing | `rpc/seller_listing_save_counts` | `SaveCount { listing_id, saves }`; `null` when unreadable | supplementary; degrades to "unavailable" alone |
| Period totals and comparison | `lib/analytics/model.ts` `totals`, `buildPerformance` (7/30/90 days, current vs previous) | `Totals { views \| null, enquiries, untrackedDays }` | compared as plain figures, not percentages |
| Enquiry rate | `enquiryRate` | per 100 views, one decimal | `null` below 20 views |
| Daily series for a chart | `seriesFor` → `DayPoint[] { day, views \| null, enquiries }` | ready for a bar or line chart; `niceMax` already computes an axis | null days must render as "not tracked" |
| Listing counts by status | `lib/dashboard/model.ts` `arrange` → `counts: Record<FilterKey, number>` | All, Drafts, Under review, Active, Expired, Rejected, Corrections requested, Withdrawn (Removed excluded) | derived from real listings and history |
| Expiring soon | `arrange` → `expiringSoon`, per card `daysLeft` | integer | from `expires_at` |
| Enquiries per listing (total, new) | `rpc/seller_listing_enquiry_counts` via `listingEnquiryCounts` | `{ total, newCount } \| 'unavailable'` | unreadable is said, never shown as 0 |
| Lead pipeline (new / contacted / closed) | `listLeads(user, 'seller')` | `Lead.status` | — |

There is nothing to invent: every figure UI-10 needs exists, with its gaps
modelled.

## 11. Verification

| Check | Result |
|---|---|
| `npm run verify` | **648** tests (new: button ratchet, FormField / Button / StatusBadge 6) |
| `npm run build` | passes |
| `dashboard-check` | **124** (UI-08: 72). New: withdraw busy keeps focus and sends once; focus to list heading or card heading with announcement; filtered empty state; publishing badge, busy withdraw, focus to status; inbox buttons named and submit; card controls hit-tested and fitting at eight widths |
| `post-check` | **89** (UI-08: 87). New: typed fields 16px and ≥44px; error follows its field |
| `listing`, `draft`, `photo`, `preview`, `description`, `pricing` checks | 23, 27, 48, 24, 28, 46: all pass |
| full suite | all pass with unchanged counts elsewhere: phase-e 64, moderation 34, users 92, performance 102, admin 124, shots (no overflow at any width), light-check, search 64, calculator 43, shell 355, motion 101, ui 128, notfound 36, login 117 / 179 with auth |
| login and 404 | no scene file in the diff; fingerprints unchanged; style-diff reports both scenes' markup and keyframes identical; `login-check` (117 and 179, timing beats included) and `notfound-check` (36) pass |
| security | the UI-07 return-path fix is untouched: its unit tests (crafted `/.//`, `/a/..//`, `/%2e//` paths) and `auth-check` (48, including the three crafted Google return paths) pass |

**Checks adjusted:**
- `dashboard-check` matches "Asha Roy" exactly. The status button's hidden
  "for Asha Roy" made the substring match two elements; the assertion (the
  buyer's name is shown) is unchanged.

**Known failures:** identical failure points to UI-08, compared line by line: `home-check` (locally; passes in CI), `property-check` (same two assertions), `media-check` (same fallback case), `lead-check` (`lead-check.mjs:70` — before it reaches the inbox, so its later "Update status" step is not exercised locally), `saved-check` (public server, not in CI). None was modified.

## 12. Bundle and performance (vs UI-08)

| Route | KB gzip | Δ | New files |
|---|---|---|---|
| Seller dashboard (upper bound) | 180.7 | +0.51 | none |
| Seller performance (upper bound) | 182.0 | +0.51 | none |
| Post photos (upper bound) | 185.8 | +0.09 | none |
| Post property | 169.4 | +0.07 | none |
| Home | 177.1 | +0.06 | none |
| Search | 178.8 | +0.13 | none |
| Property | 177.2 | +0.14 | none |
| Login | 170.6 | +0.06 | none |
| Not found | 177.1 | +0.06 | none |

- **Public routes** pay only for the shared `Button` change (the
  unavailable state and the new variant's class names): 0.06–0.14 KB.
- **The dashboard** pays for focus restoration and the action changes:
  0.5 KB.
- **No async chunk was added. No route leakage.**

Seller interactions at 390px, 4× CPU, 15 interleaved runs:

| | UI-08 | UI-09 |
|---|---|---|
| Dashboard load, total blocking time | 479 ms | 478 ms |
| Dashboard CLS | 0 | 0 |
| Open the withdraw confirmation (event) | 144 ms | 152 ms |
| Status filter click (event) | 56 ms | 72 ms |
| Enquiries load, total blocking time | 433 ms | 456 ms |
| Details form load, total blocking time | 482 ms | 479 ms |
| Details form CLS | 0 | 0 |

All within noise except the filter click, which repeated across runs. I
investigated it with a build of UI-09 without `<RestoreFocus>`: 56 ms
without, 64 ms with. That is at most one 8 ms Event Timing step at 4×
slowdown, about 2 ms of real CPU, for the effect that moves focus after
an action. Kept.

## 13. Protected areas

1. No login or 404 scene file is in the diff.
2. `protected-scenes.test.ts` fingerprints are unchanged.
3. style-diff reports the scenes' markup and keyframes identical.
4. `login-check` and `notfound-check` pass (§11).
5. The UI-07 return-path fix is untouched. Its unit tests and the
   `auth-check` crafted-path assertions pass.

## 14. Intentional visual changes (style-diff UI-08 → UI-09)

58 screens. The raw report shows 22 distinct changes on 208
element-properties and 18 structural notes; the protected scenes are
unchanged.

| Change | Where |
|---|---|
| Details-step typed inputs: 15px → 16px text, 44 → 48px tall (`py-3`); the fields below move down accordingly | post-details @390 and @1280 |
| Details-step hints: 12px caption spans → the shared 14px `p` (3 per screen) | post-details |
| "Mark notifications read": underlined text → `secondaryBrand` button (border, 16px side padding, colour transition) | dashboard-enquiries |
| "Update status" gains a hidden "for <buyer>" (`sr-only`, not visible) | dashboard-enquiries |

Not covered by style-diff screens, but asserted in `dashboard-check` and
the unit tests:
- the publishing and submitted pages' status badge;
- the filtered empty state;
- the draft editor's and photo tools' `secondaryBrand` buttons. Their look
  matches the hand-drawn originals, plus a light brand hover.

## 15. Remaining risks

- **Focus after refresh** depends on `<RestoreFocus>` being on the
  refreshed page; a new seller page with refreshing actions must add it.
  The publishing and dashboard pages have it.
- **The emptied-filter titles** are new copy ("Nothing under review"); the
  body sentence is the original.
- **Admin screens** still disable busy buttons and fieldsets (ReviewDecision,
  AccountControls), which loses focus. That is for the admin stage.
- **Enquiry and profile forms** do not use `FormField` yet.
- **The publishing and submitted pages** are not in style-diff's screen
  list; add them when that tool next changes.

## 16. Recommendation for UI-10 — Seller analytics (Bklit UI)

1. **Performance page charts from `seriesFor`** (`DayPoint[]`):
   - daily views and enquiries per listing for 7, 30 or 90 days;
   - `null` days drawn as "not tracked" (a gap, never a zero);
   - the period comparison kept as plain figures.
2. **Bklit UI**, installed with this first chart, following the vendoring
   rules:
   - pinned source;
   - tokens only (the dataviz palette mapped onto GharBazaar's);
   - `motion` reused (one copy), or CSS if the chart animation is not
     worth it — measure as UI-05, UI-06 and UI-08 did;
   - only on `/dashboard/performance`, with a route-isolation check that
     no public route downloads it.
3. **Accessible charts:** a data table or summary for each chart, keyboard
   reach to data points if interactive, reduced motion, and 320px layouts
   that do not scroll sideways.
4. **Status distribution** from `arrange().counts` only if it adds
   something the filter counts do not. Otherwise leave it out: no decorative
   charts.
5. Nothing invented: the enquiry rate stays hidden below 20 views, and
   unavailable data says so.

Out of UI-10: admin analytics, Anime.js, the login and 404 scenes.
