## 2024-05-18 - Avoid Runtime Errors on Locales
**Learning:** Do not commit lockfiles (e.g. `pnpm-lock.yaml`) during a small UI change. Keep PRs focused.
**Action:** Always verify if `locale` logic is robust.

## 2024-05-19 - Keyboard Accessibility for Complex Interactive Rows
**Learning:** When making `div` elements clickable (like list rows), applying `aria-label` directly to the container overrides all visible child text nodes in the Accessibility Tree, which hides important data.
**Action:** Always add `role="button"`, `tabIndex={0}`, an `onKeyDown` handler (for Enter/Space), and `focus-visible` styles. To provide screen-reader context without squashing visual data, insert a visually hidden `<span className="sr-only">` inside the container instead of using `aria-label`.
