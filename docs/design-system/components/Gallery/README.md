# Gallery

The property photo viewer — the most-used element on the detail page.

**Rules**

- **Only the first image loads eagerly**, with `fetchpriority="high"`. Everything else is `loading="lazy"`. Images are the dominant byte cost of this page.
- Every frame is a fixed **4:3** box reserved before load.
- **Never autoplay.** A carousel that advances on its own is disorienting and hurts accessibility.
- Swipe on touch, arrows on pointer devices, **left/right arrow keys always**, Escape closes the lightbox.
- The counter ("4 / 14") is always visible — people want to know how much there is.
- Tabs switch between Photos, Video and Floor plan. A floor plan is shown `contain` on a fixed canvas — **never cropped**.
- On phones the gallery is full-bleed; the page gutter resumes below it.
- Alt text is generated from listing attributes: "3 BHK living room, New Town" — never "image1".

**Consumer provides**: the ordered media list with types and alt text.
