# Phase 14 — Property pricing form

## 1. Scope
Collect sale price or monthly rent, rental security deposit, monthly maintenance and negotiability. Review pricing alongside validated property facts and location. Photos remain Phase 15 and draft saving Phase 16.

## 2. UX
Continue from location review to pricing. Sale and rent have separate amount fields; changing intent never reinterprets one amount as the other. Rental deposit is required, with zero explicitly meaning no deposit. Maintenance must be declared: separate, none, unknown, or included in rent (rental only). Separate maintenance requires a positive monthly amount. Negotiability is an explicit yes/no choice. Errors preserve answers and link to fields. Earlier steps preserve pricing through navigation and native form submissions.

## 3. Technical
Server-rendered native GET forms, URL state, no client state or persistence. Pure pricing parser/validator under lib/posting. Canonical links normalise integer rupees, reject duplicate and oversized inputs, and remove inapplicable fields. Pricing stages require valid details and location. Per-square-foot rate is derived, never accepted from the URL.

## 4. Data
Discriminated sale/rental pricing; integer rupees only. Entry ceilings are broad typo guards, not valuations or legal limits: sale ₹1,000 Cr; monthly rent ₹1 Cr; deposit ₹10 Cr; monthly maintenance ₹10 L. Maintenance status distinguishes unknown, none and included; only separate maintenance has an amount. Rate uses carpet area converted to sqft (sqm × 10.7639, sqyd × 9), rounded to whole rupees; rental rate explicitly states per month.

## 5. Edge cases
Reject decimals, negative values, exponent notation, malformed grouping, unsafe integers, unsupported choices and duplicate parameters. Accept plain, Indian and international digit grouping. No-deposit zero survives canonicalisation. Inapplicable deposit/rent/sale values are removed after intent changes; hidden maintenance amount is removed when no longer separate. Missing earlier facts/location returns to the relevant form without losing pricing. No price-to-deposit ratio or fabricated valuation is enforced.

## 6. Accessibility
One page h1, labelled fields, 16px inputs, keyboard-operable choices, field errors and focusable error summary with field links. Touch controls ≥44px. Exact rupees appear in visible review text as well as shared PriceDisplay.

## 7. Responsive
Seven progress stages use two rows on phones and one row on larger screens. Forms/review fit 390, 412, 768 and 1280px; large amounts wrap without overflow. Light theme follows existing tokens.

## 8. Verification
- Lint and strict TypeScript pass; 327 unit tests across 21 suites pass, including 31 pricing/parser/flow cases.
- Production Webpack build passes using the original Google font cache in this restricted runtime; GitHub CI runs the default production build.
- 46 pricing browser assertions pass, covering sale/rent, invalid input, error focus, native submission with and without JavaScript, earlier-step retention, maintenance switching and responsive states at 390/412/768/1280.
- Existing post-check (87 assertions), search-check (64 assertions), shots and light-check pass. Maximum sale price, pricing form and validation-error states are included in the shared visual/theme checks.
- Phone pricing form and rental review screenshots visually inspected; no overflow or runtime errors.
- Pricing browser checks added to the pull-request CI gates. GitHub CI result recorded on the PR.

## 9. Production readiness
No listing is saved or published; the final review states that photos come next. No database, payment handling or invented data. Phase 13 is merged and deployed at main commit 3908bcc. Phase 14 will be submitted for review separately.
