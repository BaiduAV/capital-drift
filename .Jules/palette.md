## 2024-05-18 - Avoid Runtime Errors on Locales
**Learning:** Do not commit lockfiles (e.g. `pnpm-lock.yaml`) during a small UI change. Keep PRs focused.
**Action:** Always verify if `locale` logic is robust.

## 2024-05-19 - Accessible Pagination Dots and Interactive Lists
**Learning:** Empty elements like `div` or `button` used as pagination dots or interactive steps are invisible to screen readers unless explicitly labelled.
**Action:** Always wrap interactive lists (like tutorial steps) in a `role="group"` with an `aria-label`, and ensure each interactive item has a descriptive `aria-label`, `aria-current` or `aria-selected` state, and `focus-visible` styling for keyboard navigation.
