## 2024-05-18 - Avoid Runtime Errors on Locales
**Learning:** Do not commit lockfiles (e.g. `pnpm-lock.yaml`) during a small UI change. Keep PRs focused.
**Action:** Always verify if `locale` logic is robust.

## 2024-06-23 - Screen Reader Support for Numerical Actions
**Learning:** Adding `aria-label` directly to an outer wrapper of an icon and count overrides the child text, but screen readers might skip a generic `span`. For interactive buttons, `aria-pressed` combined with `aria-hidden` on child elements cleanly communicates state without redundant visual information being read.
**Action:** Use `role="group"` on non-interactive wrapper spans when applying `aria-label`. For toggle buttons, use `aria-pressed` and hide the icon/count using `aria-hidden="true"` while applying localized labels to the button directly.
