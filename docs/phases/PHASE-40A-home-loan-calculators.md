# Phase 40A — Home loan calculators

**Status:** Implemented on `main`, built ahead of roadmap order at the client's request (September 2026). Inserted as 40A in the Buyer Retention & Discovery track so the 75-phase numbering is unchanged.

## 1. Scope

**In.** Two calculators a buyer uses before and while choosing a home, and the routes into them:

- **Budget ("How much home can I afford?")** at `/calculators/budget`. From monthly take-home income, existing EMIs, savings for the down payment, interest rate, tenure and the share of income allowed for EMIs, it gives the highest home price within reach, split into down payment and loan. It also says which limit set that price and links to homes for sale up to that price.
- **EMI** at `/calculators/emi`. From property price, down payment, rate and tenure, it gives the monthly instalment, total interest and total repaid, the principal/interest split, and a year-by-year schedule. It warns when the loan exceeds what a lender may finance under the RBI loan-to-value limits.
- An index at `/calculators`, a "Plan your purchase" section on the homepage, footer links, and "Estimate the monthly EMI" on every for-sale listing, prefilled with its price.

**Out.** The following are not part of this phase:
- **Live bank rates or offers.** No rate feed exists, and a rate shown as "current" would be a claim the platform cannot back. The rate is an editable example, labelled as such. Lender offers belong to Phases 47 and 61.
- **Loan eligibility from credit score or employment type.** That is a lender's decision, and nothing here models it.
- **Stamp duty and registration.** West Bengal's rates and concessions change and need a maintained source. They are named as excluded beside every budget.
- **Prepayment, step-up and floating-rate schedules, rent-versus-buy, and saving calculations to an account.**
- **An EMI figure on listing cards.** A figure there would need a rate, and no rate is the buyer's own.

## 2. UX requirements

- **Answers update as the person types.** Each input is a text field that accepts Indian digit grouping ("62,50,000"). It echoes rupee amounts back in lakh or crore ("₹62.5 L"), so a misplaced zero is obvious. A slider gives quick adjustment over a practical range.
- **Phones:**
  - Fields come first, then the result.
  - While the result is below the screen, a compact bar pinned above the bottom navigation shows the answer, so the number being adjusted is always visible. Tapping it jumps to the breakdown.
- **Desktop:** form and result sit side by side, with the result sticky.
- **The budget result says what limits it.** Either repayments (income, existing EMIs, tenure) or the down payment (the RBI loan-to-value share), with what would raise it.
- **Invalid input:**
  - It is never guessed at or replaced. The field says what to type, for example "Enter a whole number of rupees, for example 62,50,000", and the result asks for the correction instead of showing a stale number.
  - A down payment at or above the price, or existing EMIs at or above income, is an error.
- **Every result states its assumptions in text.** It is an estimate rounded to the nearest rupee, the rate is an example, and fees, insurance, prepayments, stamp duty and registration are excluded. A lender decides the final loan.
- **Each calculator ends at a next step.** The budget calculator leads to a search capped at the budget. The EMI calculator leads to homes up to the price and to its companion calculator.

## 3. Technical requirements

- `lib/finance/loan.ts` is pure arithmetic: EMI, the yearly schedule, the loan an EMI repays, the RBI loan-to-value bands and affordability. There is no React and no I/O.
- `lib/finance/params.ts` is the only module that knows parameter names, defaults, bounds and messages. Both the server page and the client form call it, so they cannot disagree.
- **The URL is the state.**
  - Every input is a query parameter, written canonically: plain digits, fixed order, and only values that differ from the defaults.
  - Pages are native `<form method="get">` forms, so a calculation works without JavaScript. The server renders the result for any query.
  - With JavaScript, results are computed in the browser as the person types. The URL is updated with `history.replaceState`, debounced and only for valid input, so there is no history entry per keystroke and nothing re-renders on the server.
- The client component renders the same result during server rendering, so a shared link shows its answer before hydration.
- `parseWholeNumber` moved from `lib/posting/details.ts` to `lib/format/number.ts`, shared by posting and finance. `details.ts` re-exports it.

## 4. Data requirements

- **No table, migration or fixture.** Nothing is stored, and calculations are not personal data kept by the platform.
- **Money is integer rupees in and out.**
  - The rate is a decimal percentage (1–20, up to two places).
  - Schedules are differences of rounded running totals, so yearly principal adds up exactly to the loan and yearly interest exactly to the total interest.
  - Budgets and the loan an EMI can repay are rounded down, never up.
- **RBI loan-to-value ceilings** for individual housing loans are 90% up to ₹30 lakh, 80% to ₹75 lakh, and 75% above. They are one table, `LTV_BANDS`, cited in the code; if the RBI changes them, that table is the only change.
- **Bounds:**
  - Price: ₹1 lakh to ₹100 crore.
  - Down payment and savings: ₹0 to ₹100 crore.
  - Income: ₹5,000 to ₹1 crore a month.
  - Tenure: 1–30 years.
  - EMI share of income: 20–60%, default 40%, described as a common lender range, not a rule.

## 5. Edge cases

- **0% interest:** the EMI is the loan divided by the months, with ₹0 interest shown as "₹0", not "Price on request".
- **No room for a new EMI:** if existing EMIs use up the allowed share of income, the new EMI is ₹0 and the page says so. The budget is then the savings alone.
- **Zero savings:** the budget is ₹0 (no loan without a down payment), and no search link is offered for ₹0.
- **Loan larger than a lender may give:** the page shows a warning naming the minimum down payment.
- **Out-of-range, empty or garbage parameters** in a shared link are shown in their fields with errors, never silently replaced.
- **Values beyond a slider's range** are kept, and the slider rests at its end.

## 6. Accessibility requirements

- **Fields:**
  - Every text field has a visible label.
  - Its error is linked by `aria-describedby` and marked `aria-invalid`.
  - Numeric keypads are requested with `inputMode`.
- **Sliders** duplicate a text field, so they are hidden from assistive technology and the tab order. The text field is the control.
- **Announcements:** one always-present, visually hidden live region announces each new result briefly, never the whole panel on each keystroke.
- **The principal/interest bar:**
  - It is an image with a text alternative, and both parts are labelled in text with amount and share.
  - The yearly schedule is a real table with a caption and header cells.
  - Its colours passed the palette validator (CVD ΔE 12.4). The ochre is below 3:1 against white, which is why the parts carry text labels.
- **Focus rings** are visible, and targets are 44px.

## 7. Responsive requirements

- **390 and 412:** one column. The result card follows the form, the pinned result bar sits above the bottom navigation, and the page pads its bottom so the bar never covers content.
- **768:** one column, with wider fields and the two index cards side by side.
- **1280:** form in two columns beside a sticky result column.
- **No horizontal overflow** at any width. The schedule table scrolls inside its own container.

## 8. Verification

- **`npm run verify`:** `lib/finance/loan.test.ts` covers known EMIs (₹50 lakh at 8.5% for 20 years is ₹43,391), 0%, exact schedule totals, monotonic principal and interest, and the loan-to-value band edges. It also covers the down-payment ceiling, both affordability limits, and parameter parsing, errors and canonical round-trips. `lib/property/queries.test.ts` is unchanged.
- **`npm run calculator-check`** (in CI) runs against the production build. It covers:
  - the known EMI on screen, and URL sync without history entries;
  - reload and shared links, and a no-JavaScript submission computing the same answer;
  - errors on invalid input with no stale result, and the lender-limit warning;
  - the budget's limiting factor for both limits, and the budget link landing on results capped at the budget;
  - the listing link prefilling price and minimum down payment, and the pinned result bar hiding when the result is in view;
  - keyboard labels and no overflow at 390, 412, 768 and 1280.
- **`npm run shots` and `npm run light-check`** include the three calculator routes. `npm run home-check` covers the homepage section.

## 9. Production readiness

- **Before launch:**
  - Legal or compliance review of the wording ("estimate", "example rate", excluded costs).
  - Confirm the RBI loan-to-value bands against the current circular, and assign someone to own updating them.
- **When a rate source exists:** show a dated range, never a single "current" rate. That source would be a new model with its own provenance, not a constant.
- **Analytics** on calculator use and on click-through to search belong to Phase 69.
