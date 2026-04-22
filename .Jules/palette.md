## 2024-05-18 - Avoid Runtime Errors on Locales
**Learning:** Do not commit lockfiles (e.g. `pnpm-lock.yaml`) during a small UI change. Keep PRs focused.
**Action:** Always verify if `locale` logic is robust.
## 2026-04-22 - Add aria-labels to Generic Inputs
**Learning:** Inputs without explicit `<Label>` components are inaccessible to screen readers, and adding `aria-label` attributes fixes this without visual disruption.
**Action:** Always verify if generic inputs like search bars or quantity adjusters have an `aria-label` or `id`/`htmlFor` pairing.
