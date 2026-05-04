## 2024-05-18 - Avoid Runtime Errors on Locales
**Learning:** Do not commit lockfiles (e.g. `pnpm-lock.yaml`) during a small UI change. Keep PRs focused.
**Action:** Always verify if `locale` logic is robust.

## 2024-05-19 - Keyboard Accessibility for Custom Interactive Elements
**Learning:** When making a `div` act like a button/link (e.g., using `onClick` for navigation), it requires `role="button"`, `tabIndex={0}`, an `onKeyDown` handler (for 'Enter' and 'Space'), and explicit `focus-visible` styling to be accessible to keyboard and screen reader users.
**Action:** Consistently apply these attributes to custom interactive elements.
