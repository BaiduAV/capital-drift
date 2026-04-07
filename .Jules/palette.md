## 2024-05-18 - Avoid Runtime Errors on Locales
**Learning:** Do not commit lockfiles (e.g. `pnpm-lock.yaml`) during a small UI change. Keep PRs focused.
**Action:** Always verify if `locale` logic is robust.

## 2024-05-24 - Accessibility for Inputs and Icon Buttons
**Learning:** In custom UI layouts, generic inputs (like Search bars or inline inline seeds) and icon-only buttons often lack proper accessibility labels. This can lead to screen reader users not knowing what an input is for or what a button does. For example, a `<label>` element without an `htmlFor` pointing to the `id` of an input does not associate correctly.
**Action:** Always explicitly link a visible `<label>` element to an `<input>` using `id` and `htmlFor`. When visible labels are not present, use `aria-label` for generic inputs and icon-only buttons, making sure to implement bilingual support when necessary (e.g., using the app's `locale` context).