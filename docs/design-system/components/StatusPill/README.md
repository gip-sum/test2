# StatusPill

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
