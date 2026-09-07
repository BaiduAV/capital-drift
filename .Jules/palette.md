## 2024-05-18 - Avoid Runtime Errors on Locales
**Learning:** Do not commit lockfiles (e.g. `pnpm-lock.yaml`) during a small UI change. Keep PRs focused.
**Action:** Always verify if `locale` logic is robust.

## 2024-05-20 - Adding ARIA labels to Generic Form Inputs
**Learning:** Generic inputs (like search bars, quantity adjusters, and inline seeds) frequently lack explicit `<Label>` components, leading to screen reader accessibility issues.
**Action:** Manually add localized `aria-label` attributes to these components or pair them with explicit `id`/`htmlFor` labels if missing.

## 2024-05-18 - Multi-step interactive indicators accessibility
**Learning:** When building multi-step interactive indicators (like tutorial navigation dots), wrapping them in a container with `role="group"` and `aria-label`, adding explicit `aria-label` to each dot (e.g. "Go to step X"), and using `aria-current="step"` on the active dot provides a standard accessible pattern. Furthermore, custom interactive elements must explicitly include `focus-visible` utility classes to support keyboard navigation.
**Action:** When implementing similar interactive indicators or custom buttons, ensure this pattern is applied and standard `focus-visible` outline styles are included.
