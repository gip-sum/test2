# SkeletonCard

The loading state for a result list — matched to the final card so nothing shifts when data arrives.

**Skeletons, never spinners,** for content areas. This is most of how CLS stays under 0.05.

**The rule**: a skeleton's dimensions match the real element exactly. If the real card's photo is a 4:3 box and its title is two lines, the skeleton is too. A skeleton that is the wrong height causes the exact layout shift it was meant to prevent.

**Counts**: 6 card skeletons on a result list, 1 gallery box plus 3 text bars on a property page, stat tiles at final size on a dashboard.

**Rules**

- The shimmer respects `prefers-reduced-motion` — it becomes a static tint.
- Skeletons are `aria-hidden`, with a single polite live region announcing "Loading properties".
- A working **button** keeps its width and swaps its label for a spinner; a shrinking button moves everything beside it.
- Never show a skeleton for longer than ~3 seconds without switching to an error state with a retry.

**Consumer provides**: the count and the variant.
