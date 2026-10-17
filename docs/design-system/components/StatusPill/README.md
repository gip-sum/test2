# StatusPill → StatusBadge

> **Shipped as `components/ui/StatusBadge.tsx` (UI-05).** The Phase 0
> `StatusPill` below was never imported and its status set had drifted; it
> was removed. The badge reads labels from `STATUS_BADGE_LABEL` and tones
> from `LISTING_STATUS_TONE` (`lib/listings/status-tone.ts`, UI-03), so a
> status reads and looks the same on every screen:
>
> | Status | Label | Tone |
> |---|---|---|
> | `DRAFT` | Draft | neutral |
> | `UNDER_REVIEW` | Under review | pending |
> | `ACTIVE` | Active | live |
> | `CHANGES_REQUESTED` | Corrections requested | pending |
> | `REJECTED` | Rejected | problem |
> | `EXPIRED` | Expired | neutral |
> | `WITHDRAWN` | Withdrawn | neutral |
> | `REMOVED` | Removed | neutral |
> | `DELETED` (stored lifecycle) | Deleted | neutral |
>
> The Phase 0 design that follows is kept for its rules; its labels and
> state names are historical.

The listing lifecycle, in words a first-time seller understands.

The database has states like `UNDER_SCREENING`. The seller reads "Being reviewed". This component is the entire translation layer, and it is the reason a non-technical owner can use the dashboard.

| State | Pill label | Token |
|---|---|---|
| `DRAFT` | Draft | `neutral` |
| `UNDER_SCREENING` | Being reviewed | `warn` |
| `ACTIVE` | Live | `trust` |
| `REJECTED` | Needs changes | `danger` |
| `EXPIRED` | Expired | `neutral` |
| `SOLD` / `RENTED` | Closed | `neutral` |
| `REPORTED` | Reported | `danger` |

**Rules**

- "Needs changes" always appears with the specific reason and an "Edit and resubmit" action. A rejection with no reason generates support load and churn.
- "Being reviewed" sets an expectation: "usually a few hours".
- Expired listings prompt renewal *before* they expire, not after.
- Colour is never the only signal — the label carries the meaning on its own.
