## 2024-05-18 - Avoid Runtime Errors on Locales
**Learning:** Do not commit lockfiles (e.g. `pnpm-lock.yaml`) during a small UI change. Keep PRs focused.
**Action:** Always verify if `locale` logic is robust.

## 2024-06-25 - Accessible Icon Buttons with Counts
**Learning:** When adding explicit `aria-label`s to icon-only buttons that also display a numerical count, screen readers might read both the label and the raw text count, causing redundancy or confusion.
**Action:** Use `aria-hidden="true"` on the raw count text and icon elements inside the button when providing a comprehensive localized `aria-label` (e.g., `<button aria-label="42 likes"><Heart aria-hidden="true" /><span aria-hidden="true">42</span></button>`). For non-interactive elements, wrap them in `role="group"` to ensure the `aria-label` is announced correctly.
