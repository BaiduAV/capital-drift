## 2024-05-18 - Avoid Runtime Errors on Locales
**Learning:** Do not commit lockfiles (e.g. `pnpm-lock.yaml`) during a small UI change. Keep PRs focused.
**Action:** Always verify if `locale` logic is robust.

## 2026-03-20 - Adding ARIA labels to dynamically generated action buttons
**Learning:** When using map() to generate rows in a DataTable with icon-only action buttons, standard accessibility checks might miss them unless each dynamic button is tested. The `aria-label` should ideally include the unique identifier (e.g., asset ID) to distinguish them for screen readers.
**Action:** Ensure that all dynamically generated `size="icon"` buttons in lists or tables receive dynamic, descriptive, and localized `aria-label` attributes.
