## 2026-02-28 - Added ARIA Label to Market Shopping Cart
**Learning:** The 'Market' page had an icon-only button (ShoppingCart) missing an `aria-label`, making it inaccessible to screen readers. It highlights that action buttons inside tables/grids need explicit labeling, especially when they depend on context (the row's asset ID).
**Action:** Add `aria-label` to any icon-only button inside repeated elements, ensuring the label includes contextual information (like the item name or ID) so users know exactly what the button acts upon.
