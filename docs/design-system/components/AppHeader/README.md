# AppHeader

The persistent top bar, and the one place the supply-side call to action always appears.

**Logo left is not a style choice** — people expect "home" there, and breaking that convention measurably costs task success.

**Post property uses `supply-600`, never `brand-600`.** In a two-sided marketplace the supply-side action must be visually distinct from the buyer's primary action. This is the most visible application of the two-accent system.

**Rules**

- Sticky, with `top: env(safe-area-inset-top)` — not `0`.
- On scroll past the hero, a condensed search bar appears in the header so search is never more than one tap away.
- Phone: logo + account only; navigation lives in the bottom bar.
- Signed out shows "Log in"; signed in shows the account menu. Nothing else changes — a signed-out person can browse everything except contacting.

**Consumer provides**: auth state and the current route.
