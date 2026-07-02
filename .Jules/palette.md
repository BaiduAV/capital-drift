## 2024-05-18 - Avoid Runtime Errors on Locales
**Learning:** Do not commit lockfiles (e.g. `pnpm-lock.yaml`) during a small UI change. Keep PRs focused.
**Action:** Always verify if `locale` logic is robust.

## 2024-11-09 - Accessible Interactive Icons
**Learning:** In complex engagement blocks, generic non-interactive `span` elements require `role="group"` to force screen readers to read their `aria-label` instead of defaulting to their children's text. When applying `aria-label` to these compound components or to buttons containing icons and visible numbers, the internal visible content (both icons and text) must be hidden from screen readers using `aria-hidden="true"` to prevent redundant or confusing announcements.
**Action:** Use `role="group"` with `aria-label` on non-interactive semantic wrappers, and apply `aria-hidden="true"` to internal decorative/redundant elements like icons and text nodes within interactive buttons to ensure clean screen reader output.
