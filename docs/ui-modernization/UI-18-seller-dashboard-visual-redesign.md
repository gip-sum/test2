# UI-18 — Seller Dashboard visual redesign

Status: complete, 20 October 2026, on `main`. The fifth stage of the visual
track, after [UI-17](UI-17-post-property-visual-redesign.md).

My properties is now an operational seller workspace organised around a
seller's questions: what is waiting for me, what I have and what state each
is in, whether buyers are interested, and what to do next. The owner
approved it in one review (Stage A, `39dab71`).

Unchanged: listing lifecycle and status logic, permissions, moderation,
auth, analytics calculations and the database schema. The seller's data
reads stay behind `lib/dashboard/queries.ts` and `lib/analytics/queries.ts`.

## Before → after

| | Before (UI-17) | After (UI-18) |
|---|---|---|
| Header | "Manage your listings, drafts and next steps." and Post a property | A real summary ("7 properties · 2 live · 1 under review · 1 draft"), Enquiries with the unread count, Post a property as the primary action |
| Summary and filters | Four count tiles above a row of tabs that repeated their counts | One status navigation: every filter a link with its real count, the current one marked; empty statuses recede but stay links; it scrolls on a phone and wraps from 640px |
| Waiting items | One yellow banner, for expiring listings only | **Needs your attention** (below) |
| Listings | A table-like list: an icon, columns of price, status and dates, a row of five equal links | Cards (below) |
| Buyer interest | Only on the separate performance page | **Buyer interest** on the dashboard: views and enquiries for the last 30 days, new enquiries, and the UI-10 chart |
| Empty filter | "No properties have this status." | Each status says what would be there |
| Performance page | Tabs, a counting note above them, then tiles, a chart box and a table box stacked separately | A segmented period control, then one panel per period: figures, chart, how figures are counted, daily table |

## Information architecture

- **Order.** Attention, then the listings (status navigation, sort, cards, pagination, the Removed group), then buyer interest. This is the DOM order, so a screen reader meets them the same way.
- **Layout.** From 1280px the listings take the main column, and attention and interest sit beside it in a 21–23rem column. Below 1280px they stack in the order above.
- **State.** The URL is still the only state (`status`, `sort`, `page`). Every filter and sort control is a link.

## Attention system

`attentionItems(cards)` (`lib/dashboard/model.ts`, unit-tested) derives items only from facts the cards already hold. Each links to the action that resolves it:

| Kind | Shown when | Action |
|---|---|---|
| Returned | Rejected or corrections requested | Edit draft |
| Expiring | Active, within 7 days of expiry | Review listing (publishing page) |
| New enquiries | Enquiries still marked new on a listing | Open enquiries (inbox for that listing) |
| Expired | Past expiry | Review & re-submit |
| Draft incomplete | A never-submitted draft with sections left | Continue editing |
| Draft needs photos | A complete draft known to have no photos | Add photos |
| Draft ready | A complete draft with photos | Review preview |

- **Order.** Returned, expiring, new enquiries, expired, drafts.
- **Length.** Three items show; the rest sit behind a native "Show N more" disclosure.
- **Honesty.** With nothing waiting, it says so. There are no scores, recommendations or invented urgency. Under review, a quiet live listing and read enquiries are not items.

## Seller cards

**Cover.** The photo buyers see, or a never-submitted draft's own first photo, with a photo count.
- Read in two batched owner-session queries, one for submission photos and one for draft collections; never one per card.
- A failed read leaves a placeholder and an unknown count, not an error.
- The image comes from the owner-only endpoint, so it is loaded lazily, and a failed image is covered by the UI-16 media ground.

**Content:**
- **Status line:** the badge, the date that matters ("Live since", "Submitted", "Expired"), and what it means ("Expires in 3 days", "Waiting for review", "Not public").
- **Description:** title, locality, sale or rent, and price.
- **Measured figures:**
  - photo count;
  - views in 30 days, for live listings, from the performance data;
  - enquiries, with a "2 new" marker, linking to that listing's inbox.
- **Notes:** the reviewer's note in a neutral box, and a 4-section progress strip for drafts.

**Actions.** Ranked, not lined up:
- one primary step, filled when the card needs attention and outlined otherwise;
- at most two secondary links from 640px;
- the rest, including Withdraw and Remove listing…, behind **More**.

On a phone only the primary step and More show. The available actions per status are exactly Phase 19's; UI-18 only orders them.

**More menu.** A native `<details>`, so it works without JavaScript.
- A small client layer adds Escape (with focus back to the control), closing on a press outside, and closing other menus when one opens.
- Withdraw keeps its confirmation, Cancel, busy state and focus handling (UI-09).
- Menu items are full-width 44px rows; dashboard-check hit-tests them at every width.

## Status system

- **One status language:** `StatusBadge` (text plus tone, never colour alone) beside a status line in words.
- **Statuses:** Draft, Under review, Active, Expired, Rejected, Corrections requested, Withdrawn and Removed, the dashboard's real states.
- **Calm problem states:** rejected and expired are not alarming. The badge and words carry the meaning, and the primary button fills.

## Analytics and Bklit

- **Chart.** The UI-10 chart (`components/analytics/DailyActivityChart`) is kept as it is: the same drawing, `ChartScrubber` slider, keyboard, `touch-action: pan-y`, untracked-day gaps and text summary. Its only change is a `compact` size (shorter plots) for the dashboard column.
- **Bklit provenance:** adapted from Bklit UI, github.com/bklit/bklit-ui at `7167844`, MIT License; recorded in the component (UI-10). No additional Bklit chart was added, because it would duplicate the same data.
- **Dashboard.** The buyer-interest panel shows views (or "not tracked"), enquiries and new enquiries for 30 days, the compact chart, and a link to Performance. When counting is off or unreadable it says so, and enquiries are unaffected.
- **Performance page.** Each period is one panel; the period control is segmented; calculations are unchanged.
- **Data loading.** `loadActivity` was split from `loadPerformance`, so My properties reads activity beside the cards it already loads; the cards are not loaded twice. `loadPerformance` composes the same two reads.

## Sources

- **Kokonut UI:** evaluated, not used.
  - `smooth-tab`: the status filters are URL navigation, not in-page tabs.
  - `morph-popover`, `profile-dropdown`: Motion components (about 30 KB gzip on a route with none) for a morph the menu does not need.
  - `metric-card`: animated KPI tiles that conflict with the dashboard's figures-in-words design and duplicate the chart.
- **Motion:** evaluated, not used. Filtering and status changes are server-confirmed navigations; animating them would make the data feel unstable and adds nothing to the interaction.
- **Anime.js:** no legitimate timeline or SVG use.
- **Others:** none. No new dependency.

## Mobile, accessibility, no JavaScript

**Mobile:**
- no horizontal overflow from 320px to 1440px;
- at 320px the header's two actions wrap, fixed in validation (they overflowed by 7px);
- 44px targets, including the attention links, sort pills, the More control and its items;
- compact cards with the primary action full width beside More;
- the status row scrolls inside its own box.

**Accessibility:**
- one h1;
- each panel is a labelled region;
- status links use `aria-current`;
- each card action is named for its property;
- the enquiries link reads "3 enquiries, 2 new, for …" (fixed in validation: the badge ran into the count);
- the chart keeps its slider and text summary;
- no animation on load.

**No JavaScript:** cards, statuses, filters, sort, the More menu and Show more all work, and the performance chart is drawn by the server.

## Bundle

Measured against UI-17 (`1277355`), same build and simulator, first load from the served HTML with a session:

| Route | Δ gzip |
|---|---|
| Seller dashboard | **+2.6 KB** (the chart's slider, the card menu) |
| Seller performance | +0.3 KB |
| Every other route | +0.0 KB |

## Validation

| Command / check | Result |
|---|---|
| `npm run verify` | lint and typecheck clean; 693 unit tests (new: covers and photo counts, `attentionItems` kinds, order and links, batched photo reads, photo failure) |
| `npm run build` | passes |
| dashboard-check | 143 (was 134), updated for the approved design: status counts, attention items and links, menus, Withdraw from the menu, empty states, the Removed group, and open-menu hit-testing at every width |
| performance-check | 225, with the chart now expected on the two seller routes and no others |
| lead, saved, listing, moderation, users, admin, auth, login, description, preview, draft, photo | all pass |
| phase-e, shots, light, search, home, property, calculator, shell, motion, ui, pricing, post, notfound, login, media | all pass |
| style-diff (UI-17 → UI-18, 75 screens) | changes on the seller screens; elsewhere only capture-time text (admin) and a resolved auto margin (Saved); login and 404 scenes unchanged |

**UI-10 route-isolation guard.** It now allows the dashboard alongside the performance page. It still proves the chart reaches no other route, including the enquiries inbox and every public page.

**Defects fixed in validation:**
- 320px header overflow;
- the enquiries link's run-together name;
- the Removed group moved back outside the list it is not counted in.

## Remaining issues

- **Card photos:** they are full-size originals loaded lazily; a thumbnail size on the owner photo endpoints would save mobile data.
- **Enquiries inbox:** keeps its pre-UI-18 presentation; it is reached from the header, the attention panel and each card.
- **Dead CSS:** the ~60 UI-13 Home rules remain.

## UI-19 recommendation

Account and Saved visual redesign (next in the visual track):
- the buyer's account, profile and Saved homes in the workspace and card language of UI-15 to UI-18;
- the enquiries inbox brought into the UI-18 panel and card system at the same time.
