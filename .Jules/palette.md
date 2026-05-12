## 2024-05-18 - Avoid Runtime Errors on Locales
**Learning:** Do not commit lockfiles (e.g. `pnpm-lock.yaml`) during a small UI change. Keep PRs focused.
**Action:** Always verify if `locale` logic is robust.
## 2026-05-12 - Onboarding Tutorial Navigation Dots & Icon Button Accessibility
**Learning:** When using dots to indicate steps (like in the Onboarding Tutorial), screen readers cannot deduce their purpose from visual styling alone. Icon-only buttons (like the close 'X' button) also fail accessibility checks without textual descriptions.
**Action:** Use `role="group"` and a descriptive `aria-label` on the step container, and `aria-current="step"` and `aria-label` on individual step buttons. Always add an `aria-label` to icon-only buttons. Add `focus-visible` utility classes for clear keyboard navigation.
