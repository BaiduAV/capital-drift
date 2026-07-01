## 2024-05-18 - Avoid Runtime Errors on Locales
**Learning:** Do not commit lockfiles (e.g. `pnpm-lock.yaml`) during a small UI change. Keep PRs focused.
**Action:** Always verify if `locale` logic is robust.

## 2024-05-19 - Accessible Social Feed Action Buttons
**Learning:** Icon-only action buttons (like Repost/Like in SocialFeed) with numerical counts often lack context for screen readers when using default text content. Also, non-interactive visual indicators (like reply counts) require `role="group"` to be properly announced with their `aria-label`.
**Action:** Added explicit localized `aria-label` attributes to include both count and action context, applied `aria-hidden="true"` to visual icons/numbers to prevent redundancy, added `aria-pressed` for stateful toggles, and included `focus-visible` ring utility classes for clear keyboard navigation states.
