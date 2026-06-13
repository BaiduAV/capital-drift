## 2024-05-18 - Avoid Runtime Errors on Locales
**Learning:** Do not commit lockfiles (e.g. `pnpm-lock.yaml`) during a small UI change. Keep PRs focused.
**Action:** Always verify if `locale` logic is robust.

## 2024-06-13 - Icon-Only Button Context
**Learning:** Icon-only interactive buttons, like those found in the social feed for Likes, Reposts, and Replies, inherently lack context for screen readers when they only contain icons and counts. This pattern creates an inaccessible experience for non-sighted users.
**Action:** When implementing or updating icon-only buttons with counts, ensure they are wrapped with `aria-label` (localized, e.g., `locale === 'pt-BR' ? 'X Curtidas' : 'X Likes'`), `title` tooltips, and `focus-visible` classes for keyboard navigation. Additionally, stateful toggles (like Like/Repost) must include `aria-pressed`.
