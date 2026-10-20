# UI-17 — Post Property visual redesign

Status: complete, 20 October 2026, on `main`. The fourth stage of the visual
track, after [UI-16](UI-16-property-visual-redesign.md).

The seller's posting flow now uses the Home, Search and Property language.
The owner approved it in one review (Stage A: `40ad67b`, `47fc52b`,
`0526048`), along with the Kokonut UI File Upload technique and Motion on
the photo step.

Unchanged: the posting rules and URL-driven GET forms, validation, drafts,
lifecycle, moderation, permissions, auth, `safeReturnPath` and analytics.
No schema change. The login and 404 scenes are untouched.

## Before → after

| | Before (UI-16) | After (UI-17) |
|---|---|---|
| Frame | A 1320px column; the step and its progress stacked | The 1400px workspace: a mint band ("Post a property", the way back), the step in one white card with fields at reading width, and a sticky side column from 1024px |
| Progress | One row of eight segments | Desktop: a rail of the eight real stages in three groups (done steps ticked and linking back, "You are here", later steps greyed). Phone: a one-line bar ("Step 5 of 8 · Location · Next: Pricing") over the segmented track, with every step in a native `<details>` |
| Forms | One long column of fields | Titled sections with a sentence each. Small fixed answers (furnishing, construction, availability, maintenance, negotiable) are radio option cards with a line of meaning; counts and units stay chips. No field was added |
| Pricing | Plain number field, "(₹)" in the label | A ₹ inside the field and an Indian-format echo as you type (₹65,00,000 · ₹65 L). The accessible name still says "(₹)" |
| Location | One column | Neighbourhood (city, locality) apart from building (society, address); the privacy note beside the address; coordinates in an optional "Map position" disclosure |
| Photos | Small rows with text buttons | A drop zone; tiles with position, cover badge, upload and failure overlays; drag to reorder; compact rows on phones (below) |
| Review | Its own simplified preview | The real buyer page (`PublishedProperty`), marked as a preview, under a seller-only review area (below) |
| Publishing status | A list of links and a box | The frame, a three-state path lit from the real status (private draft, under review, published), the status card with its actions, history as a timeline |

## Workspace

`PostingWorkspace` wraps every step: the band, the card, and the side column.

The side column holds:
- the rail;
- "Your listing so far" (role, plan, type);
- the step's guide, ending "Next: … Nothing is published until you submit it for review."

`StepHeading`, `FormSection` and `StepActions` give every step the same
heading, grouping and action row. Everything is server-rendered; only
`AmountEcho` (the price echo) and the existing save strips are client code.

## Progress

`PostingProgress` draws the flow's eight real stages twice:
- the rail from 1024px;
- the bar below 1024px.

Only one is displayed at a width, so assistive technology meets one "Posting
progress" navigation. There are no percentages and no derived counts.

The bar's track sits in the `<summary>`, so it shows with the bar closed. A
closed `<details>` does not render its content: with the track inside it,
UI-08's fill never finished and was never seen. That was found in
validation and fixed.

## Photo manager

**Upload zone.** The labelled file input, drawn as a drop zone:
- drop or paste photos onto it, or press it to choose;
- it is armed while a file is dragged anywhere over the window, and ready while over it;
- upload and processing states are the real XHR progress and server state.

**Tiles.**
- The image at 4:3, with its position number.
- "Cover photo" on the first.
- The upload or processing overlay, or the failure state.
- `PhotoFallback` (UI-16) when a preview fails.
- One row of tools: Earlier and Later (44px icon buttons with full names such as "Move kitchen.jpg earlier"), Make cover, and Remove.
- On a phone each photo is a row, the picture beside its tools; from 640px a card.

**Reordering.**
- Drag a photo by its handle. The photo follows the pointer and the others make room as it passes.
- The order is saved on release, or put back with a message if saving fails.
- The buttons stay the way to reorder from a keyboard. Each keeps focus through its own move (UI-08); removal hands focus to the photo that takes its place.

**Drag details settled in validation:**
- The slot that opens is the one under the dragged photo's centre (clamped to the screen), not under the pointer. The handle sits in a corner.
- Swapping back with a photo still sliding away is ignored for the layout animation's length.
- Edge auto-scroll was removed. Motion re-runs a drag on scroll, so it fed itself and ran the page away. On a phone, a photo beyond the screen moves with Earlier and Later.

## Review: the buyer's page

The preview renders `PublishedProperty`, the component `/listing/[id]` uses,
so what the seller reviews is what a buyer will get:
- the gallery, summary, facts, area panel, description, location and seller;
- a **Preview** marker in its band;
- the listing's name one level under the page's heading ("Check your listing as buyers will see it.").

Seller-only parts sit around it, never drawn into it:
- **Above:** the "Private preview · Not published" state, then either "Information to complete" (the warnings, each with its fix link) or "Nothing is missing" with a short list of what to check, and "Your description", the editor (16px, a count that turns red over the limit). Its heading has its own id, because the buyer section "About this property" is on the same page.
- **Beside:** the confirmation, where buyers find the contact card, labelled "Your controls · not shown to buyers".

When the listing cannot be drawn yet (no facts, price, type or role), a
placeholder says what it needs; nothing is filled in for the seller.

## Sources

**Kokonut UI File Upload technique, adapted.**
- Pinned: github.com/kokonut-labs/kokonutui `bb9120f8`, `components/kokonutui/file-upload.tsx` v2.0.0 by @dorianbaffier. MIT License.
- Kept: one zone to drop, paste or press; armed while a file crosses the window; ready over the zone.
- Changed:
  - the native labelled file input stays the control (keyboard, screen readers, no drag needed);
  - no simulated progress;
  - our validation, compression and upload unchanged;
  - GharBazaar tokens;
  - no animated icon.
- Provenance is recorded in `components/posting/PhotoManager.tsx`. Kokonut has no stepper component, so progress is ours.

**Motion, on the photo step only.**
- Drag reorder and layout animation for every change of order (drag, buttons, rollback), plus a short fade-in for a photo just added. Photos that load with the page are simply there.
- It replaced UI-08's FLIP in the photo manager, because a drag needs the photo under the pointer while the others move, which FLIP cannot do mid-gesture. Saved homes keep the FLIP (`lib/motion/flip.ts`).
- Drag and layout come from `<MotionFeatures max>` (`domMax`, loaded lazily); the form steps carry none of it.
- Reduced motion: `reducedMotion="user"` makes layout changes instant (measured: no displacement); a drag still follows the pointer.

**Anime.js:** not added. There is no timeline or SVG sequence in posting.

**Bklit:** not applicable. Posting has no data to chart.

**Others:** none.

The UI-13 locality picker was not reused for the location step. It is a
multi-select search combobox; posting needs one city and one locality, and
the native selects are already accessible, work without JavaScript and are
16px.

## Bundle

Measured against UI-16 (`28a184d`), both built with `npm run build` and
served against the same fixture simulator.

| | UI-16 | UI-17 | Δ gzip |
|---|---|---|---|
| Photo step, first load (signed in, real posting URL) | 176.4 KB | 192.9 KB | **+16.5 KB** |
| Photo step, after first paint (Motion's drag and layout features) | — | 30.4 KB | **+30.4 KB** lazy |
| Post property (`/post`) | 171.5 KB | 171.4 KB | −0.1 KB |
| Property details | 213.0 KB | 214.6 KB | +1.6 KB |
| Other routes | | | −0.8 to −0.9 KB |

- **The photo step's total is +46.9 KB gzip**, about 10 KB more than the ≈37 KB estimated at the Stage A review. That estimate compared the photo step with `/post`, which already carried part of it; this table compares the same route across the two builds.
- **Property +1.6 KB** is webpack regrouping: the gallery's single 28.5 KB Motion chunk is now split into chunks shared with the photo step. Nothing new loads there.
- **Other routes** fell slightly from the same regrouping.

## Mobile, accessibility, no JavaScript

**Mobile:**
- no horizontal overflow at 320, 360, 375, 390, 412, 430, 768 and 1280 on every step, the photo step, the preview and publishing status;
- 16px fields and 44px targets, including the drag handle;
- the save strip shortens to "Not saved yet." on a phone;
- the step bar stays one line until opened.

**Accessibility:**
- one h1 per page; on the preview it is the review heading, with the listing's name under it;
- an option card's radio is named by its title alone and described by its line of meaning (wrapped in the label, both were read as one long name; fixed in validation);
- price fields keep "(₹)" in their accessible name (fixed in validation);
- the error summary takes focus;
- moves, drags, failures and removals are announced;
- drag is never the only way to reorder.

**No JavaScript:**
- every step posts as a GET form; the option cards are real radios;
- the maintenance amount appears through CSS;
- the step bar and coordinates open as native disclosures;
- the photo step says photos need JavaScript.

## Validation

| Command / check | Result |
|---|---|
| `npm run verify` | lint and typecheck clean; 683 unit tests, including the design guards (the scale-literal ratchet lost the posting literals UI-17 removed) |
| `npm run build` | passes |
| post-check | 96, rewritten for the rail and the phone bar (one visible navigation, the step in words, eight stages, one current, done steps linking back with answers kept, the track visible when closed), option cards and the map-position disclosure |
| pricing-check | 46, with and without JavaScript; maintenance and negotiation chosen by card |
| photo-check | 62 (was 49); details below |
| draft-check | 27 |
| description-check | 35, with the editor as "Your description" and the buyer's "About this property" showing the saved text, unique ids, the over-limit count and a 16px editor |
| preview, moderation, listing, dashboard | 24, 61, 23, 134 |
| motion-check | 117, including the posting fill |
| ui, shots, light, search, home, property, calculator, shell, phase-e | all pass |
| users, performance, lead, saved, admin, auth | all pass |
| login (both apps), notfound, media | 179 and 117, 36, 26/26 |
| style-diff (UI-16 → UI-17, 75 screens) | changes only on the posting screens; login and 404 scenes unchanged |

**photo-check, what changed:**
- The FLIP assertions are replaced by Motion's: the order changes at once, both moved photos are displaced mid-move, none at rest, and no displacement under reduced motion.
- Kept unchanged: keyboard reorder, focus, busy refusal and rollback.
- Added:
  - drag (lift, live order, saved and announced, cover following, rollback on a failed save);
  - drop (armed and ready states) and paste, each uploading and inserting at the end;
  - the empty state and cover badge;
  - handle size;
  - rows at 390 and cards at 768.

**style-diff, outside posting:**
- Home's and Property's image transitions differ only by whether the photo fade had started at capture time (`data-fade`); no rule or component involved changed.
- One resolved `auto` margin on Saved, with nothing moved.

**Defects found and fixed in validation:**
- the phone bar's track was hidden inside the closed disclosure;
- option cards read their description as part of their name;
- price fields lost the currency from their accessible name.

**Checks fixed, not the product:**
- Two flaky photo-check readings came from measuring tiles mid-animation; they now wait until every photo is at rest.
- An identity transform was being counted as movement.

The database checks (`*-db-check`) run in CI against Postgres; no schema or
query changed.

## Remaining issues

- **Long drags on a phone:** a photo cannot be dragged past the edge of the screen (no edge auto-scroll, by decision); Earlier and Later can move it anywhere.
- **Mid-flight distortion:** a tile entering a cell of a different height (a longer file name) is scaled for the animation's length.
- **Real listings:** amenities and landmarks will appear when posting collects them (from UI-16).
- **Dead CSS:** the ~60 UI-13 Home rules remain.

## UI-18 recommendation

Seller Dashboard visual redesign (the next stage in the roadmap's visual
track):
- the dashboard, listing cards and enquiries in the 1400px workspace language of UI-17;
- the status badges and actions unchanged in behaviour;
- the UI-10 analytics chart left as it is.
