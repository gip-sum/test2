# UI-20 — Admin workspace visual redesign

Status: complete, 22 October 2026, on `main`. The seventh stage of the visual
track, after [UI-19](UI-19-account-saved-enquiries-visual-redesign.md).

The admin console is now an internal operations room organised around four
questions: what needs attention, what am I reviewing, what matters in it,
and what can I do. The owner approved it in one review (Stage A,
`0e71630`).

Unchanged: who can open the console, staff checks (`requireStaff` on every
page, the database functions checking again), moderation rules and the
three decisions, the listing lifecycle, seller permissions, the admin API
routes and the schema.

## Before → after

| | Before (UI-11) | After (UI-20) |
|---|---|---|
| Shell | The seller workspace's light sidebar, "Staff only · signed in as admin" in small text | A forest sidebar with an "Admin console" caption and mint current marker; an Admin / Moderator pill in the top bar |
| Navigation | Overview, Listings, Moderation, Users & sellers, System | Overview, **Review queue**, Listings, **Accounts**, System — the work second; destinations unchanged |
| Overview | Four figure tiles, then four cards of sentences | Needs attention → Next in the queue → Where listings stand, with figures, accounts and enquiries beside |
| Queue and listings | A seven-column table with a Review button per row | One row per listing, the whole row one link; the queue led by place in line and wait |
| Review | The submitted copy in one long panel, a plain form beside it | A case header, jump links, the buyer page's components, "Before you decide" facts, and a separate decision panel |
| Accounts | A filter card above a table | Identity-led rows with an inline search; an identity header on the detail page |

## Overview

- **Needs attention** comes first. The review queue gives its count (from `admin_overview`) and the oldest wait, which is marked when overdue. Failing system checks are named one by one, each with its state in words. Each row carries its action: Open review queue, or See system status.
- **Next in the queue** lists the three oldest submissions, each linking straight to its review. It is the queue's own read (`moderation_queue`, page 1). It names rows only; the count stays the overview's.
- **Where listings stand** groups the status counts as Waiting, Public, Returned to the seller and Off the market. Every count is a link to its filtered listings page.
- **Beside these:** published listings, accounts, enquiries and staff, plus account and enquiry facts. All are counts; none is a trend, score or chart.
- **When the overview cannot be read** it says so. The attention panel stays, because the system checks and the queue link have their own reads. Validation restored this: the Stage A page lost the system summary with the figures.

**Overdue.** One rule everywhere: `REVIEW_OVERDUE_MS`, the existing 48 hours. Past it, the wait shows a mark, the word "Overdue" and its duration, on the overview, the queue, listings under review and the review page.

## Queue and listings

- **Rows.** One row per listing: wait (queue) or status (listings), property and place, price, seller and type, and the submitted date. The title link stretches over the row, so the row is one tab stop named by the title. Checks hit-test that a press anywhere on the row reaches it.
- **Queue.** Oldest first, with each row's place in line (`<ol start>` follows the page). The summary gives the oldest wait, and the overdue count only when the whole queue is on the page.
- **Layout.** Rows switch to aligned columns by their panel's width (a container query), so the overview's narrower preview stays readable. In a narrow panel, the seller and date share a line.
- **Listings filter.** The dashboard's URL-driven status navigation, with the overview's counts and the current one marked. Each status has its own empty-state wording.
- **No cover photos, by decision.** The queue read returns no photo. Adding one would need a schema change or a read per row, and a text queue is faster to scan.

## Listing review

- **Case header.** Status (still the focus target after a decision, `#listing-status`), when it was submitted, the wait, place and type, the seller as declared, and the price with its per-sqft rate.
- **Jump links.** Photos, Price and terms, Facts, Area, Location, Description and History. They are plain anchors, so they work without JavaScript.
- **The submission as buyers would see it**, in the buyer page's own components: `Gallery`, `KeyDetails`, `AreaBreakdown` and `PriceDisplay`. Nothing is formatted twice.
- **Before you decide.** Facts in words, not a score:
  - photo count;
  - description present (with its length) or missing;
  - map position and society name (optional; missing reads neutral);
  - earlier decisions, with the last one linked.

  A missing expected fact carries a mark and "(missing)" for screen readers.
- **The decision.** A separate panel with a heavy border, its own heading ("Your decision") and the act at its foot. The three existing actions are unchanged:
  - **Approve:** publishes the submitted copy for the days set.
  - **Request corrections:** not published; returned to the seller with the reason.
  - **Reject:** not published; the seller sees it was rejected, with the reason.

  Each consequence is the radio's description; its name is just the decision. The consequence is said again beside the button, and Reject is a danger button. Validation, the confirmation box, the API request, busy state and focus after a decision are UI-11's, unchanged.

## Accounts

- **List.** Initial, name, email, status badge, seller role, a staff badge, joined date and last sign-in, one link per row. The search is a GET form, so its state is the URL.
- **Detail page.** An identity header (initial, name, email, staff badge), a fact grid, and the account form beside it. The form says what a change will do: suspending stops protected actions at once, restoring does not verify, a role change leaves access alone. A suspension uses the danger button.
- **Unchanged:** the focus targets after a change (`account-status-value`, `account-role-value`) and the protection of self and staff accounts.

## Mobile and accessibility

- **Mobile.**
  - The sidebar becomes a forest top band; the section navigation scrolls inside it.
  - Rows become compact cards, three lines in the queue.
  - Controls are 44px.
  - No page overflow from 320px to 1440px, including with very long names and emails. Validation found that a long unbroken account name widened a phone page; titles now wrap.
- **Accessibility.**
  - One h1 per page; each panel is a labelled region.
  - Status, overdue and missing facts are never colour alone.
  - Decisions are named concisely and described by their consequence (validation found the consequence had been folded into each radio's name).
  - Visible focus on rows, jump links and the forest navigation.

## Authorization and photos

- **Re-proved:**
  - signed out → login with a return path;
  - non-staff → the ordinary 404 on every admin page, with no admin data;
  - a moderator sees only the queue and cannot open the overview;
  - non-staff are refused by the admin decision API and photo route;
  - a revoked role blocks a photo at once;
  - a foreign origin cannot decide.
- **The shell is navigation only, never a boundary.** Admin photos keep their private, `no-store` route; nothing passes through the shared image optimizer.

## Sources

- **Kokonut UI** (`bb9120f8`, MIT):
  - **Adapted:** `ai-tool-approval`'s information design. Each choice states its consequence in plain words, and the evidence is kept apart from the decision. No source code and none of its Motion animation were copied.
  - **Rejected:**
    - `hold-button`: hold-to-confirm would replace the existing confirmation, and suits keyboard and screen-reader users poorly.
    - `uptime-card`: it draws daily history, and the console has current state only.
    - `scroll-index`: plain anchors work without JavaScript.
    - `action-search-bar`, `toolbar`, `morphic-navbar`: the search is already a GET form, and the navigation is server-rendered.
- **Bklit** (`7167844`): pie, ring, bar and funnel charts were evaluated for the status counts and the account and enquiry totals. Not used: these are current counts with no history (UI-10's decision against a status chart), and a funnel would imply a conversion that was never measured.
- **Motion:** not used. Queue to review is a server navigation, and a confirmed decision refreshes the page with focus on the new status. Moderation data should stay still.
- **Anime.js:** evaluated; no legitimate timeline or SVG use.
- **Others:** none. No new dependency.

## Bundle

Measured against UI-19 (`a0373a2`), same build settings and data, first load from the served HTML with a staff session:

| Route | JS (gzip) | HTML (gzip) |
|---|---|---|
| Overview | 181.7 → 180.8 KB | 11.9 → 14.2 KB |
| Review queue | 181.7 → 180.8 KB | 13.4 → 12.2 KB |
| Listing review | 221.8 → 221.3 KB | 15.2 → 17.6 KB |
| Listings | 181.7 → 180.8 KB | 16.3 → 13.5 KB |
| Accounts | 181.7 → 180.8 KB | 13.5 → 12.6 KB |
| Account detail | 185.0 → 184.3 KB | 13.3 → 13.4 KB |

The shared stylesheet grew by about 1.4 KB gzip (29.9 → 31.3 KB), which every route loads. Public routes' JavaScript is unchanged (+0.0 KB), and style-diff shows no rendering change outside the admin screens.

## Validation

| Command / check | Result |
|---|---|
| `npm run verify` | lint and typecheck clean; 702 unit tests |
| `npm run build` | passes |
| admin-check | 289 (was 286), for the approved design: the role pill and five destinations; Needs attention (queue, overdue in words, each failing check, the actions); next in the queue in order; status links; queue rows numbered with overdue in words; the attention panel kept when the overview fails; row targets hit-tested at eight widths |
| moderation-check | 65 (was 61): plus jump links with targets, factual checks with no score, each decision described by its consequence, Reject as the danger act; validation, confirmation, busy state, retry, focus after a decision and every authorization path unchanged |
| users-check | 170: filtered rows, the status badge read once, the new empty-search sentence, long names wrapping at 320px |
| dashboard, listing, performance, lead, saved, auth, login (public and signed in), description, preview, draft, photo | all pass |
| phase-e, shots, light, search, home, calculator, shell, motion, ui, pricing, post, notfound, property, media | all pass |
| style-diff (UI-19 → UI-20, 75 screens) | changes on the admin screens only; every public, seller and account screen unchanged despite the shared CSS; login and 404 scenes identical |

**Defects found in validation:**
- The overview lost its system summary when the overview figures could not be read; the attention panel now always renders.
- Each decision radio's accessible name was its whole consequence sentence; the name is now the decision and the sentence its description.
- A long unbroken account name widened a 320px page; row titles wrap.
- A spoken "Status:" added to the rows doubled StatusBadge's own; removed.
- Phone queue rows ran about 175px; the seller and date now share a line.
- Checks updated for the approved design: labels, row structure, headings and the new copy. A stretched row link is measured by its row and hit-tested, never exempted.

## Remaining issues

- **Queue covers:** not shown, by decision (see above).
- **Gallery photos:** the review page's thumbnails load the full private photo, as in UI-11. A sized private route would follow UI-19's pattern.
- **Seller-declared roles and locations** stay unverified and are labelled so; the console makes no verification claim.
- **Dead CSS:** the ~60 UI-13 Home rules remain.

## UI-21 recommendation

Final polish, the last stage of the visual track:
- a cross-site consistency pass over the redesigned pages (spacing, headings, empty and error states);
- the open thumbnail items: Property Details photos at size, and the dashboard and admin gallery thumbnails through sized private routes;
- the dead Home CSS removed with a style-diff proving nothing changes.
