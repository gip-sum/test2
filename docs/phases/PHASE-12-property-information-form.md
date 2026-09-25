# Phase 12 — Property information form

**Status:** Implemented on `claude/phase-12-s4gy03`; CI on `main` and deployment pending.

## 1. Scope

**In.** The second stage of the seller journey at `/post`. Once a seller has chosen role, intent and property type (Phase 11), they fill in the facts about the property:

- **Configuration:** bedrooms (BHK) and bathrooms. A studio has no BHK question.
- **Area:** carpet area (required), built-up and super built-up (optional), each a separate field, and one area unit (sqft, sq.m, sq.yd).
- **Furnishing:** unfurnished, semi-furnished or furnished.
- **Floor:** for flats, builder floors and studios, the floor the unit is on and the building's total floors. For independent houses and villas, the number of floors in the house.
- **Availability and age:** for sale, ready to move or under construction. Ready properties give their age, and under-construction ones give an expected possession month. Rentals must be ready to move. They give their age and whether they are available now or from a certain date.

The form ends in a review showing all Phase 11 choices and the facts, each with a way to change it.

**Out.** The following are not part of this phase: location (Phase 13), price, deposit and maintenance (Phase 14), photos (Phase 15), saving, resuming and autosave (Phase 16), the buyer-style preview (Phase 17), and publishing (Phase 18). Balconies, parking, facing, ownership, amenities and description are also excluded. They are fields on the property detail page but not in Phase 12's key focus in `Phases.txt`. They belong to a later posting stage, which the roadmap will name when that stage is specified. Plot area for houses and basement-level units are also excluded. Both need model decisions (a fourth area basis, and negative floor numbers) that nothing currently displays.

## 2. UX requirements

- Picking a property type leads directly to the details form. Phase 11's standalone "starting point" confirmation screen is replaced by a compact summary of those three choices at the top of the form, and each can still be changed.
- One form, split into labelled groups (Configuration, Area, Furnishing, Floors, Availability). Groups only show questions that apply to the chosen property type and intent. A studio has no BHK question, a villa has no "which floor", and a rental has no "under construction".
- Choices with few options (BHK, bathrooms, furnishing, unit, availability) are large tappable radio chips. Numbers are text inputs with a numeric keypad (`inputMode="numeric"`), not spinners.
- Areas accept Indian digit grouping as typed ("1,240" or "1,24,000").
- Under construction and ready to move reveal only their own follow-up question. Rentals choose between available now and available from a date, and the same rule applies.
- **Validation happens on the server when the form is submitted.** An invalid submission returns the form with every typed value intact, an error summary at the top linking to each problem, and a message under each affected field saying what to do ("Enter the carpet area, for example 1,240"), not only what is wrong.
- A valid submission leads to a review. There, "Change" on any fact returns to the filled-in form. Changing role, intent or type keeps the facts already entered and returns to the form to confirm them, since some may no longer apply.
- The review says plainly that nothing has been saved or posted, and that location is the next stage to be built. Nothing implies a listing exists.

## 3. Technical requirements

- `lib/posting/details.ts` is the only module that knows the facts' shape. It holds the parameter names, the field-applicability rules per type and intent, parsing, validation (with an injected `today`), and canonical serialisation. It is pure and has no React, Next.js or I/O.
- The URL remains the state, as in Phase 11. The form is a native `<form method="get" action="/post">` carrying `role`, `intent` and `type` as hidden fields, so the whole stage works without JavaScript. Back, forward, refresh and a shared link all reproduce the same stage.
- How the stage is determined:
  - no detail parameters: an empty form;
  - detail parameters present: a submission, which is validated;
  - `edit=1`: the filled-in form, without errors.
  - A valid submission redirects to its **canonical** review URL (normalised numbers, inapplicable and empty optional fields removed, fixed parameter order).
  - An invalid submission renders errors in place and only removes unrecognised parameters.
- Changing an earlier choice carries the recognised detail values through the Phase 11 choice links and returns with `edit=1`. Applicability rules then drop what no longer fits.
- Presentation is split into `components/posting/` (progress, choice card, details form, review, error summary). `app/post/page.tsx` handles parsing, redirects and composition only.
- The error summary is focused when it mounts, through the only client component in the flow. Without JavaScript the summary is still first in reading order.
- Conditional follow-up questions are shown and hidden using CSS `:has()` on the checked radio, not JavaScript. Without `:has()` support both show, and the server ignores whichever does not apply.

## 4. Data requirements

- `PropertyFacts` in `lib/posting/details.ts` uses the listing model's own types and units: `bedrooms`, `bathrooms`, `carpetArea`, `builtUpArea`, `superArea`, `areaUnit`, `furnishing`, `floor`, `totalFloors`, `constructionStatus`, `ageYears`, `possessionBy` (`YYYY-MM`), `availableFrom` (`'now'` or an ISO date). Areas are integers in the chosen unit, stored as entered, never converted.
- **Floor convention, stated once and enforced.** `totalFloors` counts every storey including the ground floor (a ground-plus-four building has 5). `floor` is 0 for the ground floor and at most `totalFloors − 1`. For houses and villas, `totalFloors` is the number of storeys in the house. The development fixture generator previously produced `floor === totalFloors`, which is impossible under this convention, so it now draws from `0 … totalFloors − 1`.
- Rules for areas:
  - Carpet area must be at most built-up, and built-up at most super built-up, wherever both values are given. Super built-up must also be at least carpet.
  - Plausible bounds are checked in square feet after conversion: carpet from 100 to 100,000 sqft. Unit conversions are sq.m × 10.7639 and sq.yd × 9.
- Other ranges:
  - Bedrooms 1–10 and bathrooms 1–10.
  - Total floors 1–99.
  - Age 0–150 years (0 means under a year old).
  - Possession from the current month up to 10 years ahead.
  - Available-from today up to one year ahead.
  - "Today" is calculated in `Asia/Kolkata`.
- `possessionBy` is new to the domain. It is collected here, carried by the Phase 16 draft, and added to the listing model when Phase 18 publishes. It is not added to `PropertySummary` now, because nothing displays it yet.
- No table, migration or fixture listing. `listing_draft` remains Phase 16's. The facts are not private and may live in the URL.

## 5. Edge cases

- **Empty submission:** every required field is reported, and the page does not redirect.
- **Duplicated parameter:** treated as a missing answer, never resolved by picking one value.
- **Value over 40 characters, or unrecognised key:** dropped without being echoed.
- **Script-like text in a number field:** reported as not a number. It is echoed back only through React's escaped `value` attribute.
- **Decimals, negatives, `1e3`, and grouping like "12,34,5":** rejected with a specific message. Only digits and commas are accepted, and the commas are removed before parsing.
- **Floor above the top floor, or zero total floors:** error on the floor field.
- **Super built-up smaller than carpet:** error on the larger basis field explaining the relationship.
- **Possession or available-from date in the past:** error. This includes a review link opened later, after its date has passed.
- **Type changed from flat to villa with a floor filled in:** the floor is dropped silently, because it no longer applies. Everything else stays.
- **Intent changed from sale to rent while "under construction":** construction status and possession are dropped, and the rental availability question is asked.
- **Invalid Phase 11 choices together with detail values:** Phase 11 canonicalisation applies first, and details are carried but not validated until the type is known.
- **A studio:** is saved with `bedrooms` absent, never with 0 or 1 BHK claimed.

## 6. Accessibility requirements

- One `h1` per state, and the progress bar is an ordered list with `aria-current="step"` (five stages).
- Every input has a visible `<label>`. Every radio group is a `<fieldset>` with a `<legend>`. Hints and errors are linked through `aria-describedby` (on the fieldset for radio groups), and invalid text inputs have `aria-invalid="true"`. `aria-invalid` is not valid on a radio, so a group's error is carried by its description.
- The error summary is `role="alert"`, is headed "There is a problem", lists each error as an in-page link to the field's `id`, and receives focus on load when JavaScript is available.
- Each radio chip is a real `<input type="radio">` that is visually styled, not a div, so arrow keys move within the group. The checked state is shown with a border, a tick, and weight, never with colour alone.
- Targets are at least 44 px. Focus rings follow the global `:focus-visible` rule, including on visually styled chips (via `:has(:focus-visible)`).
- Numeric inputs use `inputMode="numeric"` and `autoComplete="off"`, with no spinner and no placeholders used as labels.

## 7. Responsive requirements

- **390 and 412 px:** single column. Chips wrap. BHK and bathroom chips (1–10) fit in two rows, and the submit button is full width.
- **768 px:** the three area inputs share a row, as do floor and total floors.
- **1280 px:** the form column sits beside the Phase 11 guide panel, which now explains the area bases.
- No horizontal scrolling at any width. The bottom navigation does not cover the submit button.

## 8. Verification

- `npm run verify`: unit tests in `lib/posting/details.test.ts` cover applicability for all 5 types × 2 intents, every validation rule and bound, grouping-comma parsing, unit conversion, date rules with a fixed `today`, canonical ordering, and hostile or duplicate input.
- `npm run build`, `npm run shots`, `npm run light-check`, `npm run search-check`. The shots and light-check route lists include the details form, a failed submission, and a review.
- `npm run post-check` is extended to cover:
  - Owner → Sell → Flat to the empty form;
  - an empty submission with the error summary, links and `aria-invalid`;
  - a corrected submission to a canonical review URL;
  - reloading the review;
  - "Change" on a fact returning to a filled-in form;
  - changing the type to Villa, which drops the floor and keeps the areas;
  - a rent flow with a past date, which is rejected;
  - no JavaScript, from start to finish;
  - keyboard radio selection;
  - no overflow at 390/412/768/1280.
- The error summary's focus-on-mount is checked by the browser script with JavaScript enabled.

## 9. Production readiness

To ship, the form collects every Phase 12 fact with server-side validation that cannot be bypassed by editing the URL, works without JavaScript, and never implies a listing was saved. The facts type is the input for the Phase 16 draft table without any reshaping. Phase 12 is complete when the five standard gates and `post-check` pass in CI on `main`, and the deployed `/post` serves the details stage.

### Verification record

Run locally against `npm run build && npm run start` (port 3100), Chromium 1194:

- `npm run verify`: lint clean, typecheck clean, 202 tests across 14 suites. This includes 28 posting tests in `details.test.ts`, `flow.test.ts` and `entry.test.ts`.
- `npm run build`: passed, and `/post` remains dynamic.
- `npm run shots`: no horizontal overflow at 390/412/768/1280, including the failed-submission and review states.
- `npm run light-check`: light theme held on every route under a dark-mode browser, including the new `/post` states.
- `npm run search-check`: 64 passed.
- `npm run post-check`: 59 passed, and 59 passed again on a second run, so it is stable. Focus moving to the error summary was checked with JavaScript on. The full Agent → Sell → Builder floor → details → review flow, including the CSS-only possession reveal, was checked with JavaScript off.
- Development fixtures: after the floor-generator change, every generated listing keeps `floor ≤ totalFloors − 1`, a new fixture-integrity test checks this. It failed against the old generator and passes now.
