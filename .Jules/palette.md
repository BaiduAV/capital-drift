## 2024-05-18 - Avoid Runtime Errors on Locales
**Learning:** Do not commit lockfiles (e.g. `pnpm-lock.yaml`) during a small UI change. Keep PRs focused.
**Action:** Always verify if `locale` logic is robust.
## 2026-04-23 - Dynamic aria-label requires string interpolation
**Learning:** When a button text depends on dynamic data (like the seed number) and we need an `aria-label`, the `aria-label` must explicitly include that dynamic data since it completely overrides the visible text for screen readers. Using just "Copy seed" without the number makes it less informative.
**Action:** Always include the dynamic element values inside localized aria-labels when they replace dynamic visual text.
