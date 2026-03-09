## 2024-05-18 - Avoid Runtime Errors on Locales
**Learning:** Do not commit lockfiles (e.g. `pnpm-lock.yaml`) during a small UI change. Keep PRs focused.
**Action:** Always verify if `locale` logic is robust.

## 2025-03-09 - Missing Form Labels in Custom Layouts
**Learning:** Many generic inputs (like search bars, quantity adjusters, or inline seeds) in this codebase are used without a corresponding explicit `<Label>` or `aria-label`, meaning screen readers lack context for these controls.
**Action:** When working on UI views with inline or custom-styled inputs, always verify that `aria-label` or `id`/`htmlFor` pairings exist, especially for icon-only buttons or generic number/text fields.
