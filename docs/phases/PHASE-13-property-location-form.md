# Phase 13 — Property location form

Status: Implemented; GitHub review and deployment verification pending.

## 1. Scope
Collect city, locality, optional sub-locality, optional seller-stated society name, address and optional latitude/longitude after the Phase 12 details review. Review and edit all answers. Pricing, media, account persistence, autosave, publishing, geocoding and map search remain their own phases.

## 2. UX requirements
A native form works without JavaScript. Kolkata is the supported city. Select from the existing geographic catalogue; sub-localities show their parent name. A mismatched parent produces a helpful error. Society is seller-stated text, never a verified building suggestion from the development fixtures. Address asks for street/building details, not a flat number or personal contact information. Coordinates are optional but must be supplied together, in decimal degrees. No place centroid is substituted for the actual property. Errors preserve answers and link to fields. Continue leads to a review, not a saved listing. Back, refresh and edits preserve location answers.

## 3. Technical requirements
`lib/posting/location.ts` owns parsing, validation and canonical serialisation. Catalogue data comes only through `lib/location/queries.ts`; validator receives that catalogue. `/post` extends the existing GET flow with `step=location` and `step=location-review`. `step=location` also opens an unjudged filled form for edits. Phase 12 must validate before either new stage is reachable. Existing entry, details and review URLs retain their behaviour. Location values travel through earlier choices and details edits. Unknown and duplicate values cannot be selected implicitly. Server components render the form and review; existing error-summary focus is reused.

## 4. Data requirements
`PropertyLocation` carries stable city/locality/sub-locality IDs, an optional seller-stated society name, address and an optional coordinate pair explicitly marked seller-provided. Names remain lookup data, rather than identity. Society text is an unverified collection value for a future society-resolution workflow, not a new society registry. No migration or listing mutation is needed before Phase 16 drafts. Top-level localities must belong to Kolkata; sub-localities must belong to the selected locality. Text is Unicode-normalised and whitespace-normalised, with length and control-character checks. Decimal coordinates allow up to six places, must be finite, and must fall within the supported Kolkata metropolitan envelope (21.8–23.3 N, 87.8–89 E). This is a broad plausibility check, not proof of an address or its locality.

## 5. Edge cases
Empty submissions, unknown city, society used as a locality, mismatched sub-locality, duplicate keys, overlong text, control characters, HTML-like text, incomplete coordinates, exponent notation, NaN, Infinity, wrong-region coordinates, stale earlier facts and direct stage skipping are rejected or returned to the appropriate earlier form. Optional blank fields disappear from the canonical review URL. Invalid answers remain correctable. Long unbroken text wraps in the review. No catalogue-derived coordinate is invented.

## 6. Accessibility requirements
Visible labels, native selects and text inputs, 44px targets, error descriptions and aria-invalid, a focused linked error summary, one h1, ordered progress with aria-current, keyboard operation and visible focus. No map-only interaction. Coordinates have decimal keyboards. Address is a textarea with autocomplete disabled.

## 7. Responsive requirements
Single column at 390/412, paired coordinate inputs from 768, existing guide panel at 1280. Measure no horizontal overflow on form, error and long-address review at 390/412/768/1280. Inputs use at least 16px text so phone browsers do not zoom them on focus.

## 8. Verification
Run verify, build, shots, light-check, search-check and post-check. Unit tests cover catalogue relationships, optional fields, bounds, canonicalisation, hostile and duplicate input, stage guards and preserved answers. Browser assertions cover failed and corrected submission, focus, refresh, editing details and choices without losing location, no-JavaScript completion and required widths. Add location states to shots and light-check routes.

## 9. Production readiness
No claim of verified geocoding, saved drafts or published listings. Location is held in the page link, as the existing posting flow states; avoid personal information in the address. A proper persistence lifecycle arrives in Phase 16. Catalogue expansion and map-provider integration require their own data/provider decisions. Phase 13 is ready for review when local required gates pass; deployment is separately verified.

### Verification record

- `npm run verify`: lint and TypeScript clean; 296 tests across 20 suites pass.
- Production build passes with `npm run build -- --webpack`. The default Turbopack build could not fetch Google font assets in this restricted environment; the Webpack build used the original font files cached through the network proxy, without changing application fonts or build settings. CI retains the default production build.
- `npm run post-check`: 87 assertions pass, including no-JavaScript completion, failed/corrected location submission, edit preservation, coordinates and four responsive widths.
- `npm run search-check`: 64 assertions pass.
- `npm run light-check`: all route surfaces, including the three location states, stay light under a dark-mode browser.
- `npm run shots`: all routes measured at 390/412/768/1280; the new long-address fixture required bounded, hash-suffixed screenshot filenames.
- Browser checks used Chrome Headless Shell 154 through Playwright. The agent-browser daemon could not start because local IPC sockets are restricted; equivalent browser checks ran in the same execution session as the server. The location form at 390px was visually inspected.

- Merged via PR #3 at `3908bcc`; GitHub Actions run 36893401552 passed the default production build and full browser checks. Vercel production was READY and the live location flow was verified after deployment.
