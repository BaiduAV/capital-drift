## 2024-05-18 - Avoid Runtime Errors on Locales
**Learning:** Do not commit lockfiles (e.g. `pnpm-lock.yaml`) during a small UI change. Keep PRs focused.
**Action:** Always verify if `locale` logic is robust.

## 2024-05-19 - Accessible Icon-Only Buttons with Counts
**Learning:** When implementing icon-only interaction buttons with numerical counts (e.g., Like, Repost in social feeds), screen readers often read just the number or lack context if standard labeling isn't applied. For generic `span` elements, an `aria-label` is ignored unless `role="group"` is present.
**Action:** Always add `role="group"` to non-interactive `span` wrappers, hide the raw count and icon with `aria-hidden="true"`, and apply `aria-label` with the full context (e.g., "42 likes"). For buttons, add localized `title` tooltips, `focus-visible` classes for keyboard navigation, and `aria-pressed` for stateful toggles.
