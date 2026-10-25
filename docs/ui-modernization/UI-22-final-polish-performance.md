# UI-22 — Final polish and performance

Status: complete, 25 October 2026, on `main`. The owner approved Stage A (`fc0a130`) in one review. This stage follows [UI-21](UI-21-map-search-location-discovery.md).

It contains three pieces of work:
- private listing photos now load at the size they are shown, still access-checked and never publicly cached;
- the dead pre-redesign Home CSS is removed;
- three genuine cross-site inconsistencies are fixed.

Unchanged: authentication, authorization, moderation rules, the listing lifecycle, the schema, the Login and 404 scenes, the brand green, and the locality map with its documented limits (its basemap is still unverified in production).

## Private photos at size

**Before.**
- **UI-19's limit.** UI-19 taught the *public* listing photo route to resize on `?w=` after its per-request check.
- **Originals elsewhere.** Every other photo surface loaded originals of up to 1920px:
  - the gallery on real listings;
  - the owner's view and the posting preview;
  - the admin review gallery;
  - dashboard covers and photo-manager tiles.
- **Why the optimizer was not used.** These photos cannot go through the shared image optimizer: its copy is publicly cacheable for hours and would outlive a withdrawn listing or a revoked role.

**Now.** Every photo route resizes on `?w=`. Each does it only after its own access check, and each answers `private, no-store`, resized or not, success or refusal.

| Route | Who | Check before any read or resize |
|---|---|---|
| `/api/listings/[id]/photos/[photoId]` | anyone | the listing is public now (`readPublishedPhoto`, per request) |
| `/api/posting/photos/[id]` | the draft's owner | verified user (401), then an owner-scoped read |
| `/api/posting/submissions/[id]/photos/[photoId]` | the listing's owner | verified user (401), then an owner-filtered read |
| `/api/admin/moderation/[id]/photos/[photoId]` | staff | `reviewerUser` (non-staff get 404), the database's `moderation_photo` RPC, and the 2 MB bound before resizing |

**Shared rules.**
- **Widths.** A route accepts only the widths next/image requests (`lib/listings/photo-widths`). Any other width is a 404. A photo is never enlarged.
- **Loaders.** The gallery uses the route's own loader for every published, owner, staff and preview photo (`sizedByRoute`). Dashboard covers and photo-manager tiles, which are plain `<img>`, get a srcset from the same URLs (`listingPhotoSrcSet`).
- **Query strings.** The loader keeps a query the route already takes: the admin route's `?submission=`.

**Every access-checked photo was downloading twice.**
- **The preload.** A `priority` photo got a preload, and the `no-store` response could not be handed to the `<img>`. Access-checked photos are no longer preloaded; they load eagerly at `fetchpriority="high"` from the HTML.
- **The `onError` replay.** next/image re-assigns `img.src` after hydration whenever `onError` is set, to replay an error that happened before React attached. That restarts the request, which the cache absorbs for cacheable images but not for these. Failure is now caught by `photoRef` (`lib/motion/image-fade`): it checks for an image that already failed, listens for a later failure, and never touches `src`.
- **The fallback still works.** It is provoked by failing the photo route both before hydration and after it; both show `PhotoFallback`.

**Photo bytes per page.** Measured in production builds against the simulator, with realistic 1600×1200 JPEGs, scrolling the whole page:

| Page | Before (390 / 1440) | After (390 / 1440) |
|---|---|---|
| Seller dashboard, 6 covers | 497 / 497 KB | 22 / 16 KB |
| Real listing (public or owner) | 490 / 490 KB — one photo, downloaded twice | 85 / 55 KB — once |
| Admin review | 490 / 993 KB | 85 / 64 KB |
| Inbox thumbnail (UI-19) | — / 4.1 KB, twice | — / 2.1 KB, once |

### Resizing cost

The cost of one resize (sharp, one thread here, a 1920×1440 stored photo):

| Width | Time | Size |
|---|---|---|
| 96px | ≈10 ms | 2 KB |
| 200px | ≈13 ms | 6 KB |
| 320px | ≈19 ms | 13 KB |
| 768px | ≈75 ms | 55 KB |
| 1440px | ≈150 ms | 139 KB |

A dashboard of ten covers costs ≈130 ms of CPU (53 ms wall), and an admin review ≈135 ms (117 ms wall).

**The concrete concern.** Because nothing may be cached, every view pays this again:
- a popular public listing pays ≈75 ms per desktop view;
- opening the full-screen viewer pays ≈150 ms per photo at 1440px.

At launch traffic this is server CPU time, not a failure. It should be watched in production function metrics.

**What could be done later, within the rules:**
- an access-aware private cache (for example, a short `private, max-age` only on public listings, accepting a revocation delay of that length);
- resized variants generated once at upload and stored privately beside the original.

Neither was built here: both change the revocation or storage model.

## Dead Home CSS

**What was removed.** About 200 rules of the Phase E home that no source file references, from `app/globals.css`:
- the reference banner and sticky search;
- quick routes and type, locality, budget and size tiles;
- the discovery band and possession section;
- the old seller invitation and orbit, the "why" points, and the rail end card.

The rules nested under those classes went too. Comments left describing nothing were removed or reworded.

**How "unused" was proven.**
- **Static scan.** Every class in the stylesheet was searched for across `app`, `components` and `lib` as a whole word.
- **Built names.** Runtime-built names were checked by hand (`home-map-${i}`, `type-tone-${i}`, `nav-panel-${id}` are used; `locality-${slug}` is an id, not a class).
- **Rendering.** style-diff over 75 screens shows **no rendering change** from the removal.
- **Protected scenes.** The login street and 404 scenes are identical.

**style-diff notes.**
- **The intended change.** The only real difference is the locality field's new focus ring (below).
- **A measurement quirk.** `.guest-activity` reports its `auto` margins as 0px in one capture and 190px in the other, with an identical box (x 190, width 900).

**Effect.** Shared CSS on every route is 31.4 → 28.5 KB gzip. The scale-literal ratchet loses its 23 entries for the removed declarations.

**Also unreferenced, but not Home** (left for a focused cleanup):
- the old header hub (`hub-cols`, `hub-sheet`, `hub-subgroup`, `menu-home`);
- the pre-UI-18 workspace (`workspace-tabs`, `workspace-toolbar`, `workspace-summary`, `workspace-counts`);
- `footer-intro`.

## Cross-site consistency

A measured audit compared every redesigned page at 390 and 1440 on the same points: frame width, h1 and h2 typography, focus rings by keyboard, small targets, and overflow. No page overflows.

**Already by design:**
- whole-card and whole-row links, where the card draws the ring;
- checkboxes and radios inside full-size labels;
- the sort pill's `:focus-within` ring;
- the workspace's smaller heading scale.

**Fixed:**
- **My enquiries** (`/account/enquiries`) was the one account page still on the pre-redesign layout: a 1024px frame, glass cards, a different heading scale, and raw status codes ("Status: contacted"). It is now in Saved's frame (mint band, 1400px, white cards):
  - the seller's status reads in the inbox's words, with what it means from the buyer's side ("Contacted — the seller has marked it answered");
  - the history says "Marked Contacted";
  - the shared empty and error states replace the hand-made ones;
  - the title links are 44px targets.
- **Account:** the profile-unavailable warning was a one-off box. It now uses the shared `ErrorState`.
- **Locality field** (Home hero, filters, picker): keyboard focus showed only a 1px border tint, the weakest focus state on the site. Its frame now draws the product's 2px focus ring.

## Performance

Production builds, first load, gzip (UI-21 → UI-22):

| Route | JS | CSS | HTML |
|---|---|---|---|
| Home | 179.5 → 179.7 | 31.4 → 28.5 | 38.5 → 38.6 |
| Search | 183.6 → 183.8 | 32.8 → 30.0 | 35.9 → 36.0 |
| Property | 214.8 → 215.0 | 31.4 → 28.5 | 23.7 → 23.7 |
| Login | 171.8 → 171.8 | 38.0 → 35.2 | 32.3 → 32.3 |
| 404 | 179.5 → 179.7 | 31.4 → 28.5 | 13.4 → 13.4 |
| Dashboard | 185.4 → 185.6 | 31.4 → 28.5 | 20.8 → 21.6 |
| Account | 170.4 → 170.4 | 31.4 → 28.5 | 16.3 → 16.3 |
| My enquiries | 167.1 → 167.1 | 31.4 → 28.5 | 11.8 → 13.1 |
| Real listing | 213.7 → 213.9 | 31.4 → 28.5 | 17.5 → 17.7 |
| Admin review | 221.4 → 221.8 | 31.4 → 28.5 | 17.6 → 18.3 |

- **JavaScript:** +0.2 to 0.4 KB is the loader and `photoRef`.
- **HTML:** grows where srcsets were added.
- **Dependencies:** no new one.
- **Isolation:** no map code or map CSS on any route other than Search.

## Validation

Stage B ran on one fresh production build.

**Unit, database and Python:**
- `npm run verify`: lint clean, typecheck clean, 735 tests in 85 files.
- `npm run build`: succeeds.
- All ten `*-db-check`s (PGlite): media 11, draft 10, preview 8, listing 41, enquiry 32, analytics 39, admin 38, description 27, moderation 49, users 78.
- `python-check`: 55 tests.

**Browser checks:**

| Area | Passed |
|---|---|
| Public app | phase-e 78, home 163, search 80, map 94, calculator 43, shell 355, motion 117, ui 137, pricing 46, post 96, not-found 36, login 117, property 73, media 26 |
| Simulator app | moderation 65, users 170, listing 23, dashboard 176, performance 229, admin 289, description 35, preview 24, lead 42, saved 24, draft 27, photo 62, auth 71, login (auth) 179 |
| Layout | `shots`: no horizontal overflow at any width |
| Theme | `light-check`: holds under a dark-mode browser |

**Checks that expected originals.** Two checks still expected the 640px original where the gallery now asks for the slot's width:
- `listing-check`: the owner's submitted copy and the public copy;
- `preview-check`: the posting preview.

Both now assert the stricter thing:
- the right route, by path;
- a `w` was asked for;
- the photo is never enlarged past the fixture;
- the response is `private, no-store` JPEG.

The old preview assertion was run once against this build and fails as expected. `moderation-check` and `lead-check` were updated the same way in Stage A.

**Unchanged since Stage A, and still holding:**
- Home's style-diff (0 changes);
- the identical login and 404 fingerprints;
- `protected-scenes.test.ts`, inside `verify`.

No login or 404 file is in the diff.

The queue-registration import step needs the `vercel` Python package, which CI installs. UI-22 changes no Python.

## Remaining issues

- **Resizing CPU:** see above. Watch production function metrics; a private cache or stored variants are the options.
- **Viewer resolution:** the full-screen viewer is capped at 1440px wide on very large desktops, the same cap demo photos already had.
- **Unreferenced non-Home CSS:** listed above.
- **Carried forward:**
  - the locality points' OpenStreetMap check and the real basemap are unverified in production (UI-21);
  - anonymous reads of live listings' exact coordinates await a privacy review (UI-21).
