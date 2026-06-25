## 2024-05-18 - Avoid Runtime Errors on Locales
**Learning:** Do not commit lockfiles (e.g. `pnpm-lock.yaml`) during a small UI change. Keep PRs focused.
**Action:** Always verify if `locale` logic is robust.

## 2026-06-25 - ARIA Labels and Interaction Feedback on Social Feeds
**Learning:** Icon-only buttons (like interactions on a social feed) need robust accessibility attributes including `aria-label`, `title`, and `aria-pressed`. When grouping icons and non-interactive text counters for screen readers, wrapping them in a `span` with `role="group"` ensures the text is correctly overridden by the parent's label.
**Action:** Always provide translated `aria-label`s on icon-only buttons with interactive elements, use `aria-hidden="true"` on the visual icons/text, and utilize `focus-visible:ring-*` for keyboard navigation.
