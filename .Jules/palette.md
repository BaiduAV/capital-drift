## 2024-05-18 - Avoid Runtime Errors on Locales
**Learning:** Do not commit lockfiles (e.g. `pnpm-lock.yaml`) during a small UI change. Keep PRs focused.
**Action:** Always verify if `locale` logic is robust.

## 2024-05-21 - Accessible List Items
**Learning:** List items using `onClick` need proper roles (`role="button"`), `tabIndex={0}`, keyboard handlers (Enter and Space), and screen reader labels (`aria-label`) to be fully accessible.
**Action:** When implementing custom interactive elements, always ensure keyboard accessibility and provide descriptive labels.
