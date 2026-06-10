## 2024-05-18 - Avoid Runtime Errors on Locales
**Learning:** Do not commit lockfiles (e.g. `pnpm-lock.yaml`) during a small UI change. Keep PRs focused.
**Action:** Always verify if `locale` logic is robust.
## 2024-05-18 - Keyboard Navigation in Complex Custom Lists
**Learning:** When creating custom interactive list rows (like the ones in DividendCalendar), just adding `role="button"` and `tabIndex={0}` is not enough for screen readers. Using `aria-label` on the outer div can override all child text content, making the actual data invisible to screen readers.
**Action:** Add a visually hidden `<span className="sr-only">` inside the clickable row to announce the action (e.g., 'Trade Asset') while allowing the screen reader to naturally read the tabular data inside the row.
