## 2024-05-18 - Avoid Runtime Errors on Locales
**Learning:** Do not commit lockfiles (e.g. `pnpm-lock.yaml`) during a small UI change. Keep PRs focused.
**Action:** Always verify if `locale` logic is robust.

## 2024-05-18 - Screen Reader Accessibility for Complex List Rows
**Learning:** Applying `aria-label` directly to an outer wrapper of a complex interactive list row completely overrides the child text (tabular data) in the accessibility tree, making it confusing for screen reader users.
**Action:** When adding screen reader accessibility to complex interactive list rows, use a visually hidden `<span className="sr-only">` inside the row to announce the action, preserving the tabular data in the accessibility tree.
