# ContactBar

The sticky conversion surface on the property page — the component the business runs on.

The user must **never** be able to scroll into a position with no way to contact the seller.

- **Phone**: fixed to the bottom of the viewport, above the bottom nav (which it replaces on this page), `shadow-3`. Its padding adds `env(safe-area-inset-bottom)`.
- **Desktop (≥1024px)**: a sticky card in the right rail.

**Two tiers, deliberately**

1. **Enquire** — filled `brand-600`, low friction, sends a written message.
2. **View phone** — secondary. Triggers OTP verification, then reveals the number.

**The rule that protects the business**: the enquiry record is written **before** the number is displayed, and the seller's contact details are absent from the API payload until that point. Hiding a number in the UI while shipping it in the JSON is a real and common leak.

Repeat reveals by the same person on the same listing are deduplicated, so a seller is never charged twice for one lead.

**Consumer provides**: the listing id, the signed-in user, and handlers for enquire and reveal.
