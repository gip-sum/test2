# Loading, empty and error states

Half of a real product is what it shows when there is nothing to show. These are specified, not improvised.

## Loading

**Skeletons, never spinners,** for content areas. A skeleton matches the final element's dimensions exactly so nothing shifts when data arrives — this is most of how CLS stays under 0.05.

- Result list: 6 card skeletons at the exact card height.
- Property page: gallery box at 4:3, then three text bars.
- Dashboard: stat tiles at final size.
- A button that is working keeps its width and swaps its label for a spinner — a shrinking button moves everything beside it.

A spinner is acceptable only inside a control that already has a fixed size.

## Empty

An empty state is never a dead end. Every one names the situation, explains it in one line, and offers the single most useful next action.

| Where | What it says | The action |
|---|---|---|
| Search, zero results | "No properties match all your filters" | Name the most restrictive filter and offer to remove it |
| Search, zero results (cont.) | "12 properties within 5 km" | Widen the radius |
| Saved properties | "Nothing saved yet" | "Browse flats in Kolkata" |
| My listings | "You haven't posted a property yet" | "Post your property — it's free" (`supply-600`) |
| Lead inbox | "No enquiries yet" | Explain what improves visibility: photos, completeness |
| Admin queue | "Queue is clear" | Plain confirmation, no action needed |

### The zero-result ladder

Applied in order, and **always disclosed** with one-tap undo. A silently relaxed search feels like a broken filter.

1. Widen budget ±10%, then ±25%
2. Expand radius: locality → 3 km → 5 km → 10 km
3. Relax configuration (3 BHK → 3 or 4 BHK)
4. Drop the least selective amenity filters
5. Include adjacent localities
6. Offer: save this search

## Error

Three rules:

1. **Keep the user's context.** Filter chips stay rendered. Scroll position holds. Never bounce to the homepage — that is the incumbent's most-complained-about failure.
2. **Retry in place.** The retry button sits where the content would have been.
3. **Say what to do.** "We couldn't load these results. Check your connection and try again." Not "Something went wrong."

| Error | Message | Recovery |
|---|---|---|
| Search failed | "We couldn't load these results." | Retry, filters intact |
| Photo upload failed | "3 of 12 photos didn't upload." | Retry just those three |
| OTP wrong | "That code doesn't match. 2 attempts left." | Re-enter, resend after timer |
| OTP expired | "That code expired." | Resend |
| Rate limited | "Too many attempts. Try again in 10 minutes." | Explain the wait, never fail silently |
| Listing rejected | The specific reason plus the field to fix | "Edit and resubmit" |
| Property gone (410) | "This property is no longer listed." | Similar active properties |

## Offline

Tell the user they are offline and what still works — saved properties and drafts should remain readable. Mobile connectivity in this market is unreliable enough that this is worth building.
