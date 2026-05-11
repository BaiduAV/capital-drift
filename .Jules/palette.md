## 2024-05-18 - Avoid Runtime Errors on Locales
**Learning:** Do not commit lockfiles (e.g. `pnpm-lock.yaml`) during a small UI change. Keep PRs focused.
**Action:** Always verify if `locale` logic is robust.

## 2024-05-18 - Avoid Runtime Errors on Locales
**Learning:** Do not commit lockfiles (e.g. `pnpm-lock.yaml`) during a small UI change. Keep PRs focused.
**Action:** Always verify if `locale` logic is robust.

## 2024-05-18 - Accessible Multi-Step Pagination
**Learning:** Interactive step indicators (like the dots in a tutorial modal) need proper grouping and roles to be meaningful to screen readers.
**Action:** Wrap the step indicator container in `role="tablist"` and give each dot `role="tab"` with `aria-selected` denoting the active step, along with robust `aria-label`s. Ensure they have `focus-visible` styles for keyboard navigation.
