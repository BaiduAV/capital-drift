## 2024-05-18 - Avoid Runtime Errors on Locales
**Learning:** Do not commit lockfiles (e.g. `pnpm-lock.yaml`) during a small UI change. Keep PRs focused.
**Action:** Always verify if `locale` logic is robust.

## 2024-05-20 - Adding ARIA labels to Generic Form Inputs
**Learning:** Generic inputs (like search bars, quantity adjusters, and inline seeds) frequently lack explicit `<Label>` components, leading to screen reader accessibility issues.
**Action:** Manually add localized `aria-label` attributes to these components or pair them with explicit `id`/`htmlFor` labels if missing.
