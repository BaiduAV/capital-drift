## 2024-05-18 - Avoid Runtime Errors on Locales
**Learning:** Do not commit lockfiles (e.g. `pnpm-lock.yaml`) during a small UI change. Keep PRs focused.
**Action:** Always verify if `locale` logic is robust.
## 2024-05-18 - Stateful Icon-Only Buttons
**Learning:** Icon-only interactive buttons with counts (e.g. Like, Repost in social feeds) require localized `aria-label`, `title` tooltips, `focus-visible` classes for keyboard navigation, and importantly `aria-pressed` for screen readers to recognize them as toggles reflecting active state.
**Action:** When creating or modifying stateful interactive icon elements, apply these specific attributes systematically.
