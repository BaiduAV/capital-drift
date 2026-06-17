## 2024-05-18 - Avoid Runtime Errors on Locales
**Learning:** Do not commit lockfiles (e.g. `pnpm-lock.yaml`) during a small UI change. Keep PRs focused.
**Action:** Always verify if `locale` logic is robust.

## 2024-06-17 - Social Feed Engagement Button Accessibility Context
**Learning:** When implementing icon-only interaction buttons with numerical counts (like the Like or Repost buttons in the social feed), simply adding an `aria-label` like "Like" overrides the count from the perspective of a screen reader. The screen reader will read "Like button" but ignore the adjacent count (e.g., "42"), leading to a loss of context. Furthermore, toggleable buttons must use `aria-pressed` to correctly announce their current state (e.g., whether a post is already liked).
**Action:** When creating or updating interaction buttons with inline counts, ensure the `aria-label` includes the count context directly (e.g., `aria-label="42 likes"` instead of just `aria-label="Like"`), use localized strings, hide the raw count/icon with `aria-hidden` if necessary to prevent duplication, apply `aria-pressed` for toggle states, and always include `focus-visible` styles for clear keyboard navigation.
