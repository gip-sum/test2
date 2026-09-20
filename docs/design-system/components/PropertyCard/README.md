# PropertyCard

The unit of comparison, and the single most important component in the product.

Every buyer decision starts here. The card exists to answer one question — *is this worth opening?* — with the fewest possible elements.

**Two layouts, one component**

- **Horizontal** below 768px: photo left at 40%, content right. A vertical card shows about 1.5 results per phone screen; horizontal shows 3–4 while keeping the photo meaningful.
- **Vertical** from 768px up: 2-up at tablet, 3-up on desktop.

**Content, in priority order**

1. **Price** — the largest thing on the card, in the display face with tabular numerals, Indian format.
2. **Configuration** — `3 BHK · 3 Baths · 1,240 sqft (carpet)`. **The area basis is never omitted.**
3. **Title** — project or society name, two lines maximum.
4. **Locality, City**
5. **Up to three attributes** — status, furnishing, floor.
6. **Seller type** — Owner / Agent / Builder. A top-three buyer filter, so it always shows.
7. **Freshness** — "Posted 3 days ago". Recency is a strong quality proxy.

**Rules**

- Photo box is a fixed **4:3** via `aspect-ratio` — reserved before load, which is most of how CLS stays under 0.05. 4:3 shows interiors better than 16:9.
- **One filled primary action.** "Enquire" is filled; "View phone" is secondary; save and share are icon-only.
- Save is optimistic: it fills immediately, and if the user is signed out the auth sheet opens and the save replays after login.
- Maximum two badges. Overflow is dropped, not stacked.
- The whole card is a link; nested controls stop propagation.
- `shadow-0` at rest. Cards separate with `border-subtle` — fifty shadows in a scrolling list cost real paint time on a mid-range phone.
- Hover lift only under `@media (hover:hover)`.

**Consumer provides**: the listing object and handlers for save, enquire and reveal.
