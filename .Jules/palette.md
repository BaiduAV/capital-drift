## 2024-05-18 - Avoid Runtime Errors on Locales
**Learning:** Do not commit lockfiles (e.g. `pnpm-lock.yaml`) during a small UI change. Keep PRs focused.
**Action:** Always verify if `locale` logic is robust.

## 2024-10-31 - Keyboard Accessibility for Clickable Elements
**Learning:** Found a recurring pattern in the app (e.g., `DividendCalendar.tsx`, `Market.tsx`, `Trade.tsx`) where `div` elements act as buttons via `onClick` but lack keyboard support. Screen readers and keyboard users cannot easily navigate or activate these items.
**Action:** When converting a `div` or `span` into a clickable item with `onClick`, ensure keyboard accessibility by explicitly adding `role="button"`, `tabIndex={0}`, an `onKeyDown` handler to intercept 'Enter' and 'Space' (calling `e.preventDefault()`), and standard `focus-visible` outline utilities (`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background`).
