## 2024-05-18 - Avoid Runtime Errors on Locales
**Learning:** Do not commit lockfiles (e.g. `pnpm-lock.yaml`) during a small UI change. Keep PRs focused.
**Action:** Always verify if `locale` logic is robust.

## 2024-05-19 - Accessible List Row Wrappers
**Learning:** When making complex interactive list rows (like those in `DividendCalendar.tsx`) accessible, applying `aria-label` directly to the outer wrapper (`<div role="button">`) completely overrides its inner text content in the accessibility tree. This hides critical tabular data (yields, dates, etc.) from screen reader users.
**Action:** Use a visually hidden `<span>` (e.g. `sr-only`) to add actionable context to interactive list rows without destroying the underlying data readout, and pair the wrapper with `role="button"`, `tabIndex={0}`, standard `focus-visible` styles, and keyboard event handlers.
