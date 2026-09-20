# Badge

Short, high-trust markers on a property: verification, seller type, compliance and freshness.

Badges are the fastest trust signal on a card, so they are strictly rationed.

**Maximum two visible per card.** Priority order: `Verified` → `New` → `Price reduced` → everything else. Overflow is dropped, not stacked.

| Badge | Token | Means exactly |
|---|---|---|
| Verified | `trust-600` | Photos were captured at this property recently. **Nothing else.** |
| Owner / Agent / Builder | `ink-700` | Who is advertising — a top-three buyer filter |
| New | `brand-600` | Posted within 7 days |
| Price reduced | `supply-600` | Price dropped since publication |
| RERA | `ink-700` | A registration number is on file (self-declared in V1) |

**The scoping rule**: `Verified` carries a tooltip stating what was and was not checked — it does **not** mean ownership, documents, area or price were verified. A bare "Verified" with no scope is a legal exposure. Never ship one.

Every badge is an icon **plus** text **plus** colour, so it survives colour blindness and greyscale.
