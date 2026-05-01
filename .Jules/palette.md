## 2024-05-18 - Avoid Runtime Errors on Locales
**Learning:** Do not commit lockfiles (e.g. `pnpm-lock.yaml`) during a small UI change. Keep PRs focused.
**Action:** Always verify if `locale` logic is robust.
## 2024-05-18 - Keyboard Navigation for List Items\n**Learning:** In custom UI, list items built with generic `div` elements and `onClick` handlers must be explicitly converted to interactive elements using `role="button"`, `tabIndex={0}`, an `onKeyDown` handler (catching Space/Enter), and `focus-visible` styles to ensure full accessibility.\n**Action:** When adding click interactions to custom list rows, immediately add the full suite of ARIA and keyboard interaction attributes.
