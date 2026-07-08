## 2024-05-18 - Avoid Runtime Errors on Locales
**Learning:** Do not commit lockfiles (e.g. `pnpm-lock.yaml`) during a small UI change. Keep PRs focused.
**Action:** Always verify if `locale` logic is robust.

## 2026-07-08 - Accessible Stateful Icon Buttons with Counts
**Learning:** In SocialFeed components, `aria-label` directly on wrappers can be too generic or omit numerical counts, and raw counts inside buttons can cause screen readers to read "Like, 42" awkwardly.
**Action:** Always place `aria-label` (including the count, e.g., "42 likes") and a localized `title` on the button itself. Add `aria-pressed` for state toggles, apply `focus-visible` classes for keyboard navigation, and wrap the visible icon and count in a `span` with `aria-hidden="true"` to prevent redundant reading.
