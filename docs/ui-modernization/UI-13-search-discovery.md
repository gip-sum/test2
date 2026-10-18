# UI-13 — Search and discovery controls

Status: complete, 18 October 2026, on `main`. Builds on UI-01 to UI-12
([UI-12](UI-12-buyer-forms.md)).

UI-13 brings the remaining search and discovery controls onto the shared
primitives and the focus rules, without redesigning Search or Home.

- **The locality picker** is one accessible combobox at every width:
  - arrows, Enter and Escape work;
  - picks and match counts are announced;
  - it is 16px;
  - the phone sheet opens with focus in the field.
  
  The phone version was a text box over tabbable buttons marked as options.
- **Filter toggles** share one `ToggleChip`. The results rail's copy was
  40px and showed "pressed" by colour alone.
- **Focus is kept when controls disappear:**
  - removing a filter chip moves focus to the next chip, or the result count;
  - Clear all keeps focus in place;
  - nothing a press can empty is natively disabled.
- **The `home-check` local failure was a product bug.** Clear all in More
  filters disabled itself while it had focus. That sent focus into the
  dialog behind it, and Escape then closed neither dialog. It is fixed,
  and `home-check` passes locally.
- **Read more** is a disclosure that makes sense out of context. Without
  JavaScript the whole description shows.
- **The Home search launcher** becomes a link to the results without
  JavaScript. Before, it did nothing.
- **iPhone zoom:** Sort, the price and area fields, the date field and the
  locality field are now 16px.
- **Handwritten buttons:** 27 → 19.

Unchanged:
- URL-driven search and filters, server-first rendering, filter semantics;
- the Buy/Rent SmoothTabs;
- the location data model;
- the Bklit analytics.

No new dependency, no Motion, no new Kokonut component, no Anime.js.
The login and 404 scenes are untouched.

---

## 1. Scope

In:
- the Home search panel and More filters;
- the locality picker;
- the results page's filter rail, sheet, chips, Clear all and Sort;
- the search fields;
- header and menu disclosures (audit);
- Read more;
- the `home-check` local failure.

Out:
- redesigns;
- the gallery and its `media-check` failure (left for a media stage);
- making the filter rail work without JavaScript (§10).

## 2. Audit findings (UI-12 state)

| Area | Finding |
|---|---|
| Locality picker, phone | The input was not a combobox. Options were tabbable `<button role="option">`s inside a `listbox`, so a screen reader announced a listbox the arrow keys did not move through, and Tab visited 20 options. Nothing said a locality had been added. The sheet's `autoFocus` lost to Radix, which focused Close. |
| Locality picker, both widths | 15px input, so iPhone zoomed on focus. Long names were truncated. Removing a chip dropped focus to `<body>`. The desktop list could not be closed with Escape inside the Home search sheet: the sheet closed instead. |
| Filter toggles | Two copies: Home's (44px, tick, 2px border) and the results rail's (40px, colour-only pressed state, natively `disabled` at zero results). |
| Clear all | Home's More filters disabled the button as soon as it had cleared, while it had focus. The results sheet's copy was a separate button; clearing removed it and dropped focus. |
| Chips | Every remove control unmounted with its chip, so focus fell to `<body>`. |
| Sort, range and date fields | 13px, so iPhone zoomed on tap. |
| Read more | `aria-expanded` and 44px were already in place, but its name was the generic "Read more", and without JavaScript the text stayed clamped behind a dead button. |
| Home launcher | A sheet trigger: without JavaScript the first-screen search did nothing. |

## 3. Search panel (Home)

- **More filters, Search and Clear all are on `Button`.**
  - Their looks are kept: the More filters count badge, the filled Search,
    and Clear all on the tertiary variant.
  - More filters and Clear all are `type="button"`, because a `Button` in
    a form defaults to submit.
- **Clear all is `aria-disabled` while there is nothing to clear,** not
  `disabled`. The press is refused and focus stays (§11).
- **Chips:** the chosen-filter chips are a `data-chip-group`. Removing one
  moves focus to the next chip, or to More filters after the last.
- **The toggles inside More filters are the shared `ToggleChip`.**
- **Without JavaScript,** the launcher (a sheet trigger) is replaced by a
  link, "Search homes for sale in Kolkata", to `/buy/kolkata`. There the
  results, chips, sort and pages all work without JavaScript (UI-06).
- **The Buy/Rent SmoothTabs and the URL-building submit are unchanged.**

## 4. Locality picker

`components/search/LocationField.tsx`. The same `Combobox` serves the
desktop inline field and the phone sheet.

**Keyboard and screen reader.**
- The text box is `role="combobox"` with `aria-expanded`,
  `aria-controls`, `aria-autocomplete="list"` and `aria-activedescendant`.
  Focus never leaves it.
- **ArrowDown and ArrowUp** move the active option, which scrolls into
  view.
  - Inline, the first suggestion starts active (Enter picks it, as
    before).
  - In the touch-first sheet, nothing looks chosen until the arrows move.
- **Enter** adds or removes the active option and never submits the search
  form.
- **Escape:** the first press closes the suggestions (inline) or clears the
  search (sheet, where suggestions are always shown). The next press clears
  the text (inline) or closes the sheet.
  - `Sheet` now leaves Escape to a combobox that still has something to
    dismiss. Inside the Home search sheet, Escape used to close the whole
    sheet.
- **Backspace** in an empty field removes the last chosen locality.
- **Options are list items, not buttons:** no tab stops. A tap or click
  toggles one without taking focus from the text box (mousedown is
  cancelled).
- **A polite status announces:**
  - "3 localities found." while typing;
  - "No locality matches zzzz." when nothing matches;
  - "Salt Lake added. 1 locality chosen." or "… removed …" on a pick.
  
  A visually hidden hint explains the keys.
- **The phone trigger:**
  - it announces `aria-haspopup="dialog"`;
  - its name includes the choice ("Localities: Salt Lake, New Town"),
    because the count badge was not announced;
  - Escape returns focus to it.

**Fields and touch.**
- The field is 16px (it was 15px), with `autocomplete="off"` (the
  suggestions are ours), `spellcheck=false` and `enterkeyhint`.
- The sheet opens with focus in the field: `Sheet` focuses a
  `[data-autofocus]` element on open instead of Close.
- Options are 52px tall in the sheet and 44px inline.
- Long names wrap instead of truncating, so two similar localities stay
  distinguishable. "Uttarpara Kotrung" fits at 390px with no sideways
  scroll.

**Empty and focus states.**
- Under two letters, a prompt shows. With no match, a message shows and is
  announced.
- Removing a chosen locality's chip moves focus to the next chip, or back
  to the field after the last.

The location data and lookup (`searchLocations`) are unchanged.

## 5. Search fields

| Field | Name | Size | Other |
|---|---|---|---|
| Locality (inline / sheet) | "Search localities in Kolkata" / "Search localities", with a hint | 16px, 48px row | combobox, no autofill, Enter picks |
| Sort | "Sort results" | 16px, 44px | a GET form with a no-JS Sort button (UI-06); widens to 16rem and wraps at narrow widths |
| Price / area min–max | legend plus field ids | 16px, 44px | commit on blur or Enter (unchanged) |
| Posted since | its label | 16px, 44px | — |

Basic search never needs JavaScript:
- the Home launcher falls back to a link;
- the results page streams in full (UI-06).

## 6. Filters

- **One `ToggleChip`** (`components/ui/ToggleChip.tsx`) for More filters
  and for the rail and sheet:
  - 44px tall;
  - pressed shown by fill, 2px border, tick and weight;
  - the count in the chip;
  - `unavailable` (zero results) is `aria-disabled` with the press refused,
    never `disabled`.
- **Check rows** in the rail (localities, type, furnishing…) keep their
  look. They also changed from `disabled` to `aria-disabled`: a row pressed
  off can come back with a zero count, and disabling it under the keyboard
  dropped focus.
- **Clear all is one component**, `ClearAll` in `SearchLayout`, beside the
  chips and in the sheet:
  - a link to the unfiltered URL, so it works without JavaScript beside the
    chips;
  - a plain click keeps the in-place transition;
  - before clearing, it moves focus to the result count, or to the sheet's
    body inside the sheet.
- **Chips beside the results** (links since UI-06) now hand focus on:
  - to the next chip;
  - after the last, to the result count (`#results-count`). It is focusable
    and live, so the new count is read out.
- **Filter semantics, URL grammar, counts and "dim, don't blank" are
  unchanged.** No URL update waits for an animation.

## 7. Filter accessibility (tested)

| Behaviour | Check |
|---|---|
| Removing a chip by keyboard → focus on the next chip | `search-check` |
| Removing the last chip → focus on the result count | `search-check` |
| Clear all by keyboard → focus on the result count | `search-check` |
| A rail toggle pressed by keyboard keeps focus and reads pressed | `search-check` |
| Every visible rail toggle ≥ 44px; no natively disabled filter control | `search-check` |
| Phone: the sheet's Clear all keeps focus inside the open sheet; Escape closes it and focus returns to Filters | `search-check` |
| Home More filters: Clear all unavailable but focusable; after clearing, focus stays on it inside the sheet | `home-check` |
| Sheet focus, Escape and reduced motion (UI-04) | `motion-check` 101, unchanged |

## 8. Disclosure decision: no shared primitive

| Control | Semantics | Verdict |
|---|---|---|
| Header section toggles (`HeaderNav`, one per section) and Explore all | popover disclosures, one open at a time, closed by Escape (focus back), an outside click or focus leaving | already share one implementation in `HeaderNav` |
| `MarketplaceMenu` triggers ×3 | open a modal dialog (`aria-haspopup="dialog"`) | dialog triggers, not disclosures |
| Menu categories | `aria-pressed` category switcher | not a disclosure |
| Home banner dots | carousel picker | not a disclosure |
| Filter groups | native `<details>` | the platform's disclosure |
| Read more | inline expand of text in place | one use |

Fewer than three controls genuinely share the same semantics and behaviour.
The two that do already share one implementation. A shared `Disclosure`
would force different behaviours (popover vs inline, exclusive vs
independent) into one abstraction, so none was built.

## 9. Read more

`components/property/DescriptionBlock.tsx`.

- **The shared `text` Button,** kept to its old look (no underline until
  hover, brand colour, chevron). 44px tall, and `type="button"`.
- **Accessible name:** "Read more of the description" / "Show less of the
  description". The words carry the state, as does `aria-expanded`, plus
  `aria-controls` to the paragraph.
- **The state is obvious without animation:**
  - the label changes;
  - the chevron flips (instant under reduced motion, through the global
    reduced-motion rule);
  - the text expands.
  
  Only the expected text expansion moves layout.
- **Keyboard:** Enter and Space toggle it, and focus stays on it.
- **Without JavaScript,** a `<noscript>` style shows the whole description
  and hides the button, which could never open it. The text stays in the
  DOM either way, so find-in-page works.

## 10. No-JS behaviour

| Surface | Without JavaScript |
|---|---|
| Home search launcher | **new:** link to `/buy/kolkata` |
| Results page: results, chips, Clear all beside chips, Sort, pages | works (UI-06), unchanged |
| Read more | **new:** the whole description, no dead button |
| Filter rail and sheet, locality picker | still need JavaScript, as recorded in UI-06 |

Making the rail work without JavaScript needs real checkboxes in a GET
form. That in turn needs the search route to accept the form's
`bhk=2&bhk=3` grammar alongside its own `bhk=2,3`: a URL-grammar change.
It is outside this stage's "preserve where already supported" scope and is
recommended in §20.

## 11. `home-check` root cause

**Symptom.** Locally, `home-check` stopped at line 200, waiting for the
locality field. In CI it passed.

**Cause: a product bug.** Clear all in Home's More filters had
`disabled={filterCount === 0}`. Pressing it emptied the filters, so the
button disabled itself while it had focus. A probe recorded the sequence:
1. Focus left the More filters dialog for the content of the "Find your
   home" dialog behind it.
2. The next Escape reached the Sheet listeners with a target in the parent
   dialog's content, so neither the child nor the parent closed it.
3. The child sheet stayed open. Its modal `aria-hidden` and `inert` hid the
   form, so the next locator waited forever.

Whether focus lands in the parent dialog or on `<body>` after a focused
control is disabled depends on timing and the browser build. That is why
CI passed.

**Fix.**
- Clear all is a `Button` with `aria-disabled` (refused, focus kept).
- The same rule is now applied to every filter control.
- The check now asserts the new behaviour: unavailable but focusable, and
  focus stays inside the sheet after clearing. No timeout changed.

**Result:** 143/143 locally.

## 12. Button count

- Baseline **27**, migrated **8**, remaining **19**.
- Ceiling 27 → 19 in `lib/design/button-count.test.ts`.

| Migrated | How |
|---|---|
| `SearchPanel` More filters, Search, Clear all | `Button` |
| `SearchPanel` and `FilterControls` ToggleChip copies | one `components/ui/ToggleChip` (a shared primitive, like `Chip`) |
| `SearchLayout` sheet Clear all | the same `ClearAll` link as beside the chips |
| `LocationField` option buttons | combobox options (`li role="option"`): they were never meant to be tab stops |
| `DescriptionBlock` Read more | `Button variant="text"` |

| Remaining | Count | Why |
|---|---|---|
| Navigation toggles (`MarketplaceMenu` ×5, `HeaderNav` ×2) | 7 | dialog triggers, category switcher, popover disclosures with their own styling |
| Gallery controls | 6 | media controls; media stage |
| Home banner dots and search launcher (`HomeHero`) | 2 | carousel picker; a field-shaped dialog trigger |
| Locality field trigger (`LocationField`) | 1 | field-shaped dialog trigger |
| Filter check row (`FilterControls`) | 1 | a list-row toggle with a count; one component |
| Save heart | 1 | specialised busy toggle |
| Delete listing | 1 | danger outline, one use |

## 13. Kokonut, Motion, Bklit, Anime.js

| Library | Decision |
|---|---|
| **Kokonut** | None adopted. The pinned source (`bb9120f`) offers `action-search-bar`: a 1,134-line, single-select command palette using Motion's `animate`. Its rows are 36px, and `aria-selected` marks the highlight rather than a choice. It does not fit a multi-select locality picker. The problems found here were semantics and focus, fixed in the existing component. SmoothTabs remains the only adapted Kokonut component. |
| **Motion** | Not used. No new animation; the chevron is the existing CSS transition. |
| **Bklit** | Untouched; analytics isolated (dashboard chunks unchanged apart from the shared split below). |
| **Anime.js** | Not installed. |

## 14. Mobile

| Width | Result |
|---|---|
| 320–430, 768, 1280 | `shots`: no horizontal overflow at any width. `search-check`: overflow and rail/sheet layout at 390, 412, 768 and 1280. `home-check`: overflow and CLS at 390, 412, 768, 1024 and 1280. |
| Fake zoom | Every search and filter text control and select is 16px (`search-check`, `home-check`) |
| Targets | Toggles ≥ 44px; chip removes 44px; Clear all 44px; Read more 44px; picker options 52px / 44px (`ui-check` 128, `search-check`, `property-check`) |
| Picker | Long names wrap with no sideways scroll at 390px (`home-check`) |
| Header and bottom navigation | `shell-check` 355, unchanged |

## 15. Bundle and performance (vs UI-12)

**Client JS.** From served HTML, gzip, two builds side by side:

| Route | UI-12 | UI-13 | Δ |
|---|---|---|---|
| Home, 404 | 181.37 KB | 182.93 KB | +1.57 KB |
| Search ×3 | 182.40 KB | 183.68 KB | +1.27 KB |
| Property | 182.89 KB | 183.09 KB | +0.20 KB |
| Login | 174.69 KB | 174.81 KB | +0.11 KB |
| Seller dashboard (owner) | 185.58 KB | 187.15 KB | +1.57 KB |
| Account / Saved (owner) | — | — | +0.12 / +0.09 KB |

**Why Home grew.**
- Raw JS on Home grew 2.1 KB: the combobox's keys, announcements and
  hint, the chip focus hand-off, `ToggleChip` and the no-JS launcher.
- Webpack also moved the modules Home and Search share into a new chunk
  (`Chip`, `ToggleChip`, the card photo, the save heart, the property
  labels). That shrank Home's page chunk by 2.3 KB and added the 3.8 KB
  chunk. Splitting compresses worse, which is why gzip grew 1.57 KB on
  2.1 KB raw.

**404 and the dashboard.**
- They pay the same amount because they already load Home's page chunk
  (true in UI-11 and UI-12 as well), which now depends on the shared
  chunk. Login does not load it and is unchanged.
- No search, combobox or filter code reached Login. The dashboard's own
  chunks, and the Bklit chart, are unchanged.

**Runtime.** 390px, 4× CPU, 9 interleaved runs (medians):

| | UI-12 | UI-13 |
|---|---|---|
| TBT: Search / Property / Login / 404 / Dashboard | 302 / 271 / 260 / 250 / 257 ms | 318 / 259 / 274 / 270 / 242 ms |
| Filter sheet: keyboard toggle → results applied | 524 ms | 515 ms |
| Filter sheet: longest event | 96 ms | 104 ms |

All are within noise. Home first paint read 196 → 304 ms in that run. The
21-run Home comparison used in UI-12 settled it: UI-13 is no slower.

| Home (21 runs) | UI-12 | UI-13 |
|---|---|---|
| FCP | 300 ms | 256 ms |
| TBT | 409 ms | 380 ms |

## 16. Protected areas

- **Login and 404 scenes:** style-diff reports markup, `@keyframes` and
  timing identical on every login and not-found screen. `login-check`
  117 / 179 and `notfound-check` 36 pass.
- **Auth architecture and UI-07 return paths:** untouched. `auth-check`
  63/63, including the crafted return paths; the `safeReturnPath` unit
  tests pass.
- **Bklit analytics, seller and admin logic:** untouched.
  `performance-check` 225, `dashboard-check` 124, `admin-check` 286,
  `users-check` 170 and `moderation-check` 61 pass.

**Style-diff (UI-12 → UI-13).** The results filter sheet was added as a
screen. Every difference is explained:
- **Rail and sheet toggles:**
  - 40 → 44px (everything below them moves down);
  - padding 14 → 16px;
  - border `border-subtle` → `border-strong`;
  - count weight 500 → 400;
  - pressed: 2px border, `brand-600` → `brand-700` text, and a tick.
- **Sort, range and date fields:** 13 → 16px. The wider select moves the
  sort form's margin.
- **The sheet's Clear all:** a button → the same 44px link pill as beside
  the chips.
- **Search and Read more buttons:** the shared Button's 1px transparent
  border and colour transition; boxes unchanged.
- **Read more:** an sr-only span added.
- **Unchanged elsewhere:** the hero image URL differs by server port.
- **Noise:** card-image transitions on `home @390` appeared only with a
  cold image cache on the baseline server, and were gone when recaptured
  warm.

## 17. Tests and checks

| Check | UI-12 | UI-13 |
|---|---|---|
| `npm run verify` | 672 | **675** (`ToggleChip` ×2, Chip removal hook) |
| `home-check` | failed locally at line 200 | **143**, passes locally |
| `search-check` | 65 | **74** |
| `property-check` | 67 | **73**, now in CI |
| Rest of the suite | — | all unchanged: phase-e 64, moderation 61, users 170, listing 23, dashboard 124, performance 225, admin 286, description 28, preview 24, shots, light-check, calculator 43, shell 355, motion 101, ui 128, pricing 46, post 89, notfound 36, login 117 / 179, lead 41, saved 24, draft 27, photo 48, auth 63 |

`ui-check` and `home-check` selectors moved with the product: the
locality field is a combobox, and the sheet's Clear all is a link.

## 18. Known failures remaining

| Check | State |
|---|---|
| `media-check` 25/26 "failed image shows clear fallback" (not in CI) | unchanged; left for the media and gallery stage |

`home-check`'s line-200 failure is fixed (§11).

## 19. Remaining risks

- **The filter rail and sheet still need JavaScript** (§10).
- **Chip focus hand-off relies on `data-chip-group`.** A new chip list
  without it falls back to `focusAfterRemove` only.
- **`Sheet` gives Escape to a combobox** that is expanded or has text. A
  future combobox in a sheet must handle Escape itself, or the sheet will
  not close until it is empty.
- **The shared chunk** is webpack's grouping, not ours. A later change to
  Home or Search may move it again; bundle-report will show it.

## 20. Recommendation for UI-14 — Media and gallery

The largest group of handwritten controls left is the gallery (6). The
last known local failure, `media-check`, is a gallery photo fallback.
Recommended UI-14:

1. **`media-check` "failed image shows clear fallback":** find the root
   cause first.
2. **Gallery controls** (previous/next, thumbnails, open/close full
   screen):
   - keyboard and screen-reader pass;
   - 44px targets;
   - focus return from full screen;
   - reduced motion;
   - consolidate onto `Button` or an icon-button primitive only where it
     genuinely fits.
3. **Photo loading and failure states** across cards, gallery and the photo
   manager: one fallback, measured.
4. **Optional:** make the results filter rail work without JavaScript (a
   GET form with checkboxes and the matching URL grammar), if the client
   wants no-JS filtering.
5. **Same gates:**
   - eight widths and 44px;
   - no new dependency without a bundle comparison;
   - style-diff;
   - login and 404 untouched.
