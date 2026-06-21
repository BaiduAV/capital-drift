## 2024-05-18 - Avoid Runtime Errors on Locales
**Learning:** Do not commit lockfiles (e.g. `pnpm-lock.yaml`) during a small UI change. Keep PRs focused.
**Action:** Always verify if `locale` logic is robust.
## 2024-05-18 - Keyboard Support for Custom List Rows
**Learning:** Found an accessibility issue pattern specific to this app where complex interactive list rows (like dividend items or top movers) use `div` and `span` with `onClick` but lack keyboard navigation support (`role="button"`, `tabIndex`, and `onKeyDown`). Using custom focus utility classes (`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background`) provides an excellent visual focus indicator.
**Action:** When creating clickable non-button elements, always remember to pair `onClick` with `onKeyDown` supporting `Enter` and `Space`, and add appropriate ARIA roles and tabIndex.
