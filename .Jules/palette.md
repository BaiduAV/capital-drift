## 2024-05-18 - Avoid Runtime Errors on Locales
**Learning:** Do not commit lockfiles (e.g. `pnpm-lock.yaml`) during a small UI change. Keep PRs focused.
**Action:** Always verify if `locale` logic is robust.

## 2024-05-19 - Keyboard Accessibility for List Items
**Learning:** Interactive lists using `div` with `onClick` handlers need explicit ARIA roles, `tabIndex`, keyboard event handlers, and focus styles for accessibility. This is a common pattern in custom list components.
**Action:** When making a `div` act as a button or list item, always add `role="button"`, `tabIndex={0}`, handle `Enter` and `Space` keys in `onKeyDown`, and provide a clear `aria-label` with `focus-visible` styling.
