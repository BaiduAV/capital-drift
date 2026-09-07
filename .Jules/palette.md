## 2024-05-18 - Avoid Runtime Errors on Locales
**Learning:** Do not commit lockfiles (e.g. `pnpm-lock.yaml`) during a small UI change. Keep PRs focused.
**Action:** Always verify if `locale` logic is robust.

## 2024-05-20 - Adding ARIA labels to Generic Form Inputs
**Learning:** Generic inputs (like search bars, quantity adjusters, and inline seeds) frequently lack explicit `<Label>` components, leading to screen reader accessibility issues.
**Action:** Manually add localized `aria-label` attributes to these components or pair them with explicit `id`/`htmlFor` labels if missing.

## 2024-05-18 - Multi-step interactive indicators accessibility
**Learning:** When building multi-step interactive indicators (like tutorial navigation dots), wrapping them in a container with `role="group"` and `aria-label`, adding explicit `aria-label` to each dot (e.g. "Go to step X"), and using `aria-current="step"` on the active dot provides a standard accessible pattern. Furthermore, custom interactive elements must explicitly include `focus-visible` utility classes to support keyboard navigation.
**Action:** When implementing similar interactive indicators or custom buttons, ensure this pattern is applied and standard `focus-visible` outline styles are included.
## 2024-05-18 - Keyboard Support for Custom List Rows
**Learning:** Found an accessibility issue pattern specific to this app where complex interactive list rows (like dividend items or top movers) use `div` and `span` with `onClick` but lack keyboard navigation support (`role="button"`, `tabIndex`, and `onKeyDown`). Using custom focus utility classes (`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background`) provides an excellent visual focus indicator.
**Action:** When creating clickable non-button elements, always remember to pair `onClick` with `onKeyDown` supporting `Enter` and `Space`, and add appropriate ARIA roles and tabIndex.
