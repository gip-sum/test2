# UI-19 — Account, Saved and Enquiries inbox visual redesign

Status: complete, 22 October 2026, on `main`. The sixth stage of the visual
track, after [UI-18](UI-18-seller-dashboard-visual-redesign.md).

Three pages, three jobs: Account is identity, details and tools; Saved is
the homes a buyer cares about; Enquiries is the seller's work queue. The
owner approved all three in one review (Stage A, `6c95ae7`).

Unchanged: auth (email and Google), the schema, enquiry rules and the three
lead statuses, the unread calculation (`countUnreadNotifications`), seller
permissions, save semantics, listing lifecycle, moderation and analytics.

## Before → after

| | Before | After |
|---|---|---|
| Inbox | A stacked list of enquiry cards, each with a status select | The list beside the open enquiry from 1024px; on a phone the list, then the enquiry on its own page |
| Lead status | A select and a button per card | Three visible radio choices and one Update status, on the open enquiry |
| Saved | The old property card for demo homes, a text card for real listings | The UI-15 results card for both, under a mint band with the count |
| Saved, empty | One line and Browse properties | A short explanation, Browse homes for sale and Browse homes to rent |
| Account | A profile form beside four cards of links and facts | An identity band, grouped settings rows, Profile, Sign-in & security |

## Enquiries inbox

**Architecture.** Server-rendered. The open enquiry is `?enquiry=<id>`,
beside the existing `?listing=<id>` filter, so back, refresh, a shared link
and no-JavaScript all land on the same enquiry. With nothing chosen the
newest is open. No client selection state.

**Desktop (1024px and up).** The list (22–25rem) beside the open enquiry,
which stays in view while the list scrolls. A chosen enquiry is
`aria-current`; the newest, open by default, is marked visually there only.

**Phone.** The list is the page and nothing is marked open. Choosing an
enquiry opens it on its own page with an "All enquiries" link back; the two
are never squeezed side by side.

**Rows.** One link per enquiry: state, buyer, date, property, a Follow-up
tag where the same number wrote before, and two lines of the message (or
"No message — the buyer left their number").

**New, contacted, closed.** One language, never colour alone:

| State | Mark | Row |
|---|---|---|
| New | Filled pill with a dot | Buyer and message in bold |
| Contacted | Outlined pill with a tick | Regular |
| Closed | Subdued grey pill | Regular |

**Open enquiry.** State and received time (IST), the buyer's initial, name
and number, the message as the largest block, then the property, quieter:
cover, status, title, place, price, View listing and All enquiries for this
listing. Then the lead status: the same server action and the same three
values, as radio choices with Update status named for the buyer.

**Unread.** The bar above the list is `countUnreadNotifications`, the
figure the sidebar and the dashboard header show; dashboard-check compares
all four. It shows only while something is unread. Mark notifications read
is unchanged.

## Saved

- **One card family.** `ResultCard` takes a demo summary or a real
  listing's `ResultCardData` (the fields it displays, its link and what its
  heart saves), so Search, Similar and Saved show a home the same way:
  cover, price (`PriceDisplay`), title, place, facts (`AreaDisplay`) and the
  filled heart.
- **Real listings.** `getPublishedCards` reads the public submissions and
  photos of every saved listing in three batched reads, only for listings
  public now; `cardOfListing` maps them, with nothing the seller did not
  give.
- **Unavailable.** A saved listing that is not public keeps its place, with
  a no-photo frame, why, and its heart to remove it.
- **Removal.** Unchanged from UI-12: immediate, no confirmation; announced;
  focus to the next heart, else the count or the empty state; the remaining
  cards slide with the FLIP; still under reduced motion.
- **Empty.** What the shortlist is for, where the hearts are, and Browse
  homes for sale / to rent. No suggested homes.

## Account

- **Identity band:** an initial avatar, name, email, and Member since only
  when the date is known.
- **Your activity:** Saved homes, My enquiries, Activity. **Selling:** My
  properties, Seller inbox, Post a property. One white list per group, each
  row a 64px link, like a phone's settings.
- **Counts** appear only where their query answered, through
  `lib/account/counts` — the Activity hub uses the same helper and the same
  reads, and auth-check compares the two pages.
- **Profile:** the UI-12 form, unchanged. **Sign-in & security:** email and
  its confirmation, how you sign in, created, last sign-in, Log out.
- The page no longer nests a `<main>` inside the shell's.

## Photos at card size

Public listing photos come from `/api/listings/[id]/photos/[photoId]`, which
checks on every request that the listing is still public and answers
`no-store`. Stage A sent the inbox thumbnail and Saved photos through the
shared image optimizer; validation found that the optimizer makes its copy
publicly cacheable for hours, so a withdrawn listing's photos — or one
removed in moderation — would outlive it. That is why such endpoints bypass
the optimizer (`PropertyMedia.authenticated`).

The route now resizes itself: `?w=` (the widths `next/image` requests,
`lib/listings/photo-widths`, kept equal to `next.config` by a test) returns
a re-encoded JPEG at that width, after the same check and still `no-store`.
A `next/image` loader points the srcset at it. Thumbnails stay small (the
inbox's is 1.4–4.6 KB instead of 30 KB), and a listing that leaves public
view stops serving its photos at once (performance-check).

## Sources

- **Kokonut UI** (`bb9120f8`, MIT): evaluated, not used.
  - `notification-stack`: stacks enquiries behind each other and implies a swipe-to-dismiss the product does not have.
  - `smooth-drawer`: would replace a detail view that works through the URL, without JavaScript, with back and refresh.
  - `profile-dropdown`, `stack-panel`, `status-island`: no matching need; `avatar-picker`: no avatar feature.
  - `smooth-tab`, `morph-popover`, `metric-card`: rejected as in UI-18.
- **Motion:** evaluated, not used. Saved removal already reflows with the UI-12 FLIP (Motion's layout measured +42.6 KB in UI-08); the inbox moves by server navigation.
- **Anime.js:** evaluated; no legitimate timeline or SVG use.
- **Bklit:** not applicable; the UI-18 chart is untouched.
- **Others:** none. No new dependency (`sharp` was already one).

## Bundle

Client JavaScript on first load, measured from the served HTML with a
session against UI-18 (`287ce3c`, same simulator): **+0.0 KB gzip on every
route** (Home, Search, Property, Post, dashboard, performance, admin,
Account, Saved).

**Inbox against UI-18.** UI-18 never recorded `/dashboard/enquiries`, so the
UI-18 commit was built and served beside UI-19 on the same data:

| `/dashboard/enquiries` | UI-18 | UI-19 |
|---|---|---|
| JavaScript (15 files, gzip) | 182.5 KB | 182.1 KB |
| CSS (gzip, shared) | 29.6 KB | 29.9 KB |
| HTML markup (gzip) | 3.5 KB | 4.5 KB |
| RSC payload in the HTML (gzip) | 8.5 KB | 9.4 KB |
| Property cover | none | 1.4 / 3.0 / 4.6 KB at 1× / 2× / 3× (the original is 30 KB) |

The 182 KB is the shared framework and workspace shell that every seller
route loads (the dashboard is 185 KB); UI-19 added no client code to the
inbox. What it added is the open enquiry in the HTML (+1.7 KB gzip) and the
thumbnail. Account and Saved: JavaScript −0.9 KB (the old Saved card's chunk
is gone), HTML +1.3 and +1.0 KB gzip.

## Validation

| Command / check | Result |
|---|---|
| `npm run verify` | lint and typecheck clean; 702 unit tests (new: batched saved-listing reads and the card adapter, the shared count wording, photo widths kept equal to `next.config`, route resizing) |
| `npm run build` | passes |
| dashboard-check | 176 (was 143): the inbox as approved — newest open, URL selection, refresh and back, `?listing=` kept, phone list and enquiry with All enquiries, state in words, property context and route-sized cover, one unread figure across inbox, sidebar and dashboard, the status radios, keyboard, no-JS, another seller seeing nothing even by URL, every width 320–1440 |
| lead-check | 42: the assigned follow-up row, Mark notifications read, the status changed through the radios and seen by the buyer |
| auth-check | 71: identity band, grouped rows, no nested `<main>`, Member since only when known, Account and Activity counts equal, rows at 320–430 |
| performance-check | 229: a saved real listing is the results card with a route-sized photo, `no-store`, an unoffered width refused, and the photo gone the moment the listing leaves public view |
| saved-check | 24: save, unsave, focus, announcement, FLIP reflow, reduced motion, failure, empty state |
| login-check (public and signed in), notfound, shell, ui, motion, light, search, home, property, calculator, pricing, post, media, phase-e, listing, moderation, users, admin, description, preview, draft, photo, shots | all pass |
| style-diff (UI-18 → UI-19, 75 screens) | changes only on Account, Saved and the inbox; elsewhere four admin date captions whose text changed between capture days; login and 404 scenes identical |

**Defects found in validation:**
- Inbox and Saved photos went through the shared image optimizer (above); the route now sizes them.
- Checks updated for the approved design: the lead status is radios, the unread bar hides at zero, and the user's address appears in the band and the security panel.
- dashboard-check read the live region in the 50ms between focus moving and the sentence being written (`announce` clears first so a repeat is heard); on a freshly started server it failed every time. It now waits for the sentence.

## Remaining issues

- **Property page gallery:** real listings' gallery photos still load at full size (`authenticated`, unoptimized); they could use the route's `?w=` widths.
- **Dashboard covers:** the owner photo endpoints still have no thumbnail size (from UI-18).
- **Inbox:** no reply channel by design (the platform has no messaging); the seller calls or messages the number themselves.
- **Dead CSS:** the ~60 UI-13 Home rules remain.

## UI-20 recommendation

Admin visual redesign (the next stage in the roadmap's visual track): the
review queue, listing review, accounts and overview in the 1400px workspace
language of UI-17 to UI-19, with the UI-11 behaviour (busy, focus,
validation, authorization) unchanged.
