## 2024-05-18 - Avoid Runtime Errors on Locales
**Learning:** Do not commit lockfiles (e.g. `pnpm-lock.yaml`) during a small UI change. Keep PRs focused.
**Action:** Always verify if `locale` logic is robust.

## 2024-05-31 - Keyboard Accessibility on Clickable Divs
**Learning:** The application uses many clickable `div` elements for lists (e.g., Dividend Calendar rows) without standard accessibility features. A recurring accessibility pattern here is needing to convert these into interactive elements. However, adding `aria-label` to a container completely overrides its visible text for screen readers.
**Action:** When finding a clickable `div` or `span` without a `button` tag, always add `role="button"`, `tabIndex={0}`, an `onKeyDown` handler (for 'Enter' and 'Space' with `e.preventDefault()`), and appropriate `focus-visible` outline classes. Instead of overriding complex row content with `aria-label`, inject a visually hidden span (`<span className="sr-only">Action</span>`) inside the button so screen readers read the action along with the rich content.
