# Phase D — Mobile navigation bar

**Status:** Implemented on `main` (September 2026), at the client's request. The client asked for the phone bar to follow the six-item model of the 99acres mobile app (Home, Search, Sell/Rent, 99shorts, Activity, Menu), in GharBazaar's own terms and visual system. Only the bottom bar changes, plus the smallest destinations it needs. The 75-phase numbering is unchanged.

## 1. Scope

**In.**

- **The bottom bar**, `components/navigation/BottomNav.tsx` (the same component; no second one), in this order:
  1. **Home**, `/`.
  2. **Search**: the existing results page, `/buy/kolkata`. It is active anywhere under `/buy` or `/rent`, and the URL stays the state.
  3. **Post**: the existing posting flow, `/post`. It is the visually prominent action, a filled circle in the supply accent.
  4. **Videos**: `/videos`, a new, honest placeholder page (see below).
  5. **Activity**: `/account/activity`, a new, minimal hub linking to what exists: saved homes, your enquiries, and enquiries on your listings. It replaces the separate Saved and Enquiries items.
  6. **Menu**: a button that opens the existing marketplace menu (Phase C's discovery hub). It is not a new menu.
- **The header's menu button** appears only where the bottom bar is hidden (`/post`, `/login`, `/admin`, `/property/*`). Elsewhere below 1024px the bar's Menu is the one menu control on screen, the same rule Post follows.
- **Clearance for the bar**: a spacer that includes the safe-area inset. The old fixed 80px spacer was shorter than the bar on phones with a home indicator.

**Out.**

- **The contents of the Menu** (Phase C, and a later marketplace-menu phase), the hero, search, cards, filters, property page and seller dashboard.
- **A video feature.** No listing has a video, and there is no video upload, storage or player. `/videos` says so plainly and offers real next steps. It is `noindex`. It is not a video grid with empty slots or stock footage.
- **Activity's future contents:** recently viewed (Phase 39), contact reveal history (Phase 10, postponed), saved searches (36) and alerts (37). They are not shown as placeholders on the hub. They are listed in `docs/ROADMAP.md`.
- **Notification badges on the bar.** The only real count is a seller's unread enquiries, which belongs to the seller inbox, not to the buyer's Activity item. The Activity hub shows the counts it can state truthfully. The bar shows none.
- **Account in the bar.** It moves out of the bar, because Menu took its slot. It stays one tap away in the header's account control ("Log in" or "Account") on every phone screen, and in the Menu.
- **Desktop.** From 1024px there is no bottom bar. The header is unchanged.

## 2. UX requirements

- **Six equal slots** at 390 and 412px, with labels at 11px and no truncation.
- **Where you are:** a filled pill behind the icon, a bold label and brand green. It is never colour alone, and it is marked with `aria-current="page"`.
  - Activity is current on the hub, on saved homes, on your enquiries and on the seller inbox.
  - Search is current on any results page.
- **Post stays prominent** whether or not it is current. It is a 44px supply-filled circle with a white ring and a pressed state. It stays inside the bar, never lifted over page content.
- **Menu** opens the full-screen marketplace menu. Closing it returns focus to the Menu button.
- **Signed out:**
  - Activity goes through the existing sign-in guard, and back to `/account/activity` afterwards.
  - Post opens the posting flow directly, as it does today. That flow does not require sign-in, and this phase does not change it.
- **Videos** reads as an intentional page, not a broken one: what will be here, why it is empty, and where to go meanwhile.

## 3. Technical requirements

- **`BottomNav`** stays a client component (it needs `usePathname`). It receives the marketplace navigation model from `PageShell` and renders `MarketplaceMenu` with a new `trigger="bar"` variant.
- **`lib/navigation/bottom-bar.ts`** holds one rule for where the bar is hidden. Both the bar and the header's menu button use it, so the two menu controls can never both show or both be missing.
- **`getMarketplaceNav`** is wrapped in React `cache()`, so the header and the bar share one build per request.
- **`/account/activity`** is under `/account`, the existing convention for a signed-in visitor's own pages. That puts it behind the existing proxy guard (`proxy.ts`), with the page's own `getVerifiedUser` check as well. It reads counts only through the existing queries (`listSaved`, `listLeads`, `countUnreadNotifications`). There is no new model.
- **`/videos`:** a static page on `PageShell`, with `robots: noindex, follow`.
- **Icons:** the existing Home, Search, Plus, Heart (Activity, as in the reference) and Menu icons, plus a new `VideoIcon` in the same 24-grid stroke style.

## 4. Data requirements

No new entity, table or fixture. Activity reads the saved-property and enquiry data through their existing queries. The future contents of Activity, and video, are recorded in the ROADMAP registers, against the phases that introduce their models. Video would extend Phase 15's `media_asset`, and it needs a phase in `Phases.txt` first.

## 5. Edge cases

- **Signed out, tapping Activity:** the guard redirects to `/login?next=%2Faccount%2Factivity`.
- **A query fails on the Activity hub:** the link still shows, without a count. No "0" is ever guessed.
- **Zero saved or zero enquiries:** the count reads "None yet", and the link still opens the page's own empty state.
- **Pages without the bar** (`/post`, `/login`, `/admin`, `/property/*`): the header's menu button is shown instead.
  - The 404 page forces the bar, so it hides the header's button too.
- **Phones with a home indicator:** the bar's padding and the page's spacer both include `env(safe-area-inset-bottom)`.
- **A very narrow phone (360px):** six slots of 60px, still at least 44px each.
- **JavaScript off:**
  - Home, Search, Post, Videos and Activity are plain links and work.
  - Menu needs JavaScript, as it did in the header.

## 6. Accessibility requirements

- The landmark is `nav` "Primary".
- Every item has a visible text label, which is its accessible name.
- Menu is a `button` with `aria-haspopup="dialog"` and `aria-expanded`.
- Every item is at least 44×44px (the slots are about 60px tall).
- A visible focus ring comes from the global `:focus-visible`.
- `aria-current="page"` marks the current destination, and it is shown by shape and weight as well as colour.
- The menu dialog keeps Phase C's behaviour: modal, focus trapped, Escape returns focus to the bar's Menu button.
- On `/videos` and `/account/activity`: one `h1`, `h2` sections, and every link at least 44px.

## 7. Responsive requirements

- **390, 412 and 768:** the bar is visible with six items, and there is no horizontal overflow.
- **1024 and 1280:** no bar.
- **Every width:**
  - page content is never hidden under the bar (the last element on the page clears it);
  - the Post circle does not rise above the bar's top edge.

## 8. Verification

- `npm run verify` (lint, typecheck, unit tests) and `npm run build`.
- **`shell-check`**, updated:
  - the six items in order;
  - the current state on Home, Search, Videos and Activity;
  - Post inside the bar, and its fill;
  - Menu opening the hub and returning focus;
  - one menu control per screen;
  - 44px targets;
  - the safe-area spacer;
  - the signed-out redirect from Activity;
  - Saved and Enquiries reachable from Activity;
  - no bar at 1024 or 1280.
- **`notfound-check`** is updated for the new bar.
- **`auth-check`** and **`saved-check`** are re-run, with sign-in against the simulator.
- Before-and-after captures at 390, 412 and 768.

## 9. Production readiness

- **Videos** needs a real phase in `Phases.txt`: upload, transcoding, storage and a player. Until then the page stays `noindex` and says nothing is there.
- **Activity** gains sections as Phases 36–39 ship, each backed by its own table.
- **A buyer notification count** for the Activity item needs a buyer-side notification model. It does not exist yet.
- Real-device checks on iOS Safari (safe area) are still owed. Only Chromium is available here.
