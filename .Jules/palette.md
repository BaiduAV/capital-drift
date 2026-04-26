## 2024-05-18 - Avoid Runtime Errors on Locales
**Learning:** Do not commit lockfiles (e.g. `pnpm-lock.yaml`) during a small UI change. Keep PRs focused.
**Action:** Always verify if `locale` logic is robust.
## 2024-05-18 - [Add semantic ARIA tags to Tutorial Step Indicators]
**Learning:** Icon-only buttons or dynamic arrays of simple elements (like dots indicating tutorial steps) generated through `map` often lack inherent semantic meaning to screen readers. Relying only on visual cues (like background color changes) isolates users who rely on assistive technologies.
**Action:** When creating multi-step interactive indicators, group them logically using `role="tablist"` and give individual elements `role="tab"`, setting `aria-selected` based on the active state. Ensure localized `aria-label` attributes define each step explicitly, and include explicit keyboard focus styles.
