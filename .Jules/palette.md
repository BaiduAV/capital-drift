## 2024-05-18 - Avoid Runtime Errors on Locales
**Learning:** Do not commit lockfiles (e.g. `pnpm-lock.yaml`) during a small UI change. Keep PRs focused.
**Action:** Always verify if `locale` logic is robust.

## 2024-05-18 - A11y on Social Feed Engagement Buttons
**Learning:** Icon-only interactive buttons in dynamic lists (like the SocialFeed's Repost and Like buttons) must announce state (`aria-pressed`), function (`title`, `aria-label`), and clearly show visual focus (`focus-visible`). Decorative internal icons must be hidden (`aria-hidden="true"`) to prevent double-readouts by screen readers.
**Action:** Always wrap interactive counts in standard `<button>` or `<span role="button" tabIndex={0}>` tags, and inject localized aria-labels and standard Tailwind `focus-visible` utilities across all similar components.
