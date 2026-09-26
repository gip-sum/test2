# Phase A — Marketplace navigation and shell

**Status:** Implemented on `main` (September 2026), at the client's request, after a UX review against larger Indian property portals. It changes the application shell from Phase 1 and the quick routes from Phase 2. The 75-phase numbering is unchanged.

The aim is that a first-time visitor, on any screen, can see straight away that this is a whole property marketplace, and where to buy, rent, explore localities, plan a loan and post a property. The shell does this in GharBazaar's own design language, without copying another portal's branding, layout, wording or icons.

## 1. Scope

**In.**

- **Header, in three tiers:**
  - *Phones (< 768px):* logo, account, and a menu button.
  - *Tablets (768–1023px):* logo, a condensed Buy · Rent · Localities nav, account and the menu button.
  - *Desktop (≥ 1024px):* logo; Buy, Rent, Localities and Home loans, each a link with a disclosure panel of real destinations; Post property as the supply-side call to action; account.
- **The marketplace menu:** a full-screen sheet on phones and a centred dialog on tablets. It holds every destination the product has. It opens from the header's menu button and from "View all" on the quick routes.
- **Quick routes:** the same four (Buy, Rent, Localities, Post property), in one consistent treatment, plus "View all".
- **Bottom navigation:** the same six items in the same order, with an active state that no longer depends on colour alone.
- **One navigation model:** `lib/navigation/marketplace.ts` builds every destination from the existing data seams and URL builders, so the header, menu and quick routes cannot disagree.

**Out.**

- **Projects, Agents, Builders and Insights/price trends.** None of these pages exists, and there is no pattern for marking a future destination. A link to a placeholder would claim what the platform does not have. Each one is listed, with the phase that makes it real, in "Navigation destinations waiting on their phase" in `docs/ROADMAP.md`. Adding one later is one entry in the navigation model.
- **The homepage hero, the search panel, property cards, and the header search that appears on scroll.**
- **Account dropdown, unread badges, and a signed-in avatar.**

## 2. UX requirements

- **Every destination is a real, working route.** A type, bedroom or budget link appears only when that intent has inventory behind it, so no navigation link leads to an empty result page.
- **Post property appears once per screen.**
  - Below 1024px it is the bottom bar's centre action.
  - From 1024px, where the bottom bar is gone, it is the header's filled supply button.
  - It keeps the supply accent (`supply-600`): the design system reserves brand green for the buyer's actions, so the two sides of the marketplace are never confused.
- **No text-link row on phones.** The header's redundant "Home" link is removed, because the logo and the bottom bar both go home. The menu button reaches everything else, including on pages that hide the bottom bar (posting, sign-in, a property).
- **Desktop panels:**
  - A panel opens on click, tap or Enter, never on hover.
  - It closes on Escape (focus returns to its button), on a click outside, when focus leaves the navigation, when another panel opens, and on navigation.
  - The top-level word stays a link to the main results, so Buy is still one click away.
- **Current place:** the section you are in is marked in the header and the bottom bar by a shape (an underline bar, or a pill behind the icon) and a heavier label as well as colour, and by `aria-current`.
- **Quick routes:** discovery tiles share one brand tint and Post keeps the supply tint, so the row reads as "find" and "list". "View all" sits where the homepage's section heads put "See all".

## 3. Technical requirements

- **`lib/navigation/marketplace.ts` (server):**
  - Builds sections from `getPopularLocalities`, `FILTER_SLUGS`, `buildLandingUrl` and `searchProperties` (for inventory).
  - Links use `buildLandingUrl`, the same pretty landing URLs the footer emits.
  - No component imports it on the client. Client components import only its types, so no fixture or query code reaches the browser bundle.
- **`AppHeader` (server):** builds the model and passes it to two client components:
  - `HeaderNav` (disclosure panels, active state from `usePathname`);
  - `MarketplaceMenu` (a trigger plus the existing Radix-based `Sheet`, which already provides the focus trap, Escape, scroll lock and focus return).
- `QuickRoutes` stays a server component and renders a `MarketplaceMenu` trigger for "View all". Each trigger owns its own sheet, so there is no global state.
- `BottomNav` keeps its items and hiding rules. Only its active styling changes.
- **Landmark names:** the header's nav is "Marketplace", the bottom bar stays "Primary", the menu's nav is "All destinations", and the quick routes stay "Quick routes".

## 4. Data requirements

None new. The navigation reads the location tree and the property corpus through their existing seams. No entity, table or fixture is added.

## 5. Edge cases

- **An intent with no inventory for a slug:** the link is left out, not shown disabled.
- **Signed out vs signed in:** the account control keeps its current behaviour ("Log in" / "Account").
- **Localities link on the homepage itself:** `/#localities` scrolls in place. The sheet closes first, so the section is not scrolled behind an open dialog.
- **Pages without a bottom bar** (`/post`, `/login`, `/property/*`): the header's menu button still reaches every destination below 1024px.
- **Very narrow screens (320px):** logo, account and menu fit on one row without wrapping.
- **JavaScript off:**
  - The header's top-level links still work. Panels and the menu need JavaScript.
  - On phones the bottom bar and the quick routes remain.

## 6. Accessibility requirements

- **Semantics and keyboard:**
  - Semantic `<nav>` landmarks with unique names.
  - Disclosure buttons carry `aria-expanded` and `aria-controls`.
  - Closed panels are `hidden`, so they are out of the tab order and the accessibility tree.
- **Names and targets:**
  - Icon-only controls have an accessible name, for example "Menu" and "More in Buy".
  - Every interactive target is at least 44×44px.
- **Visible focus** on every control, from the global `:focus-visible` ring.
- **Current state** is exposed by `aria-current` and shown by shape and weight, not colour alone.
- **Menu dialog:** it is modal, titled, traps focus, closes on Escape and returns focus to the control that opened it.

## 7. Responsive requirements

At 390, 412, 768, 1024 and 1280:

- no horizontal overflow;
- the header is a single row that never wraps;
- no nav label breaks across lines.

The tier boundaries are 768px (condensed nav) and 1024px (full nav with panels, bottom bar gone). A 360px screen is also checked.

## 8. Verification

- `npm run verify` (lint, typecheck, unit tests) and `npm run build`.
- `npm run shell-check`, a new browser check:
  - the header tiers at each width;
  - one header row and no overflow;
  - Post property shown once;
  - 44px targets;
  - disclosure keyboard behaviour (open, Escape returns focus, focus-out closes);
  - every navigation link resolves to a 200;
  - the menu sheet opens from both triggers and traps focus;
  - `aria-current` and the non-colour indicators;
  - no Projects, Agents or Insights links.
- The existing checks are updated where they asserted the old header (`home-check`, `post-check`), and run with the rest of the suite.
- Before-and-after screenshots at 390, 412, 768, 1024 and 1280.

## 9. Production readiness

- **Adding a destination:** Projects, Agents and Insights join the navigation model when their phases ship. The register in `docs/ROADMAP.md` names them.
- **Header search on scroll** is still owed from the design system's AppHeader rules and belongs with a search-phase change.
- **Unread counts on Enquiries** wait on Phase 9's notification work.
