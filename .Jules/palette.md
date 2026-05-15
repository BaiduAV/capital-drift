## 2024-05-18 - Avoid Runtime Errors on Locales
**Learning:** Do not commit lockfiles (e.g. `pnpm-lock.yaml`) during a small UI change. Keep PRs focused.
**Action:** Always verify if `locale` logic is robust.

## 2024-05-15 - Dynamic Data in Aria-Labels
**Learning:** When using `aria-label` to replace the visible text of interactive elements, it will completely override the text content in the Accessibility Tree. Omitting dynamic data (like counts) will hide them from screen readers.
**Action:** Explicitly include dynamic text such as seed numbers or repost counts in `aria-label`.
