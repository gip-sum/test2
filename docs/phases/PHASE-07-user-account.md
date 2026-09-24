# Phase 7 — Buyer account

**Status:** Implemented; deployment and live sign-in verification pending.
**Source:** `Phases.txt`, Phase 7.

## 1. Scope

The guarded `/account` area manages a buyer's name, optional contact number, property interest, preferred locality, email update choice, sign-in state and basic account activity. Saved properties and enquiry history belong to Phases 8 and 9. This phase does not verify the contact number or change the Auth email address.

## 2. UX requirements

The account shows the verified Auth email, a clearly labelled optional and unverified phone number, editable preferences and an explicit save result. The buyer can log out or return to property search. Account creation and last sign-in dates come from Supabase Auth; unavailable dates show “Not available yet”. If profile storage is unreachable, editing is disabled with an error instead of silently replacing saved details.

## 3. Technical requirements

`lib/account/queries.ts` owns server-side REST reads and writes. A server action validates submitted values and re-verifies the user against Supabase Auth for each update. The access token stays in an HTTP-only cookie; the provider publishable key never elevates table permissions. `/account` remains protected by both the proxy and server render. Search and property routes retain their existing behaviour.

## 4. Data requirements

`public.buyer_profiles` has one row per `auth.users.id` with `full_name`, `contact_phone`, `preferred_intent`, `preferred_locality`, `email_updates`, and timestamps. RLS restricts SELECT, INSERT and UPDATE to the authenticated row owner; `anon` has no table privileges. A buyer profile is created on first save, without a signup trigger. Auth remains the sole source for email and sign-in times. No sample profile is inserted.

## 5. Edge cases

Handle no profile row, missing provider config, failed REST read or save, expired/forged session, malformed names and phone numbers, invalid locality and hostile intent values. The optional phone is stored as entered after validation and remains unverified. Updating the form does not claim email messages were delivered.

## 6. Accessibility requirements

Inputs and selects have visible labels, submission feedback has status/alert semantics, error text does not rely on colour, and controls are usable by keyboard with visible focus. The default checkbox is unchecked and requires an explicit choice.

## 7. Responsive requirements

The editor and account information cards stack on phones and use a two-column layout when space allows. Check for horizontal overflow at 390, 412, 768 and 1280px.

## 8. Verification

Run `npm run verify`, `npm run build`, and the authenticated browser flow in `npm run auth-check` with the simulated provider. The browser flow saves and reloads a buyer profile and checks responsive widths. Apply the migration to the connected project; inspect table policies and advisors. Real email and Google delivery remain Phase 6 live checks.

## 9. Production readiness

- [x] Profile validation, UI, server action and migration implemented.
- [x] Simulated authentication and profile persistence/browser checks pass.
- [x] Table migrated with owner RLS and explicit authenticated grants; security advisors checked.
- [ ] Vercel deployment and live sign-in/profile save verified with a real account.
- [ ] Phase 6 live email and Google provider checks completed.
