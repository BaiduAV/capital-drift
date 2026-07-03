## 2024-05-18 - Avoid Runtime Errors on Locales
**Learning:** Do not commit lockfiles (e.g. `pnpm-lock.yaml`) during a small UI change. Keep PRs focused.
**Action:** Always verify if `locale` logic is robust.

## 2024-07-03 - Semantic grouping of icons and text
**Learning:** Using an `aria-label` directly on a generic non-interactive `span` is often ignored by screen readers. Furthermore, displaying raw numbers next to an SVG icon without explicitly hiding them can lead to disjointed, confusing readouts ("SVG 42").
**Action:** Always add `role="group"` to the parent `span` if it requires an `aria-label`. To ensure clean announcements, also add `aria-hidden="true"` to both the decorative SVG child and the raw text counter child.
