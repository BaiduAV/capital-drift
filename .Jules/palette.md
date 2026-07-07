## 2024-05-18 - Avoid Runtime Errors on Locales
**Learning:** Do not commit lockfiles (e.g. `pnpm-lock.yaml`) during a small UI change. Keep PRs focused.
**Action:** Always verify if `locale` logic is robust.

## 2024-05-19 - Accessible Dynamic Counters with Icon Toggles
**Learning:** When implementing icon-only interaction buttons with numerical counts (e.g., Like, Repost in social feeds), relying solely on the raw count and icon is inaccessible. Applying `aria-label` directly to the button provides context, but it completely overrides child text elements in the accessibility tree, requiring the manual inclusion of the dynamic count within the `aria-label` string (e.g., `${likeCount} likes`).
**Action:** When styling icon-and-count button combinations, construct a dynamic `aria-label` that includes both context and count, hide the raw UI elements with `aria-hidden="true"`, and use `aria-pressed` to correctly announce stateful toggles to screen readers.
