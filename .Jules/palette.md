## 2024-05-18 - Avoid Runtime Errors on Locales
**Learning:** Do not commit lockfiles (e.g. `pnpm-lock.yaml`) during a small UI change. Keep PRs focused.
**Action:** Always verify if `locale` logic is robust.

## 2024-05-18 - Tutorial Modal Pagination Accessibility
**Learning:** Progress indicator dots in modals (like the Onboarding Tutorial) are often implemented as buttons but lack context for screen readers. Using `role="tablist"` on the container and `role="tab"`, `aria-selected`, and localized `aria-label`s on the individual buttons makes them significantly more accessible.
**Action:** When implementing custom pagination dots or multi-step indicator buttons, always wrap them in a semantically appropriate role (like `tablist` or `group`) and ensure individual items have explicit, descriptive labels and selection states.
