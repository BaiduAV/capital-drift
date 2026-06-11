## 2024-05-18 - Avoid Runtime Errors on Locales
**Learning:** Do not commit lockfiles (e.g. `pnpm-lock.yaml`) during a small UI change. Keep PRs focused.
**Action:** Always verify if `locale` logic is robust.

## 2025-02-23 - Keyboard Accessibility on Clickable Divs
**Learning:** Interactive rows or items built using `div` with `onClick` lack keyboard accessibility. Using visually hidden `<span className="sr-only">` inside the row instead of applying `aria-label` to the container prevents overriding internal text content for screen readers.
**Action:** Add `role="button"`, `tabIndex={0}`, an `onKeyDown` handler (for Enter/Space), `focus-visible` styling, and an internal visually hidden label to such elements.
