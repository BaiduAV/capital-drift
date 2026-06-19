## 2024-05-18 - Avoid Runtime Errors on Locales
**Learning:** Do not commit lockfiles (e.g. `pnpm-lock.yaml`) during a small UI change. Keep PRs focused.
**Action:** Always verify if `locale` logic is robust.
## 2024-05-19 - Keyboard Accessibility for Custom List Rows
**Learning:** In interactive lists like `DividendCalendar.tsx`, clickable `div` elements lacking `role="button"`, `tabIndex`, and keyboard handlers are a common accessibility anti-pattern that completely blocks keyboard navigation.
**Action:** Always add `role="button"`, `tabIndex={0}`, and `onKeyDown` handlers for 'Enter' and 'Space' to custom interactive elements. Apply the standard focus ring classes (`focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background`) and include a visually hidden `sr-only` description for screen readers.
