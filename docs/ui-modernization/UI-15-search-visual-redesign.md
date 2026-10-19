# UI-15 — Search results visual redesign

Status: complete, 19 October 2026, on `main`. The second stage of the
visual track, after [UI-14](UI-14-home-visual-redesign.md).

The results page now uses the homepage's design language, and moving from
Home to Search reads as one product. The owner approved it in two reviews:
the redesign (`e4b892a`), then a mobile-card polish (`48aee6b`). Search
behaviour is unchanged: URL state, filters, sort, pagination, save, and
search without JavaScript. The login and 404 scenes are untouched.

## Before → after

| | Before (UI-14) | After (UI-15) |
|---|---|---|
| Frame | Content at 1320px under a 1400px header and footer | The 1400px frame, aligned with header and footer |
| Top of page | Heading, count, Filters and Sort on white | Mint search band: place eyebrow, heading, count with filters applied, Buy/Rent switch, locality shortcuts with real counts |
| Toolbar | Sort select beside the heading | "Showing 1–24 of 59" and Sort as a pill, active filters as outlined chips with Clear all |
| Filter rail | Plain bordered list | White card headed "Filters · N applied", stays beside the results as you scroll; clearer group headings; selected rows tinted, counts as small pills |
| Cards | Photo on top, grey runs of text; horizontal on phones | Homepage card family: framed photo, price first with rate per sqft, name, place, a mint fact panel (bedrooms and baths in fixed columns, carpet area below), construction line, seller and date |
| Pagination | Square buttons | One white bar with round pages; "Previous" / "Next" spelled out from 640px |
| Zero results | Bordered box | The shared EmptyState on a white card; remove-one-filter and nearby-locality options carry their counts |
| Loading / error | Bare skeleton with no header; old frame | Skeleton mirrors the new band, rail and cards, inside the page shell so the header stays; the error card sits on the band's mint |

## Desktop

- A filter rail of 18.5rem and three result columns at 1440px; two at
  1024px.
- The rail stays in view and scrolls inside itself when it is taller than
  the screen.
- Bedrooms and baths line up across a row of cards; the footers line up
  too.
- Hover lifts a card 4px and zooms its photo, as on Home; there is no
  movement under reduced motion.

## Mobile

- **Toolbar:** Filters and Sort share one row. The Sort label truncates
  rather than widening the page.
- **Shortcuts:** the band's locality shortcuts swipe sideways.
- **Card:** vertical, approved in the owner's second review. The first
  version put the photo beside the text, which left a 180px text column
  and cut off seller names and the furnishing/floor line. Now:
  - the photo spans the card at 16:10, chosen so the facts stay on the
    first screen (3:2 in the grid);
  - the card is about 490px tall at 390px;
  - no text is cut off at 360, 390 or 430px;
  - the heart is on the photo, with a 44px target.
- **Header:** "Post property" is an outlined white pill below 640px. The
  bottom bar already carries Sell/Rent, and the filled forest pill
  outweighed the page. Same size and target; forest from 640px.
- **Overflow:** none at any width from 320 to 1440px.

## Behaviour and accessibility

- **Without JavaScript:** results, filter chips (links), Sort (a GET form
  with its own submit button), pagination, Buy/Rent and the shortcuts all
  work. The loading fallback, now with its header, gives way to the
  streamed page as before; ui-check covers this.
- **Focus across remounts (fixed in UI-15; the defect predates it):** a
  filter that moves the URL to another path — one locality's landing page
  to `?loc=…` and back — gives the page a new route segment, and React
  replaces the results frame. Before the fix, the phone Filters sheet
  closed mid-filter and desktop keyboard focus fell to `<body>`.
  - The frame remembers the open sheet, the scroll positions and the
    focused control (filter controls carry `data-restore` keys), and puts
    them back.
  - A sheet put back opens without replaying its entrance (`Sheet`
    `reopened`), with focus on the same control.
  - search-check covers both.
- **Buy/Rent:** links, not tabs, because switching changes the page.
  Localities, type and bedrooms carry over; prices drop, as on Home.
- **Other fixes:** filter chips keep the UI-13 focus hand-off. The error
  state's "Start a new search" was a button inside a link; it is now one
  link.

## Components and libraries

- **New:**
  - `ResultCard` and `ResultCardSkeleton`;
  - `IntentSwitch`;
  - a `pill` variant of `Pagination`;
  - an `outline` tone of `Chip`;
  - a `card` surface and `headingId` on `EmptyState`;
  - `reopened` and `initialFocus` on `Sheet`.
- **Removed:** `PropertyCardSkeleton` and the old responsive layout of
  `PropertyCard`. `PropertyCard` stays the Saved homes card.
- **Kokonut UI:** no new component. SmoothTabs stays on Home.
- **Motion:** not used; CSS transitions on the existing tokens.
- **Anime.js:** not needed. **Bklit:** untouched.
- **Other sources:** none, and no new dependency.

## Bundle and performance

Measured against UI-14 (`13ac3e6`), both built with `npm run build`:

| | UI-14 | UI-15 | Δ |
|---|---|---|---|
| Search, client JS on first load (gzip) | 179.4 KB | 180.8 KB | +1.4 KB: remount restore, Buy/Rent and shortcut links, the new card's client parts |
| Other routes, client JS | | | +0.0–0.1 KB (shared chunk) |
| Shared stylesheet, every page (gzip) | 27.4 KB | 28.1 KB | +0.7 KB |
| Search HTML (gzip, `/buy/kolkata`) | 28.9 KB | 35.7 KB | +6.8 KB, of which 4.3 KB is the loading fallback now carrying the page shell |
| Home and property HTML | | | unchanged |

The fallback's 4.3 KB buys the header staying on screen while the
results stream. It is streamed ahead of every cold Search response. If
that matters later, a lighter fallback header (logo and a placeholder bar
instead of the full shell with its menus) would recover most of it.

Other measurements:
- **Layout shift:** no horizontal overflow and no layout shift from the
  new card; photos keep their reserved boxes.
- **Photo fade:** validation found that the card's hover-zoom rule
  replaced the UI-04 photo fade on Home and results cards, so photos
  popped in. Both transitions now run.
- **Benchmarks:** no 20-run benchmarks; nothing measured a regression
  that called for one.
- **style-diff (UI-14 → UI-15, 75 screens):** login and 404 scenes are
  fingerprint-identical. Outside Search, the only changes are the phone
  header's outlined Post pill and a margin that now reports its resolved
  `auto` value on the guest activity page (no element moved).

## Known remaining issues

- **Gallery:** `media-check` 25/26 (broken-image fallback), from before
  UI-15. Unrelated.
- **Dead CSS:** about 60 obsolete UI-13 Home rules. This was optional
  for UI-15 and is left: some names look dead but are built at runtime
  (`home-map-${i}`, `type-tone-${i}`), so removing them needs its own
  `style-diff --expect-none` pass.
- **No-JS filters:** the filter rail still needs JavaScript. Chips, Sort
  and pagination do not.
- **Other pages at 1320px:** the property page and other pages are still
  1320px under the 1400px header and footer.
- **Loading/error header:** the error state has no header (an error
  boundary cannot render the server-side shell). Loading has one now.
- **`next dev` and CLAUDE.md:** `next dev` appends its own agent-rules
  block to `CLAUDE.md`; keep it out of commits.

## UI-16 recommendation

Property Details visual redesign:

- the 1400px frame;
- a gallery in the framed-photo language;
- a price and facts header using the result card's hierarchy;
- the enquiry panel as a white card beside the content, with a compact
  mobile contact bar.

Keep `PriceDisplay`, `AreaDisplay`, the enquiry form's UI-12 behaviour and
the gallery's keyboard handling. The gallery's broken-image fallback
(`media-check`) fits that stage.
