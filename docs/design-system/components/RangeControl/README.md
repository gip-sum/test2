# RangeControl

Budget and area selection on a non-linear scale, with exact numeric entry beside it.

The single most-used filter, and the one most often built wrong.

**Why non-linear**: a linear ₹0–₹10 Cr slider makes the ₹40–60 L band — where most Kolkata inventory actually sits — about four pixels wide and effectively unselectable. The scale is piecewise, with far more resolution at the low end.

**Rules**

- **Always pair the slider with numeric inputs.** Some people drag; some people know their number and want to type it.
- Values display in Indian format (`₹62.5 L`, `₹1.4 Cr`), and the underlying value stays an integer in rupees.
- The same control serves area, with `sqft` and a linear scale.
- Both handles are keyboard operable (arrows step, Home/End jump) and carry `aria-valuetext` in the formatted form so a screen reader says "62 lakh", not "6250000".
- Committing a change updates the URL, so a filtered search is shareable.

**Consumer provides**: min, max, current values, and the scale type.
