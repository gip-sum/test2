# UI-11 — Admin workspace

Status: complete, 18 October 2026, on `main`. Builds on UI-01 to UI-10
([UI-10](UI-10-seller-analytics.md)).

UI-11 brings the admin console onto the rules UI-05 to UI-10 set for the
rest of the product:
- **Admin actions keep focus.** The review decision and account change
  forms keep focus while they save and refuse a second press. Each form used
  to disable its fieldset and button while saving, which dropped a keyboard
  user at `<body>`.
- **Focus after the refresh.** It lands on what changed:
  - the listing's status badge after a review decision;
  - the account's status or role after an account change, which is also
    announced.
- **Validation on press.** The submit buttons no longer sit disabled,
  telling nobody why. A press checks the input against the server's rules,
  marks each problem on its field and focuses the first. Nothing is sent
  until everything is right.
- **Shared components replace the admin's own:**
  - `Button` for the two hand-written Refresh buttons (handwritten
    **41 → 39**; none remain in admin);
  - `StatusBadge` for account status and for listing status in an
    account's history;
  - `FormField`, `FormFieldset` and a new `FormCheckbox` for every admin
    form control, at 16px;
  - `EmptyState` for the queue, listings, accounts and "Decision
    unavailable".

Unchanged:
- authorization;
- the admin product and its layout;
- every figure, which stays a plain count.

No new dependency, no Motion, no chart. The login and 404 scenes are
untouched.

---

## 1. Scope

**In:**
- `/admin` (overview, listings, moderation queue and review, users and
  account detail, system);
- `components/admin`;
- the shared pieces they needed (`StatusBadge`'s vocabulary, `FormCheckbox`);
- the admin browser checks;
- style-diff coverage of the account and review screens.

**Out:**
- new admin features or figures;
- auth, RLS and API changes;
- public and seller pages;
- the login and 404 scenes;
- the 75-phase numbering.

## 2. Audit findings (UI-10 state)

| Where | Finding | Rule it broke |
|---|---|---|
| `ReviewDecision` | `<fieldset disabled>` and `<Button disabled>` while saving; Enter in the days field submits, then the field it was in became disabled | busy keeps focus (UI-07) |
| `ReviewDecision` | Submit disabled until valid and confirmed, with no message | errors at the field (UI-09) |
| `ReviewDecision` | hand-written "Refresh review" `<button>` | shared Button |
| `ReviewDecision` | after `router.refresh()` the form is replaced and focus falls to `<body>` | afterRefresh / RestoreFocus (UI-09) |
| `AccountControls` | the same three problems; "Refresh account" was a hand-written button doing a full `window.location.reload()` | the same |
| Users list | 14px search fields (`text-body-sm`): Safari on iPhone zooms the page | 16px controls |
| Users list | hand-built status pills: Active in brand green, Suspended in amber | one status language |
| Account detail | listing history status as raw text ("CHANGES REQUESTED") | StatusBadge |
| Listings, queue, accounts | empty lists as hand-styled paragraphs | EmptyState |
| Review page | "Decision unavailable" as a hand-built panel | EmptyState |
| Review / account forms | 15px selects and textarea; hand-wired labels and hints | FormField, 16px |
| Overview | plain counts computed at request time | already right (§11) |
| System checks | `CheckBadge` (ok / warning / problem / unknown) | not a listing status; kept (§11) |

## 3. Components migrated

| Component / page | Change |
|---|---|
| `components/admin/ReviewDecision.tsx` | `Button loading` (busy, focus kept); fields stay enabled and edits are refused while saving; validation on press with per-field errors and focus; `FormFieldset` (decision), `FormField` (days, reason), `FormCheckbox` (confirmation); "Refresh review" is a `Button`; `afterRefresh(['listing-status'])` before the refresh; an always-present status region |
| `components/admin/AccountControls.tsx` | the same pattern; "Refresh account" is a `Button` that re-reads in place (`router.refresh`) and clears the lock; `afterRefresh` to the changed value, with an announcement |
| `app/admin/moderation/[id]/page.tsx` | `<RestoreFocus>`; the status badge in a focusable `#listing-status`; "Decision unavailable" is `EmptyState` |
| `app/admin/users/[id]/page.tsx` | `<RestoreFocus>`; the status is a `StatusBadge` in a focusable `#account-status-value`, the role in `#account-role-value`; listing history statuses are `StatusBadge` |
| `app/admin/users/page.tsx` | search fields on `FormField` (16px, 48px, still a GET form); status as `StatusBadge`; empty search is `EmptyState` with Clear filters |
| `app/admin/listings/page.tsx`, `app/admin/moderation/page.tsx` | empty lists are `EmptyState` (h3); a page past the end says so and links back |
| `lib/listings/status-tone.ts` | account vocabulary: `SUSPENDED` (problem tone, "Suspended"); account `ACTIVE` is the listing `ACTIVE` (live, "Active"); `isBadgeStatus` guard for RPC strings |
| `components/ui/FormField.tsx` | `FormCheckbox`: label beside the box, error in its `aria-describedby` |

**No admin duplicate was introduced.** `StatusBadge` gained one status
rather than an `AccountStatusBadge` being added beside it. `CheckBadge`
stays separate because system health (ok / warning / problem / unknown) is
not a listing or account status.

## 4. Button count

Measured with `lib/design/button-count.test.ts`: `<button` in `app/` and
`components/` TSX outside `components/ui`.

| | Count |
|---|---|
| UI-10 end | 41 |
| **UI-11 end** | **39** (ceiling lowered) |

Migrated: "Refresh review" and "Refresh account". **No handwritten button
remains in `app/admin` or `components/admin`.** The other 39 are the
categories UI-09 recorded (navigation toggles, gallery, search controls,
save heart, text actions in sentences, Delete listing, public and account
controls).

## 5. Form changes

| Form | Before | After |
|---|---|---|
| Review decision | radios in a plain fieldset; days 44px; reason 15px; hand-wired hint | `FormFieldset`, `FormField` × 2, `FormCheckbox`; controls 16px / 48px; hints in `aria-describedby`; errors under each field with "Error:" for screen readers |
| Account change | two 15px selects and a textarea | `FormField` × 3 + `FormCheckbox`, 16px / 48px |
| Users search (GET) | 14px inputs, caption labels | `FormField` × 3, 16px / 48px; still a plain GET form (the search is the URL) |

**Kept:**
- every label text, so tests and assistive technology find the same names;
- hints;
- the character counters;
- "editing resets the confirmation";
- request ids reused for a retried decision or change;
- every server endpoint and rule.

Nothing was turned into a server action, and no working server path changed.

**Validation messages** (client mirror of the server's rules; the server
still decides):
- Days: "Enter a whole number of days from 1 to 180."
- Reason:
  - "Give the seller a reason of at least 5 characters.";
  - "A review note needs at least 5 characters, or leave it empty.";
  - "Shorten the reason to 2,000 characters or fewer.";
  - "Remove unsupported characters from the reason."
- Account:
  - "Choose a different status or seller role to save a change." (on the
    status field);
  - "Give a reason of at least 5 characters.";
- Confirmation: "Confirm this decision for the submitted copy you
  reviewed." / "Confirm this change for this account."

## 6. Focus and busy behaviour

| Action | Busy | After |
|---|---|---|
| **Approve / Reject / Request corrections** | `Button loading`: focused, `aria-disabled`, `aria-busy`, refuses Enter and Space; fields focusable, edits refused; "Saving the review decision." in a status region | the page refreshes; the form is replaced by "Decision unavailable"; **focus goes to `#listing-status`**, whose `role="status"` badge reads the new state (as the UI-09 publishing page does) |
| Decision fails (outage, lost response, conflict) | — | focus stays on the decision button; the alert offers **Refresh review** (`Button`), which refreshes and returns focus to the form heading (or the status, if the form is gone) |
| **Save account change** | the same | **focus goes to the changed value** (`#account-status-value`, else `#account-role-value`); announced: "Account change recorded. Marketplace status: Suspended. Seller role: Agent." |
| Stale or missing account (409/404) | the form locks; Save keeps focus, `aria-disabled` | **Refresh account** re-reads in place, clears the lock and returns focus to "Manage account" (it used to reload the whole page) |
| Pressing with something missing | nothing is sent | each problem is marked on its field (`aria-invalid`, error in `aria-describedby`); focus goes to the first |

One focus system: `lib/a11y/after-refresh` and `<RestoreFocus>` from UI-09.
Nothing new was added.

## 7. Accessibility results

Tested on real action flows against the API simulators, not markup:
- **Busy keeps focus.** The focused button is `aria-disabled` and
  `aria-busy`, never `disabled` (both forms).
- **Duplicate presses are refused.** Enter and Space during a decision send
  no second request (counted at the mock); likewise Enter during an account
  change.
- **Focus after refresh:**
  - `#listing-status` after a decision;
  - `#account-status-value` after both account changes;
  - "Manage account" after Refresh account;
  - the decision button after a failure.
- **Announcements:**
  - busy text in status regions;
  - the decision through the badge's live region;
  - the account change through the polite announcer, with its exact text
    asserted.
- **Field errors:** each error is tied to its control. The browser checks
  assert `aria-invalid`, `aria-describedby` and focus on the confirmation,
  days, reason and status fields.
- **Status semantics:**
  - the badges carry "Status:" for screen readers;
  - the review badge is `role="status"`;
  - the account statuses and history are shared badges with the canonical
    tones.
- **Empty and error states:** headed `EmptyState` (h3 under the section's
  h2) and the existing `ErrorState` alerts for read failures (unchanged
  checks still pass).
- **Keyboard:** the existing checks pass (keyboard confirmation and
  submission, Tab from the role select to the reason). Fields stay in the
  Tab order while saving, and nothing traps focus.
- **Reduced motion:** UI-11 adds no animation. The busy spinner is the
  existing CSS one that the global rule stops.

## 8. Mobile results

All at **320, 360, 375, 390, 412, 430, 768 and 1280**:
- `admin-check`: overview, listings (review filter), moderation queue,
  system;
- `moderation-check`: the review page;
- `users-check`: the users list and an account, with a 250-character name
  and a 200-character email.

| Assertion | Result |
|---|---|
| No horizontal page scroll | pass at every width and page |
| Controls ≥ 44px (links, buttons, selects, inputs) | pass; admin fields are 48px |
| Decision and confirmation rows ≥ 44px | pass |
| Long names and emails | wrap inside their cards (`break-all`), no overflow |
| Tables | listings and accounts switch to card lists under 768px (existing), with status badges in the cards |
| Action groups | wrap (`flex-wrap`); forms fit the viewport |

Text and controls were not shrunk. Fields grew to 16px and 48px.

## 9. Authorization

Unchanged: `requireStaff` on every page, origin check plus
`reviewerUser` / `accountAdmin` on both APIs, and the security-definer
functions that check the staff role in the database.

| Check | Result |
|---|---|
| Guest → admin pages | sent to log in (admin, moderation, users checks) |
| Buyer / seller → admin pages | ordinary 404, no "Staff only" (admin-check, users-check) |
| Moderator → admin overview, users | 404 (moderation-check, users-check) |
| Guest → decision API | 401; ordinary account → 404; foreign origin → 403 |
| **New:** buyer and moderator → account API with a well-formed change | refused (not 200), no change recorded |
| **New:** a seller requesting the review page | ordinary 404, no form |
| **New:** the seller dashboard's HTML | no staff navigation, decision history or staff ids |
| Suspended account → API | 403 |
| Database (pglite) | `moderation-db-check` 49, `users-db-check` 78, `admin-db-check` 38 |

**Hiding a button is never the authorization.** The forms appear only for
staff, and the server refuses everyone else regardless (asserted above).
No RLS or auth policy changed.

## 10. Bundle and performance (vs UI-10)

Client JS from served HTML, gzip, two builds side by side, signed-in pages
with a simulator session:

| Page | UI-10 | UI-11 | Δ |
|---|---|---|---|
| **Review submitted listing** | 184.48 | 185.64 | **+1.16** (page chunk 3.94 → 5.09) |
| **Account details** | 180.58 | 181.63 | **+1.05** (page chunk 3.52 → 4.57) |
| Users list, listings, system, overview | 178.37 | 178.37 | 0.00 (server-rendered; FormField is server-safe) |
| Home, Search ×3, Property, Login, 404, Post, EMI, Activity | — | — | ±0.01 (hash renames) |
| Seller dashboard, seller performance | — | — | 0.00 |

- The two form pages pay for `RestoreFocus`, `after-refresh` and the
  field frames in their client bundles. Nothing moved into a shared chunk.
- **Route isolation:** `moderation-check` finds the chunk carrying the
  review form's code and asserts **none of Home, Search, Login, 404, the
  seller dashboard or performance loads it**.

Runtime at 390px, 4× CPU, 15 interleaved runs (medians):

| | UI-10 | UI-11 |
|---|---|---|
| Review page: total blocking time | 454 ms | 422 ms |
| Account page: total blocking time | 449 ms | 403 ms |
| Users list: total blocking time | 412 ms | 408 ms |
| FCP (review / account / users) | 380 / 368 / 344 ms | 372 / 356 / 332 ms |
| CLS (all three) | 0 | 0 |

All within noise; no regression. No client component was added to a page
that lacked one. The users list stays fully server-rendered.

## 11. Rejected ideas

| Idea | Why not |
|---|---|
| **Charts on the overview** | Its figures are rolling-window counts computed at request time (`admin_overview`: last 7 / 30 days, totals). There is no stored series. A real one *could* be derived from timestamped rows (`enquiries.created_at`, moderation actions, account creation), but that needs a new RPC, which is new functionality. Recorded as a candidate, not built. If built, reuse UI-10's `DailyActivityChart` pattern, not more Bklit code. |
| Trends, funnels, conversion rates, animated counters | not measured, or decoration |
| An `AccountStatusBadge` | would duplicate `StatusBadge`; one status added to the shared map instead |
| Folding `CheckBadge` into `StatusBadge` | system health is a different vocabulary (Unknown is not a listing state) |
| Server actions for the decision and account forms | both are working JSON endpoints with idempotent request ids and origin checks; converting them would change working server behaviour for no user gain |
| `EmptyState` for the account history sub-lists ("No submitted listings.") | each is one line under its own section heading; a second heading inside would add noise, so they stay plain text |
| Kokonut, Motion, Anime.js, Bklit | nothing here animates or charts |

## 12. Dependency decision

**None added.** `package.json` and the lockfile are unchanged.

## 13. Tests and checks

| Check | UI-10 | UI-11 |
|---|---|---|
| `npm run verify` (lint, types, unit) | 667 | **670** (FormCheckbox; account badge; account vocabulary and `isBadgeStatus`; the coverage test now includes account statuses) |
| `admin-check` | 124 | **286** (eight widths, queue page, empty state) |
| `moderation-check` | 34 | **61** |
| `users-check` | 92 | **170** |
| `moderation-db-check` / `users-db-check` / `admin-db-check` | 49 / 78 / 38 | unchanged |
| `performance-check` | 225 | 225 (one assertion made race-free, below) |
| Rest of the CI suite | — | all unchanged: phase-e 64, listing 23, dashboard 124, description 28, preview 24, draft 27, photo 48, auth 48, login 117 / 179, shots, light-check, search 64, calculator 43, shell 355, motion 101, ui 128, pricing 46, post 89, notfound 36 |

**Assertions changed, and why.** The product behaviour changed on purpose:
the submit buttons are no longer disabled as a hint.
- `moderation-check` "confirmation is required" checked `isDisabled()`. It
  now presses the button and asserts that **nothing is sent**, the box is
  marked invalid with its error, and it has focus.
- `users-check` "confirmation required" / "valid confirmed change enabled"
  checked `isDisabled()` / `isEnabled()`. They now assert the same refusal
  and errors, and that a valid confirmed change is not `aria-disabled`.
- `users-check` "stale account requires refresh" checked `isDisabled()`. It
  now checks `aria-disabled="true"` (the button stays focusable on purpose)
  plus the same alert text.

Each is at least as strict as before: it proves the refusal at the server
boundary (request count), not only an attribute.

**A UI-10 check made race-free.** CI run #89 failed at
`performance-check` "reduced motion: … no animation at all", although it
had passed in #88 and locally. The global reduced-motion rule gives
*every* element a 0.01ms transition over `all`, so the tap that opens the
readout can leave a CSSTransition alive for that instant (the focus ring
appearing), and counting animations raced it. The promise is that nothing
takes perceptible time, so the check now asserts every animation in the
chart lasts under 1ms. That is still a hard failure for any real animation.
It passed three consecutive local runs. No product code changed.

**style-diff:**
- `admin-users`, `admin-user` and `admin-review` added; the simulator
  answers their RPCs.
- **Changes only on those three screens:**
  - field labels 12px caption → 13px label in ink-900;
  - controls 13–15px → 16px with 12px vertical padding;
  - hints ink-700 → ink-500 (the shared hint; 4.9:1 on white);
  - account badges brand / amber → the canonical live / problem tones;
  - submit buttons no longer drawn at 45% opacity before input;
  - the history status as a badge.
- **Public screens:** only the hero image URL's server port.
- **Login and 404 scenes:** unchanged.

## 14. Known pre-existing failures

UI-10 recorded five. Run on the UI-10 and UI-11 builds side by side, each
fails at exactly the same point on both:

| Check | UI-10 | UI-11 |
|---|---|---|
| `home-check` (passes in CI) | line 200 | line 200 |
| `lead-check` | line 70 | line 70 |
| `saved-check` | line 61 | line 61 |
| `property-check` | 65/67: "valid enquiry does not claim success…", "form submits without JavaScript" | the same two |
| `media-check` | 25/26: "failed image shows clear fallback" | the same |

None was modified.

## 15. Remaining risks

- **Client validation mirrors the server rules** (`decisionInput`, account
  reason length). If the server rules change, the messages must change with
  them; the server still refuses anything wrong.
- **The status-region announcement on decisions** relies on the page badge
  being `role="status"`; if that badge changes, pass a message to
  `afterRefresh` instead.
- **`isBadgeStatus` shows raw text** for an unknown status from an RPC
  rather than inventing a tone.
- **Admin overview figures** are rolling counts. A historical view would
  need a new RPC (§11).

## 16. Recommendation for UI-12 — Account and enquiry forms

The last forms outside the shared frame are the buyer-facing ones UI-09
named:
1. **The enquiry form** on property pages: `FormField` (16px), errors at the
   field, a busy `SubmitButton` that keeps focus, and progressive
   enhancement kept.
2. **Account profile** (`/account`): `FormField`, busy and focus after
   save, `afterRefresh` where it refreshes.
3. **The public text actions UI-09 left as `<button>`** (Copy link, Try
   again, Reload…): review each against `Button`'s variants and lower the
   ratchet where one fits.
4. **The `lead-check` and `saved-check` local failures** fail before the flows
   they guard. Find why (they time out locally) so those forms are covered
   end to end.
5. **Same gates:** eight widths, 44px, no new dependency, style-diff,
   login and 404 untouched.
