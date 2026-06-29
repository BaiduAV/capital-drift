## 2024-05-18 - Avoid Runtime Errors on Locales
**Learning:** Do not commit lockfiles (e.g. `pnpm-lock.yaml`) during a small UI change. Keep PRs focused.
**Action:** Always verify if `locale` logic is robust.

## 2024-05-18 - Icon-Only Action Buttons with Numerical Counts
**Learning:** When implementing icon-only interaction buttons with numerical counts (e.g., Like, Repost in social feeds), applying `aria-label` directly to the button overrides the text content, leaving it completely accessible while hiding visual noise.
**Action:** Always ensure `aria-label` includes the count directly (e.g., `42 likes`), hide the raw count/icon with `aria-hidden="true"`, and apply localized `title` tooltips, `focus-visible` classes for keyboard navigation, and `aria-pressed` for stateful toggles. For non-interactive components acting as a single logical unit, use a wrapper with `role="group"` and `aria-label`.
